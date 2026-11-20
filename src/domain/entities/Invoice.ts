import { Money } from '../value-objects/Money.js';

export interface InvoiceItemProps {
  id: string;
  itemId: string;
  itemName: string;
  hsnCode: string;
  quantity: number;
  unitPrice: Money;
  taxableAmount: Money;
  taxRatePercent: number;
  cgstAmount: Money;
  sgstAmount: Money;
  igstAmount: Money;
  totalAmount: Money;
}

export class InvoiceItem {
  public readonly id: string;
  public readonly itemId: string;
  public readonly itemName: string;
  public readonly hsnCode: string;
  public readonly quantity: number;
  public readonly unitPrice: Money;
  public readonly taxableAmount: Money;
  public readonly taxRatePercent: number;
  public readonly cgstAmount: Money;
  public readonly sgstAmount: Money;
  public readonly igstAmount: Money;
  public readonly totalAmount: Money;

  constructor(props: InvoiceItemProps) {
    this.id = props.id;
    this.itemId = props.itemId;
    this.itemName = props.itemName;
    this.hsnCode = props.hsnCode;
    this.quantity = props.quantity;
    this.unitPrice = props.unitPrice;
    this.taxableAmount = props.taxableAmount;
    this.taxRatePercent = props.taxRatePercent;
    this.cgstAmount = props.cgstAmount;
    this.sgstAmount = props.sgstAmount;
    this.igstAmount = props.igstAmount;
    this.totalAmount = props.totalAmount;
  }
}

export type InvoiceStatus = 'ISSUED' | 'CANCELLED';

export interface InvoiceProps {
  id: string;
  invoiceNumber: string;
  financialYear: string;
  orderId: string;
  customerId: string;
  customerName: string;
  customerGstin: string;
  customerAddress: string;
  customerStateCode: string;
  customerStateName: string;
  supplierGstin: string;
  supplierStateCode: string;
  supplierStateName: string;
  invoiceDate: Date;
  isInterState: boolean;
  totalTaxable: Money;
  totalCgst: Money;
  totalSgst: Money;
  totalIgst: Money;
  grandTotal: Money;
  status: InvoiceStatus;
  items: InvoiceItem[];
  creditNoteId?: string;
  cancellationReason?: string;
}

export class Invoice {
  public readonly id: string;
  public readonly invoiceNumber: string;
  public readonly financialYear: string;
  public readonly orderId: string;
  public readonly customerId: string;
  public readonly customerName: string;
  public readonly customerGstin: string;
  public readonly customerAddress: string;
  public readonly customerStateCode: string;
  public readonly customerStateName: string;
  public readonly supplierGstin: string;
  public readonly supplierStateCode: string;
  public readonly supplierStateName: string;
  public readonly invoiceDate: Date;
  public readonly isInterState: boolean;
  public readonly totalTaxable: Money;
  public readonly totalCgst: Money;
  public readonly totalSgst: Money;
  public readonly totalIgst: Money;
  public readonly grandTotal: Money;
  public status: InvoiceStatus;
  public readonly items: InvoiceItem[];
  public creditNoteId?: string;
  public cancellationReason?: string;

  constructor(props: InvoiceProps) {
    this.id = props.id;
    this.invoiceNumber = props.invoiceNumber;
    this.financialYear = props.financialYear;
    this.orderId = props.orderId;
    this.customerId = props.customerId;
    this.customerName = props.customerName;
    this.customerGstin = props.customerGstin;
    this.customerAddress = props.customerAddress;
    this.customerStateCode = props.customerStateCode;
    this.customerStateName = props.customerStateName;
    this.supplierGstin = props.supplierGstin;
    this.supplierStateCode = props.supplierStateCode;
    this.supplierStateName = props.supplierStateName;
    this.invoiceDate = props.invoiceDate;
    this.isInterState = props.isInterState;
    this.totalTaxable = props.totalTaxable;
    this.totalCgst = props.totalCgst;
    this.totalSgst = props.totalSgst;
    this.totalIgst = props.totalIgst;
    this.grandTotal = props.grandTotal;
    this.status = props.status;
    this.items = [...props.items];
    this.creditNoteId = props.creditNoteId;
    this.cancellationReason = props.cancellationReason;
  }

  /**
   * Cancels invoice via credit note, maintaining strict financial audit trail.
   */
  public cancelWithCreditNote(creditNoteId: string, reason: string): void {
    if (this.status === 'CANCELLED') {
      throw new Error(`Invoice ${this.invoiceNumber} is already cancelled`);
    }
    this.status = 'CANCELLED';
    this.creditNoteId = creditNoteId;
    this.cancellationReason = reason;
  }
}
