import { IGstTaxStrategy } from './IGstTaxStrategy.js';
import { IntraStateTaxStrategy } from './IntraStateTaxStrategy.js';
import { InterStateTaxStrategy } from './InterStateTaxStrategy.js';
import { Money } from '../value-objects/Money.js';
import { TaxBreakdown } from '../value-objects/TaxBreakdown.js';

/**
 * Context class that encapsulates tax calculation logic adhering to Strategy Pattern.
 * Factory logic determines whether intra-state or inter-state tax rules apply based on GST state codes.
 */
export class GstTaxService {
  private intraStateStrategy: IGstTaxStrategy;
  private interStateStrategy: IGstTaxStrategy;

  constructor(
    intraStateStrategy?: IGstTaxStrategy,
    interStateStrategy?: IGstTaxStrategy
  ) {
    this.intraStateStrategy = intraStateStrategy ?? new IntraStateTaxStrategy();
    this.interStateStrategy = interStateStrategy ?? new InterStateTaxStrategy();
  }

  /**
   * Calculates GST breakdown based on supplier state code and place of supply state code.
   * Standard Indian State Code for Tamil Nadu is '33', Karnataka is '29'.
   */
  public calculateTax(
    taxableAmount: Money,
    taxRatePercent: number,
    supplierStateCode: string,
    placeOfSupplyStateCode: string
  ): TaxBreakdown {
    const isInterState = supplierStateCode.trim() !== placeOfSupplyStateCode.trim();
    const strategy = isInterState ? this.interStateStrategy : this.intraStateStrategy;
    return strategy.calculate(taxableAmount, taxRatePercent);
  }
}
