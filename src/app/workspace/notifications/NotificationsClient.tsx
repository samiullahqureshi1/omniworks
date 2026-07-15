'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, CheckCircle2 } from 'lucide-react';
import { markAllNotificationsReadAction, markNotificationReadAction, getMyNotificationsAction } from '@/app/actions/notifications';
import { useRouter } from 'next/navigation';
import { useRealtime } from '@/hooks/useRealtime';

export default function NotificationsClient({ initialNotifications }: { initialNotifications: any[] }) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const router = useRouter();
  
  const { lastEvent } = useRealtime([{ taskId: undefined, projectId: undefined }]);

  useEffect(() => {
    if (lastEvent) {
      getMyNotificationsAction().then(res => {
        if (res.success) {
          setNotifications(res.notifications);
        }
      });
    }
  }, [lastEvent]);

  const handleMarkAllRead = async () => {
    await markAllNotificationsReadAction();
    setNotifications(notifications.map(n => ({ ...n, isRead: true })));
  };

  const handleRead = async (id: string, url: string | null) => {
    await markNotificationReadAction(id);
    setNotifications(notifications.map(n => n.id === id ? { ...n, isRead: true } : n));
    if (url) router.push(url);
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Notifications</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Stay updated on your workspace activities</p>
        </div>
        {unreadCount > 0 && (
          <Button onClick={handleMarkAllRead} variant="outline" size="sm" className="gap-2 shrink-0">
            <CheckCircle2 size={16} />
            Mark all as read
          </Button>
        )}
      </div>

      <Card className="border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {notifications.length === 0 ? (
            <div className="p-16 text-center text-slate-500 dark:text-slate-400 flex flex-col items-center justify-center">
              <div className="h-16 w-16 bg-slate-100 dark:bg-white/10 rounded-full flex items-center justify-center mb-4">
                <Bell className="h-8 w-8 text-slate-300 dark:text-slate-600" />
              </div>
              <h3 className="text-lg font-medium text-slate-700 dark:text-slate-200">No notifications yet</h3>
              <p className="text-sm mt-1">When there's activity in your workspace, you'll see it here.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-white/5">
              {notifications.map(notif => (
                <div
                  key={notif.id}
                  onClick={() => handleRead(notif.id, notif.actionUrl)}
                  className={`p-4 sm:p-5 flex gap-4 transition-colors cursor-pointer hover:bg-\[#fbfaf7\] dark:hover:bg-white/5 ${!notif.isRead ? 'bg-primary/[0.03]' : ''}`}
                >
                  <div className="mt-1">
                    <div className={`h-2.5 w-2.5 rounded-full shadow-sm ${!notif.isRead ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`} />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <h4 className={`text-sm ${!notif.isRead ? 'font-semibold text-slate-900 dark:text-white' : 'font-medium text-slate-700 dark:text-slate-300'}`}>
                      {notif.title}
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl">{notif.message}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 font-medium pt-1 uppercase tracking-wider">
                      {new Date(notif.createdAt).toLocaleDateString()} at {new Date(notif.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
