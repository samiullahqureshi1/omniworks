'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Play, Edit, Trash2, ShieldAlert, Cpu, Calendar, Clock, User, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { createRuleAction, updateRuleAction, deleteRuleAction, executeRuleAction } from '@/app/actions/rules';

export default function RulesClient({
  initialRules,
  initialLogs,
  projects,
  currentUser,
}: {
  initialRules: any[];
  initialLogs: any[];
  projects: any[];
  currentUser: any;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [rules, setRules] = useState(initialRules);
  const [logs, setLogs] = useState(initialLogs);

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<any>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formFrequency, setFormFrequency] = useState('DAILY');
  const [formReminderTime, setFormReminderTime] = useState('09:00 AM');
  const [formActionType, setFormActionType] = useState('SEND_REMINDER');
  const [formRecipients, setFormRecipients] = useState<string[]>(['PROJECT_MANAGER']);
  const [formAttachedProjectIds, setFormAttachedProjectIds] = useState<string[]>([]);

  // Open creation modal
  const handleOpenCreate = () => {
    setFormName('');
    setFormDescription('');
    setFormFrequency('DAILY');
    setFormReminderTime('09:00 AM');
    setFormActionType('SEND_REMINDER');
    setFormRecipients(['PROJECT_MANAGER']);
    setFormAttachedProjectIds([]);
    setIsCreateOpen(true);
  };

  // Open edit modal
  const handleOpenEdit = (rule: any) => {
    setSelectedRule(rule);
    setFormName(rule.name);
    setFormDescription(rule.description || '');
    setFormFrequency(rule.frequency);
    setFormReminderTime(rule.reminderTime);
    setFormActionType(rule.actionType);
    setFormRecipients(rule.recipients || []);
    setFormAttachedProjectIds(rule.projects.map((pr: any) => pr.projectId));
    setIsEditOpen(true);
  };

  // Open delete modal
  const handleOpenDelete = (rule: any) => {
    setSelectedRule(rule);
    setIsDeleteOpen(true);
  };

  // Toggle rule active status
  const handleToggleActive = async (rule: any) => {
    const nextActive = !rule.isActive;
    startTransition(async () => {
      const res = await updateRuleAction(rule.id, { isActive: nextActive });
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(`Rule ${nextActive ? 'activated' : 'deactivated'} successfully`);
        setRules(prev => prev.map(r => r.id === rule.id ? { ...r, isActive: nextActive } : r));
        router.refresh();
      }
    });
  };

  // Handle create submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error('Rule name is required.');
      return;
    }

    startTransition(async () => {
      const res = await createRuleAction({
        name: formName,
        description: formDescription,
        frequency: formFrequency,
        reminderTime: formReminderTime,
        actionType: formActionType,
        recipients: formRecipients,
        attachedProjectIds: formAttachedProjectIds,
      });

      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success('Automation rule created successfully');
        setIsCreateOpen(false);
        // Refresh page to load fully populated relation list
        const updated = await fetch('/api/project-statuses').then(() => router.refresh());
        window.location.reload();
      }
    });
  };

  // Handle edit submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error('Rule name is required.');
      return;
    }

    startTransition(async () => {
      const res = await updateRuleAction(selectedRule.id, {
        name: formName,
        description: formDescription,
        frequency: formFrequency,
        reminderTime: formReminderTime,
        actionType: formActionType,
        recipients: formRecipients,
        attachedProjectIds: formAttachedProjectIds,
      });

      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success('Automation rule updated successfully');
        setIsEditOpen(false);
        window.location.reload();
      }
    });
  };

  // Handle delete submit
  const handleDeleteConfirm = async () => {
    startTransition(async () => {
      const res = await deleteRuleAction(selectedRule.id);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success('Rule deleted successfully');
        setRules(prev => prev.filter(r => r.id !== selectedRule.id));
        setIsDeleteOpen(false);
        router.refresh();
      }
    });
  };

  // Handle run rule action (Trigger Automation immediately)
  const handleRunRule = async (ruleId: string) => {
    toast.info('Triggering automation rule...');
    const res = await executeRuleAction(ruleId);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success('Rule execution completed');
      // Refresh execution logs
      const updatedLogsRes = await fetch('/api/project-statuses').then(() => {
        window.location.reload();
      });
    }
  };

  // Toggle recipient role selection
  const toggleRecipient = (role: string) => {
    if (formRecipients.includes(role)) {
      setFormRecipients(prev => prev.filter(r => r !== role));
    } else {
      setFormRecipients(prev => [...prev, role]);
    }
  };

  // Toggle attached project selection
  const toggleProject = (projectId: string) => {
    if (formAttachedProjectIds.includes(projectId)) {
      setFormAttachedProjectIds(prev => prev.filter(id => id !== projectId));
    } else {
      setFormAttachedProjectIds(prev => [...prev, projectId]);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <Cpu className="text-primary" size={28} />
            Rules & Automation
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Define global reminders and automatic tasks to attach to your projects.
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="shadow-md">
          <Plus className="mr-2 h-4 w-4" /> Create Rule
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Rules List */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-bold tracking-tight">Active Automation Rules</h2>
          {rules.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center border border-dashed rounded-2xl text-muted-foreground p-6 bg-background">
              <Cpu size={40} className="opacity-20 mb-3" />
              <p className="text-sm font-semibold">No rules created yet.</p>
              <p className="text-xs text-center mt-1">Create rules to send progress reminders, update statuses, or auto-assign tasks.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-1">
              {rules.map((rule: any) => (
                <Card key={rule.id} className="relative overflow-hidden group hover:shadow-md transition-shadow border-slate-200/60 dark:border-slate-800/60">
                  <div className={`absolute top-0 left-0 w-1.5 h-full ${rule.isActive ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
                  <CardHeader className="pb-3 pl-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-base font-bold flex items-center gap-2">
                          {rule.name}
                          {!rule.isActive && <Badge variant="secondary" className="text-[10px]">Inactive</Badge>}
                        </CardTitle>
                        <CardDescription className="text-xs">{rule.description || 'No description provided.'}</CardDescription>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRunRule(rule.id)}
                          disabled={!rule.isActive || isPending}
                          className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 rounded-lg"
                          title="Run Rule Now"
                        >
                          <Play size={14} className="fill-current" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(rule)}
                          className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded-lg"
                        >
                          <Edit size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDelete(rule)}
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 pl-6 text-xs text-muted-foreground flex flex-wrap gap-x-6 gap-y-2">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} /> {rule.frequency}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={12} /> {rule.reminderTime}
                    </span>
                    <span className="flex items-center gap-1">
                      <Cpu size={12} /> Action: <strong className="text-foreground uppercase">{rule.actionType.replace('_', ' ')}</strong>
                    </span>
                    <span className="flex items-center gap-1">
                      <User size={12} /> Recipients: <strong className="text-foreground">{rule.recipients?.join(', ') || 'None'}</strong>
                    </span>
                    <div className="w-full mt-2 pt-2 border-t flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-semibold text-foreground mr-1">Attached Projects:</span>
                      {rule.projects.length === 0 ? (
                        <span className="italic text-[11px]">None</span>
                      ) : (
                        rule.projects.map((pr: any) => (
                          <Badge key={pr.projectId} variant="outline" className="text-[10px] bg-slate-50 dark:bg-slate-900">
                            {pr.project.name}
                          </Badge>
                        ))
                      )}
                    </div>
                    <div className="w-full mt-3 flex items-center justify-between">
                      <span className="text-[11px]">Toggle Rule State:</span>
                      <button
                        onClick={() => handleToggleActive(rule)}
                        className={`text-[11px] font-bold px-2 py-0.5 rounded border transition-colors ${
                          rule.isActive 
                            ? 'text-emerald-600 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                            : 'text-muted-foreground bg-muted border-slate-300 dark:border-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {rule.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Execution History */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight">Execution History</h2>
          <Card className="border-slate-200/60 dark:border-slate-800/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Rule Execution History</CardTitle>
              <CardDescription className="text-xs">Logs of automation runs in this organization.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {logs.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground italic">
                  No automation events logged yet.
                </div>
              ) : (
                <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
                  <Table>
                    <TableHeader className="bg-muted/30 text-xs">
                      <TableRow>
                        <TableHead className="py-2 pl-4">Rule/Log Details</TableHead>
                        <TableHead className="py-2 pr-4 text-right">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="text-xs">
                      {logs.map((log: any) => (
                        <TableRow key={log.id} className="hover:bg-muted/20">
                          <TableCell className="py-2 pl-4">
                            <div className="font-semibold text-foreground">{log.rule?.name || 'Deleted Rule'}</div>
                            {log.project && (
                              <div className="text-[10px] text-muted-foreground mt-0.5">Project: {log.project.name}</div>
                            )}
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                              {new Date(log.executedAt).toLocaleString('en-US', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                            <div className="text-[10px] text-muted-foreground mt-0.5">Sent To: {log.sentTo}</div>
                          </TableCell>
                          <TableCell className="py-2 pr-4 text-right align-middle">
                            <Badge 
                              variant="outline" 
                              className={`text-[10px] font-bold ${
                                log.status === 'SUCCESSFUL' 
                                  ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                  : 'bg-red-50 text-red-600 border-red-200'
                              }`}
                            >
                              {log.status}
                            </Badge>
                            {log.error && <p className="text-[9px] text-red-500 mt-1 max-w-[120px] truncate" title={log.error}>{log.error}</p>}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* CREATE RULE MODAL */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[550px] bg-background border-border max-h-[85vh] overflow-y-auto custom-scrollbar">
          <DialogHeader>
            <DialogTitle>Create Automation Rule</DialogTitle>
            <DialogDescription>
              Define recurring actions or progress reminders.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Rule Name</label>
              <Input
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Daily Project Report Reminder"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Description</label>
              <Input
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Send reminder to submit progress report."
              />
            </div>

            <div className="grid grid-cols-2 gap-4 bg-muted/20 p-4 rounded-xl border">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Frequency</label>
                <select
                  value={formFrequency}
                  onChange={(e) => setFormFrequency(e.target.value)}
                  className="flex h-9 w-full rounded-xl border bg-background px-3 text-sm focus:ring-1 focus:ring-ring"
                >
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Reminder Time</label>
                <Input
                  value={formReminderTime}
                  onChange={(e) => setFormReminderTime(e.target.value)}
                  placeholder="e.g. 06:00 PM"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Action Type</label>
              <select
                value={formActionType}
                onChange={(e) => setFormActionType(e.target.value)}
                className="flex h-9 w-full rounded-xl border bg-background px-3 text-sm focus:ring-1 focus:ring-ring"
              >
                <option value="SEND_REMINDER">Send Reminder</option>
                <option value="CREATE_TASK">Create Task</option>
                <option value="SEND_NOTIFICATION">Send Notification</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">Send Reminder To</label>
              <div className="flex flex-col gap-2 p-3 border rounded-xl bg-muted/20">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formRecipients.includes('PROJECT_OWNER')}
                    onChange={() => toggleRecipient('PROJECT_OWNER')}
                    className="rounded border-gray-300 text-primary"
                  />
                  Project Owner
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formRecipients.includes('PROJECT_MANAGER')}
                    onChange={() => toggleRecipient('PROJECT_MANAGER')}
                    className="rounded border-gray-300 text-primary"
                  />
                  Project Manager
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formRecipients.includes('ASSIGNED_USER')}
                    onChange={() => toggleRecipient('ASSIGNED_USER')}
                    className="rounded border-gray-300 text-primary"
                  />
                  Assigned Users
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">Attach to Projects</label>
              <div className="flex flex-col gap-2 p-3 border rounded-xl max-h-[150px] overflow-y-auto bg-muted/20 custom-scrollbar">
                {projects.length === 0 ? (
                  <p className="text-xs italic text-muted-foreground">No projects available.</p>
                ) : (
                  projects.map(p => (
                    <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formAttachedProjectIds.includes(p.id)}
                        onChange={() => toggleProject(p.id)}
                        className="rounded border-gray-300 text-primary"
                      />
                      {p.name}
                    </label>
                  ))
                )}
              </div>
            </div>

            <DialogFooter className="pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Creating...' : 'Create Rule'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT RULE MODAL */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[550px] bg-background border-border max-h-[85vh] overflow-y-auto custom-scrollbar">
          <DialogHeader>
            <DialogTitle>Edit Automation Rule</DialogTitle>
            <DialogDescription>
              Modify trigger schedules, actions, or project mappings.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Rule Name</label>
              <Input
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Daily Project Report Reminder"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Description</label>
              <Input
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Send reminder to submit progress report."
              />
            </div>

            <div className="grid grid-cols-2 gap-4 bg-muted/20 p-4 rounded-xl border">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Frequency</label>
                <select
                  value={formFrequency}
                  onChange={(e) => setFormFrequency(e.target.value)}
                  className="flex h-9 w-full rounded-xl border bg-background px-3 text-sm focus:ring-1 focus:ring-ring"
                >
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Reminder Time</label>
                <Input
                  value={formReminderTime}
                  onChange={(e) => setFormReminderTime(e.target.value)}
                  placeholder="e.g. 06:00 PM"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Action Type</label>
              <select
                value={formActionType}
                onChange={(e) => setFormActionType(e.target.value)}
                className="flex h-9 w-full rounded-xl border bg-background px-3 text-sm focus:ring-1 focus:ring-ring"
              >
                <option value="SEND_REMINDER">Send Reminder</option>
                <option value="CREATE_TASK">Create Task</option>
                <option value="SEND_NOTIFICATION">Send Notification</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">Send Reminder To</label>
              <div className="flex flex-col gap-2 p-3 border rounded-xl bg-muted/20">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formRecipients.includes('PROJECT_OWNER')}
                    onChange={() => toggleRecipient('PROJECT_OWNER')}
                    className="rounded border-gray-300 text-primary"
                  />
                  Project Owner
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formRecipients.includes('PROJECT_MANAGER')}
                    onChange={() => toggleRecipient('PROJECT_MANAGER')}
                    className="rounded border-gray-300 text-primary"
                  />
                  Project Manager
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formRecipients.includes('ASSIGNED_USER')}
                    onChange={() => toggleRecipient('ASSIGNED_USER')}
                    className="rounded border-gray-300 text-primary"
                  />
                  Assigned Users
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">Attach to Projects</label>
              <div className="flex flex-col gap-2 p-3 border rounded-xl max-h-[150px] overflow-y-auto bg-muted/20 custom-scrollbar">
                {projects.length === 0 ? (
                  <p className="text-xs italic text-muted-foreground">No projects available.</p>
                ) : (
                  projects.map(p => (
                    <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formAttachedProjectIds.includes(p.id)}
                        onChange={() => toggleProject(p.id)}
                        className="rounded border-gray-300 text-primary"
                      />
                      {p.name}
                    </label>
                  ))
                )}
              </div>
            </div>

            <DialogFooter className="pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* CONFIRM DELETE MODAL */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert size={20} /> Confirm Delete
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete rule <strong>&quot;{selectedRule?.name}&quot;</strong>? This action is permanent.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={isPending}>
              {isPending ? 'Deleting...' : 'Delete Rule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
