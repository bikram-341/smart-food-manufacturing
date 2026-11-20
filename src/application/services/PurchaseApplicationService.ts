import {
  IPurchaseRepository,
  ISupplierRepository,
  IItemRepository,
  IStockLedgerRepository,
  IAuditRepository,
} from '../interfaces/IRepositories.js';
import { PurchaseOrder, PurchaseItem, AuditLog } from '../../domain/entities/PurchaseOrder.js';
import { StockLedgerEntry } from '../../domain/entities/StockLedgerEntry.js';
import { GstTaxService } from '../../domain/strategies/GstTaxService.js';
import { Money } from '../../domain/value-objects/Money.js';
import { Unit } from '../../domain/value-objects/Unit.js';

export interface RecordPurchaseCommand {
  supplierId: string;
  supplierInvoiceNumber: string;
  purchaseDate?: Date;
  items: Array<{
    itemId: string;
    quantity: number;
    rateRupees: number;
    taxRatePercent?: number;
    batchNumber?: string;
    expiryDate?: Date;
  }>;
  notes?: string;
  userId?: string;
}

export class PurchaseApplicationService {
  private factoryStateCode = '33';

  constructor(
    private purchaseRepo: IPurchaseRepository,
    private supplierRepo: ISupplierRepository,
    private itemRepo: IItemRepository,
    private stockLedgerRepo: IStockLedgerRepository,
    private auditRepo: IAuditRepository,
    private gstTaxService: GstTaxService = new GstTaxService()
  ) {}

  public async recordPurchase(cmd: RecordPurchaseCommand): Promise<PurchaseOrder> {
    const supplier = await this.supplierRepo.findById(cmd.supplierId);
    if (!supplier) {
      throw new Error(`Supplier ${cmd.supplierId} not found`);
    }

    if (!cmd.items || cmd.items.length === 0) {
      throw new Error('Purchase must have at least one item');
    }

    const purchaseItems: PurchaseItem[] = [];
    let totalTaxable = Money.zero();
    let totalCgst = Money.zero();
    let totalSgst = Money.zero();
    let totalIgst = Money.zero();
    let grandTotal = Money.zero();

    for (const reqItem of cmd.items) {
      const item = await this.itemRepo.findById(reqItem.itemId);
      if (!item) {
        throw new Error(`Item ${reqItem.itemId} not found`);
      }

      const rate = Money.fromRupees(reqItem.rateRupees);
      const taxable = rate.multiply(reqItem.quantity);
      const taxRate = reqItem.taxRatePercent ?? item.taxRatePercent;

      const taxBreakdown = this.gstTaxService.calculateTax(
        taxable,
        taxRate,
        supplier.stateCode,
        this.factoryStateCode
      );

      totalTaxable = totalTaxable.add(taxable);
      totalCgst = totalCgst.add(taxBreakdown.cgst);
      totalSgst = totalSgst.add(taxBreakdown.sgst);
      totalIgst = totalIgst.add(taxBreakdown.igst);
      grandTotal = grandTotal.add(taxBreakdown.grandTotal);

      purchaseItems.push(
        new PurchaseItem({
          id: `pi_${Math.random().toString(36).substring(2, 9)}`,
          itemId: item.id,
          itemName: item.name,
          unit: item.unit,
          quantity: reqItem.quantity,
          rate,
          taxRatePercent: taxRate,
          taxableAmount: taxable,
          cgstAmount: taxBreakdown.cgst,
          sgstAmount: taxBreakdown.sgst,
          igstAmount: taxBreakdown.igst,
          totalAmount: taxBreakdown.grandTotal,
          batchNumber: reqItem.batchNumber,
          expiryDate: reqItem.expiryDate,
        })
      );
    }

    const purchaseNumber = await this.purchaseRepo.getNextPurchaseNumber();
    const purchaseDate = cmd.purchaseDate ?? new Date();

    const purchase = new PurchaseOrder({
      id: `po_${Math.random().toString(36).substring(2, 9)}`,
      purchaseNumber,
      supplierId: supplier.id,
      supplierName: supplier.name,
      supplierGstin: supplier.gstin,
      supplierInvoiceNumber: cmd.supplierInvoiceNumber,
      purchaseDate,
      totalTaxable,
      totalCgst,
      totalSgst,
      totalIgst,
      grandTotal,
      items: purchaseItems,
      notes: cmd.notes,
    });

    await this.purchaseRepo.save(purchase);

    // Update Stock Ledger and Lots for each item received
    for (const item of purchaseItems) {
      const currentBalance = await this.stockLedgerRepo.getCurrentBalance(item.itemId);
      const newBalance = Math.round((currentBalance + item.quantity) * 10000) / 10000;

      const ledgerEntry = new StockLedgerEntry({
        id: `sl_pur_${Math.random().toString(36).substring(2, 9)}`,
        timestamp: purchaseDate,
        itemId: item.itemId,
        itemName: item.itemName,
        itemCategory: (await this.itemRepo.findById(item.itemId))?.category ?? 'RAW_MATERIAL',
        unit: item.unit,
        movementType: 'PURCHASE_RECEIPT',
        referenceType: 'PURCHASE_INVOICE',
        referenceId: purchase.id,
        referenceNumber: purchase.purchaseNumber,
        quantityChange: item.quantity,
        balanceAfter: newBalance,
        unitRate: item.rate,
        totalValuation: item.taxableAmount,
        batchNumber: item.batchNumber,
        expiryDate: item.expiryDate,
        notes: `Purchased from ${supplier.name} (Inv: ${cmd.supplierInvoiceNumber})`,
        createdBy: cmd.userId ?? 'admin',
      });

      await this.stockLedgerRepo.recordEntry(ledgerEntry);

      // Create new lot for FIFO and Weighted Average tracking
      await this.stockLedgerRepo.createLot({
        id: `lot_pur_${item.id}`,
        itemId: item.itemId,
        date: purchaseDate,
        quantityRemaining: item.quantity,
        unitRate: item.rate,
        batchNumber: item.batchNumber,
      });
    }

    // Audit Logging
    await this.auditRepo.log(
      new AuditLog({
        id: `aud_${Math.random().toString(36).substring(2, 9)}`,
        timestamp: new Date(),
        userId: cmd.userId ?? 'admin',
        username: 'admin',
        userRole: 'ADMIN',
        action: 'PURCHASE_RECORDED',
        entityName: 'PurchaseOrder',
        entityId: purchase.id,
        afterStateJson: JSON.stringify({
          purchaseNumber: purchase.purchaseNumber,
          supplier: supplier.name,
          total: grandTotal.getRupees(),
        }),
      })
    );

    return purchase;
  }

  public async getAllPurchases(): Promise<PurchaseOrder[]> {
    return this.purchaseRepo.findAll();
  }
}
