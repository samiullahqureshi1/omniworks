'use client';

import React, { useState } from 'react';
import { ProjectStatusesTab } from './ProjectStatusesTab';
import { TaskStatusesTab } from './TaskStatusesTab';
import { DelegateAccessTab } from './DelegateAccessTab';
import { FolderKanban, CheckSquare, Lock, Building2 } from 'lucide-react';

export function SettingsTabsClient({ children, userRole, currentOrgId }: { children: React.ReactNode, userRole?: string, currentOrgId?: string }) {
  const isOwner = userRole === 'OWNER';
  const [activeTab, setActiveTab] = useState<'project' | 'task' | 'security' | 'delegate'>(isOwner ? 'project' : 'security');

  return (
    <div className="flex flex-col md:flex-row gap-6 w-full items-start">
      {/* Settings Navigation Sidebar */}
      <aside className="w-full md:w-64 shrink-0 bg-white dark:bg-[#1f1f1f] rounded-[24px] p-4.5 shadow-sm flex flex-col gap-1.5">
        <h2 className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 px-3.5 mb-2 uppercase tracking-wider">
          Settings Categories
        </h2>
        
        {isOwner && (
          <>
            <button
              onClick={() => setActiveTab('project')}
              className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-all w-full text-left
                ${activeTab === 'project'
                  ? 'bg-primary/5 text-primary border-l-4 border-primary'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-white border-l-4 border-transparent'
                }`}
            >
              <FolderKanban size={15} />
              <span>Project Statuses</span>
            </button>

            <button
              onClick={() => setActiveTab('task')}
              className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-all w-full text-left
                ${activeTab === 'task'
                  ? 'bg-primary/5 text-primary border-l-4 border-primary'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-white border-l-4 border-transparent'
                }`}
            >
              <CheckSquare size={15} />
              <span>Task Statuses</span>
            </button>
          </>
        )}

        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-all w-full text-left
            ${activeTab === 'security'
              ? 'bg-primary/5 text-primary border-l-4 border-primary'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-white border-l-4 border-transparent'
            }`}
        >
          <Lock size={15} />
          <span>Security Profile</span>
        </button>

        <button
          onClick={() => setActiveTab('delegate')}
          className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-all w-full text-left
            ${activeTab === 'delegate'
              ? 'bg-primary/5 text-primary border-l-4 border-primary'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-white border-l-4 border-transparent'
            }`}
        >
          <Building2 size={15} />
          <span>Delegate Access</span>
        </button>
      </aside>

      {/* Main Settings Content Area */}
      <main className="flex-1 w-full space-y-6">
        {isOwner && activeTab === 'project' && <ProjectStatusesTab />}
        {isOwner && activeTab === 'task' && <TaskStatusesTab />}
        {activeTab === 'security' && <div className="w-full">{children}</div>}
        {activeTab === 'delegate' && <DelegateAccessTab currentOrgId={currentOrgId || ''} />}
      </main>
    </div>
  );
}
