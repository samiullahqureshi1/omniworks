'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Plus, Edit2, Check, X } from 'lucide-react';

export function ProjectStatusesTab() {
  const [statuses, setStatuses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newStatusName, setNewStatusName] = useState('');
  const [newStatusColor, setNewStatusColor] = useState('#8b5cf6');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  useEffect(() => {
    fetchStatuses();
  }, []);

  const fetchStatuses = async () => {
    try {
      const res = await fetch('/api/project-statuses');
      if (res.ok) {
        const data = await res.json();
        setStatuses(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newStatusName.trim()) return;
    try {
      const res = await fetch('/api/project-statuses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newStatusName.trim(),
          color: newStatusColor
        })
      });
      if (res.ok) {
        setNewStatusName('');
        fetchStatuses();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this status?')) return;
    try {
      const res = await fetch(`/api/project-statuses/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchStatuses();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const startEdit = (s: any) => {
    setEditingId(s.id);
    setEditName(s.name);
    setEditColor(s.color);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async (id: string) => {
    try {
      const res = await fetch(`/api/project-statuses/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, color: editColor })
      });
      if (res.ok) {
        setEditingId(null);
        fetchStatuses();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 w-full">

      <Card className="border-none shadow-sm bg-white dark:bg-[#1f1f1f] rounded-[24px] overflow-hidden mb-8">
        <CardHeader className="bg-[#f8f9fc] dark:bg-[#181818] border-b border-slate-100 dark:border-slate-800/60 pb-6 pt-6 px-6">
          <CardTitle className="text-lg text-slate-800 dark:text-white">Create New Status</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Input 
                value={newStatusName} 
                onChange={(e) => setNewStatusName(e.target.value)} 
                placeholder="Status Name (e.g., In QA)" 
                className="bg-[#f8f9fc] dark:bg-[#181818] border-slate-200 dark:border-slate-700 rounded-xl h-11"
              />
            </div>
            <div className="w-16">
              <Input 
                type="color" 
                value={newStatusColor} 
                onChange={(e) => setNewStatusColor(e.target.value)} 
                className="p-1 h-11 w-full bg-[#f8f9fc] dark:bg-[#181818] border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer"
              />
            </div>
            <Button onClick={handleCreate} className="h-11 rounded-xl bg-[#8b5cf6] hover:bg-[#7c3aed] text-white px-6 font-semibold shadow-md shadow-purple-500/20">
              <Plus size={18} className="mr-2" /> Add Status
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm bg-white dark:bg-[#1f1f1f] rounded-[24px] overflow-hidden">
        <CardHeader className="bg-[#f8f9fc] dark:bg-[#181818] border-b border-slate-100 dark:border-slate-800/60 pb-6 pt-6 px-6">
          <CardTitle className="text-lg text-slate-800 dark:text-white">Existing Statuses</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading...</div>
          ) : statuses.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No custom statuses found.</div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {statuses.map(s => (
                <div key={s.id} className="p-6 flex items-center justify-between hover:bg-[#f8f9fc]/50 dark:hover:bg-[#181818]/50 transition-colors">
                  {editingId === s.id ? (
                    <div className="flex items-center gap-4 w-full">
                      <Input 
                        value={editName} 
                        onChange={(e) => setEditName(e.target.value)} 
                        className="flex-1 bg-white dark:bg-[#1f1f1f] border-slate-200 dark:border-slate-700 rounded-xl"
                      />
                      <Input 
                        type="color" 
                        value={editColor} 
                        onChange={(e) => setEditColor(e.target.value)} 
                        className="p-1 h-10 w-16 bg-white dark:bg-[#1f1f1f] border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer"
                      />
                      <Button size="icon" variant="ghost" onClick={() => saveEdit(s.id)} className="text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl">
                        <Check size={18} />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={cancelEdit} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl">
                        <X size={18} />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-4">
                        <div className="w-4 h-4 rounded-full shadow-inner" style={{ backgroundColor: s.color }}></div>
                        <span className="font-semibold text-slate-800 dark:text-white">{s.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="icon" variant="ghost" onClick={() => startEdit(s)} className="text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl">
                          <Edit2 size={16} />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDelete(s.id)} className="text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl">
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
