/**
 * QuotationRegistry
 *
 * Singleton in-memory registry responsible for storing and retrieving
 * Quotation instances. Uses Map-based storage only. No database, no
 * networking, no external dependencies.
 */

import { Quotation } from "./Quotation";

export class QuotationRegistry {
  private static instance: QuotationRegistry | null = null;

  private readonly quotations: Map<string, Quotation>;

  private constructor() {
    this.quotations = new Map<string, Quotation>();
  }

  /**
   * Returns the singleton instance of QuotationRegistry.
   */
  public static getInstance(): QuotationRegistry {
    if (QuotationRegistry.instance === null) {
      QuotationRegistry.instance = new QuotationRegistry();
    }
    return QuotationRegistry.instance;
  }

  /**
   * Resets the singleton instance. Intended for test isolation only.
   */
  public static resetInstance(): void {
    QuotationRegistry.instance = null;
  }

  /**
   * Registers a quotation. Throws if a quotation with the same id already exists.
   */
  public register(quotation: Quotation): void {
    if (this.quotations.has(quotation.id)) {
      throw new Error(`Quotation with id "${quotation.id}" is already registered.`);
    }
    this.quotations.set(quotation.id, quotation);
  }

  /**
   * Replaces an already-registered quotation with an updated instance.
   * Throws if no quotation with that id is registered.
   */
  public update(quotation: Quotation): void {
    if (!this.quotations.has(quotation.id)) {
      throw new Error(`Cannot update unregistered quotation with id "${quotation.id}".`);
    }
    this.quotations.set(quotation.id, quotation);
  }

  /**
   * Removes a quotation by id. Throws if no quotation with that id exists.
   */
  public remove(id: string): void {
    if (!this.quotations.has(id)) {
      throw new Error(`Cannot remove unregistered quotation with id "${id}".`);
    }
    this.quotations.delete(id);
  }

  /**
   * Finds a quotation by id. Throws if no quotation with that id exists.
   */
  public find(id: string): Quotation {
    const quotation = this.quotations.get(id);
    if (!quotation) {
      throw new Error(`No quotation found with id "${id}".`);
    }
    return quotation;
  }

  /**
   * Returns true if a quotation with the given id is registered.
   */
  public has(id: string): boolean {
    return this.quotations.has(id);
  }

  /**
   * Lists all registered quotations.
   */
  public list(): readonly Quotation[] {
    return Array.from(this.quotations.values());
  }

  /**
   * Lists all quotations belonging to a given proposal.
   */
  public listByProposalId(proposalId: string): readonly Quotation[] {
    return this.list().filter((quotation) => quotation.proposalId === proposalId);
  }

  /**
   * Lists all quotations belonging to a given client.
   */
  public listByClientId(clientId: string): readonly Quotation[] {
    return this.list().filter((quotation) => quotation.clientId === clientId);
  }

  /**
   * Finds a quotation by its human-readable quotation number.
   * Throws if no quotation with that number exists.
   */
  public findByQuotationNumber(quotationNumber: string): Quotation {
    const found = this.list().find((quotation) => quotation.quotationNumber === quotationNumber);
    if (!found) {
      throw new Error(`No quotation found with quotationNumber "${quotationNumber}".`);
    }
    return found;
  }

  /**
   * Returns the total number of registered quotations.
   */
  public count(): number {
    return this.quotations.size;
  }
}