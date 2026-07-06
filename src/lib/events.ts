import { EventEmitter } from 'events';

// In Next.js dev mode, a global variable prevents the EventEmitter from 
// being destroyed/recreated on every fast refresh.
const globalForEvents = global as unknown as { eventEmitter: EventEmitter };

export const appEventEmitter =
  globalForEvents.eventEmitter || new EventEmitter();

// Increase MaxListeners if we expect many open browser tabs
appEventEmitter.setMaxListeners(50);

if (process.env.NODE_ENV !== 'production') {
  globalForEvents.eventEmitter = appEventEmitter;
}

export type AppEventType = 
  | 'timer_started'
  | 'timer_stopped'
  | 'timer_idle'
  | 'timer_resumed'
  | 'manual_time_added'
  | 'time_entry_updated'
  | 'time_entry_deleted'
  | 'task_hours_updated'
  | 'message_sent'
  | 'notification_created'
  | 'message_read'
  | 'presence_updated'
  | 'message_edited'
  | 'message_deleted';

export function emitAppEvent(event: AppEventType, channel: string, payload: any) {
  // We prefix the event name with the channel so clients can subscribe to specific channels.
  // E.g. eventName = "organization:123:timer_started"
  const eventName = `${channel}:${event}`;
  appEventEmitter.emit(eventName, payload);
}
