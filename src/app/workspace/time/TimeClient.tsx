'use client';

import React from 'react';
import OwnerTimeDashboard from './OwnerTimeDashboard';
import MemberTimeTracker from './MemberTimeTracker';
import ClientTimeReports from './ClientTimeReports';

export default function TimeClient({ 
  initialActiveTimer, 
  initialTimeEntries, 
  assignedTasks,
  allProjects,
  allUsers,
  allTasks,
  userRole,
  userId,
  organizationId
}: { 
  initialActiveTimer: any, 
  initialTimeEntries: any[], 
  assignedTasks: any[],
  allProjects: any[],
  allUsers: any[],
  allTasks: any[],
  userRole: string,
  userId: string,
  organizationId: string
}) {
  
  if (userRole === 'CLIENT') {
    return (
      <ClientTimeReports 
        timeEntries={initialTimeEntries} 
        allProjects={allProjects} 
      />
    );
  }

  // Both OWNER, PM, and MEMBER will see the new dashboard view
  return (
    <OwnerTimeDashboard 
      timeEntries={initialTimeEntries} 
      allUsers={allUsers} 
      allProjects={allProjects} 
      allTasks={allTasks}
      userRole={userRole}
      currentUserId={userId}
    />
  );
}
