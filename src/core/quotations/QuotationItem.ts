/**
 * QuotationItem
 *
 * Represents a single line item within a Quotation. Immutable value object;
 * mutation methods return new instances rather than modifying state in place.
 * The item's total is always derived, never supplied directly, to prevent
 * drift between quantity/unitPrice/discount and the stored total.
 */

export interface QuotationItemProps {
  readonly id: string;
  readonly description: string;
  readonly quantity: number;
  readonly unitPrice: number;
  readonly discount: number;
}

export interface QuotationItemSnapshot extends QuotationItemProps {
  readonly total: number;
}

export class QuotationItem {
  public readonly id: string;
  public readonly description: string;
  public readonly quantity: number;
  public readonly unitPrice: number;
  public readonly discount: number;
  public readonly total: number;

  private constructor(props: QuotationItemProps) {
    this.id = props.id;
    this.description = props.description;
    this.quantity = props.quantity;
    this.unitPrice = props.unitPrice;
    this.discount = props.discount;
    this.total = QuotationItem.computeTotal(props.quantity, props.unitPrice, props.discount);
  }

  /**
   * Creates a new QuotationItem. Throws if any numeric field is invalid.
   */
  public static create(props: QuotationItemProps): QuotationItem {
    if (!props.id || props.id.trim().length === 0) {
      throw new Error("QuotationItem requires a non-empty id.");
    }
    if (!props.description || props.description.trim().length === 0) {
      throw new Error("QuotationItem requires a non-empty description.");
    }
    if (props.quantity <= 0) {
      throw new Error("QuotationItem quantity must be greater than zero.");
    }
    if (props.unitPrice < 0) {
      throw new Error("QuotationItem unitPrice cannot be negative.");
    }
    if (props.discount < 0 || props.discount > 1) {
      throw new Error("QuotationItem discount must be a fraction between 0 and 1.");
    }

    return new QuotationItem(props);
  }

  private static computeTotal(quantity: number, unitPrice: number, discount: number): number {
    const gross = quantity * unitPrice;
    const net = gross * (1 - discount);
    return Math.round(net * 100) / 100;
  }

  /**
   * Returns a new QuotationItem with an updated quantity.
   */
  public withQuantity(quantity: number): QuotationItem {
    return QuotationItem.create({
      id: this.id,
      description: this.description,
      quantity,
      unitPrice: this.unitPrice,
      discount: this.discount,
    });
  }

  /**
   * Returns a new QuotationItem with an updated unit price.
   */
  public withUnitPrice(unitPrice: number): QuotationItem {
    return QuotationItem.create({
      id: this.id,
      description: this.description,
      quantity: this.quantity,
      unitPrice,
      discount: this.discount,
    });
  }

  /**
   * Returns a new QuotationItem with an updated discount.
   */
  public withDiscount(discount: number): QuotationItem {
    return QuotationItem.create({
      id: this.id,
      description: this.description,
      quantity: this.quantity,
      unitPrice: this.unitPrice,
      discount,
    });
  }

  /**
   * Returns a plain serialisable snapshot of this item, including its derived total.
   */
  public toSnapshot(): QuotationItemSnapshot {
    return {
      id: this.id,
      description: this.description,
      quantity: this.quantity,
      unitPrice: this.unitPrice,
      discount: this.discount,
      total: this.total,
    };
  }
}