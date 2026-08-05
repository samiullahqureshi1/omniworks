import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import NotificationsClient from './NotificationsClient';
import { prisma } from '@/lib/db';

export const metadata = { title: 'Notifications - BridgeWorkspace' };

export default async function NotificationsPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const notifications = await prisma.notification.findMany({
    where: {
      recipientId: session.userId,
      organizationId: session.organizationId
    },
    orderBy: { createdAt: 'desc' }
  });

  return <NotificationsClient initialNotifications={notifications} />;
}
