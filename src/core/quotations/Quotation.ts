/**
 * Quotation
 *
 * Represents pricing extended to a client for an already-generated Proposal.
 * A Quotation contains pricing only — no proposal content, no contractual
 * terms. All monetary fields (subtotal, tax, discount, total) are derived
 * from the current set of QuotationItem line items and the applied
 * PricingStrategy, never set directly.
 */

import { QuotationItem, QuotationItemSnapshot } from "./QuotationItem";
import { PricingStrategy, PricingStrategyProps } from "./PricingStrategy";

export enum QuotationStatus {
  DRAFT = "DRAFT",
  REVIEW = "REVIEW",
  APPROVED = "APPROVED",
  SENT = "SENT",
  ACCEPTED = "ACCEPTED",
  DECLINED = "DECLINED",
  EXPIRED = "EXPIRED",
}

export interface QuotationProps {
  readonly id: string;
  readonly proposalId: string;
  readonly clientId: string;
  readonly quotationNumber: string;
  readonly currency: string;
  readonly items: readonly QuotationItem[];
  readonly pricingStrategy: PricingStrategy;
  readonly subtotal: number;
  readonly tax: number;
  readonly discount: number;
  readonly total: number;
  readonly status: QuotationStatus;
  readonly createdAt: Date;
  readonly expiresAt: Date;
}

export interface QuotationSnapshot {
  readonly id: string;
  readonly proposalId: string;
  readonly clientId: string;
  readonly quotationNumber: string;
  readonly currency: string;
  readonly items: readonly QuotationItemSnapshot[];
  readonly pricingStrategy: PricingStrategyProps;
  readonly subtotal: number;
  readonly tax: number;
  readonly discount: number;
  readonly total: number;
  readonly status: QuotationStatus;
  readonly createdAt: Date;
  readonly expiresAt: Date;
}

const VALID_TRANSITIONS: Readonly<Record<QuotationStatus, readonly QuotationStatus[]>> = {
  [QuotationStatus.DRAFT]: [QuotationStatus.REVIEW, QuotationStatus.EXPIRED],
  [QuotationStatus.REVIEW]: [QuotationStatus.DRAFT, QuotationStatus.APPROVED, QuotationStatus.EXPIRED],
  [QuotationStatus.APPROVED]: [QuotationStatus.SENT, QuotationStatus.EXPIRED],
  [QuotationStatus.SENT]: [QuotationStatus.ACCEPTED, QuotationStatus.DECLINED, QuotationStatus.EXPIRED],
  [QuotationStatus.ACCEPTED]: [],
  [QuotationStatus.DECLINED]: [],
  [QuotationStatus.EXPIRED]: [],
};

export class Quotation {
  public readonly id: string;
  public readonly proposalId: string;
  public readonly clientId: string;
  public readonly quotationNumber: string;
  public readonly currency: string;
  public readonly items: readonly QuotationItem[];
  public readonly pricingStrategy: PricingStrategy;
  public readonly subtotal: number;
  public readonly tax: number;
  public readonly discount: number;
  public readonly total: number;
  public readonly status: QuotationStatus;
  public readonly createdAt: Date;
  public readonly expiresAt: Date;

  private constructor(props: QuotationProps) {
    this.id = props.id;
    this.proposalId = props.proposalId;
    this.clientId = props.clientId;
    this.quotationNumber = props.quotationNumber;
    this.currency = props.currency;
    this.items = props.items;
    this.pricingStrategy = props.pricingStrategy;
    this.subtotal = props.subtotal;
    this.tax = props.tax;
    this.discount = props.discount;
    this.total = props.total;
    this.status = props.status;
    this.createdAt = props.createdAt;
    this.expiresAt = props.expiresAt;
  }

  /**
   * Creates a new Quotation in DRAFT status with no items. Currency is
   * taken from the supplied pricing strategy to guarantee consistency.
   */
  public static create(props: {
    id: string;
    proposalId: string;
    clientId: string;
    quotationNumber: string;
    pricingStrategy: PricingStrategy;
    expiresAt: Date;
  }): Quotation {
    if (!props.id || props.id.trim().length === 0) {
      throw new Error("Quotation requires a non-empty id.");
    }
    if (!props.proposalId || props.proposalId.trim().length === 0) {
      throw new Error("Quotation requires a non-empty proposalId.");
    }
    if (!props.clientId || props.clientId.trim().length === 0) {
      throw new Error("Quotation requires a non-empty clientId.");
    }
    if (!props.quotationNumber || props.quotationNumber.trim().length === 0) {
      throw new Error("Quotation requires a non-empty quotationNumber.");
    }

    const now = new Date();

    if (props.expiresAt.getTime() <= now.getTime()) {
      throw new Error("Quotation expiresAt must be in the future.");
    }

    return new Quotation({
      id: props.id,
      proposalId: props.proposalId,
      clientId: props.clientId,
      quotationNumber: props.quotationNumber,
      currency: props.pricingStrategy.currency,
      items: [],
      pricingStrategy: props.pricingStrategy,
      subtotal: 0,
      tax: 0,
      discount: 0,
      total: 0,
      status: QuotationStatus.DRAFT,
      createdAt: now,
      expiresAt: props.expiresAt,
    });
  }

  /**
   * Reconstructs a Quotation from a stored snapshot.
   */
  public static fromSnapshot(snapshot: QuotationSnapshot): Quotation {
    return new Quotation({
      id: snapshot.id,
      proposalId: snapshot.proposalId,
      clientId: snapshot.clientId,
      quotationNumber: snapshot.quotationNumber,
      currency: snapshot.currency,
      items: snapshot.items.map((item) => QuotationItem.create(item)),
      pricingStrategy: PricingStrategy.create(snapshot.pricingStrategy),
      subtotal: snapshot.subtotal,
      tax: snapshot.tax,
      discount: snapshot.discount,
      total: snapshot.total,
      status: snapshot.status,
      createdAt: snapshot.createdAt,
      expiresAt: snapshot.expiresAt,
    });
  }

  /**
   * Returns a new Quotation with the given item appended and totals recalculated.
   * Throws if an item with the same id already exists.
   */
  public withAddedItem(item: QuotationItem): Quotation {
    if (this.items.some((existing) => existing.id === item.id)) {
      throw new Error(`Quotation already contains an item with id "${item.id}".`);
    }

    return this.cloneWithItems([...this.items, item]);
  }

  /**
   * Returns a new Quotation with the given item removed and totals recalculated.
   * Throws if the item does not exist.
   */
  public withRemovedItem(itemId: string): Quotation {
    if (!this.items.some((existing) => existing.id === itemId)) {
      throw new Error(`Quotation does not contain an item with id "${itemId}".`);
    }

    return this.cloneWithItems(this.items.filter((existing) => existing.id !== itemId));
  }

  /**
   * Returns a new Quotation with totals recalculated from current items
   * and pricing strategy, without changing the item set.
   */
  public withRecalculatedTotals(): Quotation {
    return this.cloneWithItems(this.items);
  }

  /**
   * Returns a new Quotation transitioned to the given status.
   * Throws if the transition is not valid from the current status.
   */
  public withStatus(status: QuotationStatus): Quotation {
    const allowed = VALID_TRANSITIONS[this.status];

    if (!allowed.includes(status)) {
      throw new Error(
        `Invalid quotation status transition from "${this.status}" to "${status}".`
      );
    }

    return new Quotation({
      id: this.id,
      proposalId: this.proposalId,
      clientId: this.clientId,
      quotationNumber: this.quotationNumber,
      currency: this.currency,
      items: this.items,
      pricingStrategy: this.pricingStrategy,
      subtotal: this.subtotal,
      tax: this.tax,
      discount: this.discount,
      total: this.total,
      status,
      createdAt: this.createdAt,
      expiresAt: this.expiresAt,
    });
  }

  /**
   * Returns true if this quotation's expiry date has passed relative to the given reference time.
   */
  public isExpired(referenceTime: Date = new Date()): boolean {
    return referenceTime.getTime() > this.expiresAt.getTime();
  }

  /**
   * Returns a plain serialisable snapshot of this quotation.
   */
  public toSnapshot(): QuotationSnapshot {
    return {
      id: this.id,
      proposalId: this.proposalId,
      clientId: this.clientId,
      quotationNumber: this.quotationNumber,
      currency: this.currency,
      items: this.items.map((item) => item.toSnapshot()),
      pricingStrategy: this.pricingStrategy.toSnapshot(),
      subtotal: this.subtotal,
      tax: this.tax,
      discount: this.discount,
      total: this.total,
      status: this.status,
      createdAt: this.createdAt,
      expiresAt: this.expiresAt,
    };
  }

  private cloneWithItems(items: readonly QuotationItem[]): Quotation {
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const discount = this.pricingStrategy.computeDiscountAmount(subtotal);
    const netAfterDiscount = subtotal - discount;
    const tax = this.pricingStrategy.computeTaxAmount(netAfterDiscount);
    const total = Math.round((netAfterDiscount + tax) * 100) / 100;

    return new Quotation({
      id: this.id,
      proposalId: this.proposalId,
      clientId: this.clientId,
      quotationNumber: this.quotationNumber,
      currency: this.currency,
      items,
      pricingStrategy: this.pricingStrategy,
      subtotal: Math.round(subtotal * 100) / 100,
      tax,
      discount: Math.round(discount * 100) / 100,
      total,
      status: this.status,
      createdAt: this.createdAt,
      expiresAt: this.expiresAt,
    });
  }
}