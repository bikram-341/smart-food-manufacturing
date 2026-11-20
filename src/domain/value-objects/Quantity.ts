import { Unit, UnitConverter } from './Unit.js';

/**
 * Value Object representing a physical quantity with a specific unit of measurement.
 */
export class Quantity {
  private readonly amount: number;
  private readonly unit: Unit;

  constructor(amount: number, unit: Unit) {
    if (amount < 0) {
      throw new Error(`Quantity amount cannot be negative: ${amount}`);
    }
    // Round to 4 decimal places to prevent micro floating-point noise
    this.amount = Math.round(amount * 10000) / 10000;
    this.unit = unit;
  }

  public getAmount(): number {
    return this.amount;
  }

  public getUnit(): Unit {
    return this.unit;
  }

  public convertTo(targetUnit: Unit, packetsPerCarton: number = 20): Quantity {
    const convertedAmount = UnitConverter.convert(this.amount, this.unit, targetUnit, packetsPerCarton);
    return new Quantity(convertedAmount, targetUnit);
  }

  public add(other: Quantity, packetsPerCarton: number = 20): Quantity {
    const convertedOther = other.convertTo(this.unit, packetsPerCarton);
    return new Quantity(this.amount + convertedOther.amount, this.unit);
  }

  public subtract(other: Quantity, packetsPerCarton: number = 20): Quantity {
    const convertedOther = other.convertTo(this.unit, packetsPerCarton);
    if (this.amount < convertedOther.amount) {
      throw new Error(
        `Cannot subtract ${other.amount} ${other.unit} from ${this.amount} ${this.unit}: would result in negative quantity`
      );
    }
    return new Quantity(this.amount - convertedOther.amount, this.unit);
  }

  public equals(other: Quantity): boolean {
    return this.amount === other.amount && this.unit === other.unit;
  }

  public toString(): string {
    return `${this.amount} ${this.unit}`;
  }

  public toJSON(): { amount: number; unit: Unit } {
    return {
      amount: this.amount,
      unit: this.unit,
    };
  }
}
