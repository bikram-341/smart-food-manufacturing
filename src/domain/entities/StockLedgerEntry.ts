import { Money } from '../value-objects/Money.js';
import { Unit } from '../value-objects/Unit.js';

export type StockMovementType =
  | 'OPENING_STOCK'
  | 'PURCHASE_RECEIPT'
  | 'PRODUCTION_ISSUE'
  | 'PRODUCTION_RECEIPT'
  | 'SALES_DISPATCH'
  | 'DAMAGE_SCRAP'
  | 'STOCK_ADJUSTMENT';

export type ReferenceDocumentType =
  | 'OPENING_BALANCE'
  | 'PURCHASE_INVOICE'
  | 'PRODUCTION_RUN'
  | 'TAX_INVOICE'
  | 'STOCK_COUNT'
  | 'DAMAGE_REPORT';

export interface StockLedgerEntryProps {
  id: string;
  timestamp: Date;
  itemId: string;
  itemName: string;
  itemCategory: string;
  unit: Unit;
  movementType: StockMovementType;
  referenceType: ReferenceDocumentType;
  referenceId: string;
  referenceNumber: string;
  quantityChange: number; // positive for receipts, negative for issues
  balanceAfter: number;
  unitRate: Money;
  totalValuation: Money;
  batchNumber?: string;
  expiryDate?: Date;
  notes?: string;
  createdBy: string;
}

export class StockLedgerEntry {
  public readonly id: string;
  public readonly timestamp: Date;
  public readonly itemId: string;
  public readonly itemName: string;
  public readonly itemCategory: string;
  public readonly unit: Unit;
  public readonly movementType: StockMovementType;
  public readonly referenceType: ReferenceDocumentType;
  public readonly referenceId: string;
  public readonly referenceNumber: string;
  public readonly quantityChange: number;
  public readonly balanceAfter: number;
  public readonly unitRate: Money;
  public readonly totalValuation: Money;
  public readonly batchNumber?: string;
  public readonly expiryDate?: Date;
  public readonly notes?: string;
  public readonly createdBy: string;

  constructor(props: StockLedgerEntryProps) {
    this.id = props.id;
    this.timestamp = props.timestamp;
    this.itemId = props.itemId;
    this.itemName = props.itemName;
    this.itemCategory = props.itemCategory;
    this.unit = props.unit;
    this.movementType = props.movementType;
    this.referenceType = props.referenceType;
    this.referenceId = props.referenceId;
    this.referenceNumber = props.referenceNumber;
    this.quantityChange = props.quantityChange;
    this.balanceAfter = props.balanceAfter;
    this.unitRate = props.unitRate;
    this.totalValuation = props.totalValuation;
    this.batchNumber = props.batchNumber;
    this.expiryDate = props.expiryDate;
    this.notes = props.notes;
    this.createdBy = props.createdBy;
  }
}
