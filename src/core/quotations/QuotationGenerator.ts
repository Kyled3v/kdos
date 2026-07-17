/**
 * QuotationGenerator
 *
 * Singleton service responsible for the lifecycle operations of Quotations:
 * creation, item mutation, total recalculation, approval, duplication, and
 * expiry. Delegates storage entirely to QuotationRegistry. Delegates all
 * monetary computation to Quotation and PricingStrategy — this service
 * never computes totals directly.
 */

import { Quotation, QuotationStatus } from "./Quotation";
import { QuotationItem } from "./QuotationItem";
import { PricingStrategy } from "./PricingStrategy";
import { QuotationRegistry } from "./QuotationRegistry";

export interface CreateQuotationInput {
  readonly id: string;
  readonly proposalId: string;
  readonly clientId: string;
  readonly quotationNumber: string;
  readonly pricingStrategy: PricingStrategy;
  readonly expiresAt: Date;
}

export interface AddItemInput {
  readonly quotationId: string;
  readonly itemId: string;
  readonly description: string;
  readonly quantity: number;
  readonly unitPrice: number;
  readonly discount: number;
}

export class QuotationGenerator {
  private static instance: QuotationGenerator | null = null;

  private readonly registry: QuotationRegistry;

  private constructor(registry: QuotationRegistry) {
    this.registry = registry;
  }

  /**
   * Returns the singleton instance of QuotationGenerator.
   * Accepts an optional registry override for dependency injection in tests.
   */
  public static getInstance(registry?: QuotationRegistry): QuotationGenerator {
    if (QuotationGenerator.instance === null) {
      QuotationGenerator.instance = new QuotationGenerator(registry ?? QuotationRegistry.getInstance());
    }
    return QuotationGenerator.instance;
  }

  /**
   * Resets the singleton instance. Intended for test isolation only.
   */
  public static resetInstance(): void {
    QuotationGenerator.instance = null;
  }

  /**
   * Creates an empty DRAFT quotation with no items and registers it.
   */
  public createQuotation(input: CreateQuotationInput): Quotation {
    const quotation = Quotation.create({
      id: input.id,
      proposalId: input.proposalId,
      clientId: input.clientId,
      quotationNumber: input.quotationNumber,
      pricingStrategy: input.pricingStrategy,
      expiresAt: input.expiresAt,
    });

    this.registry.register(quotation);
    return quotation;
  }

  /**
   * Adds a line item to an existing quotation, recalculates totals, and persists the update.
   */
  public addItem(input: AddItemInput): Quotation {
    const existing = this.registry.find(input.quotationId);

    const item = QuotationItem.create({
      id: input.itemId,
      description: input.description,
      quantity: input.quantity,
      unitPrice: input.unitPrice,
      discount: input.discount,
    });

    const updated = existing.withAddedItem(item);
    this.registry.update(updated);
    return updated;
  }

  /**
   * Removes a line item from an existing quotation, recalculates totals, and persists the update.
   */
  public removeItem(quotationId: string, itemId: string): Quotation {
    const existing = this.registry.find(quotationId);
    const updated = existing.withRemovedItem(itemId);
    this.registry.update(updated);
    return updated;
  }

  /**
   * Forces recalculation of a quotation's totals from its current items and
   * pricing strategy (for example, after an external pricing strategy change),
   * and persists the update.
   */
  public calculateTotals(quotationId: string): Quotation {
    const existing = this.registry.find(quotationId);
    const updated = existing.withRecalculatedTotals();
    this.registry.update(updated);
    return updated;
  }

  /**
   * Transitions a quotation to APPROVED status and persists the update.
   */
  public approve(quotationId: string): Quotation {
    const existing = this.registry.find(quotationId);
    const updated = existing.withStatus(QuotationStatus.APPROVED);
    this.registry.update(updated);
    return updated;
  }

  /**
   * Transitions a quotation to EXPIRED status and persists the update.
   */
  public expire(quotationId: string): Quotation {
    const existing = this.registry.find(quotationId);
    const updated = existing.withStatus(QuotationStatus.EXPIRED);
    this.registry.update(updated);
    return updated;
  }

  /**
   * Creates a new DRAFT quotation that duplicates the items, pricing
   * strategy, and metadata of an existing quotation under a new id and
   * quotation number. The original quotation is untouched.
   */
  public duplicate(sourceQuotationId: string, newId: string, newQuotationNumber: string, expiresAt: Date): Quotation {
    const source = this.registry.find(sourceQuotationId);

    let duplicated = Quotation.create({
      id: newId,
      proposalId: source.proposalId,
      clientId: source.clientId,
      quotationNumber: newQuotationNumber,
      pricingStrategy: source.pricingStrategy,
      expiresAt,
    });

    for (const item of source.items) {
      duplicated = duplicated.withAddedItem(
        QuotationItem.create({
          id: `${newId}-${item.id}`,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount,
        })
      );
    }

    this.registry.register(duplicated);
    return duplicated;
  }
}