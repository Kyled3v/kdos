/**
 * ServicePricing
 *
 * Represents the commercial pricing terms for a single ServicePackage,
 * denominated in South African Rand (ZAR) using realistic 2026 KyleDev
 * market rates. Immutable value object; no computation of quotations or
 * invoices happens here — that is Quotation Engine / Invoice territory.
 * This is the catalogue-level price reference only.
 */

export enum PricingModel {
  FIXED = "FIXED",
  HOURLY = "HOURLY",
  RETAINER_MONTHLY = "RETAINER_MONTHLY",
  TIERED = "TIERED",
}

export interface ServicePricingProps {
  readonly model: PricingModel;
  readonly startingPriceZAR: number;
  readonly hourlyRateZAR: number | null;
  readonly monthlyRetainerZAR: number | null;
  readonly currency: "ZAR";
  readonly vatInclusive: boolean;
}

export class ServicePricing {
  public readonly model: PricingModel;
  public readonly startingPriceZAR: number;
  public readonly hourlyRateZAR: number | null;
  public readonly monthlyRetainerZAR: number | null;
  public readonly currency: "ZAR";
  public readonly vatInclusive: boolean;

  private constructor(props: ServicePricingProps) {
    this.model = props.model;
    this.startingPriceZAR = props.startingPriceZAR;
    this.hourlyRateZAR = props.hourlyRateZAR;
    this.monthlyRetainerZAR = props.monthlyRetainerZAR;
    this.currency = props.currency;
    this.vatInclusive = props.vatInclusive;
  }

  /**
   * Creates fixed-price pricing terms (VAT-exclusive by KyleDev default).
   */
  public static fixed(startingPriceZAR: number): ServicePricing {
    if (startingPriceZAR <= 0) {
      throw new Error("ServicePricing startingPriceZAR must be greater than zero.");
    }

    return new ServicePricing({
      model: PricingModel.FIXED,
      startingPriceZAR,
      hourlyRateZAR: null,
      monthlyRetainerZAR: null,
      currency: "ZAR",
      vatInclusive: false,
    });
  }

  /**
   * Creates hourly pricing terms with a starting estimate for the smallest
   * realistic engagement of this type.
   */
  public static hourly(hourlyRateZAR: number, startingPriceZAR: number): ServicePricing {
    if (hourlyRateZAR <= 0) {
      throw new Error("ServicePricing hourlyRateZAR must be greater than zero.");
    }
    if (startingPriceZAR <= 0) {
      throw new Error("ServicePricing startingPriceZAR must be greater than zero.");
    }

    return new ServicePricing({
      model: PricingModel.HOURLY,
      startingPriceZAR,
      hourlyRateZAR,
      monthlyRetainerZAR: null,
      currency: "ZAR",
      vatInclusive: false,
    });
  }

  /**
   * Creates monthly retainer pricing terms (e.g. hosting, maintenance,
   * ongoing support).
   */
  public static retainer(monthlyRetainerZAR: number): ServicePricing {
    if (monthlyRetainerZAR <= 0) {
      throw new Error("ServicePricing monthlyRetainerZAR must be greater than zero.");
    }

    return new ServicePricing({
      model: PricingModel.RETAINER_MONTHLY,
      startingPriceZAR: monthlyRetainerZAR,
      hourlyRateZAR: null,
      monthlyRetainerZAR,
      currency: "ZAR",
      vatInclusive: false,
    });
  }

  /**
   * Creates tiered pricing terms where startingPriceZAR represents the
   * entry tier and the service scales upward from there (e.g. ERP, POS,
   * enterprise systems).
   */
  public static tiered(startingPriceZAR: number): ServicePricing {
    if (startingPriceZAR <= 0) {
      throw new Error("ServicePricing startingPriceZAR must be greater than zero.");
    }

    return new ServicePricing({
      model: PricingModel.TIERED,
      startingPriceZAR,
      hourlyRateZAR: null,
      monthlyRetainerZAR: null,
      currency: "ZAR",
      vatInclusive: false,
    });
  }

  /**
   * Returns the 15% VAT amount on the starting price, per South African
   * standard VAT rate.
   */
  public vatAmount(): number {
    return Math.round(this.startingPriceZAR * 0.15 * 100) / 100;
  }

  /**
   * Returns the starting price inclusive of 15% VAT.
   */
  public startingPriceInclVAT(): number {
    return Math.round((this.startingPriceZAR + this.vatAmount()) * 100) / 100;
  }

  /**
   * Returns a plain serialisable snapshot of this pricing.
   */
  public toSnapshot(): ServicePricingProps {/**
 * ServicePricing
 *
 * Represents the commercial pricing terms for a single ServicePackage,
 * denominated in South African Rand (ZAR) using realistic 2026 KyleDev
 * market rates. Immutable value object; no computation of quotations or
 * invoices happens here — that is Quotation Engine / Invoice territory.
 * This is the catalogue-level price reference only.
 */

export enum PricingModel {
  FIXED = "FIXED",
  HOURLY = "HOURLY",
  RETAINER_MONTHLY = "RETAINER_MONTHLY",
  TIERED = "TIERED",
}

export interface ServicePricingProps {
  readonly model: PricingModel;
  readonly startingPriceZAR: number;
  readonly hourlyRateZAR: number | null;
  readonly monthlyRetainerZAR: number | null;
  readonly currency: "ZAR";
  readonly vatInclusive: boolean;
}

export class ServicePricing {
  public readonly model: PricingModel;
  public readonly startingPriceZAR: number;
  public readonly hourlyRateZAR: number | null;
  public readonly monthlyRetainerZAR: number | null;
  public readonly currency: "ZAR";
  public readonly vatInclusive: boolean;

  private constructor(props: ServicePricingProps) {
    this.model = props.model;
    this.startingPriceZAR = props.startingPriceZAR;
    this.hourlyRateZAR = props.hourlyRateZAR;
    this.monthlyRetainerZAR = props.monthlyRetainerZAR;
    this.currency = props.currency;
    this.vatInclusive = props.vatInclusive;
  }

  /**
   * Creates fixed-price pricing terms (VAT-exclusive by KyleDev default).
   */
  public static fixed(startingPriceZAR: number): ServicePricing {
    if (startingPriceZAR <= 0) {
      throw new Error("ServicePricing startingPriceZAR must be greater than zero.");
    }

    return new ServicePricing({
      model: PricingModel.FIXED,
      startingPriceZAR,
      hourlyRateZAR: null,
      monthlyRetainerZAR: null,
      currency: "ZAR",
      vatInclusive: false,
    });
  }

  /**
   * Creates hourly pricing terms with a starting estimate for the smallest
   * realistic engagement of this type.
   */
  public static hourly(hourlyRateZAR: number, startingPriceZAR: number): ServicePricing {
    if (hourlyRateZAR <= 0) {
      throw new Error("ServicePricing hourlyRateZAR must be greater than zero.");
    }
    if (startingPriceZAR <= 0) {
      throw new Error("ServicePricing startingPriceZAR must be greater than zero.");
    }

    return new ServicePricing({
      model: PricingModel.HOURLY,
      startingPriceZAR,
      hourlyRateZAR,
      monthlyRetainerZAR: null,
      currency: "ZAR",
      vatInclusive: false,
    });
  }

  /**
   * Creates monthly retainer pricing terms (e.g. hosting, maintenance,
   * ongoing support).
   */
  public static retainer(monthlyRetainerZAR: number): ServicePricing {
    if (monthlyRetainerZAR <= 0) {
      throw new Error("ServicePricing monthlyRetainerZAR must be greater than zero.");
    }

    return new ServicePricing({
      model: PricingModel.RETAINER_MONTHLY,
      startingPriceZAR: monthlyRetainerZAR,
      hourlyRateZAR: null,
      monthlyRetainerZAR,
      currency: "ZAR",
      vatInclusive: false,
    });
  }

  /**
   * Creates tiered pricing terms where startingPriceZAR represents the
   * entry tier and the service scales upward from there (e.g. ERP, POS,
   * enterprise systems).
   */
  public static tiered(startingPriceZAR: number): ServicePricing {
    if (startingPriceZAR <= 0) {
      throw new Error("ServicePricing startingPriceZAR must be greater than zero.");
    }

    return new ServicePricing({
      model: PricingModel.TIERED,
      startingPriceZAR,
      hourlyRateZAR: null,
      monthlyRetainerZAR: null,
      currency: "ZAR",
      vatInclusive: false,
    });
  }

  /**
   * Returns the 15% VAT amount on the starting price, per South African
   * standard VAT rate.
   */
  public vatAmount(): number {
    return Math.round(this.startingPriceZAR * 0.15 * 100) / 100;
  }

  /**
   * Returns the starting price inclusive of 15% VAT.
   */
  public startingPriceInclVAT(): number {
    return Math.round((this.startingPriceZAR + this.vatAmount()) * 100) / 100;
  }

  /**
   * Returns a plain serialisable snapshot of this pricing.
   */
  public toSnapshot(): ServicePricingProps {
    return {
      model: this.model,
      startingPriceZAR: this.startingPriceZAR,
      hourlyRateZAR: this.hourlyRateZAR,
      monthlyRetainerZAR: this.monthlyRetainerZAR,
      currency: this.currency,
      vatInclusive: this.vatInclusive,
    };
  }
}
    return {
      model: this.model,
      startingPriceZAR: this.startingPriceZAR,
      hourlyRateZAR: this.hourlyRateZAR,
      monthlyRetainerZAR: this.monthlyRetainerZAR,
      currency: this.currency,
      vatInclusive: this.vatInclusive,
    };
  }
}