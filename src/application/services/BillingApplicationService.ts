import {
  IOrderRepository,
  IInvoiceRepository,
  ICustomerRepository,
  IItemRepository,
  IStockLedgerRepository,
  IAuditRepository,
} from '../interfaces/IRepositories.js';
import { Invoice, InvoiceItem } from '../../domain/entities/Invoice.js';
import { CreditNote } from '../../domain/entities/Payment.js';
import { StockLedgerEntry } from '../../domain/entities/StockLedgerEntry.js';
import { AuditLog } from '../../domain/entities/PurchaseOrder.js';
import { GstTaxService } from '../../domain/strategies/GstTaxService.js';
import { Money } from '../../domain/value-objects/Money.js';

export interface DispatchCommand {
  orderId: string;
  adminUserId: string;
  transportMode?: string;
  vehicleNumber?: string;
}

export class BillingApplicationService {
  private factoryGstin = '33AAAAA1234A1Z5';
  private factoryStateCode = '33';
  private factoryStateName = 'Tamil Nadu';

  constructor(
    private orderRepo: IOrderRepository,
    private invoiceRepo: IInvoiceRepository,
    private customerRepo: ICustomerRepository,
    private itemRepo: IItemRepository,
    private stockLedgerRepo: IStockLedgerRepository,
    private auditRepo: IAuditRepository,
    private gstTaxService: GstTaxService = new GstTaxService()
  ) {}

  /**
   * Generates a GST-compliant tax invoice from an approved Sales Order.
   */
  public async generateInvoice(orderId: string, adminUserId: string, financialYear: string = '2026-27'): Promise<Invoice> {
    const order = await this.orderRepo.findById(orderId);
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    if (order.status !== 'APPROVED') {
      throw new Error(`Cannot generate invoice for order in status ${order.status}. Order must be APPROVED first.`);
    }

    const customer = await this.customerRepo.findById(order.customerId);
    if (!customer) {
      throw new Error(`Customer ${order.customerId} not found`);
    }

    const invoiceNumber = await this.invoiceRepo.getNextInvoiceNumber(financialYear);
    const isInterState = this.factoryStateCode.trim() !== customer.stateCode.trim();

    const invoiceItems: InvoiceItem[] = [];
    let totalTaxable = Money.zero();
    let totalCgst = Money.zero();
    let totalSgst = Money.zero();
    let totalIgst = Money.zero();
    let grandTotal = Money.zero();

    for (const orderItem of order.items) {
      const item = await this.itemRepo.findById(orderItem.itemId);
      const hsnCode = item?.hsnCode ?? '19059040';
      const taxableAmount = orderItem.getTaxableAmount();

      const taxBreakdown = this.gstTaxService.calculateTax(
        taxableAmount,
        orderItem.taxRatePercent,
        this.factoryStateCode,
        customer.stateCode
      );

      totalTaxable = totalTaxable.add(taxableAmount);
      totalCgst = totalCgst.add(taxBreakdown.cgst);
      totalSgst = totalSgst.add(taxBreakdown.sgst);
      totalIgst = totalIgst.add(taxBreakdown.igst);
      grandTotal = grandTotal.add(taxBreakdown.grandTotal);

      invoiceItems.push(
        new InvoiceItem({
          id: `ii_${Math.random().toString(36).substring(2, 9)}`,
          itemId: orderItem.itemId,
          itemName: orderItem.itemName,
          hsnCode,
          quantity: orderItem.quantity,
          unitPrice: orderItem.unitPrice,
          taxableAmount,
          taxRatePercent: orderItem.taxRatePercent,
          cgstAmount: taxBreakdown.cgst,
          sgstAmount: taxBreakdown.sgst,
          igstAmount: taxBreakdown.igst,
          totalAmount: taxBreakdown.grandTotal,
        })
      );
    }

    const invoice = new Invoice({
      id: `inv_${Math.random().toString(36).substring(2, 9)}`,
      invoiceNumber,
      financialYear,
      orderId: order.id,
      customerId: customer.id,
      customerName: customer.name,
      customerGstin: customer.gstin,
      customerAddress: customer.address,
      customerStateCode: customer.stateCode,
      customerStateName: customer.stateName,
      supplierGstin: this.factoryGstin,
      supplierStateCode: this.factoryStateCode,
      supplierStateName: this.factoryStateName,
      invoiceDate: new Date(),
      isInterState,
      totalTaxable,
      totalCgst,
      totalSgst,
      totalIgst,
      grandTotal,
      status: 'ISSUED',
      items: invoiceItems,
    });

    await this.invoiceRepo.save(invoice);

    order.markInvoiced();
    await this.orderRepo.save(order);

    await this.auditRepo.log(
      new AuditLog({
        id: `aud_${Math.random().toString(36).substring(2, 9)}`,
        timestamp: new Date(),
        userId: adminUserId,
        username: 'admin',
        userRole: 'ADMIN',
        action: 'INVOICE_GENERATED',
        entityName: 'Invoice',
        entityId: invoice.id,
        afterStateJson: JSON.stringify({
          invoiceNumber: invoice.invoiceNumber,
          taxable: totalTaxable.getRupees(),
          cgst: totalCgst.getRupees(),
          sgst: totalSgst.getRupees(),
          igst: totalIgst.getRupees(),
          grandTotal: grandTotal.getRupees(),
        }),
      })
    );

    return invoice;
  }

  /**
   * Records dispatch of goods.
   * Crucially reduces finished-goods stock in the immutable Stock Ledger!
   */
  public async recordDispatch(cmd: DispatchCommand): Promise<Invoice> {
    const order = await this.orderRepo.findById(cmd.orderId);
    if (!order) {
      throw new Error(`Order ${cmd.orderId} not found`);
    }

    let invoice = await this.invoiceRepo.findByOrderId(order.id);
    if (!invoice) {
      // Auto-generate invoice if not already raised
      invoice = await this.generateInvoice(order.id, cmd.adminUserId);
    }

    // Verify stock availability prior to physical dispatch
    for (const item of order.items) {
      const balance = await this.stockLedgerRepo.getCurrentBalance(item.itemId);
      if (balance < item.quantity) {
        throw new Error(
          `Cannot dispatch: Insufficient finished-goods stock for ${item.itemName}. Available: ${balance}, Required: ${item.quantity}`
        );
      }
    }

    // Deduct stock in double-entry ledger for every item dispatched
    const now = new Date();
    for (const item of order.items) {
      const currentBalance = await this.stockLedgerRepo.getCurrentBalance(item.itemId);
      const newBalance = Math.round((currentBalance - item.quantity) * 10000) / 10000;
      const unitRate = item.unitPrice;
      const totalValuation = unitRate.multiply(item.quantity);

      const ledgerEntry = new StockLedgerEntry({
        id: `sl_disp_${Math.random().toString(36).substring(2, 9)}`,
        timestamp: now,
        itemId: item.itemId,
        itemName: item.itemName,
        itemCategory: 'FINISHED_GOOD',
        unit: (await this.itemRepo.findById(item.itemId))?.unit ?? ('packet' as any),
        movementType: 'SALES_DISPATCH',
        referenceType: 'TAX_INVOICE',
        referenceId: invoice.id,
        referenceNumber: invoice.invoiceNumber,
        quantityChange: -item.quantity,
        balanceAfter: newBalance,
        unitRate,
        totalValuation,
        notes: `Dispatched against Invoice ${invoice.invoiceNumber}`,
        createdBy: cmd.adminUserId,
      });

      await this.stockLedgerRepo.recordEntry(ledgerEntry);
    }

    order.markDispatched();
    await this.orderRepo.save(order);

    await this.auditRepo.log(
      new AuditLog({
        id: `aud_${Math.random().toString(36).substring(2, 9)}`,
        timestamp: now,
        userId: cmd.adminUserId,
        username: 'admin',
        userRole: 'ADMIN',
        action: 'ORDER_DISPATCHED',
        entityName: 'SalesOrder',
        entityId: order.id,
        afterStateJson: JSON.stringify({
          orderNumber: order.orderNumber,
          invoiceNumber: invoice.invoiceNumber,
          status: 'DISPATCHED',
        }),
      })
    );

    return invoice;
  }

  /**
   * Cancels a posted invoice by issuing a Credit Note, preserving financial and tax audit trail.
   */
  public async cancelInvoice(invoiceId: string, adminUserId: string, reason: string): Promise<CreditNote> {
    const invoice = await this.invoiceRepo.findById(invoiceId);
    if (!invoice) {
      throw new Error(`Invoice ${invoiceId} not found`);
    }

    if (invoice.status === 'CANCELLED') {
      throw new Error(`Invoice ${invoice.invoiceNumber} is already cancelled`);
    }

    const creditNoteNumber = await this.invoiceRepo.getNextCreditNoteNumber(invoice.financialYear);
    const creditNote = new CreditNote({
      id: `cn_${Math.random().toString(36).substring(2, 9)}`,
      creditNoteNumber,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      customerId: invoice.customerId,
      amount: invoice.grandTotal,
      reason,
      issuedAt: new Date(),
    });

    await this.invoiceRepo.saveCreditNote(creditNote);
    invoice.cancelWithCreditNote(creditNote.id, reason);
    await this.invoiceRepo.save(invoice);

    await this.auditRepo.log(
      new AuditLog({
        id: `aud_${Math.random().toString(36).substring(2, 9)}`,
        timestamp: new Date(),
        userId: adminUserId,
        username: 'admin',
        userRole: 'ADMIN',
        action: 'INVOICE_CANCELLED_CREDIT_NOTE',
        entityName: 'Invoice',
        entityId: invoice.id,
        afterStateJson: JSON.stringify({
          invoiceNumber: invoice.invoiceNumber,
          creditNoteNumber: creditNote.creditNoteNumber,
          reason,
          amount: creditNote.amount.getRupees(),
        }),
      })
    );

    return creditNote;
  }

  public async getAllInvoices(filters?: { customerId?: string; startDate?: Date; endDate?: Date }): Promise<Invoice[]> {
    return this.invoiceRepo.findAll(filters);
  }

  public async getInvoiceById(id: string): Promise<Invoice | null> {
    return this.invoiceRepo.findById(id);
  }

  public async getCreditNotes(): Promise<CreditNote[]> {
    return this.invoiceRepo.getCreditNotes();
  }
}
