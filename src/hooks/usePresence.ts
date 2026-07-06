import { useEffect } from 'react';

export function usePresence() {
  useEffect(() => {
    const pingPresence = async () => {
      try {
        await fetch('/api/presence', { method: 'POST' });
      } catch (err) {
        console.error('Failed to update presence', err);
      }
    };

    // Ping immediately
    pingPresence();

    // Ping every 30 seconds
    const interval = setInterval(pingPresence, 30000);

    return () => clearInterval(interval);
  }, []);
}
