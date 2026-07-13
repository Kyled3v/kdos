/**
 * EventBus.ts
 *
 * Location: src/core/events/EventBus.ts
 *
 * EventBus is the communication backbone of KDOS. Subsystems publish
 * SystemEvents describing what happened, and other subsystems
 * subscribe to the event names they care about — no subsystem needs
 * a direct reference to another when an event can be published
 * instead.
 *
 * Example flow:
 *   ExecutiveAssistant publishes "ExecutionPlanCreated"
 *     -> WorkforceCoordinator subscribes
 *   TaskQueue publishes "TaskQueued"
 *     -> ExecutionEngine subscribes
 *   ExecutionEngine publishes "TaskCompleted"
 *     -> WorkflowEngine subscribes
 *   WorkflowEngine publishes "WorkflowCompleted"
 *     -> MemorySynchronizer subscribes
 *
 * EventBus is pure infrastructure: no AI, no database, no
 * filesystem, no executive logic, no task execution. It knows
 * nothing about what an event means — only how to deliver it to the
 * handlers that asked for it.
 */

/**
 * A single event flowing through the system. `payload` carries
 * whatever event-specific data the publisher wants to attach;
 * EventBus itself never inspects or interprets it.
 */
export interface SystemEvent {
  readonly id: string
  readonly name: string
  readonly timestamp: Date
  readonly payload: Record<string, unknown>
}

/**
 * A subscriber callback invoked with a SystemEvent. May be
 * synchronous or asynchronous.
 */
export type EventHandler = (event: SystemEvent) => Promise<void> | void

/**
 * EventBus
 *
 * Single responsibility: register handlers against event names and
 * deliver published events to every handler registered for that
 * name, in subscription order.
 *
 * This class:
 *   - Performs no AI calls, database access, or filesystem access.
 *   - Contains no executive reasoning and executes no tasks — it
 *     only routes events between subsystems that already exist.
 *   - Supports multiple listeners per event name.
 *   - Supports both synchronous and asynchronous handlers.
 *   - Prevents the same handler being registered twice for the same
 *     event name.
 *   - Isolates handler failures from one another and from the
 *     publisher, so one broken subscriber cannot block delivery to
 *     the rest or crash the publish call.
 *   - Is dependency-injection ready: it takes no external
 *     dependencies, so it can be constructed freely or supplied
 *     wherever an EventBus is required.
 *
 * THREAD-SAFETY NOTE:
 * JavaScript/TypeScript execution is single-threaded per event loop,
 * so there is no true concurrent memory access to guard against.
 * "Thread-safe where practical" is honored here by making every
 * mutation to internal state (subscribe/unsubscribe/clear)
 * synchronous and atomic with respect to the event loop, and by
 * snapshotting a handler list before iterating it in `publish`, so a
 * handler that subscribes or unsubscribes during dispatch cannot
 * corrupt the in-flight publish.
 */
export class EventBus {
  /**
   * Registered handlers, keyed by event name. Each value is a Set so
   * that re-subscribing the same handler function is a no-op rather
   * than a duplicate registration.
   */
  private readonly handlers = new Map<string, Set<EventHandler>>()

  /**
   * Registers a handler for a given event name. Subscribing the same
   * handler function to the same event name more than once has no
   * additional effect — duplicate subscriptions are not created.
   *
   * @param eventName - The event name to listen for.
   * @param handler - The callback to invoke when that event is
   *        published.
   */
  public subscribe(eventName: string, handler: EventHandler): void {
    const existing = this.handlers.get(eventName)
    if (existing) {
      existing.add(handler)
      return
    }
    this.handlers.set(eventName, new Set([handler]))
  }

  /**
   * Removes a previously registered handler for a given event name.
   * Has no effect if the handler was never subscribed to that event
   * name.
   *
   * @param eventName - The event name to stop listening for.
   * @param handler - The callback to remove.
   */
  public unsubscribe(eventName: string, handler: EventHandler): void {
    const existing = this.handlers.get(eventName)
    if (!existing) {
      return
    }

    existing.delete(handler)

    if (existing.size === 0) {
      this.handlers.delete(eventName)
    }
  }

  /**
   * Publishes an event to every handler currently subscribed to its
   * name, invoking them in subscription order and awaiting each in
   * turn so publish order is preserved end-to-end.
   *
   * Handlers are isolated from one another: if one handler throws or
   * rejects, the error is caught and does not prevent the remaining
   * handlers from running, and does not reject the returned promise.
   * Callers that need to know about handler failures should have
   * their handler report failure via its own mechanism (e.g.
   * publishing a follow-up error event).
   *
   * @param event - The SystemEvent to deliver.
   */
  public async publish(event: SystemEvent): Promise<void> {
    const registered = this.handlers.get(event.name)
    if (!registered || registered.size === 0) {
      return
    }

    // Snapshot the handler list so mutations made by a handler during
    // dispatch (subscribing/unsubscribing) do not affect this publish.
    const handlersToInvoke = [...registered]

    for (const handler of handlersToInvoke) {
      await this.invokeSafely(handler, event)
    }
  }

  /**
   * Removes every registered handler for every event name.
   */
  public clear(): void {
    this.handlers.clear()
  }

  /**
   * Returns the number of handlers currently registered for a given
   * event name.
   *
   * @param eventName - The event name to check.
   * @returns The number of registered handlers, or 0 if none exist.
   */
  public listenerCount(eventName: string): number {
    return this.handlers.get(eventName)?.size ?? 0
  }

  /**
   * Invokes a single handler and swallows any synchronous throw or
   * rejected promise it produces, so one failing subscriber can never
   * interrupt delivery to the rest of the subscribers or bubble an
   * exception up through `publish`.
   */
  private async invokeSafely(handler: EventHandler, event: SystemEvent): Promise<void> {
    try {
      await handler(event)
    } catch (error) {
      this.reportHandlerError(event, error)
    }
  }

  /**
   * Reports a handler failure. Kept as a single overridable seam
   * (rather than inlined at the catch site) so consumers who need
   * different failure reporting can extend this class and override
   * just this method, without touching dispatch logic.
   */
  protected reportHandlerError(event: SystemEvent, error: unknown): void {
    const message = error instanceof Error ? error.message : String(error)
    // eslint-disable-next-line no-console
    console.error(
      `EventBus: handler for event "${event.name}" (id: ${event.id}) threw an error: ${message}`
    )
  }
}