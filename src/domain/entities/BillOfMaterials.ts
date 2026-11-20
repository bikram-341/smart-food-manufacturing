import { Unit } from '../value-objects/Unit.js';

export interface BOMItem {
  itemId: string;
  itemName: string;
  standardQuantity: number;
  unit: Unit;
  itemCategory: 'RAW_MATERIAL' | 'PACKAGING';
}

export interface BillOfMaterialsProps {
  id: string;
  finishedGoodId: string;
  productName: string;
  batchYieldPackets: number; // e.g. 200 packets
  items: BOMItem[];
}

export class BillOfMaterials {
  public readonly id: string;
  public readonly finishedGoodId: string;
  public readonly productName: string;
  public readonly batchYieldPackets: number;
  public readonly items: BOMItem[];

  constructor(props: BillOfMaterialsProps) {
    if (props.batchYieldPackets <= 0) {
      throw new Error('Batch yield packets must be greater than zero');
    }
    this.id = props.id;
    this.finishedGoodId = props.finishedGoodId;
    this.productName = props.productName;
    this.batchYieldPackets = props.batchYieldPackets;
    this.items = [...props.items];
  }

  /**
   * Calculates the standard expected raw material and packaging requirement
   * for a given batch multiplier or target output quantity.
   */
  public calculateExpectedConsumption(targetPackets: number): Array<BOMItem & { calculatedQuantity: number }> {
    const batchRatio = targetPackets / this.batchYieldPackets;
    return this.items.map((item) => ({
      ...item,
      calculatedQuantity: Math.round(item.standardQuantity * batchRatio * 1000) / 1000,
    }));
  }

  /**
   * Calculates expected yield based on key ingredient issued (e.g. 40kg flour -> 200 packets).
   */
  public calculateExpectedYield(keyItemId: string, actualIssuedQty: number): number {
    const keyBOMItem = this.items.find((item) => item.itemId === keyItemId);
    if (!keyBOMItem) {
      throw new Error(`Key item ${keyItemId} not found in BOM`);
    }
    const ratio = actualIssuedQty / keyBOMItem.standardQuantity;
    return Math.round(this.batchYieldPackets * ratio);
  }
}
