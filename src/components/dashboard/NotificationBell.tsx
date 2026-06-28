'use client';

import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useRealtime } from '@/hooks/useRealtime';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { getMyNotificationsAction, getUnreadNotificationCountAction, markNotificationReadAction } from '@/app/actions/notifications';

export function NotificationBell({ userId }: { userId: string }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const { lastEvent } = useRealtime([{ taskId: undefined, projectId: undefined }]);

  const fetchNotifications = async () => {
    const [countRes, notifRes] = await Promise.all([
      getUnreadNotificationCountAction(),
      getMyNotificationsAction()
    ]);
    if (countRes.success) setUnreadCount(countRes.count);
    if (notifRes.success) setNotifications(notifRes.notifications.slice(0, 5));
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    if (lastEvent) {
      fetchNotifications();
    }
  }, [lastEvent]);

  const handleRead = async (id: string, url?: string) => {
    await markNotificationReadAction(id);
    setUnreadCount(prev => Math.max(0, prev - 1));
    setIsOpen(false);
    if (url) {
      router.push(url);
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative group">
          <Bell className="h-5 w-5 text-slate-500 group-hover:text-primary transition-colors" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white shadow-sm ring-2 ring-background animate-in zoom-in">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0 overflow-hidden rounded-xl border-slate-200 shadow-xl">
        <div className="flex items-center justify-between px-4 py-3 bg-\[#fbfaf7\]/80 backdrop-blur-sm border-b">
          <span className="font-semibold text-sm">Notifications</span>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="text-xs bg-primary/10 text-primary hover:bg-primary/20">
              {unreadCount} new
            </Badge>
          )}
        </div>
        
        <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
          {notifications.length === 0 ? (
            <div className="p-8 text-center flex flex-col items-center justify-center text-slate-500">
              <Bell className="h-8 w-8 mb-2 opacity-20" />
              <p className="text-sm">You have no notifications.</p>
            </div>
          ) : (
            notifications.map(notif => (
              <div 
                key={notif.id}
                onClick={() => handleRead(notif.id, notif.actionUrl)}
                className={`p-4 border-b last:border-b-0 cursor-pointer transition-colors hover:bg-\[#fbfaf7\] ${!notif.isRead ? 'bg-primary/5' : ''}`}
              >
                <div className="flex gap-3">
                  <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${!notif.isRead ? 'bg-primary' : 'bg-transparent'}`} />
                  <div className="flex-1 space-y-1">
                    <p className={`text-sm ${!notif.isRead ? 'font-medium text-slate-900' : 'text-slate-600'}`}>
                      {notif.title}
                    </p>
                    <p className="text-xs text-slate-500 line-clamp-2">
                      {notif.message}
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium">
                      {new Date(notif.createdAt).toLocaleDateString()} {new Date(notif.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        
        <div className="p-2 border-t bg-\[#fbfaf7\]/80 backdrop-blur-sm">
          <Link href="/workspace/notifications" onClick={() => setIsOpen(false)}>
            <Button variant="ghost" size="sm" className="w-full text-xs font-medium text-primary hover:text-primary hover:bg-primary/10">
              View all notifications
            </Button>
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
