import { useEffect, useState } from 'react';

/**
 * Subscribe to server-sent realtime events.
 *
 * Connections are SHARED. Several components subscribe to the same channels on one
 * page (the workspace layout, the page component, the notification bell…), and each
 * used to open its own EventSource. Every stream costs the server one listener per
 * (channel, event) pair — about 24 for the default channels — so a single user was
 * holding ~3 streams and ~70 listeners.
 *
 * Now one EventSource is opened per unique channel set and reference-counted, so
 * additional subscribers on a page are free. That cuts server-side listeners roughly
 * threefold, which is what makes 100–150 concurrent users viable on one instance.
 */

type RealtimeEvent = { event: string; payload: any };
type Subscriber = (event: RealtimeEvent) => void;

type Connection = {
  source: EventSource;
  subscribers: Set<Subscriber>;
};

// Module-level, so every hook instance in the tab shares the same streams.
const connections = new Map<string, Connection>();

function subscribe(url: string, subscriber: Subscriber): () => void {
  let connection = connections.get(url);

  if (!connection) {
    const source = new EventSource(url);
    const created: Connection = { source, subscribers: new Set() };

    source.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.event === 'connected') return;
        // Copy first: a subscriber may unsubscribe while we iterate.
        [...created.subscribers].forEach((fn) => fn(data));
      } catch {
        // Malformed frame — ignore rather than tear the stream down.
      }
    };

    source.onerror = () => {
      // Browsers reconnect SSE automatically. Do NOT close here, or the shared
      // stream would be dropped permanently for every subscriber.
    };

    connections.set(url, created);
    connection = created;
  }

  connection.subscribers.add(subscriber);

  return () => {
    const active = connections.get(url);
    if (!active) return;

    active.subscribers.delete(subscriber);

    // Close only once nothing on the page is listening any more.
    if (active.subscribers.size === 0) {
      active.source.close();
      connections.delete(url);
    }
  };
}

export function useRealtime(channels: { projectId?: string; taskId?: string; groupId?: string }[]) {
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null);

  // Serialised channel list — this is also the shared-connection key.
  const params = new URLSearchParams();
  channels.forEach((ch) => {
    if (ch.projectId) params.append('projectId', ch.projectId);
    if (ch.taskId) params.append('taskId', ch.taskId);
    if (ch.groupId) params.append('groupId', ch.groupId);
  });
  const url = `/api/realtime?${params.toString()}`;

  useEffect(() => {
    return subscribe(url, setLastEvent);
  }, [url]);

  return { lastEvent };
}
