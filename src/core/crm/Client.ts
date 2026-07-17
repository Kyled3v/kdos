/**
 * Client.ts
 *
 * Location: src/core/crm/Client.ts
 *
 * Client represents a Lead that has successfully converted: an
 * organization KDOS now does business with. This file contains no
 * logic — it is a pure data shape managed by CRM.
 */

/**
 * The current relationship status of a Client.
 */
export enum ClientStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ARCHIVED = 'ARCHIVED',
}

/**
 * A single point of contact at a Client organization.
 */
export interface ClientContact {
  readonly id: string
  readonly name: string
  readonly email: string
  readonly phone: string
  readonly role: string
}

/**
 * A Client's physical or mailing address.
 */
export interface ClientAddress {
  readonly street: string
  readonly city: string
  readonly province: string
  readonly country: string
  readonly postalCode: string
}

/**
 * A converted client organization.
 */
export interface Client {
  readonly id: string
  readonly company: string
  readonly industry: string
  readonly contacts: ClientContact[]
  readonly address: ClientAddress | null
  readonly projects: string[]
  readonly notes: string
  readonly status: ClientStatus
}