import {
  ICostValuationStrategy,
  StockLot,
  ValuationResult,
  ConsumedLotDetail,
} from './ICostValuationStrategy.js';
import { Money } from '../value-objects/Money.js';

/**
 * First-In, First-Out (FIFO) Valuation Strategy:
 * Consumes earliest acquired inventory lots first.
 * Essential for perishable goods and accurate cost tracking in food manufacturing.
 */
export class FIFOValuationStrategy implements ICostValuationStrategy {
  public readonly name = 'FIFO';

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

    // Sort lots chronologically (oldest first)
    const sortedLots: StockLot[] = [...availableLots]
      .filter((lot) => lot.quantityRemaining > 0)
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    let qtyNeeded = requestedQuantity;
    let totalCostPaise = 0;
    const consumedLots: ConsumedLotDetail[] = [];
    const remainingLots: StockLot[] = [];

    for (const lot of sortedLots) {
      if (qtyNeeded <= 0) {
        remainingLots.push({ ...lot });
        continue;
      }

      const take = Math.min(qtyNeeded, lot.quantityRemaining);
      const lotCostPaise = Math.round(take * lot.unitRate.getPaise());

      consumedLots.push({
        lotId: lot.id,
        quantityConsumed: take,
        unitRate: lot.unitRate,
        totalCost: Money.fromPaise(lotCostPaise),
      });

      totalCostPaise += lotCostPaise;
      qtyNeeded -= take;

      const remainingInLot = lot.quantityRemaining - take;
      if (remainingInLot > 0) {
        remainingLots.push({
          ...lot,
          quantityRemaining: Math.round(remainingInLot * 10000) / 10000,
        });
      }
    }

    if (qtyNeeded > 0.0001) {
      throw new Error(
        `Insufficient stock lots for FIFO valuation: requested ${requestedQuantity}, short by ${qtyNeeded}`
      );
    }

    const totalCost = Money.fromPaise(totalCostPaise);
    const effectiveUnitCost = Money.fromPaise(Math.round(totalCostPaise / requestedQuantity));

    return {
      totalCost,
      effectiveUnitCost,
      consumedLots,
      remainingLots,
    };
  }
}
