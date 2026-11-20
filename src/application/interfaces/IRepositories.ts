import { Item } from '../../domain/entities/Item.js';
import { Customer, Supplier } from '../../domain/entities/Customer.js';
import { BillOfMaterials } from '../../domain/entities/BillOfMaterials.js';
import { SalesOrder } from '../../domain/entities/SalesOrder.js';
import { Invoice } from '../../domain/entities/Invoice.js';
import { CreditNote } from '../../domain/entities/Payment.js';
import { ProductionRun } from '../../domain/entities/ProductionRun.js';
import { StockLedgerEntry } from '../../domain/entities/StockLedgerEntry.js';
import { Payment } from '../../domain/entities/Payment.js';
import { PurchaseOrder, AuditLog } from '../../domain/entities/PurchaseOrder.js';
import { StockLot } from '../../domain/strategies/ICostValuationStrategy.js';

export interface IItemRepository {
  findById(id: string): Promise<Item | null>;
  findBySku(sku: string): Promise<Item | null>;
  findAll(): Promise<Item[]>;
  save(item: Item): Promise<void>;
}

export interface ICustomerRepository {
  findById(id: string): Promise<Customer | null>;
  findAll(): Promise<Customer[]>;
  save(customer: Customer): Promise<void>;
}

export interface ISupplierRepository {
  findById(id: string): Promise<Supplier | null>;
  findAll(): Promise<Supplier[]>;
  save(supplier: Supplier): Promise<void>;
}

export interface IBillOfMaterialsRepository {
  findById(id: string): Promise<BillOfMaterials | null>;
  findByFinishedGoodId(productId: string): Promise<BillOfMaterials | null>;
  findAll(): Promise<BillOfMaterials[]>;
  save(bom: BillOfMaterials): Promise<void>;
}

export interface IOrderRepository {
  findById(id: string): Promise<SalesOrder | null>;
  findByOrderNumber(orderNumber: string): Promise<SalesOrder | null>;
  findAll(filters?: { customerId?: string; salesmanId?: string; status?: string }): Promise<SalesOrder[]>;
  save(order: SalesOrder): Promise<void>;
}

export interface IInvoiceRepository {
  findById(id: string): Promise<Invoice | null>;
  findByInvoiceNumber(invoiceNumber: string): Promise<Invoice | null>;
  findByOrderId(orderId: string): Promise<Invoice | null>;
  findAll(filters?: { customerId?: string; startDate?: Date; endDate?: Date }): Promise<Invoice[]>;
  save(invoice: Invoice): Promise<void>;
  saveCreditNote(creditNote: CreditNote): Promise<void>;
  getCreditNotes(): Promise<CreditNote[]>;
  getNextInvoiceNumber(financialYear: string): Promise<string>;
  getNextCreditNoteNumber(financialYear: string): Promise<string>;
}

export interface IProductionRunRepository {
  findById(id: string): Promise<ProductionRun | null>;
  findAll(filters?: { productId?: string; startDate?: Date; endDate?: Date }): Promise<ProductionRun[]>;
  save(run: ProductionRun): Promise<void>;
  getNextRunNumber(): Promise<string>;
}

export interface IStockLedgerRepository {
  recordEntry(entry: StockLedgerEntry): Promise<void>;
  getCurrentBalance(itemId: string): Promise<number>;
  getAllBalances(): Promise<Map<string, { currentBalance: number; unit: string; itemName: string; category: string }>>;
  getLedgerForItem(itemId: string): Promise<StockLedgerEntry[]>;
  getFullLedger(startDate?: Date, endDate?: Date): Promise<StockLedgerEntry[]>;
  getAvailableLots(itemId: string): Promise<StockLot[]>;
  updateLotRemaining(lotId: string, newRemaining: number): Promise<void>;
  createLot(lot: StockLot): Promise<void>;
}

export interface IPurchaseRepository {
  findById(id: string): Promise<PurchaseOrder | null>;
  findAll(filters?: { supplierId?: string; startDate?: Date; endDate?: Date }): Promise<PurchaseOrder[]>;
  save(order: PurchaseOrder): Promise<void>;
  getNextPurchaseNumber(): Promise<string>;
}

export interface IPaymentRepository {
  findById(id: string): Promise<Payment | null>;
  findAll(filters?: { customerId?: string; startDate?: Date; endDate?: Date }): Promise<Payment[]>;
  save(payment: Payment): Promise<void>;
  getNextPaymentNumber(): Promise<string>;
}

export interface IAuditRepository {
  log(entry: AuditLog): Promise<void>;
  getLogs(filters?: { entityName?: string; entityId?: string; limit?: number }): Promise<AuditLog[]>;
}
