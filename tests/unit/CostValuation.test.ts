import { describe, it, expect } from 'vitest';
import { FIFOValuationStrategy } from '../../src/domain/strategies/FIFOValuationStrategy.js';
import { WeightedAverageStrategy } from '../../src/domain/strategies/WeightedAverageStrategy.js';
import { StockLot } from '../../src/domain/strategies/ICostValuationStrategy.js';
import { Money } from '../../src/domain/value-objects/Money.js';

describe('Inventory Cost Valuation Strategies', () => {
  const lots: StockLot[] = [
    {
      id: 'lot_1',
      itemId: 'flour',
      date: new Date('2026-11-01'),
      quantityRemaining: 100,
      unitRate: Money.fromRupees(42),
    },
    {
      id: 'lot_2',
      itemId: 'flour',
      date: new Date('2026-11-02'),
      quantityRemaining: 60,
      unitRate: Money.fromRupees(45),
    },
  ];

  it('should valuate stock consumption using FIFO', () => {
    const fifo = new FIFOValuationStrategy();
    // Issue 40 kg flour
    const result = fifo.calculateCost(40, lots);

    // Should consume entirely from lot_1 (40 kg @ ₹42 = ₹1680)
    expect(result.totalCost.getRupees()).toBe(1680);
    expect(result.effectiveUnitCost.getRupees()).toBe(42);
    expect(result.consumedLots.length).toBe(1);
    expect(result.consumedLots[0].quantityConsumed).toBe(40);
    expect(result.remainingLots[0].quantityRemaining).toBe(60);
  });

  it('should valuate stock consumption using Weighted Average', () => {
    const weightedAvg = new WeightedAverageStrategy();
    // Total valuation = (100 * 42) + (60 * 45) = 4200 + 2700 = 6900
    // Total qty = 160 kg
    // Weighted avg rate = 6900 / 160 = 43.125 -> 43.13 (4313 paise)
    const result = weightedAvg.calculateCost(40, lots);

    expect(result.effectiveUnitCost.getRupees()).toBeCloseTo(43.13, 1);
    expect(result.totalCost.getRupees()).toBeCloseTo(1725, 0);
  });
});
