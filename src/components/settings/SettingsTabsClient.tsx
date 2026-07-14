'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { ProjectStatusesTab } from './ProjectStatusesTab';
import { TaskStatusesTab } from './TaskStatusesTab';
import { DelegateAccessTab } from './DelegateAccessTab';
import { NotificationsTab } from './NotificationsTab';
import { PermissionsTab } from './PermissionsTab';
import { UpgradeTab } from './UpgradeTab';

export function SettingsTabsClient({ 
  children, 
  userRole, 
  currentOrgId 
}: { 
  children: React.ReactNode, 
  userRole?: string, 
  currentOrgId?: string 
}) {
  const isOwner = userRole === 'OWNER';
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');

  const activeTab = (tabParam === 'project' || tabParam === 'task' || tabParam === 'security' || tabParam === 'delegate' || tabParam === 'notifications' || tabParam === 'permissions' || tabParam === 'upgrade')
    ? tabParam
    : (isOwner ? 'project' : 'security');

  return (
    <div className="w-full">
      {isOwner && activeTab === 'project' && <ProjectStatusesTab />}
      {isOwner && activeTab === 'task' && <TaskStatusesTab />}
      {activeTab === 'security' && (
        <div className="w-full bg-white dark:bg-[#151518] rounded-xl shadow-sm border border-slate-200/80 dark:border-white/10 p-6">
          {children}
        </div>
      )}
      {activeTab === 'delegate' && <DelegateAccessTab currentOrgId={currentOrgId || ''} />}
      {activeTab === 'notifications' && <NotificationsTab />}
      {activeTab === 'permissions' && <PermissionsTab />}
      {activeTab === 'upgrade' && <UpgradeTab />}
    </div>
  );
}
