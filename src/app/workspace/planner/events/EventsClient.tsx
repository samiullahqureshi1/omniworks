'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Sparkles, Plus, Pencil, Trash2, Flag, Milestone,
  Calendar as CalIcon, Repeat, RefreshCw,
} from 'lucide-react';
import {
  FormDialog, FormDialogCancelButton, FormDialogSubmitButton,
  formFieldLabel, formInputClass,
} from '@/components/ui/FormDialog';
import {
  createPlannerEventAction, updatePlannerEventAction, deletePlannerEventAction,
  processRecurringEventsAction,
  type PlannerEventInput,
} from '@/app/actions/planner';

type Ev = {
  id: string; title: string; type: string; startDate: string; endDate: string | null;
  visibility: string; status: string;
  isRepeated?: boolean; repeatFrequency?: string | null;
  project?: { id: string; name: string } | null;
  assignedTo?: { id: string; name: string } | null;
};

const TYPE_META: Record<string, { label: string; icon: any; cls: string }> = {
  MILESTONE: { label: 'Milestone', icon: Milestone, cls: 'bg-violet-100 text-violet-700 dark:bg-violet-950/30 dark:text-violet-400' },
  TASK:      { label: 'Task',      icon: Flag,      cls: 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400' },
  MEETING:   { label: 'Meeting',   icon: CalIcon,   cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' },
};

const FREQ_LABELS: Record<string, string> = {
  DAILY: 'Daily', WEEKLY: 'Weekly', MONTHLY: 'Monthly', YEARLY: 'Yearly',
};

function fmtRange(start: string, end: string | null) {
  const s = new Date(start).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  if (!end) return s;
  const e = new Date(end).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  return `${s} – ${e}`;
}

const emptyForm: PlannerEventInput = {
  title: '', type: 'MILESTONE', startDate: '', endDate: '', projectId: '',
  assignedToId: '', visibility: 'INTERNAL', status: 'OPEN',
  isRepeated: false, repeatFrequency: null, repeatEndsAt: '',
};

export default function EventsClient({
  events, canManage, projects, members,
}: {
  events: Ev[];
  canManage: boolean;
  projects: Array<{ id: string; name: string }>;
  members: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<PlannerEventInput>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Auto-process recurring events when page mounts
  useEffect(() => {
    processRecurringEventsAction().then(() => router.refresh());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openNew = () => { setEditId(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (e: Ev) => {
    setEditId(e.id);
    setForm({
      title: e.title, type: e.type as any,
      startDate: e.startDate.slice(0, 10),
      endDate: e.endDate ? e.endDate.slice(0, 10) : '',
      projectId: e.project?.id || '',
      assignedToId: e.assignedTo?.id || '',
      visibility: e.visibility as any,
      status: e.status,
      isRepeated: e.isRepeated || false,
      repeatFrequency: (e.repeatFrequency as any) || null,
      repeatEndsAt: '',
    });
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.title.trim()) return toast.error('Enter a title.');
    if (!form.startDate) return toast.error('Pick a start date.');
    if (form.isRepeated && !form.repeatFrequency) return toast.error('Pick a repeat frequency.');
    setSaving(true);
    const res = editId
      ? await updatePlannerEventAction(editId, form)
      : await createPlannerEventAction(form);
    setSaving(false);
    if (res.error) toast.error(res.error);
    else { toast.success(editId ? 'Event updated' : 'Event created'); setModalOpen(false); router.refresh(); }
  };

  const remove = async (id: string) => {
    const res = await deletePlannerEventAction(id);
    if (res.error) toast.error(res.error);
    else { toast.success('Event deleted'); router.refresh(); }
  };

  const manualRefresh = () => {
    startTransition(async () => {
      await processRecurringEventsAction();
      router.refresh();
      toast.success('Recurring events processed');
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="text-slate-500" size={22} /> Events
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Milestones, tasks and recurring events across your org.
          </p>
        </div>
        {canManage && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={manualRefresh}
              disabled={isPending}
              title="Refresh recurring events"
              className="inline-flex items-center gap-1.5 h-10 px-3 rounded-lg border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-white/5 disabled:opacity-50"
            >
              <RefreshCw size={15} className={isPending ? 'animate-spin' : ''} />
            </button>
            <button
              type="button"
              onClick={openNew}
              className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-semibold hover:opacity-90"
            >
              <Plus size={16} /> New event
            </button>
          </div>
        )}
      </div>

      {events.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 dark:border-white/10 p-12 text-center">
          <Milestone className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">No events yet</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            {canManage ? 'Create a milestone or recurring event to track it here.' : 'Milestones shared with you will appear here.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {events.map((e) => {
            const meta = TYPE_META[e.type] || TYPE_META.MILESTONE;
            const Icon = meta.icon;
            return (
              <div key={e.id} className="group flex items-center gap-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1f1f1f] p-3">
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${meta.cls}`}>
                  <Icon size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">{e.title}</span>
                    {e.isRepeated && e.repeatFrequency && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400 shrink-0">
                        <Repeat size={9} /> {FREQ_LABELS[e.repeatFrequency]}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                    {fmtRange(e.startDate, e.endDate)}
                    {e.project ? ` · ${e.project.name}` : ''}
                    {e.assignedTo ? ` · ${e.assignedTo.name}` : ''}
                  </div>
                </div>
                {e.visibility === 'CLIENT_VISIBLE' && (
                  <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                    Client-visible
                  </span>
                )}
                {canManage && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button type="button" onClick={() => openEdit(e)} className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10">
                      <Pencil size={15} />
                    </button>
                    <button type="button" onClick={() => remove(e.id)} className="p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20">
                      <Trash2 size={15} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      {canManage && (
        <FormDialog
          open={modalOpen}
          onOpenChange={setModalOpen}
          title={editId ? 'Edit event' : 'New event'}
          description="Events and milestones show up in your Planner. Enable repeat to auto-schedule them."
          footer={
            <>
              <FormDialogCancelButton onClick={() => setModalOpen(false)} disabled={saving}>Cancel</FormDialogCancelButton>
              <FormDialogSubmitButton type="button" onClick={save} disabled={saving}>
                {saving ? 'Saving…' : editId ? 'Save' : 'Create'}
              </FormDialogSubmitButton>
            </>
          }
        >
          <div className="p-6 space-y-4">
            {/* Title */}
            <div className="space-y-2">
              <label className={formFieldLabel}>Title</label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Run Monthly Payroll"
                className={`w-full ${formInputClass}`}
              />
            </div>

            {/* Type + Visibility */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className={formFieldLabel}>Type</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as any })}
                  className="flex h-[42px] w-full rounded-[8px] border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1f1f1f] dark:text-white px-3 text-sm outline-none"
                >
                  <option value="MILESTONE">Milestone</option>
                  <option value="TASK">Task</option>
                  <option value="MEETING">Meeting</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className={formFieldLabel}>Visibility</label>
                <select
                  value={form.visibility}
                  onChange={(e) => setForm({ ...form, visibility: e.target.value as any })}
                  className="flex h-[42px] w-full rounded-[8px] border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1f1f1f] dark:text-white px-3 text-sm outline-none"
                >
                  <option value="INTERNAL">Internal</option>
                  <option value="CLIENT_VISIBLE">Client-visible</option>
                </select>
              </div>
            </div>

            {/* Start + End date */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className={formFieldLabel}>Start date</label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  className={`w-full ${formInputClass}`}
                />
              </div>
              <div className="space-y-2">
                <label className={formFieldLabel}>End date (optional)</label>
                <input
                  type="date"
                  value={form.endDate || ''}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  className={`w-full ${formInputClass}`}
                />
              </div>
            </div>

            {/* Project + Assignee */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className={formFieldLabel}>Project (optional)</label>
                <select
                  value={form.projectId || ''}
                  onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                  className="flex h-[42px] w-full rounded-[8px] border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1f1f1f] dark:text-white px-3 text-sm outline-none"
                >
                  <option value="">None</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className={formFieldLabel}>Assignee (optional)</label>
                <select
                  value={form.assignedToId || ''}
                  onChange={(e) => setForm({ ...form, assignedToId: e.target.value })}
                  className="flex h-[42px] w-full rounded-[8px] border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1f1f1f] dark:text-white px-3 text-sm outline-none"
                >
                  <option value="">Unassigned</option>
                  {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
            </div>

            {/* ─── Repeat section ──────────────────────────────────── */}
            <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] p-4 space-y-4">
              {/* Toggle */}
              <label className="flex items-center justify-between cursor-pointer select-none">
                <div className="flex items-center gap-2">
                  <Repeat size={16} className="text-indigo-500" />
                  <span className="text-[13px] font-bold text-slate-700 dark:text-slate-300">
                    Repeat this event
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, isRepeated: !form.isRepeated, repeatFrequency: !form.isRepeated ? 'MONTHLY' : null })}
                  className={`relative w-10 h-5 rounded-full transition-colors ${form.isRepeated ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-white/20'}`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.isRepeated ? 'translate-x-5' : ''}`}
                  />
                </button>
              </label>

              {form.isRepeated && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className={formFieldLabel}>Frequency</label>
                    <select
                      value={form.repeatFrequency || 'MONTHLY'}
                      onChange={(e) => setForm({ ...form, repeatFrequency: e.target.value as any })}
                      className="flex h-[42px] w-full rounded-[8px] border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1f1f1f] dark:text-white px-3 text-sm outline-none"
                    >
                      <option value="DAILY">Daily</option>
                      <option value="WEEKLY">Weekly</option>
                      <option value="MONTHLY">Monthly</option>
                      <option value="YEARLY">Yearly</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className={formFieldLabel}>Ends on (optional)</label>
                    <input
                      type="date"
                      value={form.repeatEndsAt || ''}
                      onChange={(e) => setForm({ ...form, repeatEndsAt: e.target.value })}
                      className={`w-full ${formInputClass}`}
                      placeholder="No end date"
                    />
                  </div>
                </div>
              )}

              {form.isRepeated && form.repeatFrequency && (
                <p className="text-[11px] text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg px-3 py-2">
                  🔁 A new event will automatically be created every <strong>{FREQ_LABELS[form.repeatFrequency].toLowerCase()}</strong> after the start date.
                  {form.repeatEndsAt ? ` Repeats until ${new Date(form.repeatEndsAt).toLocaleDateString()}.` : ' Repeats indefinitely.'}
                </p>
              )}
            </div>
          </div>
        </FormDialog>
      )}
    </div>
  );
}
