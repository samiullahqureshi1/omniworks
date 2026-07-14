'use client';

import React from 'react';
import { Shield, Check, X } from 'lucide-react';

export function PermissionsTab() {
  const roles = [
    { name: 'Workspace Owner', key: 'OWNER', color: 'bg-violet-100 text-violet-700 dark:bg-violet-950/30 dark:text-violet-400' },
    { name: 'Project Manager', key: 'PM', color: 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400' },
    { name: 'Workspace Member', key: 'MEMBER', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' },
    { name: 'Client Viewer', key: 'CLIENT', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800/50 dark:text-slate-400' },
  ];

  const permissionMatrix = [
    { title: 'Create & Delete Workspace Org', OWNER: true, PM: false, MEMBER: false, CLIENT: false },
    { title: 'Edit Organization Settings', OWNER: true, PM: false, MEMBER: false, CLIENT: false },
    { title: 'Invite & Manage Team Members', OWNER: true, PM: true, MEMBER: false, CLIENT: false },
    { title: 'Create Projects & Pipelines', OWNER: true, PM: true, MEMBER: true, CLIENT: false },
    { title: 'Create & Modify Tasks', OWNER: true, PM: true, MEMBER: true, CLIENT: false },
    { title: 'Configure Automations & Rules', OWNER: true, PM: true, MEMBER: false, CLIENT: false },
    { title: 'Participate in AI & Team Chats', OWNER: true, PM: true, MEMBER: true, CLIENT: false },
    { title: 'Track Work Hours (Time logs)', OWNER: true, PM: true, MEMBER: true, CLIENT: false },
    { title: 'View Assigned Cards & Content', OWNER: true, PM: true, MEMBER: true, CLIENT: true },
  ];

  const Mark = ({ allowed }: { allowed: boolean }) => 
    allowed ? (
      <Check size={16} className="text-emerald-500 mx-auto" />
    ) : (
      <X size={15} className="text-slate-350 dark:text-slate-650 mx-auto" />
    );

  return (
    <div className="bg-white dark:bg-[#151518] rounded-xl shadow-sm border border-slate-200/80 dark:border-white/10 overflow-hidden">
      <div className="p-5 border-b border-slate-100 dark:border-white/5">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Shield size={16} className="text-slate-500" />
          <span>Role Permissions Matrix</span>
        </h2>
        <p className="text-[12px] text-slate-450 dark:text-slate-400 mt-1">
          Review standard user capabilities and actions allowed across different organization roles.
        </p>
      </div>

      <div className="p-6">
        <div className="overflow-x-auto rounded-lg border border-slate-200/60 dark:border-white/5">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-black/10 border-b border-slate-200/60 dark:border-white/5">
                <th className="p-3.5 font-bold text-slate-500 dark:text-slate-400">Capability</th>
                {roles.map(r => (
                  <th key={r.key} className="p-3.5 text-center font-bold text-slate-500 dark:text-slate-400">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${r.color}`}>
                      {r.key}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {permissionMatrix.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-colors">
                  <td className="p-3.5 font-semibold text-slate-700 dark:text-slate-300">
                    {row.title}
                  </td>
                  <td className="p-3.5 text-center">
                    <Mark allowed={row.OWNER} />
                  </td>
                  <td className="p-3.5 text-center">
                    <Mark allowed={row.PM} />
                  </td>
                  <td className="p-3.5 text-center">
                    <Mark allowed={row.MEMBER} />
                  </td>
                  <td className="p-3.5 text-center">
                    <Mark allowed={row.CLIENT} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
