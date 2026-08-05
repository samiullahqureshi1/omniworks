import { EventEmitter } from 'events';

// In Next.js dev mode, a global variable prevents the EventEmitter from 
// being destroyed/recreated on every fast refresh.
const globalForEvents = global as unknown as { eventEmitter: EventEmitter };

export const appEventEmitter =
  globalForEvents.eventEmitter || new EventEmitter();

/**
 * Node warns once more than N listeners are attached to the SAME event name.
 * Every open SSE stream attaches one listener per (channel, event) pair, and all
 * users in an organization share the `organization:<id>:*` event names — so the old
 * limit of 50 began emitting MaxListenersExceededWarning at roughly 50 concurrent
 * users in one org, well under the 100–150 target.
 *
 * Listeners are removed on stream abort (see /api/realtime), so a higher ceiling is
 * safe: the limit exists to catch leaks, not to cap capacity.
 *
 * NOTE: this emitter is per-process and does not fan out across instances.
 * Moving to Redis pub/sub is the follow-up (checklist 2.2).
 */
const MAX_EVENT_LISTENERS = Number(process.env.SSE_MAX_LISTENERS) || 2000;
appEventEmitter.setMaxListeners(MAX_EVENT_LISTENERS);

if (process.env.NODE_ENV !== 'production') {
  globalForEvents.eventEmitter = appEventEmitter;
}

export type AppEventType = 
  | 'timer_started'
  | 'timer_stopped'
  | 'timer_idle'
  | 'timer_resumed'
  | 'timer_sleeping'
  | 'timer_woke_up'
  | 'timer_auto_stopped'
  | 'manual_time_added'
  | 'time_entry_updated'
  | 'time_entry_deleted'
  | 'task_hours_updated'
  | 'message_sent'
  | 'notification_created'
  | 'message_read'
  | 'presence_updated'
  | 'message_edited'
  | 'message_deleted'
  | 'hours_request_submitted'
  | 'hours_request_approved'
  | 'hours_request_rejected';

export function emitAppEvent(event: AppEventType, channel: string, payload: any) {
  // We prefix the event name with the channel so clients can subscribe to specific channels.
  // E.g. eventName = "organization:123:timer_started"
  const eventName = `${channel}:${event}`;
  appEventEmitter.emit(eventName, payload);
}
