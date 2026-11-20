import { Unit } from '../value-objects/Unit.js';
import { Money } from '../value-objects/Money.js';

export type ItemCategory = 'RAW_MATERIAL' | 'PACKAGING' | 'FINISHED_GOOD' | 'WORK_IN_PROGRESS';

export interface ItemProps {
  id: string;
  sku: string;
  name: string;
  category: ItemCategory;
  unit: Unit;
  hsnCode: string;
  taxRatePercent: number;
  standardRate: Money;
  reorderLevel?: number;
  shelfLifeDays?: number;
  packSizeGram?: number;
}

export class Item {
  public readonly id: string;
  public readonly sku: string;
  public readonly name: string;
  public readonly category: ItemCategory;
  public readonly unit: Unit;
  public readonly hsnCode: string;
  public readonly taxRatePercent: number;
  public readonly standardRate: Money;
  public readonly reorderLevel: number;
  public readonly shelfLifeDays?: number;
  public readonly packSizeGram?: number;

  constructor(props: ItemProps) {
    this.id = props.id;
    this.sku = props.sku;
    this.name = props.name;
    this.category = props.category;
    this.unit = props.unit;
    this.hsnCode = props.hsnCode;
    this.taxRatePercent = props.taxRatePercent;
    this.standardRate = props.standardRate;
    this.reorderLevel = props.reorderLevel ?? 0;
    this.shelfLifeDays = props.shelfLifeDays;
    this.packSizeGram = props.packSizeGram;
  }
}
