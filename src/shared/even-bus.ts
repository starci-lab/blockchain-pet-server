// shared/event-bus.ts
import { EventEmitter2 } from 'eventemitter2';

// Singleton shared instance
export const eventBus = new EventEmitter2({
  wildcard: true,
  delimiter: '.',
});
