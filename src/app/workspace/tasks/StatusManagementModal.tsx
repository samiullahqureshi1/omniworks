'use client';

import React, { useState, useTransition } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit2, GripVertical, Plus, X } from 'lucide-react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { toast } from 'sonner';
import { createTaskStatusAction, updateTaskStatusAction, deleteTaskStatusAction } from '@/app/actions/tasks';

export default function StatusManagementModal({ 
  isOpen, 
  onOpenChange, 
  taskStatuses, 
  onSuccess 
}: { 
  isOpen: boolean; 
  onOpenChange: (open: boolean) => void; 
  taskStatuses: any[]; 
  onSuccess: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [color, setColor] = useState('#64748b');

  const resetForm = () => {
    setName('');
    setColor('#64748b');
    setIsCreating(false);
    setEditingId(null);
  };

  const handleSave = () => {
    if (!name.trim()) return toast.error('Status name is required');

    startTransition(async () => {
      let res;
      if (editingId) {
        const existing = taskStatuses.find(s => s.id === editingId);
        res = await updateTaskStatusAction(editingId, name, color, existing?.order || 0);
      } else {
        const order = taskStatuses.length;
        res = await createTaskStatusAction(name, color, order);
      }

      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(editingId ? 'Status updated' : 'Status created');
        resetForm();
        onSuccess();
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm('Are you sure you want to delete this status? Tasks with this status might be affected.')) return;
    
    startTransition(async () => {
      const res = await deleteTaskStatusAction(id);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success('Status deleted');
        onSuccess();
      }
    });
  };

  const startEdit = (status: any) => {
    setEditingId(status.id);
    setName(status.name);
    setColor(status.color);
    setIsCreating(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) resetForm();
      onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-[500px] bg-white dark:bg-[#151518] border border-slate-200/80 dark:border-white/10 p-0 sm:!rounded-[8px] !rounded-[8px] shadow-2xl overflow-hidden [&>button]:hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#19191c] relative shrink-0">
          <DialogTitle className="text-[16.5px] font-bold text-slate-900 dark:text-white leading-tight">Manage Task Statuses</DialogTitle>
          <DialogDescription className="text-xs text-slate-450 dark:text-slate-400 mt-1">
            Create, edit, and organize custom statuses for your tasks.
          </DialogDescription>
          <DialogPrimitive.Close className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-250 dark:hover:bg-zinc-700 transition-all rounded-full p-1.5 cursor-pointer outline-none flex items-center justify-center h-7 w-7">
            <X size={14} />
          </DialogPrimitive.Close>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="space-y-2 border border-slate-150 dark:border-white/5 rounded-[8px] p-2 max-h-[300px] overflow-y-auto">
            {taskStatuses.length === 0 && !isCreating && !editingId && (
              <p className="text-sm text-muted-foreground text-center py-4">No statuses defined yet.</p>
            )}
            {taskStatuses.map(status => (
              <div key={status.id} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-[8px] border bg-card">
                <div className="flex items-center gap-3">
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                  <Badge variant="outline" style={{ borderColor: status.color, color: status.color, backgroundColor: `${status.color}10` }}>
                    {status.name}
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(status)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  {status.createdByOwner && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(status.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {(isCreating || editingId) ? (
            <div className="border border-slate-150 dark:border-white/5 rounded-[8px] p-4 bg-muted/30 space-y-4">
              <h4 className="text-sm font-medium">{editingId ? 'Edit Status' : 'New Status'}</h4>
              <div className="grid grid-cols-[1fr_auto] gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium">Name</label>
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. In Review" className="h-8 text-sm !rounded-[8px]" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium">Color</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="color" 
                      value={color} 
                      onChange={e => setColor(e.target.value)}
                      className="h-8 w-8 rounded border p-0 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={resetForm} className="!rounded-[8px]">Cancel</Button>
                <Button size="sm" onClick={handleSave} disabled={isPending} className="!rounded-[8px] bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100">{isPending ? 'Saving...' : 'Save'}</Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" className="w-full border-dashed !rounded-[8px]" onClick={() => setIsCreating(true)}>
              <Plus className="h-4 w-4 mr-2" /> Add Status
            </Button>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#19191c] flex justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="px-5 py-2 text-sm font-bold !rounded-[8px] bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors shadow-sm outline-none cursor-pointer"
          >
            Done
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
