import { Money } from '../value-objects/Money.js';

export type CustomerType = 'RETAILER' | 'DISTRIBUTOR';

export interface CustomerProps {
  id: string;
  name: string;
  type: CustomerType;
  gstin: string;
  stateCode: string;
  stateName: string;
  phone: string;
  address: string;
  creditLimit: Money;
  assignedSalesmanId?: string;
}

export class Customer {
  public readonly id: string;
  public readonly name: string;
  public readonly type: CustomerType;
  public readonly gstin: string;
  public readonly stateCode: string;
  public readonly stateName: string;
  public readonly phone: string;
  public readonly address: string;
  public readonly creditLimit: Money;
  public readonly assignedSalesmanId?: string;

  constructor(props: CustomerProps) {
    this.id = props.id;
    this.name = props.name;
    this.type = props.type;
    this.gstin = props.gstin;
    this.stateCode = props.stateCode;
    this.stateName = props.stateName;
    this.phone = props.phone;
    this.address = props.address;
    this.creditLimit = props.creditLimit;
    this.assignedSalesmanId = props.assignedSalesmanId;
  }
}

export interface SupplierProps {
  id: string;
  name: string;
  gstin: string;
  stateCode: string;
  stateName: string;
  phone: string;
  address: string;
}

export class Supplier {
  public readonly id: string;
  public readonly name: string;
  public readonly gstin: string;
  public readonly stateCode: string;
  public readonly stateName: string;
  public readonly phone: string;
  public readonly address: string;

  constructor(props: SupplierProps) {
    this.id = props.id;
    this.name = props.name;
    this.gstin = props.gstin;
    this.stateCode = props.stateCode;
    this.stateName = props.stateName;
    this.phone = props.phone;
    this.address = props.address;
  }
}
