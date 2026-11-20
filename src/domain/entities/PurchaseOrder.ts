import { Money } from '../value-objects/Money.js';
import { Unit } from '../value-objects/Unit.js';

export interface PurchaseItemProps {
  id: string;
  itemId: string;
  itemName: string;
  unit: Unit;
  quantity: number;
  rate: Money;
  taxRatePercent: number;
  taxableAmount: Money;
  cgstAmount: Money;
  sgstAmount: Money;
  igstAmount: Money;
  totalAmount: Money;
  batchNumber?: string;
  expiryDate?: Date;
}

export class PurchaseItem {
  public readonly id: string;
  public readonly itemId: string;
  public readonly itemName: string;
  public readonly unit: Unit;
  public readonly quantity: number;
  public readonly rate: Money;
  public readonly taxRatePercent: number;
  public readonly taxableAmount: Money;
  public readonly cgstAmount: Money;
  public readonly sgstAmount: Money;
  public readonly igstAmount: Money;
  public readonly totalAmount: Money;
  public readonly batchNumber?: string;
  public readonly expiryDate?: Date;

  constructor(props: PurchaseItemProps) {
    this.id = props.id;
    this.itemId = props.itemId;
    this.itemName = props.itemName;
    this.unit = props.unit;
    this.quantity = props.quantity;
    this.rate = props.rate;
    this.taxRatePercent = props.taxRatePercent;
    this.taxableAmount = props.taxableAmount;
    this.cgstAmount = props.cgstAmount;
    this.sgstAmount = props.sgstAmount;
    this.igstAmount = props.igstAmount;
    this.totalAmount = props.totalAmount;
    this.batchNumber = props.batchNumber;
    this.expiryDate = props.expiryDate;
  }
}

export interface PurchaseOrderProps {
  id: string;
  purchaseNumber: string;
  supplierId: string;
  supplierName: string;
  supplierGstin: string;
  supplierInvoiceNumber: string;
  purchaseDate: Date;
  totalTaxable: Money;
  totalCgst: Money;
  totalSgst: Money;
  totalIgst: Money;
  grandTotal: Money;
  items: PurchaseItem[];
  notes?: string;
}

export class PurchaseOrder {
  public readonly id: string;
  public readonly purchaseNumber: string;
  public readonly supplierId: string;
  public readonly supplierName: string;
  public readonly supplierGstin: string;
  public readonly supplierInvoiceNumber: string;
  public readonly purchaseDate: Date;
  public readonly totalTaxable: Money;
  public readonly totalCgst: Money;
  public readonly totalSgst: Money;
  public readonly totalIgst: Money;
  public readonly grandTotal: Money;
  public readonly items: PurchaseItem[];
  public readonly notes?: string;

  constructor(props: PurchaseOrderProps) {
    this.id = props.id;
    this.purchaseNumber = props.purchaseNumber;
    this.supplierId = props.supplierId;
    this.supplierName = props.supplierName;
    this.supplierGstin = props.supplierGstin;
    this.supplierInvoiceNumber = props.supplierInvoiceNumber;
    this.purchaseDate = props.purchaseDate;
    this.totalTaxable = props.totalTaxable;
    this.totalCgst = props.totalCgst;
    this.totalSgst = props.totalSgst;
    this.totalIgst = props.totalIgst;
    this.grandTotal = props.grandTotal;
    this.items = [...props.items];
    this.notes = props.notes;
  }
}

export type UserRole = 'SALESMAN' | 'ADMIN' | 'PRODUCTION' | 'AUDITOR' | 'OWNER';

export interface UserProps {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  phone?: string;
}

export class User {
  public readonly id: string;
  public readonly username: string;
  public readonly name: string;
  public readonly role: UserRole;
  public readonly phone?: string;

  constructor(props: UserProps) {
    this.id = props.id;
    this.username = props.username;
    this.name = props.name;
    this.role = props.role;
    this.phone = props.phone;
  }
}

export interface AuditLogProps {
  id: string;
  timestamp: Date;
  userId: string;
  username: string;
  userRole: UserRole;
  action: string;
  entityName: string;
  entityId: string;
  beforeStateJson?: string;
  afterStateJson?: string;
  ipAddress?: string;
}

export class AuditLog {
  public readonly id: string;
  public readonly timestamp: Date;
  public readonly userId: string;
  public readonly username: string;
  public readonly userRole: UserRole;
  public readonly action: string;
  public readonly entityName: string;
  public readonly entityId: string;
  public readonly beforeStateJson?: string;
  public readonly afterStateJson?: string;
  public readonly ipAddress?: string;

  constructor(props: AuditLogProps) {
    this.id = props.id;
    this.timestamp = props.timestamp;
    this.userId = props.userId;
    this.username = props.username;
    this.userRole = props.userRole;
    this.action = props.action;
    this.entityName = props.entityName;
    this.entityId = props.entityId;
    this.beforeStateJson = props.beforeStateJson;
    this.afterStateJson = props.afterStateJson;
    this.ipAddress = props.ipAddress;
  }
}
