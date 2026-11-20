import { Money } from '../value-objects/Money.js';
import { Unit } from '../value-objects/Unit.js';

export interface ConsumedIngredient {
  itemId: string;
  itemName: string;
  unit: Unit;
  plannedQuantity: number;
  actualQuantity: number;
  varianceQuantity: number;
  variancePercent: number; // ((actual - planned) / planned) * 100
  isVarianceAlert: boolean; // true if Math.abs(variancePercent) > tolerancePercent
  unitCost: Money;
  totalCost: Money;
}

export interface DamagedMaterial {
  itemId: string;
  itemName: string;
  quantity: number;
  unit: Unit;
  reason: string;
  unitCost: Money;
  totalCost: Money;
}

export interface ProductionRunProps {
  id: string;
  runNumber: string;
  productId: string;
  productName: string;
  runDate: Date;
  plannedOutputPackets: number;
  actualOutputPackets: number;
  yieldVariancePercent: number; // ((actual - planned) / planned) * 100
  isYieldAlert: boolean;
  labourCost: Money;
  overheadCost: Money;
  materialsCost: Money;
  totalManufacturingCost: Money;
  costPerPacket: Money;
  ingredients: ConsumedIngredient[];
  damagedMaterials: DamagedMaterial[];
  status: 'COMPLETED' | 'CANCELLED';
  notes?: string;
}

export class ProductionRun {
  public readonly id: string;
  public readonly runNumber: string;
  public readonly productId: string;
  public readonly productName: string;
  public readonly runDate: Date;
  public readonly plannedOutputPackets: number;
  public readonly actualOutputPackets: number;
  public readonly yieldVariancePercent: number;
  public readonly isYieldAlert: boolean;
  public readonly labourCost: Money;
  public readonly overheadCost: Money;
  public readonly materialsCost: Money;
  public readonly totalManufacturingCost: Money;
  public readonly costPerPacket: Money;
  public readonly ingredients: ConsumedIngredient[];
  public readonly damagedMaterials: DamagedMaterial[];
  public status: 'COMPLETED' | 'CANCELLED';
  public readonly notes?: string;

  constructor(props: ProductionRunProps) {
    this.id = props.id;
    this.runNumber = props.runNumber;
    this.productId = props.productId;
    this.productName = props.productName;
    this.runDate = props.runDate;
    this.plannedOutputPackets = props.plannedOutputPackets;
    this.actualOutputPackets = props.actualOutputPackets;
    this.yieldVariancePercent = props.yieldVariancePercent;
    this.isYieldAlert = props.isYieldAlert;
    this.labourCost = props.labourCost;
    this.overheadCost = props.overheadCost;
    this.materialsCost = props.materialsCost;
    this.totalManufacturingCost = props.totalManufacturingCost;
    this.costPerPacket = props.costPerPacket;
    this.ingredients = [...props.ingredients];
    this.damagedMaterials = [...props.damagedMaterials];
    this.status = props.status;
    this.notes = props.notes;
  }
}
