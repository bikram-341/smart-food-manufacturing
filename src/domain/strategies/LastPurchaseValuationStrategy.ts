import {
  ICostValuationStrategy,
  StockLot,
  ValuationResult,
  ConsumedLotDetail,
} from './ICostValuationStrategy.js';
import { Money } from '../value-objects/Money.js';

/**
 * Last Purchase Price Valuation Strategy (Replacement Cost Method):
 * Valuates material consumption at the most recent purchase / acquisition rate.
 */
export class LastPurchaseValuationStrategy implements ICostValuationStrategy {
  public readonly name = 'LAST_PURCHASE_PRICE';

  public calculateCost(
    requestedQuantity: number,
    availableLots: StockLot[]
  ): ValuationResult {
    if (requestedQuantity <= 0) {
      return {
        totalCost: Money.zero(),
        effectiveUnitCost: Money.zero(),
        consumedLots: [],
        remainingLots: availableLots.map((l) => ({ ...l })),
      };
    }

    const validLots = availableLots.filter((lot) => lot.quantityRemaining > 0);
    const totalAvailableQty = validLots.reduce((acc, lot) => acc + lot.quantityRemaining, 0);

    if (totalAvailableQty < requestedQuantity - 0.0001) {
      throw new Error(
        `Insufficient stock for Last Purchase Price: requested ${requestedQuantity}, available ${totalAvailableQty}`
      );
    }

    // Most recent lot
    const sortedLotsDesc = [...validLots].sort((a, b) => b.date.getTime() - a.date.getTime());
    const latestRate = sortedLotsDesc[0].unitRate;

    const totalCost = latestRate.multiply(requestedQuantity);
    const effectiveUnitCost = latestRate;

    // Deduct quantity chronologically (FIFO order of physical stock)
    let qtyNeeded = requestedQuantity;
    const consumedLots: ConsumedLotDetail[] = [];
    const remainingLots: StockLot[] = [];
    const sortedLotsAsc = [...validLots].sort((a, b) => a.date.getTime() - b.date.getTime());

    for (const lot of sortedLotsAsc) {
      if (qtyNeeded <= 0) {
        remainingLots.push({ ...lot });
        continue;
      }
      const take = Math.min(qtyNeeded, lot.quantityRemaining);
      consumedLots.push({
        lotId: lot.id,
        quantityConsumed: take,
        unitRate: latestRate,
        totalCost: latestRate.multiply(take),
      });
      qtyNeeded -= take;
      const rem = lot.quantityRemaining - take;
      if (rem > 0) {
        remainingLots.push({ ...lot, quantityRemaining: rem });
      }
    }

    return {
      totalCost,
      effectiveUnitCost,
      consumedLots,
      remainingLots,
    };
  }
}
