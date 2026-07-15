'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function AddManualTimeModal({ 
  isOpen, 
  onClose,
  allProjects,
  allTasks,
  allUsers,
  defaultDate,
  defaultUserId
}: { 
  isOpen: boolean; 
  onClose: (refresh?: boolean) => void;
  allProjects: any[];
  allTasks: any[];
  allUsers: any[];
  defaultDate?: string;
  defaultUserId?: string;
}) {
  const [memberId, setMemberId] = useState(defaultUserId || '');
  const [projectId, setProjectId] = useState('');
  const [taskId, setTaskId] = useState('');
  const [date, setDate] = useState(defaultDate || new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [tasks, setTasks] = useState<any[]>([]);

  useEffect(() => {
    if (defaultDate) setDate(defaultDate);
    if (defaultUserId) setMemberId(defaultUserId);
  }, [defaultDate, defaultUserId]);

  useEffect(() => {
    if (!projectId) {
      setTasks([]);
      setTaskId('');
      return;
    }
    const filtered = allTasks.filter((t: any) => t.projectId === projectId);
    setTasks(filtered);
  }, [projectId, allTasks]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!memberId || !projectId || !date || !startTime || !endTime) {
      setError('Please fill out all required fields.');
      return;
    }

    const start = new Date(`${date}T${startTime}`);
    const end = new Date(`${date}T${endTime}`);

    if (end <= start) {
      setError('End time must be after start time.');
      return;
    }

    const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/time-entries/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId,
          projectId,
          taskId: taskId || null,
          date,
          startTime,
          endTime,
          duration: durationHours,
          notes
        })
      });

      const data = await res.json();
      if (data.success) {
        onClose(true); // pass true to refresh dashboard
        setProjectId('');
        setTaskId('');
        setStartTime('');
        setEndTime('');
        setNotes('');
      } else {
        setError(data.error || 'Failed to add manual time.');
      }
    } catch (err: any) {
      setError(err.message || 'Network error.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Manual Time</DialogTitle>
          <DialogDescription>
            Log hours manually for a team member.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="text-sm text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/10 p-2 rounded">{error}</div>}

          <div className="space-y-2">
            <label className="text-sm font-medium">Team Member</label>
            <select
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              className="flex h-9 w-full rounded-xl border bg-background px-3 text-sm focus:ring-1 focus:ring-ring"
            >
              <option value="">Select Member...</option>
              {allUsers.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Project</label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="flex h-9 w-full rounded-xl border bg-background px-3 text-sm focus:ring-1 focus:ring-ring"
            >
              <option value="">Select Project...</option>
              {allProjects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Task (Optional)</label>
            <select
              value={taskId}
              onChange={(e) => setTaskId(e.target.value)}
              disabled={!projectId}
              className="flex h-9 w-full rounded-xl border bg-background px-3 text-sm focus:ring-1 focus:ring-ring disabled:opacity-50"
            >
              <option value="">Select Task...</option>
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Date</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Start Time</label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">End Time</label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Notes (Optional)</label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What did they work on?" />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onClose()}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Manual Time'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
