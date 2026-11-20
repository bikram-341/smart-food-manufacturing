import { IGstTaxStrategy } from './IGstTaxStrategy.js';
import { Money } from '../value-objects/Money.js';
import { TaxBreakdown } from '../value-objects/TaxBreakdown.js';

/**
 * Intra-State Tax Strategy: Applies when supplier and customer are within the same state.
 * Tax is split equally into Central GST (CGST) and State GST (SGST).
 * Example: 5% total = 2.5% CGST + 2.5% SGST.
 */
export class IntraStateTaxStrategy implements IGstTaxStrategy {
  calculate(taxableAmount: Money, taxRatePercent: number): TaxBreakdown {
    const halfRate = taxRatePercent / 2;
    const cgst = taxableAmount.percentage(halfRate);
    const sgst = taxableAmount.percentage(halfRate);
    const igst = Money.zero();
    const totalTax = cgst.add(sgst);
    const grandTotal = taxableAmount.add(totalTax);

    return {
      taxable: taxableAmount,
      cgst,
      sgst,
      igst,
      totalTax,
      grandTotal,
      isInterState: false,
      taxRatePercent,
    };
  }
}
