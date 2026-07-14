/**
 * AuthManager.ts
 *
 * Location: src/core/auth/AuthManager.ts
 *
 * AuthManager is the authentication manager for the KyleDev Platform.
 * It authenticates and tracks sessions for every kind of platform
 * user — CEO, Employee, Client, and future System/AI Worker actors —
 * behind a single, uniform session contract.
 *
 * AuthManager holds no database and stores no credentials itself. It
 * verifies identity through an injected CredentialVerifier (so the
 * actual credential store — a database, an identity provider,
 * whatever it ends up being — is a swappable dependency rather than
 * logic baked into this class) and manages the resulting sessions
 * entirely in memory.
 */

/**
 * The set of roles AuthManager can issue sessions for.
 */
export enum UserRole {
  CEO = 'CEO',
  EMPLOYEE = 'EMPLOYEE',
  CLIENT = 'CLIENT',
  SYSTEM = 'SYSTEM',
}

/**
 * An authenticated session for a single user.
 */
export interface UserSession {
  readonly id: string
  readonly email: string
  readonly name: string
  readonly role: UserRole
  readonly createdAt: Date
  readonly expiresAt: Date
}

/**
 * The verified identity of a user who has successfully authenticated,
 * as returned by a CredentialVerifier. Deliberately excludes session
 * fields (id, createdAt, expiresAt) — those are owned by AuthManager,
 * not by whatever verifies credentials.
 */
export interface VerifiedIdentity {
  readonly email: string
  readonly name: string
  readonly role: UserRole
}

/**
 * A pluggable credential verification strategy. AuthManager delegates
 * all identity/credential checking to an implementation of this
 * interface, so it never needs to know whether credentials live in a
 * database, an external identity provider, or anywhere else.
 */
export interface CredentialVerifier {
  /**
   * Verifies a set of credentials and returns the corresponding
   * identity, or null if the credentials are invalid.
   */
  verify(email: string, password: string): Promise<VerifiedIdentity | null>
}

/**
 * Default session lifetime, in milliseconds, used when no explicit
 * TTL is supplied to the constructor.
 */
const DEFAULT_SESSION_TTL_MS = 60 * 60 * 1000 // 1 hour

/**
 * AuthManager
 *
 * Single responsibility: authenticate users via an injected
 * CredentialVerifier and manage their resulting sessions in memory
 * for their full lifecycle — creation, validation, refresh, and
 * termination.
 *
 * This class:
 *   - Uses no database or filesystem; sessions live only in an
 *     in-memory store for the lifetime of this instance.
 *   - Delegates credential checking entirely to the injected
 *     CredentialVerifier — it contains no password logic itself.
 *   - Is dependency-injection ready: both the CredentialVerifier and
 *     the session TTL are supplied via the constructor.
 */
export class AuthManager {
  /**
   * Internal in-memory session store, keyed by session id.
   */
  private readonly sessions = new Map<string, UserSession>()

  private readonly credentialVerifier: CredentialVerifier
  private readonly sessionTtlMs: number

  public constructor(
    credentialVerifier: CredentialVerifier,
    sessionTtlMs: number = DEFAULT_SESSION_TTL_MS
  ) {
    this.credentialVerifier = credentialVerifier
    this.sessionTtlMs = sessionTtlMs
  }

  /**
   * Authenticates a user by email and password via the injected
   * CredentialVerifier and, on success, creates and stores a new
   * in-memory UserSession.
   *
   * @param email - The user's email address.
   * @param password - The user's password.
   * @returns The newly created UserSession.
   * @throws Error if the credentials are invalid.
   */
  public async login(email: string, password: string): Promise<UserSession> {
    const identity = await this.credentialVerifier.verify(email, password)

    if (!identity) {
      throw new Error('AuthManager: invalid credentials.')
    }

    const session = this.createSession(identity)
    this.sessions.set(session.id, session)

    return session
  }

  /**
   * Terminates a single session, removing it from the in-memory
   * store. Has no effect if the session id does not exist.
   *
   * @param sessionId - The id of the session to terminate.
   */
  public logout(sessionId: string): void {
    this.sessions.delete(sessionId)
  }

  /**
   * Checks whether a session id refers to a currently valid,
   * unexpired session. Automatically evicts the session from the
   * store if it has expired.
   *
   * @param sessionId - The id of the session to validate.
   * @returns true if the session exists and has not expired.
   */
  public validate(sessionId: string): boolean {
    const session = this.sessions.get(sessionId)

    if (!session) {
      return false
    }

    if (this.isExpired(session)) {
      this.sessions.delete(sessionId)
      return false
    }

    return true
  }

  /**
   * Extends a valid session's expiry by the configured session TTL,
   * measured from the time refresh() is called.
   *
   * @param sessionId - The id of the session to refresh.
   * @returns The refreshed UserSession.
   * @throws Error if the session does not exist or has already
   *         expired.
   */
  public refresh(sessionId: string): UserSession {
    const session = this.sessions.get(sessionId)

    if (!session || this.isExpired(session)) {
      this.sessions.delete(sessionId)
      throw new Error(`AuthManager: cannot refresh unknown or expired session "${sessionId}".`)
    }

    const refreshed: UserSession = Object.freeze({
      ...session,
      expiresAt: new Date(Date.now() + this.sessionTtlMs),
    })

    this.sessions.set(sessionId, refreshed)
    return refreshed
  }

  /**
   * Retrieves a session by id without validating or mutating it.
   * Callers that need to enforce validity should call validate()
   * first, or use refresh() to both validate and extend.
   *
   * @param sessionId - The id of the session to retrieve.
   * @returns The UserSession, or undefined if no session exists for
   *          that id.
   */
  public getSession(sessionId: string): UserSession | undefined {
    return this.sessions.get(sessionId)
  }

  /**
   * Destroys all sessions currently held in memory, for every user
   * and every role.
   */
  public destroy(): void {
    this.sessions.clear()
  }

  /**
   * Builds a new UserSession from a verified identity, assigning a
   * fresh id, creation timestamp, and expiry based on the configured
   * session TTL.
   */
  private createSession(identity: VerifiedIdentity): UserSession {
    const now = new Date()

    return Object.freeze({
      id: this.generateSessionId(),
      email: identity.email,
      name: identity.name,
      role: identity.role,
      createdAt: now,
      expiresAt: new Date(now.getTime() + this.sessionTtlMs),
    })
  }

  /**
   * Determines whether a session's expiry has passed.
   */
  private isExpired(session: UserSession): boolean {
    return session.expiresAt.getTime() <= Date.now()
  }

  /**
   * Generates a deterministic-format session identifier.
   */
  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  }
}