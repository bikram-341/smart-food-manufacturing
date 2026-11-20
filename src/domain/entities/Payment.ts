import { Money } from '../value-objects/Money.js';

export interface CreditNoteProps {
  id: string;
  creditNoteNumber: string;
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  amount: Money;
  reason: string;
  issuedAt: Date;
}

export class CreditNote {
  public readonly id: string;
  public readonly creditNoteNumber: string;
  public readonly invoiceId: string;
  public readonly invoiceNumber: string;
  public readonly customerId: string;
  public readonly amount: Money;
  public readonly reason: string;
  public readonly issuedAt: Date;

  constructor(props: CreditNoteProps) {
    this.id = props.id;
    this.creditNoteNumber = props.creditNoteNumber;
    this.invoiceId = props.invoiceId;
    this.invoiceNumber = props.invoiceNumber;
    this.customerId = props.customerId;
    this.amount = props.amount;
    this.reason = props.reason;
    this.issuedAt = props.issuedAt;
  }
}

export interface DispatchItem {
  itemId: string;
  itemName: string;
  quantity: number;
  batchNumber?: string;
}

export interface DispatchProps {
  id: string;
  dispatchNumber: string;
  orderId: string;
  invoiceId: string;
  customerId: string;
  dispatchDate: Date;
  items: DispatchItem[];
  transportMode?: string;
  vehicleNumber?: string;
}

export class Dispatch {
  public readonly id: string;
  public readonly dispatchNumber: string;
  public readonly orderId: string;
  public readonly invoiceId: string;
  public readonly customerId: string;
  public readonly dispatchDate: Date;
  public readonly items: DispatchItem[];
  public readonly transportMode?: string;
  public readonly vehicleNumber?: string;

  constructor(props: DispatchProps) {
    this.id = props.id;
    this.dispatchNumber = props.dispatchNumber;
    this.orderId = props.orderId;
    this.invoiceId = props.invoiceId;
    this.customerId = props.customerId;
    this.dispatchDate = props.dispatchDate;
    this.items = [...props.items];
    this.transportMode = props.transportMode;
    this.vehicleNumber = props.vehicleNumber;
  }
}

export interface PaymentProps {
  id: string;
  paymentNumber: string;
  customerId: string;
  invoiceId?: string;
  amount: Money;
  paymentDate: Date;
  paymentMode: 'CASH' | 'UPI' | 'NEFT' | 'CHEQUE';
  referenceNumber?: string;
  notes?: string;
}

export class Payment {
  public readonly id: string;
  public readonly paymentNumber: string;
  public readonly customerId: string;
  public readonly invoiceId?: string;
  public readonly amount: Money;
  public readonly paymentDate: Date;
  public readonly paymentMode: 'CASH' | 'UPI' | 'NEFT' | 'CHEQUE';
  public readonly referenceNumber?: string;
  public readonly notes?: string;

  constructor(props: PaymentProps) {
    if (props.amount.isZero() || props.amount.isNegative()) {
      throw new Error('Payment amount must be positive');
    }
    this.id = props.id;
    this.paymentNumber = props.paymentNumber;
    this.customerId = props.customerId;
    this.invoiceId = props.invoiceId;
    this.amount = props.amount;
    this.paymentDate = props.paymentDate;
    this.paymentMode = props.paymentMode;
    this.referenceNumber = props.referenceNumber;
    this.notes = props.notes;
  }
}
