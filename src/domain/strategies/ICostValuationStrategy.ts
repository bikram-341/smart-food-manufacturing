import { Money } from '../value-objects/Money.js';

export interface StockLot {
  id: string;
  itemId: string;
  date: Date;
  quantityRemaining: number;
  unitRate: Money;
  batchNumber?: string;
}

export interface ConsumedLotDetail {
  lotId: string;
  quantityConsumed: number;
  unitRate: Money;
  totalCost: Money;
}

export interface ValuationResult {
  totalCost: Money;
  effectiveUnitCost: Money;
  consumedLots: ConsumedLotDetail[];
  remainingLots: StockLot[];
}

/**
 * Strategy interface for Inventory Valuation (FIFO vs Weighted Average vs Last Purchase).
 */
export interface ICostValuationStrategy {
  readonly name: string;
  calculateCost(
    requestedQuantity: number,
    availableLots: StockLot[]
  ): ValuationResult;
}
