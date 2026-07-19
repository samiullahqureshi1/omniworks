'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Sparkles, Plus, Pencil, Trash2, Flag, Milestone, Calendar as CalIcon } from 'lucide-react';
import { FormDialog, FormDialogCancelButton, FormDialogSubmitButton, formFieldLabel, formInputClass } from '@/components/ui/FormDialog';
import {
  createPlannerEventAction, updatePlannerEventAction, deletePlannerEventAction, type PlannerEventInput,
} from '@/app/actions/planner';

type Ev = {
  id: string; title: string; type: string; startDate: string; endDate: string | null;
  visibility: string; status: string;
  project?: { id: string; name: string } | null;
  assignedTo?: { id: string; name: string } | null;
};

const TYPE_META: Record<string, { label: string; icon: any; cls: string }> = {
  MILESTONE: { label: 'Milestone', icon: Milestone, cls: 'bg-violet-100 text-violet-700 dark:bg-violet-950/30 dark:text-violet-400' },
  TASK: { label: 'Task', icon: Flag, cls: 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400' },
  MEETING: { label: 'Meeting', icon: CalIcon, cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' },
};

function fmtRange(start: string, end: string | null) {
  const s = new Date(start).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  if (!end) return s;
  const e = new Date(end).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  return `${s} – ${e}`;
}

const emptyForm: PlannerEventInput = {
  title: '', type: 'MILESTONE', startDate: '', endDate: '', projectId: '', assignedToId: '', visibility: 'INTERNAL', status: 'OPEN',
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

  const openNew = () => { setEditId(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (e: Ev) => {
    setEditId(e.id);
    setForm({
      title: e.title, type: e.type as any,
      startDate: e.startDate.slice(0, 10),
      endDate: e.endDate ? e.endDate.slice(0, 10) : '',
      projectId: e.project?.id || '', assignedToId: e.assignedTo?.id || '',
      visibility: e.visibility as any, status: e.status,
    });
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.title.trim()) return toast.error('Enter a title.');
    if (!form.startDate) return toast.error('Pick a start date.');
    setSaving(true);
    const res = editId ? await updatePlannerEventAction(editId, form) : await createPlannerEventAction(form);
    setSaving(false);
    if (res.error) toast.error(res.error);
    else { toast.success(editId ? 'Event updated' : 'Event created'); setModalOpen(false); router.refresh(); }
  };

  const remove = async (id: string) => {
    const res = await deletePlannerEventAction(id);
    if (res.error) toast.error(res.error);
    else { toast.success('Event deleted'); router.refresh(); }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="text-slate-500" size={22} /> Events
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Milestones and org events across your projects.</p>
        </div>
        {canManage && (
          <button type="button" onClick={openNew}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-semibold hover:opacity-90">
            <Plus size={16} /> New event
          </button>
        )}
      </div>

      {events.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 dark:border-white/10 p-12 text-center">
          <Milestone className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">No events yet</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{canManage ? 'Create a milestone or event to track it here.' : 'Milestones shared with you will appear here.'}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {events.map((e) => {
            const meta = TYPE_META[e.type] || TYPE_META.MILESTONE;
            const Icon = meta.icon;
            return (
              <div key={e.id} className="group flex items-center gap-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1f1f1f] p-3">
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${meta.cls}`}><Icon size={16} /></div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">{e.title}</div>
                  <div className="text-[11px] text-slate-400 dark:text-slate-500">
                    {fmtRange(e.startDate, e.endDate)}
                    {e.project ? ` · ${e.project.name}` : ''}
                    {e.assignedTo ? ` · ${e.assignedTo.name}` : ''}
                  </div>
                </div>
                {e.visibility === 'CLIENT_VISIBLE' && (
                  <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">Client-visible</span>
                )}
                {canManage && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button type="button" onClick={() => openEdit(e)} className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10"><Pencil size={15} /></button>
                    <button type="button" onClick={() => remove(e.id)} className="p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"><Trash2 size={15} /></button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {canManage && (
        <FormDialog
          open={modalOpen}
          onOpenChange={setModalOpen}
          title={editId ? 'Edit event' : 'New event'}
          description="Milestones and events show up on the Planner. Client-visible events are shown to clients."
          footer={
            <>
              <FormDialogCancelButton onClick={() => setModalOpen(false)} disabled={saving}>Cancel</FormDialogCancelButton>
              <FormDialogSubmitButton type="button" onClick={save} disabled={saving}>{saving ? 'Saving…' : editId ? 'Save' : 'Create'}</FormDialogSubmitButton>
            </>
          }
        >
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <label className={formFieldLabel}>Title</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Design Phase Complete" className={`w-full ${formInputClass}`} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className={formFieldLabel}>Type</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as any })} className="flex h-[42px] w-full rounded-[8px] border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1f1f1f] dark:text-white px-3 text-sm outline-none">
                  <option value="MILESTONE">Milestone</option>
                  <option value="MEETING">Meeting</option>
                  <option value="TASK">Task</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className={formFieldLabel}>Visibility</label>
                <select value={form.visibility} onChange={(e) => setForm({ ...form, visibility: e.target.value as any })} className="flex h-[42px] w-full rounded-[8px] border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1f1f1f] dark:text-white px-3 text-sm outline-none">
                  <option value="INTERNAL">Internal</option>
                  <option value="CLIENT_VISIBLE">Client-visible</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className={formFieldLabel}>Start date</label>
                <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className={`w-full ${formInputClass}`} />
              </div>
              <div className="space-y-2">
                <label className={formFieldLabel}>End date (optional)</label>
                <input type="date" value={form.endDate || ''} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className={`w-full ${formInputClass}`} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className={formFieldLabel}>Project (optional)</label>
                <select value={form.projectId || ''} onChange={(e) => setForm({ ...form, projectId: e.target.value })} className="flex h-[42px] w-full rounded-[8px] border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1f1f1f] dark:text-white px-3 text-sm outline-none">
                  <option value="">None</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className={formFieldLabel}>Assignee (optional)</label>
                <select value={form.assignedToId || ''} onChange={(e) => setForm({ ...form, assignedToId: e.target.value })} className="flex h-[42px] w-full rounded-[8px] border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1f1f1f] dark:text-white px-3 text-sm outline-none">
                  <option value="">Unassigned</option>
                  {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
            </div>
          </div>
        </FormDialog>
      )}
    </div>
  );
}
