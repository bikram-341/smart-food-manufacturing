import {
  ICostValuationStrategy,
  StockLot,
  ValuationResult,
  ConsumedLotDetail,
} from './ICostValuationStrategy.js';
import { Money } from '../value-objects/Money.js';

/**
 * Weighted Average Cost Valuation Strategy:
 * Computes moving weighted average cost per unit across all available inventory lots.
 * Average Rate = (Total Valuation of available lots) / (Total quantity of available lots)
 */
export class WeightedAverageStrategy implements ICostValuationStrategy {
  public readonly name = 'WEIGHTED_AVERAGE';

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
        `Insufficient stock for Weighted Average: requested ${requestedQuantity}, available ${totalAvailableQty}`
      );
    }

    const totalValuationPaise = validLots.reduce(
      (acc, lot) => acc + Math.round(lot.quantityRemaining * lot.unitRate.getPaise()),
      0
    );

    const averageRatePaise = Math.round(totalValuationPaise / totalAvailableQty);
    const effectiveUnitCost = Money.fromPaise(averageRatePaise);
    const totalCostPaise = Math.round(requestedQuantity * averageRatePaise);
    const totalCost = Money.fromPaise(totalCostPaise);

    // Proportionally deduct from lots or chronological deduction
    let qtyNeeded = requestedQuantity;
    const consumedLots: ConsumedLotDetail[] = [];
    const remainingLots: StockLot[] = [];

    for (const lot of validLots) {
      if (qtyNeeded <= 0) {
        remainingLots.push({ ...lot });
        continue;
      }
      const take = Math.min(qtyNeeded, lot.quantityRemaining);
      consumedLots.push({
        lotId: lot.id,
        quantityConsumed: take,
        unitRate: effectiveUnitCost,
        totalCost: Money.fromPaise(Math.round(take * averageRatePaise)),
      });
      qtyNeeded -= take;
      const rem = lot.quantityRemaining - take;
      if (rem > 0) {
        remainingLots.push({
          ...lot,
          quantityRemaining: rem,
          unitRate: effectiveUnitCost,
        });
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
