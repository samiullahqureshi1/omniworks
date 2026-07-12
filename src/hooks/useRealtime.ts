import { useEffect, useState } from 'react';

export function useRealtime(channels: { projectId?: string; taskId?: string; groupId?: string }[]) {
  const [lastEvent, setLastEvent] = useState<{ event: string, payload: any } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    channels.forEach(ch => {
      if (ch.projectId) params.append('projectId', ch.projectId);
      if (ch.taskId) params.append('taskId', ch.taskId);
      if (ch.groupId) params.append('groupId', ch.groupId);
    });

    const url = `/api/realtime?${params.toString()}`;
    const eventSource = new EventSource(url);

    eventSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.event === 'connected') return;
        setLastEvent(data);
      } catch (err) {
        console.error('SSE parsing error', err);
      }
    };

    eventSource.onerror = (e) => {
      // Browsers natively reconnect SSE on drops. Do NOT close the connection here.
      // e is an opaque Event object, so logging it is usually unhelpful.
    };

    return () => {
      eventSource.close();
    };
  }, [JSON.stringify(channels)]);

  return { lastEvent };
}
