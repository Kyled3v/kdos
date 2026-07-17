/**
 * PricingStrategy
 *
 * Immutable value object describing the pricing rules used to compute
 * totals for a Quotation: hourly rate, fixed price, discount policy,
 * and tax rate, denominated in a specific currency.
 *
 * A PricingStrategy either operates in hourly mode or fixed-price mode.
 * Exactly one of hourlyRate or fixedPrice must be provided.
 */

export type DiscountPolicy =
  | { readonly type: "NONE" }
  | { readonly type: "PERCENTAGE"; readonly value: number }
  | { readonly type: "FLAT"; readonly value: number };

export interface PricingStrategyProps {
  readonly hourlyRate: number | null;
  readonly fixedPrice: number | null;
  readonly discountPolicy: DiscountPolicy;
  readonly taxRate: number;
  readonly currency: string;
}

export class PricingStrategy {
  public readonly hourlyRate: number | null;
  public readonly fixedPrice: number | null;
  public readonly discountPolicy: DiscountPolicy;
  public readonly taxRate: number;
  public readonly currency: string;

  private constructor(props: PricingStrategyProps) {
    this.hourlyRate = props.hourlyRate;
    this.fixedPrice = props.fixedPrice;
    this.discountPolicy = props.discountPolicy;
    this.taxRate = props.taxRate;
    this.currency = props.currency;
  }

  /**
   * Creates a new PricingStrategy. Throws if exactly one of hourlyRate or
   * fixedPrice is not provided, or if numeric fields are invalid.
   */
  public static create(props: PricingStrategyProps): PricingStrategy {
    const hasHourly = props.hourlyRate !== null;
    const hasFixed = props.fixedPrice !== null;

    if (hasHourly === hasFixed) {
      throw new Error(
        "PricingStrategy requires exactly one of hourlyRate or fixedPrice to be set."
      );
    }
    if (hasHourly && (props.hourlyRate as number) <= 0) {
      throw new Error("PricingStrategy hourlyRate must be greater than zero.");
    }
    if (hasFixed && (props.fixedPrice as number) <= 0) {
      throw new Error("PricingStrategy fixedPrice must be greater than zero.");
    }
    if (props.taxRate < 0) {
      throw new Error("PricingStrategy taxRate cannot be negative.");
    }
    if (!props.currency || props.currency.trim().length === 0) {
      throw new Error("PricingStrategy requires a non-empty currency.");
    }
    if (props.discountPolicy.type === "PERCENTAGE") {
      if (props.discountPolicy.value < 0 || props.discountPolicy.value > 1) {
        throw new Error("PricingStrategy percentage discount must be between 0 and 1.");
      }
    }
    if (props.discountPolicy.type === "FLAT") {
      if (props.discountPolicy.value < 0) {
        throw new Error("PricingStrategy flat discount cannot be negative.");
      }
    }

    return new PricingStrategy(props);
  }

  /**
   * Returns true if this strategy prices by the hour.
   */
  public isHourly(): boolean {
    return this.hourlyRate !== null;
  }

  /**
   * Returns true if this strategy prices as a fixed amount.
   */
  public isFixed(): boolean {
    return this.fixedPrice !== null;
  }

  /**
   * Applies this strategy's discount policy to a gross subtotal, returning
   * the discount amount (not the discounted total).
   */
  public computeDiscountAmount(subtotal: number): number {
    switch (this.discountPolicy.type) {
      case "NONE":
        return 0;
      case "PERCENTAGE":
        return Math.round(subtotal * this.discountPolicy.value * 100) / 100;
      case "FLAT":
        return Math.min(this.discountPolicy.value, subtotal);
    }
  }

  /**
   * Applies this strategy's tax rate to a net amount, returning the tax amount.
   */
  public computeTaxAmount(netAmount: number): number {
    return Math.round(netAmount * this.taxRate * 100) / 100;
  }

  /**
   * Returns a plain serialisable snapshot of this strategy.
   */
  public toSnapshot(): PricingStrategyProps {
    return {
      hourlyRate: this.hourlyRate,
      fixedPrice: this.fixedPrice,
      discountPolicy: this.discountPolicy,
      taxRate: this.taxRate,
      currency: this.currency,
    };
  }
}