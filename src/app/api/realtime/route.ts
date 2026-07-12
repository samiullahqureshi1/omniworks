import { NextRequest } from 'next/server';
import { appEventEmitter } from '@/lib/events';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { organizationId, userId } = session;
  const searchParams = req.nextUrl.searchParams;
  const projectIds = searchParams.getAll('projectId');
  const taskIds = searchParams.getAll('taskId');
  const groupIds = searchParams.getAll('groupId');
  
  let channels: string[] = [];
  
  channels.push(`organization:${organizationId}`);
  channels.push(`user:${userId}`);
  
  if (projectIds.length) {
    projectIds.forEach(p => channels.push(`project:${p}`));
  }
  if (taskIds.length) {
    taskIds.forEach(t => channels.push(`task:${t}`));
  }
  if (groupIds.length) {
    groupIds.forEach(g => channels.push(`group:${g}`));
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ event: 'connected' })}\n\n`));

      // Send a heartbeat comment every 30 seconds to keep the connection alive
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`:\n\n`));
        } catch (e) {
          clearInterval(heartbeatInterval);
        }
      }, 30000);

      const listener = (event: string, payload: any) => {
        const dataStr = JSON.stringify({ event, payload });
        controller.enqueue(encoder.encode(`data: ${dataStr}\n\n`));
      };

      const eventsToListen = [
        'timer_started', 
        'timer_stopped', 
        'timer_idle', 
        'timer_resumed', 
        'manual_time_added', 
        'time_entry_updated', 
        'time_entry_deleted', 
        'task_hours_updated',
        'message_sent',
        'notification_created',
        'message_read',
        'presence_updated'
      ];
      
      const boundListeners: { name: string, fn: any }[] = [];

      channels.forEach(channel => {
        eventsToListen.forEach(ev => {
          const eventName = `${channel}:${ev}`;
          const handler = (payload: any) => listener(ev, payload);
          appEventEmitter.on(eventName, handler);
          boundListeners.push({ name: eventName, fn: handler });
        });
      });

      req.signal.addEventListener('abort', () => {
        clearInterval(heartbeatInterval);
        boundListeners.forEach(bl => appEventEmitter.off(bl.name, bl.fn));
        try {
          controller.close();
        } catch (e) {
          // Ignore if already closed
        }
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
