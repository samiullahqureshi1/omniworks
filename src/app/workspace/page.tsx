import React from 'react';
import { getDashboardDataAction } from '@/app/actions/dashboard';
import { getCurrentUser } from '@/app/actions/auth';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { FolderKanban, Clock, Users, Activity, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

import DashboardHeader from '@/components/dashboard/DashboardHeader';
import OwnerDashboard from '@/components/dashboard/OwnerDashboard';
import MemberDashboard from '@/components/dashboard/MemberDashboard';
import ClientDashboard from '@/components/dashboard/ClientDashboard';

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const res = await getDashboardDataAction();
  
  if (!res.success) {
    return <div className="p-6 text-red-500">Error loading dashboard data: {res.error}</div>;
  }

  const { metrics, view } = res;

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      <DashboardHeader user={{ name: user?.name || '', role: user?.role || '' }} />
      
      {view === 'OWNER' && <OwnerDashboard metrics={metrics} />}
      {(view === 'MEMBER' || view === 'PROJECT_MANAGER') && <MemberDashboard metrics={metrics} />}
      {view === 'CLIENT' && <ClientDashboard metrics={metrics} />}
    </div>
  );
}
