export type EventPayloadMap = object;

export type EventName<TEvents extends EventPayloadMap> = Extract<keyof TEvents, string>;

export type EventHandler<TPayload> = (payload: TPayload) => void;

export type EventPayload<
  TEvents extends EventPayloadMap,
  TName extends EventName<TEvents>
> = TEvents[TName];

export type EventPayloadArgs<TEvents extends EventPayloadMap, TName extends EventName<TEvents>> =
  undefined extends EventPayload<TEvents, TName>
    ? [payload?: EventPayload<TEvents, TName>]
    : [payload: EventPayload<TEvents, TName>];

export type Unsubscribe = () => void;

type StoredEventHandler = (payload: unknown) => void;

/**
 * Coordinates typed event communication between Gallery Engine modules.
 */
export class EventBus<TEvents extends EventPayloadMap> {
  private readonly handlers = new Map<EventName<TEvents>, Set<StoredEventHandler>>();

  /**
   * Register an event handler.
   */
  public on<TName extends EventName<TEvents>>(
    eventName: TName,
    handler: EventHandler<EventPayload<TEvents, TName>>
  ): Unsubscribe {
    this.getHandlers(eventName).add(handler as StoredEventHandler);

    return () => {
      this.off(eventName, handler);
    };
  }

  /**
   * Register an event handler that runs once.
   */
  public once<TName extends EventName<TEvents>>(
    eventName: TName,
    handler: EventHandler<EventPayload<TEvents, TName>>
  ): Unsubscribe {
    const unsubscribe = this.on(eventName, (payload) => {
      unsubscribe();
      handler(payload);
    });

    return unsubscribe;
  }

  /**
   * Remove a registered event handler.
   */
  public off<TName extends EventName<TEvents>>(
    eventName: TName,
    handler: EventHandler<EventPayload<TEvents, TName>>
  ): void {
    const eventHandlers = this.handlers.get(eventName);

    if (!eventHandlers) {
      return;
    }

    eventHandlers.delete(handler as StoredEventHandler);

    if (eventHandlers.size === 0) {
      this.handlers.delete(eventName);
    }
  }

  /**
   * Emit an event to all registered handlers.
   */
  public emit<TName extends EventName<TEvents>>(
    eventName: TName,
    ...payloadArgs: EventPayloadArgs<TEvents, TName>
  ): void {
    const eventHandlers = this.handlers.get(eventName);

    if (!eventHandlers) {
      return;
    }

    for (const handler of [...eventHandlers]) {
      handler(payloadArgs[0]);
    }
  }

  /**
   * Remove all handlers, or all handlers for a single event.
   */
  public clear(eventName?: EventName<TEvents>): void {
    if (eventName) {
      this.handlers.delete(eventName);
      return;
    }

    this.handlers.clear();
  }

  private getHandlers(eventName: EventName<TEvents>): Set<StoredEventHandler> {
    const existingHandlers = this.handlers.get(eventName);

    if (existingHandlers) {
      return existingHandlers;
    }

    const eventHandlers = new Set<StoredEventHandler>();
    this.handlers.set(eventName, eventHandlers);

    return eventHandlers;
  }
}
