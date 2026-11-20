export interface DomainEvent {
  eventName: string;
  occurredOn: Date;
  payload: any;
}

export type DomainEventHandler<T extends DomainEvent = DomainEvent> = (event: T) => Promise<void> | void;

/**
 * Singleton Domain Event Publisher implementing Observer pattern.
 * Enables loose coupling between core business transactions and auxiliary audit/notification side-effects.
 */
export class DomainEventPublisher {
  private static instance: DomainEventPublisher;
  private handlers: Map<string, DomainEventHandler[]> = new Map();

  private constructor() {}

  public static getInstance(): DomainEventPublisher {
    if (!DomainEventPublisher.instance) {
      DomainEventPublisher.instance = new DomainEventPublisher();
    }
    return DomainEventPublisher.instance;
  }

  public subscribe<T extends DomainEvent>(eventName: string, handler: DomainEventHandler<T>): void {
    const existing = this.handlers.get(eventName) || [];
    existing.push(handler as DomainEventHandler);
    this.handlers.set(eventName, existing);
  }

  public async publish<T extends DomainEvent>(event: T): Promise<void> {
    const registeredHandlers = this.handlers.get(event.eventName) || [];
    for (const handler of registeredHandlers) {
      try {
        await handler(event);
      } catch (err) {
        console.error(`Error in event handler for ${event.eventName}:`, err);
      }
    }
  }

  public clear(): void {
    this.handlers.clear();
  }
}
