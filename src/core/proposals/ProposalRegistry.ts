/**
 * ProposalRegistry
 *
 * Singleton in-memory registry responsible for storing and retrieving
 * Proposal instances. Uses Map-based storage only. No database, no
 * networking, no external dependencies.
 */

import { Proposal } from "./Proposal";

export class ProposalRegistry {
  private static instance: ProposalRegistry | null = null;

  private readonly proposals: Map<string, Proposal>;

  private constructor() {
    this.proposals = new Map<string, Proposal>();
  }

  /**
   * Returns the singleton instance of ProposalRegistry.
   */
  public static getInstance(): ProposalRegistry {
    if (ProposalRegistry.instance === null) {
      ProposalRegistry.instance = new ProposalRegistry();
    }
    return ProposalRegistry.instance;
  }

  /**
   * Resets the singleton instance. Intended for test isolation only.
   */
  public static resetInstance(): void {
    ProposalRegistry.instance = null;
  }

  /**
   * Registers a proposal. Throws if a proposal with the same id already exists.
   */
  public register(proposal: Proposal): void {
    if (this.proposals.has(proposal.id)) {
      throw new Error(`Proposal with id "${proposal.id}" is already registered.`);
    }
    this.proposals.set(proposal.id, proposal);
  }

  /**
   * Replaces an already-registered proposal with an updated instance.
   * Throws if no proposal with that id is registered.
   */
  public update(proposal: Proposal): void {
    if (!this.proposals.has(proposal.id)) {
      throw new Error(`Cannot update unregistered proposal with id "${proposal.id}".`);
    }
    this.proposals.set(proposal.id, proposal);
  }

  /**
   * Removes a proposal by id. Throws if no proposal with that id exists.
   */
  public remove(id: string): void {
    if (!this.proposals.has(id)) {
      throw new Error(`Cannot remove unregistered proposal with id "${id}".`);
    }
    this.proposals.delete(id);
  }

  /**
   * Finds a proposal by id. Throws if no proposal with that id exists.
   */
  public find(id: string): Proposal {
    const proposal = this.proposals.get(id);
    if (!proposal) {
      throw new Error(`No proposal found with id "${id}".`);
    }
    return proposal;
  }

  /**
   * Returns true if a proposal with the given id is registered.
   */
  public has(id: string): boolean {
    return this.proposals.has(id);
  }

  /**
   * Lists all registered proposals.
   */
  public list(): readonly Proposal[] {
    return Array.from(this.proposals.values());
  }

  /**
   * Lists all proposals belonging to a given lead.
   */
  public listByLeadId(leadId: string): readonly Proposal[] {
    return this.list().filter((proposal) => proposal.leadId === leadId);
  }

  /**
   * Lists all proposals belonging to a given client.
   */
  public listByClientId(clientId: string): readonly Proposal[] {
    return this.list().filter((proposal) => proposal.clientId === clientId);
  }

  /**
   * Returns the total number of registered proposals.
   */
  public count(): number {
    return this.proposals.size;
  }
}