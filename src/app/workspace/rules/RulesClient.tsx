'use client';

import React, { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Play, Edit, Trash2, ShieldAlert, Cpu, Calendar, Clock, User, Check, AlertCircle, Search, ArrowRight, Shield, Users, Crown, X } from 'lucide-react';
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
  const [triggerField, setTriggerField] = useState('Title');
  const [triggerOperator, setTriggerOperator] = useState('Contains');
  const [triggerValue, setTriggerValue] = useState('');
  const [actionType, setActionType] = useState('In-app Notification');
  const [actionRecipients, setActionRecipients] = useState<string[]>(['PROJECT_MANAGER']);
  const [formAttachedProjectIds, setFormAttachedProjectIds] = useState<string[]>([]);
  const [recipientSearchQuery, setRecipientSearchQuery] = useState('');

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  // Extract all unique users from organization projects
  const allOrgUsers = useMemo(() => {
    const userMap = new Map<string, { id: string; name: string; email: string }>();
    projects.forEach((proj: any) => {
      if (proj.projectManager) {
        userMap.set(proj.projectManager.id, {
          id: proj.projectManager.id,
          name: proj.projectManager.name,
          email: proj.projectManager.email || '',
        });
      }
      proj.assignees?.forEach((a: any) => {
        if (a.user) {
          userMap.set(a.user.id, {
            id: a.user.id,
            name: a.user.name,
            email: a.user.email || '',
          });
        }
      });
    });
    return Array.from(userMap.values());
  }, [projects]);

  // Open creation modal
  const handleOpenCreate = () => {
    setFormName('');
    setFormDescription('');
    setTriggerField('Title');
    setTriggerOperator('Contains');
    setTriggerValue('');
    setActionType('In-app Notification');
    setActionRecipients(['PROJECT_MANAGER']);
    setFormAttachedProjectIds([]);
    setRecipientSearchQuery('');
    setIsCreateOpen(true);
  };

  // Open edit modal
  const handleOpenEdit = (rule: any) => {
    setSelectedRule(rule);
    setFormName(rule.name);
    setFormDescription(rule.description || '');
    setTriggerField(rule.triggerField || 'Title');
    setTriggerOperator(rule.triggerOperator || 'Contains');
    setTriggerValue(rule.triggerValue || '');

    // Map legacy database actionType values
    let displayAction = rule.actionType;
    if (rule.actionType === 'SEND_REMINDER' || rule.actionType === 'SEND_NOTIFICATION') {
      displayAction = 'In-app Notification';
    } else if (rule.actionType === 'CREATE_TASK') {
      displayAction = 'Create Task';
    } else if (rule.actionType === 'SEND_EMAIL') {
      displayAction = 'Notification Email';
    }
    setActionType(displayAction);

    setActionRecipients(rule.actionRecipients || rule.recipients || []);
    setFormAttachedProjectIds(rule.projects.map((pr: any) => pr.projectId));
    setRecipientSearchQuery('');
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
    if (!triggerValue.trim()) {
      toast.error('Trigger value is required.');
      return;
    }

    startTransition(async () => {
      const res = await createRuleAction({
        name: formName,
        description: formDescription,
        triggerField,
        triggerOperator,
        triggerValue,
        actionType,
        actionRecipients,
        attachedProjectIds: formAttachedProjectIds,
      });

      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success('Automation rule created successfully');
        setIsCreateOpen(false);
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
    if (!triggerValue.trim()) {
      toast.error('Trigger value is required.');
      return;
    }

    startTransition(async () => {
      const res = await updateRuleAction(selectedRule.id, {
        name: formName,
        description: formDescription,
        triggerField,
        triggerOperator,
        triggerValue,
        actionType,
        actionRecipients,
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

  // Trigger automation execution manually
  const handleRunRule = async (ruleId: string) => {
    toast.info('Triggering automation rule simulation...');
    const res = await executeRuleAction(ruleId);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success(res.message || 'Rule execution simulation completed.');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  };

  const toggleRecipient = (userId: string) => {
    setActionRecipients(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const toggleAttachedProject = (projectId: string) => {
    setFormAttachedProjectIds(prev => 
      prev.includes(projectId) ? prev.filter(id => id !== projectId) : [...prev, projectId]
    );
  };

  const getReadableActionType = (action: string) => {
    if (action === 'SEND_REMINDER' || action === 'SEND_NOTIFICATION') return 'In-app Notification';
    if (action === 'CREATE_TASK') return 'Create Task';
    if (action === 'SEND_EMAIL') return 'Notification Email';
    return action;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-5">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2.5 text-slate-900 dark:text-white">
            <Cpu className="h-8 w-8 text-primary" />
            Event-Based Rules
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Build custom IF &rarr; THEN automations triggered on task and project changes.
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="shadow-md rounded-xl h-10 px-4">
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
              <p className="text-sm font-semibold">No automation rules created yet.</p>
              <p className="text-xs text-center mt-1">Create event-based rules to auto-notify or create checklist tasks when criteria are met.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-1">
              {rules.map((rule: any) => (
                <Card key={rule.id} className="relative overflow-hidden group hover:shadow-md transition-shadow border-slate-200/60 dark:border-slate-800/60 rounded-2xl">
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
                          variant="outline"
                          size="sm"
                          onClick={() => handleRunRule(rule.id)}
                          disabled={!rule.isActive || isPending}
                          className="h-8 gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-900/50 dark:hover:bg-emerald-950/20 rounded-xl"
                          title="Test Rule"
                        >
                          <Play size={12} className="fill-current" />
                          <span>Test Rule</span>
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
                  <CardContent className="pt-0 pl-6 text-xs text-muted-foreground space-y-4">
                    {/* IF -> THEN Statement Block */}
                    <div className="bg-muted/30 p-3 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center gap-3 text-slate-800 dark:text-slate-200">
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge variant="secondary" className="bg-primary/10 text-primary border border-primary/20 font-bold uppercase tracking-wider text-[10px] py-0.5 px-1.5">IF</Badge>
                        <span className="font-semibold text-xs">{rule.triggerField || 'Title'}</span>
                        <span className="italic text-muted-foreground text-xs">{rule.triggerOperator?.toLowerCase() || 'contains'}</span>
                        <Badge variant="outline" className="font-mono text-[11px] bg-background">"{rule.triggerValue}"</Badge>
                      </div>
                      <ArrowRight size={14} className="text-muted-foreground hidden sm:block shrink-0" />
                      <div className="flex items-center gap-1.5">
                        <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold uppercase tracking-wider text-[10px] py-0.5 px-1.5">THEN</Badge>
                        <span className="font-bold text-xs">{getReadableActionType(rule.actionType)}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs">
                      <span className="flex items-center gap-1">
                        <User size={12} /> Recipients: <strong className="text-foreground">
                          {((rule.actionRecipients || rule.recipients) as string[])?.map(rec => {
                            if (rec === 'PROJECT_MANAGER') return 'Project Manager';
                            if (rec === 'PROJECT_OWNER') return 'Project Owner';
                            if (rec === 'ASSIGNED_USER') return 'Assigned Users';
                            const match = allOrgUsers.find(u => u.id === rec);
                            return match ? match.name : rec;
                          }).join(', ') || 'None'}
                        </strong>
                      </span>
                    </div>

                    <div className="pt-2 border-t flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-semibold text-foreground mr-1">Attached Projects:</span>
                      {rule.projects.length === 0 ? (
                        <span className="italic text-[11px]">All Projects</span>
                      ) : (
                        rule.projects.map((pr: any) => (
                          <Badge key={pr.projectId} variant="outline" className="text-[10px] bg-slate-50 dark:bg-slate-900">
                            {pr.project.name}
                          </Badge>
                        ))
                      )}
                    </div>

                    <div className="pt-2 flex items-center justify-between border-t">
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
          <Card className="border-slate-200/60 dark:border-slate-800/60 rounded-2xl">
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
                            {log.triggerData && (
                              <div className="text-[10px] bg-slate-50 dark:bg-zinc-800 p-1.5 rounded mt-1 font-mono text-muted-foreground leading-tight text-[9.5px]">
                                {(() => {
                                  try {
                                    const parsed = JSON.parse(log.triggerData);
                                    if (parsed && typeof parsed === 'object' && parsed.triggerField) {
                                      return `Field "${parsed.triggerField}" changed: "${parsed.previousValue}" → "${parsed.newValue}"`;
                                    }
                                  } catch (e) {}
                                  return log.triggerData;
                                })()}
                              </div>
                            )}
                            <div className="text-[10px] text-muted-foreground mt-1">
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
        <DialogContent className="sm:max-w-[550px] bg-background border-border max-h-[85vh] p-0 flex flex-col overflow-hidden">
          <DialogHeader className="p-6 pb-4 border-b shrink-0">
            <DialogTitle>Create Automation Rule</DialogTitle>
            <DialogDescription>
              Define IF &rarr; THEN event trigger criteria.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Rule Name</label>
                <Input
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Urgent Bug Assigned Alert"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Description</label>
                <Input
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Description of rule and action."
                />
              </div>

              {/* IF Trigger block */}
              <div className="space-y-3 p-4 border rounded-2xl bg-muted/15">
                <div className="text-xs font-bold text-primary flex items-center gap-1">
                  <Badge variant="secondary" className="bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold">IF</Badge>
                  Condition
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Field</label>
                    <select
                      value={triggerField}
                      onChange={(e) => setTriggerField(e.target.value)}
                      className="flex h-9 w-full rounded-xl border bg-background px-3 text-sm focus:ring-1 focus:ring-ring"
                    >
                      <option value="Title">Title</option>
                      <option value="Status">Status</option>
                      <option value="Priority">Priority</option>
                      <option value="Due Date">Due Date</option>
                      <option value="Assigned User">Assigned User</option>
                      <option value="Project">Project</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Condition</label>
                    <select
                      value={triggerOperator}
                      onChange={(e) => setTriggerOperator(e.target.value)}
                      className="flex h-9 w-full rounded-xl border bg-background px-3 text-sm focus:ring-1 focus:ring-ring"
                    >
                      <option value="Contains">Contains</option>
                      <option value="Equals">Equals</option>
                      <option value="Starts With">Starts With</option>
                      <option value="Ends With">Ends With</option>
                    </select>
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Value</label>
                    <Input
                      required
                      value={triggerValue}
                      onChange={(e) => setTriggerValue(e.target.value)}
                      placeholder="e.g. Bug"
                    />
                  </div>
                </div>
              </div>

              {/* THEN Action block */}
              <div className="space-y-3 p-4 border rounded-2xl bg-muted/15">
                <div className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                  <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-bold">THEN</Badge>
                  Action & Recipients
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Action</label>
                  <select
                    value={actionType}
                    onChange={(e) => setActionType(e.target.value)}
                    className="flex h-9 w-full rounded-xl border bg-background px-3 text-sm focus:ring-1"
                  >
                    <option value="In-app Notification">In-app Notification</option>
                    <option value="Notification Email">Notification Email</option>
                    <option value="Create Task">Create Task</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">To (Recipients)</label>
                  
                  {/* Selected Pills */}
                  {actionRecipients.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 dark:bg-zinc-900 border rounded-xl">
                      {actionRecipients.map(id => {
                        const roleLabel = id === 'PROJECT_MANAGER' ? 'Project Manager' : id === 'PROJECT_OWNER' ? 'Project Owner' : id === 'ASSIGNED_USER' ? 'All Assigned Users' : '';
                        const userLabel = allOrgUsers.find(u => u.id === id)?.name || id;
                        const displayName = roleLabel || userLabel;
                        return (
                          <Badge key={id} variant="secondary" className="gap-1.5 pl-2 pr-1 py-0.5 rounded-lg text-[10px] font-semibold bg-background shadow-sm border border-slate-200 text-slate-800 dark:text-slate-200">
                            {displayName}
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); toggleRecipient(id); }}
                              className="hover:bg-muted p-0.5 rounded-full text-slate-500 hover:text-slate-900"
                            >
                              <X size={10} />
                            </button>
                          </Badge>
                        );
                      })}
                    </div>
                  )}

                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search roles or team members..."
                      value={recipientSearchQuery}
                      onChange={(e) => setRecipientSearchQuery(e.target.value)}
                      className="pl-9 pr-4 rounded-xl text-sm"
                    />
                  </div>

                  {/* Scroll Box */}
                  <div className="border rounded-2xl p-2.5 max-h-[220px] overflow-y-auto space-y-3 bg-background custom-scrollbar">
                    
                    {/* Default Roles Grid */}
                    {('project manager'.includes(recipientSearchQuery.toLowerCase()) || 
                      'project owner'.includes(recipientSearchQuery.toLowerCase()) || 
                      'all assigned users'.includes(recipientSearchQuery.toLowerCase())) && (
                      <div className="space-y-1.5">
                        <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block px-1">Roles</span>
                        <div className="grid grid-cols-1 gap-2">
                          {[
                            { id: 'PROJECT_MANAGER', label: 'Project Manager (PM)', desc: 'Person leading project operations', icon: Shield },
                            { id: 'PROJECT_OWNER', label: 'Project Owner', desc: 'Organization owner or creator', icon: Crown },
                            { id: 'ASSIGNED_USER', label: 'All Assigned Users', desc: 'All members assigned to the task/project', icon: Users }
                          ].filter(role => role.label.toLowerCase().includes(recipientSearchQuery.toLowerCase())).map(role => {
                            const isSel = actionRecipients.includes(role.id);
                            const IconComp = role.icon;
                            return (
                              <div 
                                key={role.id} 
                                onClick={() => toggleRecipient(role.id)}
                                className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                                  isSel 
                                    ? 'border-primary bg-primary/5 text-primary' 
                                    : 'border-slate-100 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-900'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`p-2 rounded-lg shrink-0 ${isSel ? 'bg-primary/10 text-primary' : 'bg-slate-100 dark:bg-zinc-800 text-slate-500'}`}>
                                    <IconComp size={16} />
                                  </div>
                                  <div className="text-left">
                                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-none">{role.label}</p>
                                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{role.desc}</p>
                                  </div>
                                </div>
                                <div className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${isSel ? 'border-primary bg-primary text-white' : 'border-slate-300'}`}>
                                  {isSel && <Check size={10} className="stroke-[3]" />}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Specific Users List */}
                    <div className="space-y-1.5 pt-1.5 border-t border-dashed">
                      <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block px-1">Specific Users</span>
                      <div className="space-y-1.5">
                        {allOrgUsers.filter(u => 
                          u.name.toLowerCase().includes(recipientSearchQuery.toLowerCase()) || 
                          u.email.toLowerCase().includes(recipientSearchQuery.toLowerCase())
                        ).map(user => {
                          const isSel = actionRecipients.includes(user.id);
                          return (
                            <div 
                              key={user.id} 
                              onClick={() => toggleRecipient(user.id)}
                              className={`flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer ${
                                isSel 
                                  ? 'border-primary bg-primary/5 text-primary' 
                                  : 'border-slate-100 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-900'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                {/* Avatar */}
                                <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-slate-200 to-slate-300 text-slate-700 dark:from-zinc-700 dark:to-zinc-800 dark:text-zinc-300 flex items-center justify-center text-xs font-extrabold shrink-0">
                                  {getInitials(user.name)}
                                </div>
                                <div className="text-left">
                                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-none">{user.name}</p>
                                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{user.email}</p>
                                </div>
                              </div>
                              <div className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${isSel ? 'border-primary bg-primary text-white' : 'border-slate-300'}`}>
                                {isSel && <Check size={10} className="stroke-[3]" />}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="p-6 pt-4 border-t bg-muted/10 shrink-0">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isPending}>Create Rule</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT RULE MODAL */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[550px] bg-background border-border max-h-[85vh] p-0 flex flex-col overflow-hidden">
          <DialogHeader className="p-6 pb-4 border-b shrink-0">
            <DialogTitle>Edit Automation Rule</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Rule Name</label>
                <Input
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Description</label>
                <Input
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                />
              </div>

              {/* IF Trigger block */}
              <div className="space-y-3 p-4 border rounded-2xl bg-muted/15">
                <div className="text-xs font-bold text-primary flex items-center gap-1">
                  <Badge variant="secondary" className="bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold">IF</Badge>
                  Condition
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Field</label>
                    <select
                      value={triggerField}
                      onChange={(e) => setTriggerField(e.target.value)}
                      className="flex h-9 w-full rounded-xl border bg-background px-3 text-sm focus:ring-1 focus:ring-ring"
                    >
                      <option value="Title">Title</option>
                      <option value="Status">Status</option>
                      <option value="Priority">Priority</option>
                      <option value="Due Date">Due Date</option>
                      <option value="Assigned User">Assigned User</option>
                      <option value="Project">Project</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Condition</label>
                    <select
                      value={triggerOperator}
                      onChange={(e) => setTriggerOperator(e.target.value)}
                      className="flex h-9 w-full rounded-xl border bg-background px-3 text-sm focus:ring-1 focus:ring-ring"
                    >
                      <option value="Contains">Contains</option>
                      <option value="Equals">Equals</option>
                      <option value="Starts With">Starts With</option>
                      <option value="Ends With">Ends With</option>
                    </select>
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Value</label>
                    <Input
                      required
                      value={triggerValue}
                      onChange={(e) => setTriggerValue(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* THEN Action block */}
              <div className="space-y-3 p-4 border rounded-2xl bg-muted/15">
                <div className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                  <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-bold">THEN</Badge>
                  Action & Recipients
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Action</label>
                  <select
                    value={actionType}
                    onChange={(e) => setActionType(e.target.value)}
                    className="flex h-9 w-full rounded-xl border bg-background px-3 text-sm focus:ring-1"
                  >
                    <option value="In-app Notification">In-app Notification</option>
                    <option value="Notification Email">Notification Email</option>
                    <option value="Create Task">Create Task</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">To (Recipients)</label>
                  
                  {/* Selected Pills */}
                  {actionRecipients.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 dark:bg-zinc-900 border rounded-xl">
                      {actionRecipients.map(id => {
                        const roleLabel = id === 'PROJECT_MANAGER' ? 'Project Manager' : id === 'PROJECT_OWNER' ? 'Project Owner' : id === 'ASSIGNED_USER' ? 'All Assigned Users' : '';
                        const userLabel = allOrgUsers.find(u => u.id === id)?.name || id;
                        const displayName = roleLabel || userLabel;
                        return (
                          <Badge key={id} variant="secondary" className="gap-1.5 pl-2 pr-1 py-0.5 rounded-lg text-[10px] font-semibold bg-background shadow-sm border border-slate-200 text-slate-800 dark:text-slate-200">
                            {displayName}
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); toggleRecipient(id); }}
                              className="hover:bg-muted p-0.5 rounded-full text-slate-500 hover:text-slate-900"
                            >
                              <X size={10} />
                            </button>
                          </Badge>
                        );
                      })}
                    </div>
                  )}

                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search roles or team members..."
                      value={recipientSearchQuery}
                      onChange={(e) => setRecipientSearchQuery(e.target.value)}
                      className="pl-9 pr-4 rounded-xl text-sm"
                    />
                  </div>

                  {/* Scroll Box */}
                  <div className="border rounded-2xl p-2.5 max-h-[220px] overflow-y-auto space-y-3 bg-background custom-scrollbar">
                    
                    {/* Default Roles Grid */}
                    {('project manager'.includes(recipientSearchQuery.toLowerCase()) || 
                      'project owner'.includes(recipientSearchQuery.toLowerCase()) || 
                      'all assigned users'.includes(recipientSearchQuery.toLowerCase())) && (
                      <div className="space-y-1.5">
                        <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block px-1">Roles</span>
                        <div className="grid grid-cols-1 gap-2">
                          {[
                            { id: 'PROJECT_MANAGER', label: 'Project Manager (PM)', desc: 'Person leading project operations', icon: Shield },
                            { id: 'PROJECT_OWNER', label: 'Project Owner', desc: 'Organization owner or creator', icon: Crown },
                            { id: 'ASSIGNED_USER', label: 'All Assigned Users', desc: 'All members assigned to the task/project', icon: Users }
                          ].filter(role => role.label.toLowerCase().includes(recipientSearchQuery.toLowerCase())).map(role => {
                            const isSel = actionRecipients.includes(role.id);
                            const IconComp = role.icon;
                            return (
                              <div 
                                key={role.id} 
                                onClick={() => toggleRecipient(role.id)}
                                className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                                  isSel 
                                    ? 'border-primary bg-primary/5 text-primary' 
                                    : 'border-slate-100 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-900'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`p-2 rounded-lg shrink-0 ${isSel ? 'bg-primary/10 text-primary' : 'bg-slate-100 dark:bg-zinc-800 text-slate-500'}`}>
                                    <IconComp size={16} />
                                  </div>
                                  <div className="text-left">
                                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-none">{role.label}</p>
                                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{role.desc}</p>
                                  </div>
                                </div>
                                <div className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${isSel ? 'border-primary bg-primary text-white' : 'border-slate-300'}`}>
                                  {isSel && <Check size={10} className="stroke-[3]" />}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Specific Users List */}
                    <div className="space-y-1.5 pt-1.5 border-t border-dashed">
                      <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block px-1">Specific Users</span>
                      <div className="space-y-1.5">
                        {allOrgUsers.filter(u => 
                          u.name.toLowerCase().includes(recipientSearchQuery.toLowerCase()) || 
                          u.email.toLowerCase().includes(recipientSearchQuery.toLowerCase())
                        ).map(user => {
                          const isSel = actionRecipients.includes(user.id);
                          return (
                            <div 
                              key={user.id} 
                              onClick={() => toggleRecipient(user.id)}
                              className={`flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer ${
                                isSel 
                                  ? 'border-primary bg-primary/5 text-primary' 
                                  : 'border-slate-100 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-900'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                {/* Avatar */}
                                <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-slate-200 to-slate-300 text-slate-700 dark:from-zinc-700 dark:to-zinc-800 dark:text-zinc-300 flex items-center justify-center text-xs font-extrabold shrink-0">
                                  {getInitials(user.name)}
                                </div>
                                <div className="text-left">
                                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-none">{user.name}</p>
                                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{user.email}</p>
                                </div>
                              </div>
                              <div className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${isSel ? 'border-primary bg-primary text-white' : 'border-slate-300'}`}>
                                {isSel && <Check size={10} className="stroke-[3]" />}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="p-6 pt-4 border-t bg-muted/10 shrink-0">
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isPending}>Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* CONFIRM DELETE MODAL */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-md bg-background border-border">
          <DialogHeader>
            <DialogTitle>Delete Automation Rule</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete rule "{selectedRule?.name}"?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={isPending}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
