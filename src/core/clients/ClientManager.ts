/**
 * ClientManager.ts
 *
 * Location: src/core/clients/ClientManager.ts
 *
 * ClientManager is the single source of truth for every client in
 * KDOS. Every project, invoice, and support ticket belongs to a
 * client managed here.
 *
 * This file contains no AI logic, no authentication, and no
 * persistence beyond an in-memory store — it is a pure domain/data
 * layer responsible only for client records themselves.
 */

/**
 * The lifecycle status of a client relationship.
 */
export enum ClientStatus {
  LEAD = 'LEAD',
  PROSPECT = 'PROSPECT',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ARCHIVED = 'ARCHIVED',
}

/**
 * A single client record.
 */
export interface Client {
  readonly id: string
  readonly companyName: string
  readonly contactPerson: string
  readonly email: string
  readonly phone: string
  readonly status: ClientStatus
  readonly industry: string
  readonly website: string | null
  readonly notes: string
  readonly createdAt: Date
  readonly updatedAt: Date
}

/**
 * The fields required to create a new Client. Status defaults to
 * LEAD when not supplied; timestamps and id are always assigned by
 * ClientManager itself.
 */
export interface CreateClientInput {
  readonly companyName: string
  readonly contactPerson: string
  readonly email: string
  readonly phone: string
  readonly industry: string
  readonly website?: string | null
  readonly notes?: string
  readonly status?: ClientStatus
}

/**
 * The fields that may be updated on an existing Client. All fields
 * are optional — only supplied fields are changed.
 */
export interface UpdateClientInput {
  readonly companyName?: string
  readonly contactPerson?: string
  readonly email?: string
  readonly phone?: string
  readonly status?: ClientStatus
  readonly industry?: string
  readonly website?: string | null
  readonly notes?: string
}

/**
 * Generates unique client identifiers. Extracted as an injectable
 * dependency so id generation strategy (uuid, nanoid, sequential,
 * etc.) can be swapped without changing ClientManager itself.
 */
export interface IdGenerator {
  generate(prefix: string): string
}

/**
 * Default IdGenerator implementation, used when no IdGenerator is
 * injected.
 */
class DefaultIdGenerator implements IdGenerator {
  public generate(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  }
}

/**
 * ClientManager
 *
 * Single responsibility: own the full lifecycle of Client records —
 * creation, update, archival, restoration, deletion, retrieval, and
 * search — entirely in memory.
 *
 * This class:
 *   - Uses no database or filesystem; all state lives in memory for
 *     the lifetime of this instance.
 *   - Performs no AI calls.
 *   - Performs no authentication or authorization — callers are
 *     assumed to already be authorized by the time they reach this
 *     class.
 *   - Never mutates a returned Client in place; every change
 *     produces a new, frozen record.
 *   - Is dependency-injection ready: id generation is supplied via
 *     the constructor.
 */
export class ClientManager {
  /**
   * Internal in-memory client store, keyed by client id.
   */
  private readonly clients = new Map<string, Client>()

  private readonly idGenerator: IdGenerator

  public constructor(idGenerator: IdGenerator = new DefaultIdGenerator()) {
    this.idGenerator = idGenerator
  }

  /**
   * Creates a new Client record.
   *
   * @param input - The fields describing the new client.
   * @returns The newly created Client.
   */
  public createClient(input: CreateClientInput): Client {
    const now = new Date()

    const client: Client = Object.freeze({
      id: this.idGenerator.generate('client'),
      companyName: input.companyName,
      contactPerson: input.contactPerson,
      email: input.email,
      phone: input.phone,
      status: input.status ?? ClientStatus.LEAD,
      industry: input.industry,
      website: input.website ?? null,
      notes: input.notes ?? '',
      createdAt: now,
      updatedAt: now,
    })

    this.clients.set(client.id, client)
    return client
  }

  /**
   * Updates an existing Client with the supplied fields. Fields not
   * present in `input` are left unchanged.
   *
   * @param clientId - The id of the Client to update.
   * @param input - The fields to change.
   * @returns The updated Client.
   * @throws Error if no Client exists for the given id.
   */
  public updateClient(clientId: string, input: UpdateClientInput): Client {
    const client = this.requireClient(clientId)

    const updated: Client = Object.freeze({
      ...client,
      ...input,
      updatedAt: new Date(),
    })

    this.clients.set(clientId, updated)
    return updated
  }

  /**
   * Archives a Client by setting its status to ARCHIVED. Idempotent —
   * archiving an already-archived client simply refreshes its
   * updatedAt timestamp.
   *
   * @param clientId - The id of the Client to archive.
   * @returns The archived Client.
   * @throws Error if no Client exists for the given id.
   */
  public archiveClient(clientId: string): Client {
    return this.updateClient(clientId, { status: ClientStatus.ARCHIVED })
  }

  /**
   * Restores an archived Client back to ACTIVE status.
   *
   * @param clientId - The id of the Client to restore.
   * @returns The restored Client.
   * @throws Error if no Client exists for the given id.
   */
  public restoreClient(clientId: string): Client {
    return this.updateClient(clientId, { status: ClientStatus.ACTIVE })
  }

  /**
   * Permanently removes a Client record from the store. Unlike
   * archiveClient, this is not reversible — the record is gone.
   *
   * @param clientId - The id of the Client to delete.
   * @throws Error if no Client exists for the given id.
   */
  public deleteClient(clientId: string): void {
    this.requireClient(clientId)
    this.clients.delete(clientId)
  }

  /**
   * Retrieves a single Client by id.
   *
   * @param clientId - The id of the Client to retrieve.
   * @returns The Client, or undefined if no Client exists for the
   *          given id.
   */
  public getClient(clientId: string): Client | undefined {
    return this.clients.get(clientId)
  }

  /**
   * Retrieves every stored Client, optionally filtered by status.
   *
   * @param status - If supplied, only Clients with this status are
   *        returned.
   * @returns The matching Clients.
   */
  public getClients(status?: ClientStatus): Client[] {
    const all = [...this.clients.values()]
    return status ? all.filter((client) => client.status === status) : all
  }

  /**
   * Searches Clients by a free-text query, matched case-insensitively
   * against company name, contact person, email, and industry.
   *
   * @param query - The search text.
   * @returns Clients with at least one matching field. Returns every
   *          Client if the query is empty or whitespace-only.
   */
  public searchClients(query: string): Client[] {
    const normalized = query.trim().toLowerCase()

    if (normalized.length === 0) {
      return [...this.clients.values()]
    }

    return [...this.clients.values()].filter((client) =>
      [client.companyName, client.contactPerson, client.email, client.industry]
        .join(' ')
        .toLowerCase()
        .includes(normalized)
    )
  }

  /**
   * Retrieves a Client by id or throws if none exists, so calling
   * methods can operate on a guaranteed-defined Client.
   */
  private requireClient(clientId: string): Client {
    const client = this.clients.get(clientId)
    if (!client) {
      throw new Error(`ClientManager: no client found for id "${clientId}".`)
    }
    return client
  }
}