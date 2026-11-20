import { Money } from './Money.js';

export interface TaxBreakdown {
  taxable: Money;
  cgst: Money;
  sgst: Money;
  igst: Money;
  totalTax: Money;
  grandTotal: Money;
  isInterState: boolean;
  taxRatePercent: number;
}
