import { describe, it, expect } from 'vitest';
import { GstTaxService } from '../../src/domain/strategies/GstTaxService.js';
import { Money } from '../../src/domain/value-objects/Money.js';

describe('GST Tax Strategy & Calculation', () => {
  const taxService = new GstTaxService();

  it('should compute intra-state tax (CGST + SGST) for Tamil Nadu to Tamil Nadu', () => {
    const taxable = Money.fromRupees(7500);
    // Factory TN: 33, Customer TN: 33
    const breakdown = taxService.calculateTax(taxable, 5.0, '33', '33');

    expect(breakdown.isInterState).toBe(false);
    expect(breakdown.cgst.getRupees()).toBe(187.5);
    expect(breakdown.sgst.getRupees()).toBe(187.5);
    expect(breakdown.igst.getRupees()).toBe(0);
    expect(breakdown.grandTotal.getRupees()).toBe(7875);
  });

  it('should compute inter-state tax (IGST) for Tamil Nadu to Karnataka', () => {
    // 120 packets @ ₹50 = ₹6,000
    const taxable = Money.fromRupees(6000);
    // Factory TN: 33, Customer KA: 29
    const breakdown = taxService.calculateTax(taxable, 5.0, '33', '29');

    expect(breakdown.isInterState).toBe(true);
    expect(breakdown.cgst.getRupees()).toBe(0);
    expect(breakdown.sgst.getRupees()).toBe(0);
    expect(breakdown.igst.getRupees()).toBe(300); // 5% of 6000 = 300
    expect(breakdown.grandTotal.getRupees()).toBe(6300);
  });
});
