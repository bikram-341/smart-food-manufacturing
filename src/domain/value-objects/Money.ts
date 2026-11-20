/**
 * Value Object representing an immutable monetary amount in Indian Paise (1 INR = 100 Paise).
 * Eliminates floating-point rounding errors completely.
 * Adheres to Information Expert and Value Object design patterns.
 */
export class Money {
  private readonly paise: number;

  private constructor(paise: number) {
    if (!Number.isInteger(paise)) {
      this.paise = Math.round(paise);
    } else {
      this.paise = paise;
    }
  }

  public static fromPaise(paise: number): Money {
    return new Money(paise);
  }

  public static fromRupees(rupees: number): Money {
    return new Money(Math.round(rupees * 100));
  }

  public static zero(): Money {
    return new Money(0);
  }

  public getPaise(): number {
    return this.paise;
  }

  public getRupees(): number {
    return this.paise / 100;
  }

  public add(other: Money): Money {
    return new Money(this.paise + other.paise);
  }

  public subtract(other: Money): Money {
    return new Money(this.paise - other.paise);
  }

  public multiply(factor: number): Money {
    return new Money(Math.round(this.paise * factor));
  }

  public percentage(percent: number): Money {
    return new Money(Math.round((this.paise * percent) / 100));
  }

  public divide(divisor: number): Money {
    if (divisor === 0) {
      throw new Error('Division by zero in Money calculation');
    }
    return new Money(Math.round(this.paise / divisor));
  }

  public equals(other: Money): boolean {
    return this.paise === other.paise;
  }

  public isGreaterThan(other: Money): boolean {
    return this.paise > other.paise;
  }

  public isLessThan(other: Money): boolean {
    return this.paise < other.paise;
  }

  public isZero(): boolean {
    return this.paise === 0;
  }

  public isPositive(): boolean {
    return this.paise > 0;
  }

  public isNegative(): boolean {
    return this.paise < 0;
  }

  /**
   * Formats money into standard Indian Currency format (e.g. ₹7,875.00).
   */
  public formatInr(): string {
    const rupees = this.getRupees();
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(rupees);
  }

  public toString(): string {
    return this.formatInr();
  }

  public toJSON(): { paise: number; rupees: number; formatted: string } {
    return {
      paise: this.paise,
      rupees: this.getRupees(),
      formatted: this.formatInr(),
    };
  }
}
