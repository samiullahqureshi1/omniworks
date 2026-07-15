'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { NumberStepper } from '@/components/ui/NumberStepper';

interface ManualTimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  userRole: string;
  userId: string;
  organizationId: string;
  allProjects: any[];
  allTasks: any[];
  allUsers: any[];
  assignedTasks: any[];
}

export function ManualTimeModal({
  isOpen, onClose, userRole, userId, organizationId, allProjects, allTasks, allUsers, assignedTasks
}: ManualTimeModalProps) {
  const [loading, setLoading] = useState(false);
  
  const [projectId, setProjectId] = useState('');
  const [taskId, setTaskId] = useState('');
  const [memberId, setMemberId] = useState(userRole === 'MEMBER' ? userId : '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [duration, setDuration] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [notes, setNotes] = useState('');

  const isMember = userRole === 'MEMBER';

  const availableProjects = isMember ? [] : allProjects;
  
  const availableTasks = isMember 
    ? assignedTasks 
    : allTasks.filter(t => t.projectId === projectId);
    
  const availableUsers = isMember ? [] : allUsers;

  const handleTaskChange = (val: string) => {
    setTaskId(val);
    const selectedTask = (isMember ? assignedTasks : allTasks).find(t => t.id === val);
    if (selectedTask && !isMember) {
       setProjectId(selectedTask.projectId);
    }
  };

  const calculateDuration = () => {
    if (startTime && endTime) {
      const start = new Date(`${date}T${startTime}`);
      const end = new Date(`${date}T${endTime}`);
      let diff = (end.getTime() - start.getTime()) / (1000 * 3600);
      if (diff > 0) {
        setDuration(diff.toFixed(2));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    let finalProjectId = projectId;
    if (isMember) {
      const t = assignedTasks.find(t => t.id === taskId);
      if (t) finalProjectId = t.projectId;
    }

    try {
      const res = await fetch('/api/time-entries/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          projectId: finalProjectId,
          taskId,
          memberId,
          date,
          duration: parseFloat(duration),
          startTime,
          endTime,
          notes
        })
      });
      
      const data = await res.json();
      if (!res.ok || data.error) {
        toast.error(data.error || 'Failed to add manual hours');
      } else {
        toast.success('Manual entry added');
        onClose();
        setTaskId('');
        if (!isMember) setProjectId('');
        setDuration('');
        setNotes('');
        setStartTime('');
        setEndTime('');
      }
    } catch (err: any) {
      toast.error('An error occurred while saving.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Manual Time Entry</DialogTitle>
          <DialogDescription>Log time manually for a task.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 my-4">
            
            {!isMember && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Project <span className="text-destructive">*</span></label>
                <select value={projectId} onChange={e => setProjectId(e.target.value)} required className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <option value="">Select a project...</option>
                  {availableProjects.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Task <span className="text-destructive">*</span></label>
              <select value={taskId} onChange={e => handleTaskChange(e.target.value)} required className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <option value="">Select a task...</option>
                {availableTasks.map((t: any) => (
                  <option key={t.id} value={t.id}>{t.title} {!isMember ? '' : `(${t.project?.name || ''})`}</option>
                ))}
              </select>
              {taskId && (() => {
                 const t = (isMember ? assignedTasks : allTasks).find(x => x.id === taskId);
                 if (t && t.allocatedHours) {
                   const rem = t.allocatedHours - (t.trackedHours || 0);
                   return <p className="text-xs text-muted-foreground mt-1">Remaining Hours: <span className="font-bold text-primary">{rem > 0 ? rem.toFixed(2) : 0}h</span></p>;
                 }
                 return null;
              })()}
            </div>

            {!isMember && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Member <span className="text-destructive">*</span></label>
                <select value={memberId} onChange={e => setMemberId(e.target.value)} required className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <option value="">Select a member...</option>
                  {availableUsers.map((u: any) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Date <span className="text-destructive">*</span></label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Time <span className="text-muted-foreground font-normal">(Optional)</span></label>
                <Input type="time" value={startTime} onChange={e => {setStartTime(e.target.value); calculateDuration();}} onBlur={calculateDuration} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">End Time <span className="text-muted-foreground font-normal">(Optional)</span></label>
                <Input type="time" value={endTime} onChange={e => {setEndTime(e.target.value); calculateDuration();}} onBlur={calculateDuration} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Duration (Hours) <span className="text-destructive">*</span></label>
              <NumberStepper step={0.1} min={0.1} value={duration} onChange={e => setDuration(e.target.value)} required placeholder="e.g. 2.5" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Notes <span className="text-muted-foreground font-normal">(Optional)</span></label>
              <Input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="What did you work on?" />
            </div>

          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null} Save Entry
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
