import { Money } from '../value-objects/Money.js';

export type OrderStatus =
  | 'SUBMITTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'INVOICED'
  | 'DISPATCHED'
  | 'CANCELLED';

export interface OrderItemProps {
  id: string;
  itemId: string;
  itemName: string;
  quantity: number;
  unitPrice: Money;
  taxRatePercent: number;
  notes?: string;
}

export class OrderItem {
  public readonly id: string;
  public readonly itemId: string;
  public readonly itemName: string;
  public readonly quantity: number;
  public readonly unitPrice: Money;
  public readonly taxRatePercent: number;
  public readonly notes?: string;

  constructor(props: OrderItemProps) {
    if (props.quantity <= 0) {
      throw new Error('Order quantity must be positive');
    }
    this.id = props.id;
    this.itemId = props.itemId;
    this.itemName = props.itemName;
    this.quantity = props.quantity;
    this.unitPrice = props.unitPrice;
    this.taxRatePercent = props.taxRatePercent;
    this.notes = props.notes;
  }

  public getTaxableAmount(): Money {
    return this.unitPrice.multiply(this.quantity);
  }
}

export interface SalesOrderProps {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerStateCode: string;
  salesmanId: string;
  salesmanName: string;
  orderDate: Date;
  status: OrderStatus;
  items: OrderItem[];
  offlineId?: string;
  rejectionReason?: string;
}

export class SalesOrder {
  public readonly id: string;
  public readonly orderNumber: string;
  public readonly customerId: string;
  public readonly customerName: string;
  public readonly customerStateCode: string;
  public readonly salesmanId: string;
  public readonly salesmanName: string;
  public readonly orderDate: Date;
  public status: OrderStatus;
  public items: OrderItem[];
  public readonly offlineId?: string;
  public rejectionReason?: string;

  constructor(props: SalesOrderProps) {
    this.id = props.id;
    this.orderNumber = props.orderNumber;
    this.customerId = props.customerId;
    this.customerName = props.customerName;
    this.customerStateCode = props.customerStateCode;
    this.salesmanId = props.salesmanId;
    this.salesmanName = props.salesmanName;
    this.orderDate = props.orderDate;
    this.status = props.status;
    this.items = [...props.items];
    this.offlineId = props.offlineId;
    this.rejectionReason = props.rejectionReason;
  }

  public getTotalTaxableAmount(): Money {
    return this.items.reduce((total, item) => total.add(item.getTaxableAmount()), Money.zero());
  }

  public approve(): void {
    if (this.status !== 'SUBMITTED') {
      throw new Error(`Cannot approve order in status ${this.status}`);
    }
    this.status = 'APPROVED';
  }

  public reject(reason: string): void {
    if (this.status !== 'SUBMITTED') {
      throw new Error(`Cannot reject order in status ${this.status}`);
    }
    this.status = 'REJECTED';
    this.rejectionReason = reason;
  }

  public markInvoiced(): void {
    if (this.status !== 'APPROVED') {
      throw new Error(`Cannot invoice order in status ${this.status}`);
    }
    this.status = 'INVOICED';
  }

  public markDispatched(): void {
    if (this.status !== 'INVOICED' && this.status !== 'APPROVED') {
      throw new Error(`Cannot dispatch order in status ${this.status}`);
    }
    this.status = 'DISPATCHED';
  }

  public updateItemQuantity(itemId: string, newQuantity: number): void {
    if (this.status !== 'SUBMITTED') {
      throw new Error('Can only modify items on SUBMITTED orders before approval');
    }
    const idx = this.items.findIndex((item) => item.itemId === itemId);
    if (idx === -1) {
      throw new Error(`Item ${itemId} not found in order`);
    }
    const item = this.items[idx];
    this.items[idx] = new OrderItem({
      id: item.id,
      itemId: item.itemId,
      itemName: item.itemName,
      quantity: newQuantity,
      unitPrice: item.unitPrice,
      taxRatePercent: item.taxRatePercent,
      notes: item.notes,
    });
  }
}
