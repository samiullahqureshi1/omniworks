'use client';

import React, { useState, useTransition } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit2, GripVertical, Plus } from 'lucide-react';
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Manage Task Statuses</DialogTitle>
          <DialogDescription>Create, edit, and organize custom statuses for your tasks.</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 pt-4">
          <div className="space-y-2 border rounded-xl p-2 max-h-[300px] overflow-y-auto">
            {taskStatuses.length === 0 && !isCreating && !editingId && (
              <p className="text-sm text-muted-foreground text-center py-4">No statuses defined yet.</p>
            )}
            {taskStatuses.map(status => (
              <div key={status.id} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-xl border bg-card">
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
            <div className="border rounded-xl p-4 bg-muted/30 space-y-4">
              <h4 className="text-sm font-medium">{editingId ? 'Edit Status' : 'New Status'}</h4>
              <div className="grid grid-cols-[1fr_auto] gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium">Name</label>
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. In Review" className="h-8 text-sm" />
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
                <Button variant="outline" size="sm" onClick={resetForm}>Cancel</Button>
                <Button size="sm" onClick={handleSave} disabled={isPending}>{isPending ? 'Saving...' : 'Save'}</Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" className="w-full border-dashed" onClick={() => setIsCreating(true)}>
              <Plus className="h-4 w-4 mr-2" /> Add Status
            </Button>
          )}

          <DialogFooter className="pt-4 border-t">
            <Button variant="default" onClick={() => onOpenChange(false)}>Done</Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
