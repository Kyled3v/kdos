import type { EmployeeMemory, EmployeeMemoryType } from "../employee/types";

/**
 * Criteria used to search across stored memories.
 */
export interface MemorySearchCriteria {
  readonly employeeId?: string;
  readonly type?: EmployeeMemoryType;
  readonly query?: string;
}

/**
 * Abstraction over the underlying persistence mechanism for memory
 * records. The in-memory store implements this today; a Postgres/
 * Supabase-backed store can implement it later without changing the
 * public API of MemoryEngine.
 */
interface MemoryStore {
  set(id: string, memory: EmployeeMemory): void;
  get(id: string): EmployeeMemory | undefined;
  delete(id: string): boolean;
  values(): IterableIterator<EmployeeMemory>;
  has(id: string): boolean;
}

/**
 * Default in-process implementation of MemoryStore, backed by a Map.
 */
class InMemoryMemoryStore implements MemoryStore {
  private readonly records: Map<string, EmployeeMemory>;

  public constructor() {
    this.records = new Map<string, EmployeeMemory>();
  }

  public set(id: string, memory: EmployeeMemory): void {
    this.records.set(id, memory);
  }

  public get(id: string): EmployeeMemory | undefined {
    return this.records.get(id);
  }

  public delete(id: string): boolean {
    return this.records.delete(id);
  }

  public values(): IterableIterator<EmployeeMemory> {
    return this.records.values();
  }

  public has(id: string): boolean {
    return this.records.has(id);
  }
}

/**
 * Singleton engine providing memory storage and retrieval services to
 * every AI employee in KDOS. The underlying storage mechanism is
 * abstracted behind MemoryStore so it can later be backed by
 * PostgreSQL/Supabase without changing this public API.
 */
export class MemoryEngine {
  private static instance: MemoryEngine | null = null;

  private readonly store: MemoryStore;

  private constructor(store: MemoryStore) {
    this.store = store;
  }

  /**
   * Returns the singleton instance of the engine.
   */
  public static getInstance(): MemoryEngine {
    if (MemoryEngine.instance === null) {
      MemoryEngine.instance = new MemoryEngine(new InMemoryMemoryStore());
    }

    return MemoryEngine.instance;
  }

  /**
   * Adds a new memory record. Throws if the memory is invalid or a
   * record with the same id already exists.
   */
  public add(memory: EmployeeMemory): void {
    this.validateMemory(memory);

    if (this.store.has(memory.id)) {
      throw new Error(
        `MemoryEngine: memory with id "${memory.id}" already exists.`
      );
    }

    this.store.set(memory.id, memory);
  }

  /**
   * Retrieves a single memory record by id. Throws if it does not
   * exist.
   */
  public get(memoryId: string): EmployeeMemory {
    if (!memoryId) {
      throw new Error("MemoryEngine: memoryId is required.");
    }

    const memory = this.store.get(memoryId);

    if (!memory) {
      throw new Error(
        `MemoryEngine: memory with id "${memoryId}" does not exist.`
      );
    }

    return memory;
  }

  /**
   * Returns all stored memory records, optionally filtered by
   * employee and/or type.
   */
  public getAll(filter?: {
    employeeId?: string;
    type?: EmployeeMemoryType;
  }): EmployeeMemory[] {
    let results = Array.from(this.store.values());

    if (filter?.employeeId) {
      results = results.filter(
        (memory) => memory.employeeId === filter.employeeId
      );
    }

    if (filter?.type) {
      results = results.filter((memory) => memory.type === filter.type);
    }

    return results;
  }

  /**
   * Searches memory records by employee id, type, and/or a
   * case-insensitive substring match against content. Throws if no
   * criteria are provided.
   */
  public search(criteria: MemorySearchCriteria): EmployeeMemory[] {
    if (!criteria) {
      throw new Error("MemoryEngine: criteria is required.");
    }

    if (!criteria.employeeId && !criteria.type && !criteria.query) {
      throw new Error(
        "MemoryEngine: at least one search criterion must be provided."
      );
    }

    let results = Array.from(this.store.values());

    if (criteria.employeeId) {
      results = results.filter(
        (memory) => memory.employeeId === criteria.employeeId
      );
    }

    if (criteria.type) {
      results = results.filter((memory) => memory.type === criteria.type);
    }

    if (criteria.query) {
      const normalisedQuery = criteria.query.toLowerCase();
      results = results.filter((memory) =>
        memory.content.toLowerCase().includes(normalisedQuery)
      );
    }

    return results;
  }

  /**
   * Removes a memory record by id. Throws if it does not exist.
   */
  public remove(memoryId: string): void {
    if (!memoryId) {
      throw new Error("MemoryEngine: memoryId is required.");
    }

    if (!this.store.has(memoryId)) {
      throw new Error(
        `MemoryEngine: memory with id "${memoryId}" does not exist.`
      );
    }

    this.store.delete(memoryId);
  }

  /**
   * Removes all memory records belonging to a specific employee.
   * Throws if no employeeId is provided.
   */
  public clearEmployee(employeeId: string): void {
    if (!employeeId) {
      throw new Error("MemoryEngine: employeeId is required.");
    }

    const toRemove = this.getAll({ employeeId });

    for (const memory of toRemove) {
      this.store.delete(memory.id);
    }
  }

  /**
   * Returns the total number of stored memory records, optionally
   * filtered by employee and/or type.
   */
  public count(filter?: {
    employeeId?: string;
    type?: EmployeeMemoryType;
  }): number {
    return this.getAll(filter).length;
  }

  /**
   * Validates the shape of a memory record before storage.
   */
  private validateMemory(memory: EmployeeMemory): void {
    if (!memory) {
      throw new Error("MemoryEngine: memory is required.");
    }

    if (!memory.id) {
      throw new Error("MemoryEngine: memory.id is required.");
    }

    if (!memory.employeeId) {
      throw new Error("MemoryEngine: memory.employeeId is required.");
    }

    if (!memory.type) {
      throw new Error("MemoryEngine: memory.type is required.");
    }

    if (!memory.content || memory.content.trim().length === 0) {
      throw new Error("MemoryEngine: memory.content is required.");
    }
  }
}

export const memoryEngine = MemoryEngine.getInstance();