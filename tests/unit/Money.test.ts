import { describe, it, expect } from 'vitest';
import { Money } from '../../src/domain/value-objects/Money.js';

describe('Money Value Object', () => {
  it('should store money in integer paise and avoid float drift', () => {
    // 0.1 + 0.2 in standard JS float is 0.30000000000000004
    const m1 = Money.fromRupees(0.1);
    const m2 = Money.fromRupees(0.2);
    const sum = m1.add(m2);

    expect(sum.getPaise()).toBe(30);
    expect(sum.getRupees()).toBe(0.3);
  });

  it('should calculate percentages accurately using paise', () => {
    // Retailer A taxable: ₹7,500.00
    // CGST 2.5% = ₹187.50
    // SGST 2.5% = ₹187.50
    const taxable = Money.fromRupees(7500);
    const cgst = taxable.percentage(2.5);
    const sgst = taxable.percentage(2.5);

    expect(cgst.getPaise()).toBe(18750);
    expect(cgst.getRupees()).toBe(187.5);
    expect(sgst.getPaise()).toBe(18750);
    expect(sgst.getRupees()).toBe(187.5);

    const total = taxable.add(cgst).add(sgst);
    expect(total.getPaise()).toBe(787500);
    expect(total.getRupees()).toBe(7875);
  });

  it('should support division for cost per packet without losing precision', () => {
    // Total manufacturing cost ₹5,810.00 divided by 188 packets
    const totalCost = Money.fromRupees(5810);
    const costPerPacket = totalCost.divide(188);

    // 5810 / 188 = 30.904255... -> rounded to 30.90 (3090 paise)
    expect(costPerPacket.getPaise()).toBe(3090);
    expect(costPerPacket.getRupees()).toBe(30.9);
  });
});
