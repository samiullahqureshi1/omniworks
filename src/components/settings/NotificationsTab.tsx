'use client';

import React, { useState } from 'react';
import { Bell, Mail, ShieldAlert, Sparkles, MessageSquare, ToggleLeft, ToggleRight } from 'lucide-react';

export function NotificationsTab() {
  const [emailDigest, setEmailDigest] = useState(true);
  const [mentions, setMentions] = useState(true);
  const [assigneeUpdates, setAssigneeUpdates] = useState(true);
  const [chatMessages, setChatMessages] = useState(false);
  const [statusChanges, setStatusChanges] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }, 800);
  };

  const Switch = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
    <button onClick={onChange} className="focus:outline-none transition-all cursor-pointer">
      {checked ? (
        <ToggleRight size={38} className="text-violet-500 fill-violet-500/10" />
      ) : (
        <ToggleLeft size={38} className="text-slate-350 dark:text-slate-650" />
      )}
    </button>
  );

  return (
    <div className="bg-white dark:bg-[#151518] rounded-xl shadow-sm border border-slate-200/80 dark:border-white/10 overflow-hidden">
      <div className="p-5 border-b border-slate-100 dark:border-white/5">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Bell size={16} className="text-slate-500" />
          <span>Notification Settings</span>
        </h2>
        <p className="text-[12px] text-slate-450 dark:text-slate-400 mt-1">
          Customize how and when you receive workspace digests, mentions, and updates.
        </p>
      </div>

      <div className="p-6 space-y-5">
        {/* Toggle Items */}
        <div className="space-y-4 divide-y divide-slate-100/70 dark:divide-white/5">
          <div className="flex items-center justify-between pb-3.5">
            <div className="flex items-start gap-3 min-w-0 pr-4">
              <Mail size={16} className="text-slate-400 mt-0.5 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[13px] font-bold text-slate-800 dark:text-slate-200">Email Digest Reports</span>
                <span className="text-[11px] text-slate-400 mt-0.5">Receive summary emails for overdue items and task completions.</span>
              </div>
            </div>
            <Switch checked={emailDigest} onChange={() => setEmailDigest(!emailDigest)} />
          </div>

          <div className="flex items-center justify-between pt-3.5 pb-3.5">
            <div className="flex items-start gap-3 min-w-0 pr-4">
              <Sparkles size={16} className="text-slate-400 mt-0.5 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[13px] font-bold text-slate-800 dark:text-slate-200">Direct Mentions & Tags</span>
                <span className="text-[11px] text-slate-400 mt-0.5">Get instant notifications when someone mentions you in chats or projects.</span>
              </div>
            </div>
            <Switch checked={mentions} onChange={() => setMentions(!mentions)} />
          </div>

          <div className="flex items-center justify-between pt-3.5 pb-3.5">
            <div className="flex items-start gap-3 min-w-0 pr-4">
              <Bell size={16} className="text-slate-400 mt-0.5 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[13px] font-bold text-slate-800 dark:text-slate-200">Task Assignments</span>
                <span className="text-[11px] text-slate-400 mt-0.5">Get notified when a manager assigns you a task or adds you to a team.</span>
              </div>
            </div>
            <Switch checked={assigneeUpdates} onChange={() => setAssigneeUpdates(!assigneeUpdates)} />
          </div>

          <div className="flex items-center justify-between pt-3.5 pb-3.5">
            <div className="flex items-start gap-3 min-w-0 pr-4">
              <MessageSquare size={16} className="text-slate-400 mt-0.5 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[13px] font-bold text-slate-800 dark:text-slate-200">Workspace Chat Messages</span>
                <span className="text-[11px] text-slate-400 mt-0.5">Notify me for every message posted in channels and group conversations.</span>
              </div>
            </div>
            <Switch checked={chatMessages} onChange={() => setChatMessages(!chatMessages)} />
          </div>

          <div className="flex items-center justify-between pt-3.5">
            <div className="flex items-start gap-3 min-w-0 pr-4">
              <ShieldAlert size={16} className="text-slate-400 mt-0.5 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[13px] font-bold text-slate-800 dark:text-slate-200">Project Stage & Status Changes</span>
                <span className="text-[11px] text-slate-400 mt-0.5">Send a notification when a project or task pipeline status is modified.</span>
              </div>
            </div>
            <Switch checked={statusChanges} onChange={() => setStatusChanges(!statusChanges)} />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-100 dark:border-white/5 flex justify-end items-center gap-3">
          {saved && (
            <span className="text-[11px] text-emerald-500 font-bold animate-pulse">
              Preferences Saved Successfully!
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2 text-xs font-bold rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition-all shadow-sm outline-none cursor-pointer disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </div>
    </div>
  );
}
