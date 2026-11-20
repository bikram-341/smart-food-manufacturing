import { DatabaseConnection } from '../database/DatabaseConnection.js';
import {
  IOrderRepository,
  IInvoiceRepository,
  IProductionRunRepository,
  IPurchaseRepository,
  IPaymentRepository,
  IAuditRepository,
} from '../../application/interfaces/IRepositories.js';
import { SalesOrder, OrderItem, OrderStatus } from '../../domain/entities/SalesOrder.js';
import { Invoice, InvoiceItem, InvoiceStatus } from '../../domain/entities/Invoice.js';
import { CreditNote, Payment } from '../../domain/entities/Payment.js';
import {
  ProductionRun,
  ConsumedIngredient,
  DamagedMaterial,
} from '../../domain/entities/ProductionRun.js';
import { PurchaseOrder, PurchaseItem, AuditLog, UserRole } from '../../domain/entities/PurchaseOrder.js';
import { Money } from '../../domain/value-objects/Money.js';
import { Unit } from '../../domain/value-objects/Unit.js';

export class SqliteOrderRepository implements IOrderRepository {
  public async findById(id: string): Promise<SalesOrder | null> {
    const db = DatabaseConnection.getInstance();
    const row = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as any;
    if (!row) return null;
    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(id) as any[];
    return this.mapToEntity(row, items);
  }

  public async findByOrderNumber(orderNumber: string): Promise<SalesOrder | null> {
    const db = DatabaseConnection.getInstance();
    const row = db.prepare('SELECT * FROM orders WHERE order_number = ?').get(orderNumber) as any;
    if (!row) return null;
    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(row.id) as any[];
    return this.mapToEntity(row, items);
  }

  public async findAll(filters?: { customerId?: string; salesmanId?: string; status?: string }): Promise<SalesOrder[]> {
    const db = DatabaseConnection.getInstance();
    let query = 'SELECT * FROM orders WHERE 1=1';
    const params: any[] = [];
    if (filters?.customerId) {
      query += ' AND customer_id = ?';
      params.push(filters.customerId);
    }
    if (filters?.salesmanId) {
      query += ' AND salesman_id = ?';
      params.push(filters.salesmanId);
    }
    if (filters?.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }
    query += ' ORDER BY order_date DESC, created_at DESC';

    const rows = db.prepare(query).all(...params) as any[];
    return rows.map((r) => {
      const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(r.id) as any[];
      return this.mapToEntity(r, items);
    });
  }

  public async save(order: SalesOrder): Promise<void> {
    const db = DatabaseConnection.getInstance();
    const insertOrder = db.prepare(`
      INSERT INTO orders (id, order_number, customer_id, customer_name, customer_state_code, salesman_id, salesman_name, order_date, status, offline_id, rejection_reason)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        status = excluded.status,
        rejection_reason = excluded.rejection_reason
    `);

    const deleteItems = db.prepare('DELETE FROM order_items WHERE order_id = ?');
    const insertItem = db.prepare(`
      INSERT INTO order_items (id, order_id, item_id, item_name, quantity, unit_price_paise, tax_rate_percent, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    db.transaction(() => {
      insertOrder.run(
        order.id,
        order.orderNumber,
        order.customerId,
        order.customerName,
        order.customerStateCode,
        order.salesmanId,
        order.salesmanName,
        order.orderDate.toISOString(),
        order.status,
        order.offlineId ?? null,
        order.rejectionReason ?? null
      );

      deleteItems.run(order.id);
      for (const item of order.items) {
        insertItem.run(
          item.id,
          order.id,
          item.itemId,
          item.itemName,
          item.quantity,
          item.unitPrice.getPaise(),
          item.taxRatePercent,
          item.notes ?? null
        );
      }
    })();
  }

  private mapToEntity(row: any, items: any[]): SalesOrder {
    return new SalesOrder({
      id: row.id,
      orderNumber: row.order_number,
      customerId: row.customer_id,
      customerName: row.customer_name,
      customerStateCode: row.customer_state_code,
      salesmanId: row.salesman_id,
      salesmanName: row.salesman_name,
      orderDate: new Date(row.order_date),
      status: row.status as OrderStatus,
      offlineId: row.offline_id ?? undefined,
      rejectionReason: row.rejection_reason ?? undefined,
      items: items.map(
        (i) =>
          new OrderItem({
            id: i.id,
            itemId: i.item_id,
            itemName: i.item_name,
            quantity: i.quantity,
            unitPrice: Money.fromPaise(i.unit_price_paise),
            taxRatePercent: i.tax_rate_percent,
            notes: i.notes ?? undefined,
          })
      ),
    });
  }
}

export class SqliteInvoiceRepository implements IInvoiceRepository {
  public async findById(id: string): Promise<Invoice | null> {
    const db = DatabaseConnection.getInstance();
    const row = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id) as any;
    if (!row) return null;
    const items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(id) as any[];
    return this.mapToEntity(row, items);
  }

  public async findByInvoiceNumber(invoiceNumber: string): Promise<Invoice | null> {
    const db = DatabaseConnection.getInstance();
    const row = db.prepare('SELECT * FROM invoices WHERE invoice_number = ?').get(invoiceNumber) as any;
    if (!row) return null;
    const items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(row.id) as any[];
    return this.mapToEntity(row, items);
  }

  public async findByOrderId(orderId: string): Promise<Invoice | null> {
    const db = DatabaseConnection.getInstance();
    const row = db.prepare('SELECT * FROM invoices WHERE order_id = ?').get(orderId) as any;
    if (!row) return null;
    const items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(row.id) as any[];
    return this.mapToEntity(row, items);
  }

  public async findAll(filters?: { customerId?: string; startDate?: Date; endDate?: Date }): Promise<Invoice[]> {
    const db = DatabaseConnection.getInstance();
    let query = 'SELECT * FROM invoices WHERE 1=1';
    const params: any[] = [];
    if (filters?.customerId) {
      query += ' AND customer_id = ?';
      params.push(filters.customerId);
    }
    if (filters?.startDate) {
      query += ' AND invoice_date >= ?';
      params.push(filters.startDate.toISOString());
    }
    if (filters?.endDate) {
      query += ' AND invoice_date <= ?';
      params.push(filters.endDate.toISOString());
    }
    query += ' ORDER BY invoice_date DESC, created_at DESC';

    const rows = db.prepare(query).all(...params) as any[];
    return rows.map((r) => {
      const items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(r.id) as any[];
      return this.mapToEntity(r, items);
    });
  }

  public async save(invoice: Invoice): Promise<void> {
    const db = DatabaseConnection.getInstance();
    const insertInvoice = db.prepare(`
      INSERT INTO invoices (
        id, invoice_number, financial_year, order_id, customer_id, customer_name,
        customer_gstin, customer_address, customer_state_code, customer_state_name,
        supplier_gstin, supplier_state_code, supplier_state_name, invoice_date,
        is_inter_state, total_taxable_paise, total_cgst_paise, total_sgst_paise,
        total_igst_paise, grand_total_paise, status, credit_note_id, cancellation_reason
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        status = excluded.status,
        credit_note_id = excluded.credit_note_id,
        cancellation_reason = excluded.cancellation_reason
    `);

    const deleteItems = db.prepare('DELETE FROM invoice_items WHERE invoice_id = ?');
    const insertItem = db.prepare(`
      INSERT INTO invoice_items (
        id, invoice_id, item_id, item_name, hsn_code, quantity,
        unit_price_paise, taxable_amount_paise, tax_rate_percent,
        cgst_amount_paise, sgst_amount_paise, igst_amount_paise, total_amount_paise
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    db.transaction(() => {
      insertInvoice.run(
        invoice.id,
        invoice.invoiceNumber,
        invoice.financialYear,
        invoice.orderId,
        invoice.customerId,
        invoice.customerName,
        invoice.customerGstin,
        invoice.customerAddress,
        invoice.customerStateCode,
        invoice.customerStateName,
        invoice.supplierGstin,
        invoice.supplierStateCode,
        invoice.supplierStateName,
        invoice.invoiceDate.toISOString(),
        invoice.isInterState ? 1 : 0,
        invoice.totalTaxable.getPaise(),
        invoice.totalCgst.getPaise(),
        invoice.totalSgst.getPaise(),
        invoice.totalIgst.getPaise(),
        invoice.grandTotal.getPaise(),
        invoice.status,
        invoice.creditNoteId ?? null,
        invoice.cancellationReason ?? null
      );

      deleteItems.run(invoice.id);
      for (const item of invoice.items) {
        insertItem.run(
          item.id,
          invoice.id,
          item.itemId,
          item.itemName,
          item.hsnCode,
          item.quantity,
          item.unitPrice.getPaise(),
          item.taxableAmount.getPaise(),
          item.taxRatePercent,
          item.cgstAmount.getPaise(),
          item.sgstAmount.getPaise(),
          item.igstAmount.getPaise(),
          item.totalAmount.getPaise()
        );
      }
    })();
  }

  public async saveCreditNote(creditNote: CreditNote): Promise<void> {
    const db = DatabaseConnection.getInstance();
    db.prepare(`
      INSERT INTO credit_notes (id, credit_note_number, invoice_id, invoice_number, customer_id, amount_paise, reason, issued_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      creditNote.id,
      creditNote.creditNoteNumber,
      creditNote.invoiceId,
      creditNote.invoiceNumber,
      creditNote.customerId,
      creditNote.amount.getPaise(),
      creditNote.reason,
      creditNote.issuedAt.toISOString()
    );
  }

  public async getCreditNotes(): Promise<CreditNote[]> {
    const db = DatabaseConnection.getInstance();
    const rows = db.prepare('SELECT * FROM credit_notes ORDER BY issued_at DESC').all() as any[];
    return rows.map(
      (r) =>
        new CreditNote({
          id: r.id,
          creditNoteNumber: r.credit_note_number,
          invoiceId: r.invoice_id,
          invoiceNumber: r.invoice_number,
          customerId: r.customer_id,
          amount: Money.fromPaise(r.amount_paise),
          reason: r.reason,
          issuedAt: new Date(r.issued_at),
        })
    );
  }

  public async getNextInvoiceNumber(financialYear: string): Promise<string> {
    const db = DatabaseConnection.getInstance();
    const countRow = db.prepare(
      'SELECT COUNT(*) as count FROM invoices WHERE financial_year = ?'
    ).get(financialYear) as { count: number };
    const nextSeq = (countRow.count + 1).toString().padStart(4, '0');
    return `INV/${financialYear}/${nextSeq}`;
  }

  public async getNextCreditNoteNumber(financialYear: string): Promise<string> {
    const db = DatabaseConnection.getInstance();
    const countRow = db.prepare(
      'SELECT COUNT(*) as count FROM credit_notes'
    ).get() as { count: number };
    const nextSeq = (countRow.count + 1).toString().padStart(4, '0');
    return `CN/${financialYear}/${nextSeq}`;
  }

  private mapToEntity(row: any, items: any[]): Invoice {
    return new Invoice({
      id: row.id,
      invoiceNumber: row.invoice_number,
      financialYear: row.financial_year,
      orderId: row.order_id,
      customerId: row.customer_id,
      customerName: row.customer_name,
      customerGstin: row.customer_gstin,
      customerAddress: row.customer_address,
      customerStateCode: row.customer_state_code,
      customerStateName: row.customer_state_name,
      supplierGstin: row.supplier_gstin,
      supplierStateCode: row.supplier_state_code,
      supplierStateName: row.supplier_state_name,
      invoiceDate: new Date(row.invoice_date),
      isInterState: Boolean(row.is_inter_state),
      totalTaxable: Money.fromPaise(row.total_taxable_paise),
      totalCgst: Money.fromPaise(row.total_cgst_paise),
      totalSgst: Money.fromPaise(row.total_sgst_paise),
      totalIgst: Money.fromPaise(row.total_igst_paise),
      grandTotal: Money.fromPaise(row.grand_total_paise),
      status: row.status as InvoiceStatus,
      creditNoteId: row.credit_note_id ?? undefined,
      cancellationReason: row.cancellation_reason ?? undefined,
      items: items.map(
        (i) =>
          new InvoiceItem({
            id: i.id,
            itemId: i.item_id,
            itemName: i.item_name,
            hsnCode: i.hsn_code,
            quantity: i.quantity,
            unitPrice: Money.fromPaise(i.unit_price_paise),
            taxableAmount: Money.fromPaise(i.taxable_amount_paise),
            taxRatePercent: i.tax_rate_percent,
            cgstAmount: Money.fromPaise(i.cgst_amount_paise),
            sgstAmount: Money.fromPaise(i.sgst_amount_paise),
            igstAmount: Money.fromPaise(i.igst_amount_paise),
            totalAmount: Money.fromPaise(i.total_amount_paise),
          })
      ),
    });
  }
}

export class SqliteProductionRunRepository implements IProductionRunRepository {
  public async findById(id: string): Promise<ProductionRun | null> {
    const db = DatabaseConnection.getInstance();
    const row = db.prepare('SELECT * FROM production_runs WHERE id = ?').get(id) as any;
    if (!row) return null;
    const ingredients = db.prepare('SELECT * FROM production_run_ingredients WHERE run_id = ?').all(id) as any[];
    const damaged = db.prepare('SELECT * FROM production_run_damaged WHERE run_id = ?').all(id) as any[];
    return this.mapToEntity(row, ingredients, damaged);
  }

  public async findAll(filters?: { productId?: string; startDate?: Date; endDate?: Date }): Promise<ProductionRun[]> {
    const db = DatabaseConnection.getInstance();
    let query = 'SELECT * FROM production_runs WHERE 1=1';
    const params: any[] = [];
    if (filters?.productId) {
      query += ' AND product_id = ?';
      params.push(filters.productId);
    }
    if (filters?.startDate) {
      query += ' AND run_date >= ?';
      params.push(filters.startDate.toISOString());
    }
    if (filters?.endDate) {
      query += ' AND run_date <= ?';
      params.push(filters.endDate.toISOString());
    }
    query += ' ORDER BY run_date DESC, created_at DESC';

    const rows = db.prepare(query).all(...params) as any[];
    return rows.map((r) => {
      const ingredients = db.prepare('SELECT * FROM production_run_ingredients WHERE run_id = ?').all(r.id) as any[];
      const damaged = db.prepare('SELECT * FROM production_run_damaged WHERE run_id = ?').all(r.id) as any[];
      return this.mapToEntity(r, ingredients, damaged);
    });
  }

  public async save(run: ProductionRun): Promise<void> {
    const db = DatabaseConnection.getInstance();
    const insertRun = db.prepare(`
      INSERT INTO production_runs (
        id, run_number, product_id, product_name, run_date, planned_output_packets,
        actual_output_packets, yield_variance_percent, is_yield_alert,
        labour_cost_paise, overhead_cost_paise, materials_cost_paise,
        total_manufacturing_cost_paise, cost_per_packet_paise, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        status = excluded.status
    `);

    const deleteIng = db.prepare('DELETE FROM production_run_ingredients WHERE run_id = ?');
    const insertIng = db.prepare(`
      INSERT INTO production_run_ingredients (
        id, run_id, item_id, item_name, unit, planned_quantity, actual_quantity,
        variance_quantity, variance_percent, is_variance_alert, unit_cost_paise, total_cost_paise
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const deleteDamaged = db.prepare('DELETE FROM production_run_damaged WHERE run_id = ?');
    const insertDamaged = db.prepare(`
      INSERT INTO production_run_damaged (
        id, run_id, item_id, item_name, quantity, unit, reason, unit_cost_paise, total_cost_paise
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    db.transaction(() => {
      insertRun.run(
        run.id,
        run.runNumber,
        run.productId,
        run.productName,
        run.runDate.toISOString(),
        run.plannedOutputPackets,
        run.actualOutputPackets,
        run.yieldVariancePercent,
        run.isYieldAlert ? 1 : 0,
        run.labourCost.getPaise(),
        run.overheadCost.getPaise(),
        run.materialsCost.getPaise(),
        run.totalManufacturingCost.getPaise(),
        run.costPerPacket.getPaise(),
        run.status,
        run.notes ?? null
      );

      deleteIng.run(run.id);
      for (const ing of run.ingredients) {
        insertIng.run(
          `ing_${Math.random().toString(36).substring(2, 9)}`,
          run.id,
          ing.itemId,
          ing.itemName,
          ing.unit,
          ing.plannedQuantity,
          ing.actualQuantity,
          ing.varianceQuantity,
          ing.variancePercent,
          ing.isVarianceAlert ? 1 : 0,
          ing.unitCost.getPaise(),
          ing.totalCost.getPaise()
        );
      }

      deleteDamaged.run(run.id);
      for (const dmg of run.damagedMaterials) {
        insertDamaged.run(
          `dmg_${Math.random().toString(36).substring(2, 9)}`,
          run.id,
          dmg.itemId,
          dmg.itemName,
          dmg.quantity,
          dmg.unit,
          dmg.reason,
          dmg.unitCost.getPaise(),
          dmg.totalCost.getPaise()
        );
      }
    })();
  }

  public async getNextRunNumber(): Promise<string> {
    const db = DatabaseConnection.getInstance();
    const countRow = db.prepare('SELECT COUNT(*) as count FROM production_runs').get() as { count: number };
    const nextSeq = (countRow.count + 1).toString().padStart(4, '0');
    return `PR-2026-${nextSeq}`;
  }

  private mapToEntity(row: any, ingredients: any[], damaged: any[]): ProductionRun {
    return new ProductionRun({
      id: row.id,
      runNumber: row.run_number,
      productId: row.product_id,
      productName: row.product_name,
      runDate: new Date(row.run_date),
      plannedOutputPackets: row.planned_output_packets,
      actualOutputPackets: row.actual_output_packets,
      yieldVariancePercent: row.yield_variance_percent,
      isYieldAlert: Boolean(row.is_yield_alert),
      labourCost: Money.fromPaise(row.labour_cost_paise),
      overheadCost: Money.fromPaise(row.overhead_cost_paise),
      materialsCost: Money.fromPaise(row.materials_cost_paise),
      totalManufacturingCost: Money.fromPaise(row.total_manufacturing_cost_paise),
      costPerPacket: Money.fromPaise(row.cost_per_packet_paise),
      status: row.status as 'COMPLETED' | 'CANCELLED',
      notes: row.notes ?? undefined,
      ingredients: ingredients.map(
        (i) => ({
          itemId: i.item_id,
          itemName: i.item_name,
          unit: i.unit as Unit,
          plannedQuantity: i.planned_quantity,
          actualQuantity: i.actual_quantity,
          varianceQuantity: i.variance_quantity,
          variancePercent: i.variance_percent,
          isVarianceAlert: Boolean(i.is_variance_alert),
          unitCost: Money.fromPaise(i.unit_cost_paise),
          totalCost: Money.fromPaise(i.total_cost_paise),
        })
      ),
      damagedMaterials: damaged.map(
        (d) => ({
          itemId: d.item_id,
          itemName: d.item_name,
          quantity: d.quantity,
          unit: d.unit as Unit,
          reason: d.reason,
          unitCost: Money.fromPaise(d.unit_cost_paise),
          totalCost: Money.fromPaise(d.total_cost_paise),
        })
      ),
    });
  }
}

export class SqlitePurchaseRepository implements IPurchaseRepository {
  public async findById(id: string): Promise<PurchaseOrder | null> {
    const db = DatabaseConnection.getInstance();
    const row = db.prepare('SELECT * FROM purchases WHERE id = ?').get(id) as any;
    if (!row) return null;
    const items = db.prepare('SELECT * FROM purchase_items WHERE purchase_id = ?').all(id) as any[];
    return this.mapToEntity(row, items);
  }

  public async findAll(filters?: { supplierId?: string; startDate?: Date; endDate?: Date }): Promise<PurchaseOrder[]> {
    const db = DatabaseConnection.getInstance();
    let query = 'SELECT * FROM purchases WHERE 1=1';
    const params: any[] = [];
    if (filters?.supplierId) {
      query += ' AND supplier_id = ?';
      params.push(filters.supplierId);
    }
    if (filters?.startDate) {
      query += ' AND purchase_date >= ?';
      params.push(filters.startDate.toISOString());
    }
    if (filters?.endDate) {
      query += ' AND purchase_date <= ?';
      params.push(filters.endDate.toISOString());
    }
    query += ' ORDER BY purchase_date DESC, created_at DESC';

    const rows = db.prepare(query).all(...params) as any[];
    return rows.map((r) => {
      const items = db.prepare('SELECT * FROM purchase_items WHERE purchase_id = ?').all(r.id) as any[];
      return this.mapToEntity(r, items);
    });
  }

  public async save(order: PurchaseOrder): Promise<void> {
    const db = DatabaseConnection.getInstance();
    const insertPurchase = db.prepare(`
      INSERT INTO purchases (
        id, purchase_number, supplier_id, supplier_name, supplier_gstin,
        supplier_invoice_number, purchase_date, total_taxable_paise,
        total_cgst_paise, total_sgst_paise, total_igst_paise, grand_total_paise, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertItem = db.prepare(`
      INSERT INTO purchase_items (
        id, purchase_id, item_id, item_name, unit, quantity, rate_paise,
        tax_rate_percent, taxable_amount_paise, cgst_amount_paise,
        sgst_amount_paise, igst_amount_paise, total_amount_paise, batch_number, expiry_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    db.transaction(() => {
      insertPurchase.run(
        order.id,
        order.purchaseNumber,
        order.supplierId,
        order.supplierName,
        order.supplierGstin,
        order.supplierInvoiceNumber,
        order.purchaseDate.toISOString(),
        order.totalTaxable.getPaise(),
        order.totalCgst.getPaise(),
        order.totalSgst.getPaise(),
        order.totalIgst.getPaise(),
        order.grandTotal.getPaise(),
        order.notes ?? null
      );

      for (const item of order.items) {
        insertItem.run(
          item.id,
          order.id,
          item.itemId,
          item.itemName,
          item.unit,
          item.quantity,
          item.rate.getPaise(),
          item.taxRatePercent,
          item.taxableAmount.getPaise(),
          item.cgstAmount.getPaise(),
          item.sgstAmount.getPaise(),
          item.igstAmount.getPaise(),
          item.totalAmount.getPaise(),
          item.batchNumber ?? null,
          item.expiryDate ? item.expiryDate.toISOString() : null
        );
      }
    })();
  }

  public async getNextPurchaseNumber(): Promise<string> {
    const db = DatabaseConnection.getInstance();
    const countRow = db.prepare('SELECT COUNT(*) as count FROM purchases').get() as { count: number };
    const nextSeq = (countRow.count + 1).toString().padStart(4, '0');
    return `PO-2026-${nextSeq}`;
  }

  private mapToEntity(row: any, items: any[]): PurchaseOrder {
    return new PurchaseOrder({
      id: row.id,
      purchaseNumber: row.purchase_number,
      supplierId: row.supplier_id,
      supplierName: row.supplier_name,
      supplierGstin: row.supplier_gstin,
      supplierInvoiceNumber: row.supplier_invoice_number,
      purchaseDate: new Date(row.purchase_date),
      totalTaxable: Money.fromPaise(row.total_taxable_paise),
      totalCgst: Money.fromPaise(row.total_cgst_paise),
      totalSgst: Money.fromPaise(row.total_sgst_paise),
      totalIgst: Money.fromPaise(row.total_igst_paise),
      grandTotal: Money.fromPaise(row.grand_total_paise),
      notes: row.notes ?? undefined,
      items: items.map(
        (i) =>
          new PurchaseItem({
            id: i.id,
            itemId: i.item_id,
            itemName: i.item_name,
            unit: i.unit as Unit,
            quantity: i.quantity,
            rate: Money.fromPaise(i.rate_paise),
            taxRatePercent: i.tax_rate_percent,
            taxableAmount: Money.fromPaise(i.taxable_amount_paise),
            cgstAmount: Money.fromPaise(i.cgst_amount_paise),
            sgstAmount: Money.fromPaise(i.sgst_amount_paise),
            igstAmount: Money.fromPaise(i.igst_amount_paise),
            totalAmount: Money.fromPaise(i.total_amount_paise),
            batchNumber: i.batch_number ?? undefined,
            expiryDate: i.expiry_date ? new Date(i.expiry_date) : undefined,
          })
      ),
    });
  }
}

export class SqlitePaymentRepository implements IPaymentRepository {
  public async findById(id: string): Promise<Payment | null> {
    const db = DatabaseConnection.getInstance();
    const row = db.prepare('SELECT * FROM payments WHERE id = ?').get(id) as any;
    if (!row) return null;
    return this.mapToEntity(row);
  }

  public async findAll(filters?: { customerId?: string; startDate?: Date; endDate?: Date }): Promise<Payment[]> {
    const db = DatabaseConnection.getInstance();
    let query = 'SELECT * FROM payments WHERE 1=1';
    const params: any[] = [];
    if (filters?.customerId) {
      query += ' AND customer_id = ?';
      params.push(filters.customerId);
    }
    if (filters?.startDate) {
      query += ' AND payment_date >= ?';
      params.push(filters.startDate.toISOString());
    }
    if (filters?.endDate) {
      query += ' AND payment_date <= ?';
      params.push(filters.endDate.toISOString());
    }
    query += ' ORDER BY payment_date DESC, created_at DESC';

    const rows = db.prepare(query).all(...params) as any[];
    return rows.map((r) => this.mapToEntity(r));
  }

  public async save(payment: Payment): Promise<void> {
    const db = DatabaseConnection.getInstance();
    db.prepare(`
      INSERT INTO payments (id, payment_number, customer_id, invoice_id, amount_paise, payment_date, payment_mode, reference_number, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      payment.id,
      payment.paymentNumber,
      payment.customerId,
      payment.invoiceId ?? null,
      payment.amount.getPaise(),
      payment.paymentDate.toISOString(),
      payment.paymentMode,
      payment.referenceNumber ?? null,
      payment.notes ?? null
    );
  }

  public async getNextPaymentNumber(): Promise<string> {
    const db = DatabaseConnection.getInstance();
    const countRow = db.prepare('SELECT COUNT(*) as count FROM payments').get() as { count: number };
    const nextSeq = (countRow.count + 1).toString().padStart(4, '0');
    return `PAY-2026-${nextSeq}`;
  }

  private mapToEntity(row: any): Payment {
    return new Payment({
      id: row.id,
      paymentNumber: row.payment_number,
      customerId: row.customer_id,
      invoiceId: row.invoice_id ?? undefined,
      amount: Money.fromPaise(row.amount_paise),
      paymentDate: new Date(row.payment_date),
      paymentMode: row.payment_mode,
      referenceNumber: row.reference_number ?? undefined,
      notes: row.notes ?? undefined,
    });
  }
}

export class SqliteAuditRepository implements IAuditRepository {
  public async log(entry: AuditLog): Promise<void> {
    const db = DatabaseConnection.getInstance();
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, user_id, username, user_role, action, entity_name, entity_id, before_state_json, after_state_json, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      entry.id,
      entry.timestamp.toISOString(),
      entry.userId,
      entry.username,
      entry.userRole,
      entry.action,
      entry.entityName,
      entry.entityId,
      entry.beforeStateJson ?? null,
      entry.afterStateJson ?? null,
      entry.ipAddress ?? null
    );
  }

  public async getLogs(filters?: { entityName?: string; entityId?: string; limit?: number }): Promise<AuditLog[]> {
    const db = DatabaseConnection.getInstance();
    let query = 'SELECT * FROM audit_logs WHERE 1=1';
    const params: any[] = [];
    if (filters?.entityName) {
      query += ' AND entity_name = ?';
      params.push(filters.entityName);
    }
    if (filters?.entityId) {
      query += ' AND entity_id = ?';
      params.push(filters.entityId);
    }
    query += ' ORDER BY timestamp DESC';
    if (filters?.limit) {
      query += ` LIMIT ${filters.limit}`;
    }

    const rows = db.prepare(query).all(...params) as any[];
    return rows.map(
      (r) =>
        new AuditLog({
          id: r.id,
          timestamp: new Date(r.timestamp),
          userId: r.user_id,
          username: r.username,
          userRole: r.user_role as UserRole,
          action: r.action,
          entityName: r.entity_name,
          entityId: r.entity_id,
          beforeStateJson: r.before_state_json ?? undefined,
          afterStateJson: r.after_state_json ?? undefined,
          ipAddress: r.ip_address ?? undefined,
        })
    );
  }
}
