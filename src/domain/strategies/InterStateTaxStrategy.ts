import { IGstTaxStrategy } from './IGstTaxStrategy.js';
import { Money } from '../value-objects/Money.js';
import { TaxBreakdown } from '../value-objects/TaxBreakdown.js';

/**
 * Inter-State Tax Strategy: Applies when supplier and customer are in different states.
 * Entire tax is levied as Integrated GST (IGST).
 * Example: 5% total = 5% IGST, CGST = 0, SGST = 0.
 */
export class InterStateTaxStrategy implements IGstTaxStrategy {
  calculate(taxableAmount: Money, taxRatePercent: number): TaxBreakdown {
    const igst = taxableAmount.percentage(taxRatePercent);
    const cgst = Money.zero();
    const sgst = Money.zero();
    const totalTax = igst;
    const grandTotal = taxableAmount.add(totalTax);

    return {
      taxable: taxableAmount,
      cgst,
      sgst,
      igst,
      totalTax,
      grandTotal,
      isInterState: true,
      taxRatePercent,
    };
  }
}
