import { Money } from '../value-objects/Money.js';
import { TaxBreakdown } from '../value-objects/TaxBreakdown.js';

/**
 * Strategy interface for GST tax calculation.
 * Open/Closed Principle: Easily extendable for union territories, export exemptions, etc.
 */
export interface IGstTaxStrategy {
  calculate(taxableAmount: Money, taxRatePercent: number): TaxBreakdown;
}
