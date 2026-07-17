/**
 * CRM.ts
 *
 * Location: src/core/crm/CRM.ts
 *
 * CRM is the heart of the KDOS business pipeline: Lead -> Qualified
 * Lead -> Opportunity -> ... -> Client. It owns the full lifecycle of
 * Leads, Clients, Opportunities, and Interactions, entirely in
 * memory.
 *
 * CRM performs no AI calls, no database access, and no networking —
 * it is a pure domain/orchestration layer over Map-based storage.
 */

import type { Lead, LeadSource } from './Lead'
import { LeadStatus } from './Lead'
import type { Client, ClientAddress, ClientContact } from './Client'
import { ClientStatus } from './Client'
import type { Opportunity } from './Opportunity'
import { OpportunityStage } from './Opportunity'
import type { Interaction } from './Interaction'
import { InteractionType } from './Interaction'

/**
 * The fields required to create a new Lead. status defaults to NEW
 * when not supplied; id and createdAt are always assigned by CRM
 * itself.
 */
export interface CreateLeadInput {
  readonly firstName: string
  readonly lastName: string
  readonly company: string
  readonly email: string
  readonly phone: string
  readonly industry: string
  readonly website?: string | null
  readonly source: LeadSource
  readonly assignedEmployee?: string | null
  readonly status?: LeadStatus
}

/**
 * The fields that may be updated on an existing Lead. All fields are
 * optional — only supplied fields are changed.
 */
export interface UpdateLeadInput {
  readonly firstName?: string
  readonly lastName?: string
  readonly company?: string
  readonly email?: string
  readonly phone?: string
  readonly industry?: string
  readonly website?: string | null
  readonly status?: LeadStatus
  readonly source?: LeadSource
  readonly assignedEmployee?: string | null
}

/**
 * The fields required to create a new Client directly (not via
 * conversion from a Lead).
 */
export interface CreateClientInput {
  readonly company: string
  readonly industry: string
  readonly contacts?: ClientContact[]
  readonly address?: ClientAddress | null
  readonly notes?: string
  readonly status?: ClientStatus
}

/**
 * The fields required to create a new Opportunity for a Lead.
 */
export interface CreateOpportunityInput {
  readonly leadId: string
  readonly estimatedValue: number
  readonly probability: number
  readonly stage?: OpportunityStage
  readonly expectedClose: Date
}

/**
 * The fields required to record a new Interaction against a Lead.
 */
export interface RecordInteractionInput {
  readonly leadId: string
  readonly employeeId: string
  readonly type: InteractionType
  readonly summary: string
}

/**
 * CRM
 *
 * Single responsibility: own the full lifecycle of Leads, Clients,
 * Opportunities, and Interactions, and the transitions between them,
 * entirely in memory.
 *
 * This class:
 *   - Is a singleton — use CRM.getInstance() rather than `new`.
 *   - Stores every record in a Map, keyed by its id.
 *   - Performs no AI calls, database access, or networking.
 *   - Never mutates a returned record in place; every change
 *     produces a new, frozen record.
 */
export class CRM {
  private static instance: CRM | null = null

  private readonly leads = new Map<string, Lead>()
  private readonly clients = new Map<string, Client>()
  private readonly opportunities = new Map<string, Opportunity>()
  private readonly interactions = new Map<string, Interaction>()

  /**
   * Private constructor — CRM is a singleton and must be created via
   * getInstance(), never directly.
   */
  private constructor() {}

  /**
   * Retrieves the singleton CRM instance, creating it on first call.
   */
  public static getInstance(): CRM {
    if (!CRM.instance) {
      CRM.instance = new CRM()
    }
    return CRM.instance
  }

  /**
   * Resets the singleton instance. Intended for test isolation only.
   */
  public static resetInstance(): void {
    CRM.instance = null
  }

  /**
   * Creates a new Lead record.
   *
   * @param input - The fields describing the new lead.
   * @returns The newly created Lead.
   */
  public createLead(input: CreateLeadInput): Lead {
    const lead: Lead = Object.freeze({
      id: this.generateId('lead'),
      firstName: input.firstName,
      lastName: input.lastName,
      company: input.company,
      email: input.email,
      phone: input.phone,
      industry: input.industry,
      website: input.website ?? null,
      status: input.status ?? LeadStatus.NEW,
      source: input.source,
      assignedEmployee: input.assignedEmployee ?? null,
      createdAt: new Date(),
    })

    this.leads.set(lead.id, lead)
    return lead
  }

  /**
   * Updates an existing Lead with the supplied fields. Fields not
   * present in `input` are left unchanged.
   *
   * @param leadId - The id of the Lead to update.
   * @param input - The fields to change.
   * @returns The updated Lead.
   * @throws Error if no Lead exists for the given id.
   */
  public updateLead(leadId: string, input: UpdateLeadInput): Lead {
    const lead = this.requireLead(leadId)

    const updated: Lead = Object.freeze({
      ...lead,
      ...input,
    })

    this.leads.set(leadId, updated)
    return updated
  }

  /**
   * Marks a Lead as QUALIFIED, indicating it has passed initial
   * vetting and is ready to move toward an Opportunity.
   *
   * @param leadId - The id of the Lead to qualify.
   * @returns The updated Lead.
   * @throws Error if no Lead exists for the given id.
   */
  public qualifyLead(leadId: string): Lead {
    return this.updateLead(leadId, { status: LeadStatus.QUALIFIED })
  }

  /**
   * Converts a Lead into a Client: marks the Lead WON and creates a
   * corresponding Client record, seeded from the Lead's company,
   * industry, and primary contact details.
   *
   * @param leadId - The id of the Lead to convert.
   * @returns The newly created Client.
   * @throws Error if no Lead exists for the given id.
   */
  public convertLead(leadId: string): Client {
    const lead = this.requireLead(leadId)

    if (lead.status !== LeadStatus.WON) {
      this.updateLead(leadId, { status: LeadStatus.WON })
    }

    const primaryContact: ClientContact = {
      id: this.generateId('contact'),
      name: `${lead.firstName} ${lead.lastName}`.trim(),
      email: lead.email,
      phone: lead.phone,
      role: 'Primary Contact',
    }

    return this.createClient({
      company: lead.company,
      industry: lead.industry,
      contacts: [primaryContact],
      status: ClientStatus.ACTIVE,
    })
  }

  /**
   * Creates a new Client record directly.
   *
   * @param input - The fields describing the new client.
   * @returns The newly created Client.
   */
  public createClient(input: CreateClientInput): Client {
    const client: Client = Object.freeze({
      id: this.generateId('client'),
      company: input.company,
      industry: input.industry,
      contacts: input.contacts ? [...input.contacts] : [],
      address: input.address ?? null,
      projects: [],
      notes: input.notes ?? '',
      status: input.status ?? ClientStatus.ACTIVE,
    })

    this.clients.set(client.id, client)
    return client
  }

  /**
   * Creates a new Opportunity tied to an existing Lead.
   *
   * @param input - The fields describing the new opportunity.
   * @returns The newly created Opportunity.
   * @throws Error if no Lead exists for the given leadId.
   */
  public createOpportunity(input: CreateOpportunityInput): Opportunity {
    this.requireLead(input.leadId)

    const opportunity: Opportunity = Object.freeze({
      id: this.generateId('opportunity'),
      leadId: input.leadId,
      estimatedValue: input.estimatedValue,
      probability: input.probability,
      stage: input.stage ?? OpportunityStage.QUALIFICATION,
      expectedClose: input.expectedClose,
    })

    this.opportunities.set(opportunity.id, opportunity)
    return opportunity
  }

  /**
   * Records a new Interaction against an existing Lead.
   *
   * @param input - The fields describing the interaction.
   * @returns The newly created Interaction.
   * @throws Error if no Lead exists for the given leadId.
   */
  public recordInteraction(input: RecordInteractionInput): Interaction {
    this.requireLead(input.leadId)

    const interaction: Interaction = Object.freeze({
      id: this.generateId('interaction'),
      leadId: input.leadId,
      employeeId: input.employeeId,
      type: input.type,
      summary: input.summary,
      createdAt: new Date(),
    })

    this.interactions.set(interaction.id, interaction)
    return interaction
  }

  /**
   * Retrieves a single Lead by id.
   *
   * @param leadId - The id of the Lead to retrieve.
   * @returns The Lead, or undefined if no Lead exists for the given
   *          id.
   */
  public findLead(leadId: string): Lead | undefined {
    return this.leads.get(leadId)
  }

  /**
   * Retrieves a single Client by id.
   *
   * @param clientId - The id of the Client to retrieve.
   * @returns The Client, or undefined if no Client exists for the
   *          given id.
   */
  public findClient(clientId: string): Client | undefined {
    return this.clients.get(clientId)
  }

  /**
   * Lists every stored Lead, optionally filtered by status.
   *
   * @param filter - Optional filters to narrow the result set.
   * @param filter.status - If supplied, only Leads with this status
   *        are returned.
   * @returns The matching Leads.
   */
  public listLeads(filter?: { status?: LeadStatus }): Lead[] {
    const all = [...this.leads.values()]
    return filter?.status ? all.filter((lead) => lead.status === filter.status) : all
  }

  /**
   * Lists every stored Client, optionally filtered by status.
   *
   * @param filter - Optional filters to narrow the result set.
   * @param filter.status - If supplied, only Clients with this
   *        status are returned.
   * @returns The matching Clients.
   */
  public listClients(filter?: { status?: ClientStatus }): Client[] {
    const all = [...this.clients.values()]
    return filter?.status ? all.filter((client) => client.status === filter.status) : all
  }

  /**
   * Retrieves a Lead by id or throws if none exists, so calling
   * methods can operate on a guaranteed-defined Lead.
   */
  private requireLead(leadId: string): Lead {
    const lead = this.leads.get(leadId)
    if (!lead) {
      throw new Error(`CRM: no lead found for id "${leadId}".`)
    }
    return lead
  }

  /**
   * Generates a deterministic-format, prefixed identifier.
   */
  private generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  }
}