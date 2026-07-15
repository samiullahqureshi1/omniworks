'use client';

import React, { useState, useTransition, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumberStepper } from '@/components/ui/NumberStepper';
import { 
  ArrowLeft, Calendar, Clock, MoreHorizontal, Settings, 
  LayoutDashboard, CheckSquare, Users, Timer, Activity,
  Briefcase, MessageSquare, GripVertical, Plus, ShieldAlert,
  Search, Check, X, Hash, Trash2, Repeat, ChevronDown, Cpu
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { createTaskAction, updateTaskAction, deleteTaskAction } from '@/app/actions/tasks';
import { updateTeamOpsProjectAction, deleteTeamOpsProjectAction } from '@/app/actions/teamops';
import { getRulesAction, createRuleAction } from '@/app/actions/rules';
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { useRealtime } from '@/hooks/useRealtime';

export default function TeamOpsDetailClient({
  project,
  currentUser,
  users = [],
  taskStatuses = [],
  projectStatuses = []
}: {
  project: any;
  currentUser: any;
  users?: any[];
  taskStatuses?: any[];
  projectStatuses?: any[];
}) {
  const [activeTab, setActiveTab] = useState('overview');
  const [isPending, startTransition] = useTransition();
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('MEDIUM');
  const [newTaskHours, setNewTaskHours] = useState('');
  const [newTaskAssignees, setNewTaskAssignees] = useState<string[]>([]);
  const [isAssigneeModalOpen, setIsAssigneeModalOpen] = useState(false);
  const [assigneeSearchQuery, setAssigneeSearchQuery] = useState('');
  
  // Project Edit
  const [isEditProjectOpen, setIsEditProjectOpen] = useState(false);
  const [editIsOngoing, setEditIsOngoing] = useState(project.isOngoing);
  const [editDescription, setEditDescription] = useState(project.description || '');
  const [editDepartment, setEditDepartment] = useState(project.department || '');
  const [editTeam, setEditTeam] = useState(project.team || '');
  const [editRepeatHour, setEditRepeatHour] = useState("09");
  const [editRepeatMinute, setEditRepeatMinute] = useState("00");
  const [editRepeatAmPm, setEditRepeatAmPm] = useState("AM");
  const [editCustomFields, setEditCustomFields] = useState<
    { name: string; type: string; value: string }[]
  >(() => {
    if (project.customFields && Array.isArray(project.customFields)) {
      return project.customFields as any[];
    }
    return [];
  });

  // Rule States
  const [rules, setRules] = useState<any[]>([]);
  const [attachedRuleIds, setAttachedRuleIds] = useState<string[]>(
    project.rules?.map((pr: any) => pr.ruleId) || []
  );
  const [isCreateRuleOpen, setIsCreateRuleOpen] = useState(false);

  // Rule Form States
  const [ruleFormName, setRuleFormName] = useState("");
  const [ruleFormDescription, setRuleFormDescription] = useState("");
  const [ruleFormFrequency, setRuleFormFrequency] = useState("DAILY");
  const [ruleFormReminderTime, setRuleFormReminderTime] = useState("09:00 AM");
  const [ruleFormActionType, setRuleFormActionType] = useState("SEND_REMINDER");
  const [ruleFormRecipients, setRuleFormRecipients] = useState<string[]>(["PROJECT_MANAGER"]);

  const fetchRules = async () => {
    const res = await getRulesAction();
    if (res.success && res.rules) {
      setRules(res.rules);
    }
  };

  useEffect(() => {
    if (isEditProjectOpen) {
      fetchRules();
      if (project.repeatTime) {
        const match = project.repeatTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
        if (match) {
          setEditRepeatHour(match[1]);
          setEditRepeatMinute(match[2]);
          setEditRepeatAmPm(match[3].toUpperCase());
        }
      }
    }
  }, [isEditProjectOpen]);

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleFormName.trim()) {
      toast.error("Rule name is required");
      return;
    }

    startTransition(async () => {
      const res = await createRuleAction({
        name: ruleFormName,
        description: ruleFormDescription,
        frequency: ruleFormFrequency,
        reminderTime: ruleFormReminderTime,
        actionType: ruleFormActionType,
        recipients: ruleFormRecipients,
      });

      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Rule created and attached successfully");
        setIsCreateRuleOpen(false);
        if (res.rule) {
          setAttachedRuleIds((prev) => [...prev, res.rule.id]);
        }
        fetchRules();
        setRuleFormName("");
        setRuleFormDescription("");
        setRuleFormFrequency("DAILY");
        setRuleFormReminderTime("09:00 AM");
        setRuleFormActionType("SEND_REMINDER");
        setRuleFormRecipients(["PROJECT_MANAGER"]);
      }
    });
  };

  const toggleRuleRecipient = (role: string) => {
    if (ruleFormRecipients.includes(role)) {
      setRuleFormRecipients((prev) => prev.filter((r) => r !== role));
    } else {
      setRuleFormRecipients((prev) => [...prev, role]);
    }
  };

  // Presence
  const [presenceMap, setPresenceMap] = useState<Record<string, string>>({});
  const { lastEvent } = useRealtime([]);

  useEffect(() => {
    const initialPresence: Record<string, string> = {};
    users.forEach((u: any) => {
      if (u.presence) {
        const diff = Date.now() - new Date(u.presence.lastSeen).getTime();
        initialPresence[u.id] = diff > 120000 ? 'OFFLINE' : 'ONLINE';
      } else {
        initialPresence[u.id] = 'OFFLINE';
      }
    });
    setPresenceMap(initialPresence);
  }, [users]);

  useEffect(() => {
    if (lastEvent?.event === 'presence_updated' && lastEvent.payload) {
      setPresenceMap(prev => ({
        ...prev,
        [lastEvent.payload.userId]: lastEvent.payload.status
      }));
    }
  }, [lastEvent]);

  const projectMembers = useMemo(() => {
    const membersMap = new Map();
    users.filter((u: any) => u.role === 'OWNER').forEach((u: any) => membersMap.set(u.id, u));
    if (project.projectManagerId) {
      const pm = users.find((u: any) => u.id === project.projectManagerId);
      if (pm) membersMap.set(pm.id, pm);
    }
    if (project.assignees) {
      project.assignees.forEach((a: any) => {
        if (a.user) membersMap.set(a.user.id, a.user);
      });
    }
    if (project.tasks) {
      project.tasks.forEach((t: any) => {
        if (t.assignees) {
          t.assignees.forEach((a: any) => {
            if (a.user) membersMap.set(a.user.id, a.user);
          });
        }
      });
    }
    return Array.from(membersMap.values());
  }, [project, users]);
  
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (searchParams.get('edit') === 'true') {
      setIsEditProjectOpen(true);
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.delete('edit');
      router.replace(`${pathname}${newParams.toString() ? `?${newParams.toString()}` : ''}`, { scroll: false });
    }
  }, [searchParams, pathname, router]);
  
  const members = users.filter((u: any) => u.role === 'MEMBER' && u.status === 'ACTIVE');

  // Permissions
  const isOwner = currentUser.role === 'OWNER';
  const isPM = project.projectManagerId === currentUser.userId;
  const canManageTasks = isOwner || isPM;

  // Metrics
  const getTaskTrackedHours = (taskId: string) => {
    const ms = project.timeEntries?.filter((t: any) => t.taskId === taskId).reduce((acc: number, t: any) => acc + (t.activeWorkedDuration || 0) * 1000, 0) || 0;
    return Math.round((ms / (1000 * 60 * 60)) * 100) / 100;
  };

  const getMemberTrackedHours = (userId: string) => {
    const ms = project.timeEntries?.filter((t: any) => t.memberId === userId).reduce((acc: number, t: any) => acc + (t.activeWorkedDuration || 0) * 1000, 0) || 0;
    return Math.round((ms / (1000 * 60 * 60)) * 100) / 100;
  };

  const getMemberAllocatedHours = (userId: string) => {
    let allocated = 0;
    project.tasks?.forEach((task: any) => {
      if (task.assignees?.some((a: any) => a.userId === userId)) {
        allocated += (task.allocatedHours || 0);
      }
    });
    return allocated;
  };

  const isStrictMember = currentUser.role === 'MEMBER' && !isPM;

  let displayTotalAllocatedHours = project.totalAllocatedHours || 0;
  let displayTotalTrackedHours = 0;
  let displayProgressPercent = 0;

  if (isStrictMember) {
    displayTotalAllocatedHours = getMemberAllocatedHours(currentUser.userId);
    displayTotalTrackedHours = getMemberTrackedHours(currentUser.userId);
    displayProgressPercent = displayTotalAllocatedHours 
      ? Math.round((displayTotalTrackedHours / displayTotalAllocatedHours) * 100)
      : 0;
  } else {
    const totalTrackedMs = project.timeEntries?.reduce((acc: number, t: any) => acc + (t.activeWorkedDuration || 0) * 1000, 0) || 0;
    displayTotalTrackedHours = Math.round((totalTrackedMs / (1000 * 60 * 60)) * 100) / 100;
    displayProgressPercent = project.totalAllocatedHours 
      ? Math.round((displayTotalTrackedHours / project.totalAllocatedHours) * 100)
      : 0;
  }

  async function handleUpdateProject(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const repeatTime = `${editRepeatHour}:${editRepeatMinute} ${editRepeatAmPm}`;

    startTransition(async () => {
      const res = await updateTeamOpsProjectAction(project.id, {
        name: formData.get('name') as string,
        description: editDescription,
        notes: project.notes,
        projectManagerId: formData.get('projectManagerId') as string || undefined,
        statusId: formData.get('statusId') as string || undefined,
        priority: formData.get('priority') as any,
        startDate: formData.get('startDate') as string,
        endDate: formData.get('endDate') as string || undefined,
        isOngoing: editIsOngoing,
        assigneeIds: project.assignees.map((a: any) => a.userId),
        projectBudget: formData.get('projectBudget') ? parseFloat(formData.get('projectBudget') as string) : undefined,
        totalAllocatedHours: formData.get('totalAllocatedHours') ? parseFloat(formData.get('totalAllocatedHours') as string) : undefined,
        customFields: editCustomFields,
        department: editDepartment,
        team: editTeam,
        repeatTime,
        ruleIds: attachedRuleIds,
      });
      
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success('Internal project updated successfully');
        setIsEditProjectOpen(false);
        router.refresh();
      }
    });
  }

  async function handleCreateTask(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!newTaskName.trim()) return;

    const hours = newTaskHours ? parseFloat(newTaskHours) : undefined;

    startTransition(async () => {
      const res = await createTaskAction(
        project.id, 
        newTaskName, 
        newTaskDescription || undefined, 
        newTaskPriority as any,
        hours,
        undefined, 
        undefined, 
        newTaskAssignees
      );
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success('Task created successfully');
        setNewTaskName('');
        setNewTaskDescription('');
        setNewTaskHours('');
        setNewTaskPriority('MEDIUM');
        setNewTaskAssignees([]);
        setIsNewTaskModalOpen(false);
        router.refresh();
      }
    });
  }

  const handleTaskStatusChange = async (taskId: string, newStatus: string) => {
    startTransition(async () => {
      const res = await updateTaskAction(taskId, { statusId: newStatus });
      if (res.error) toast.error(res.error);
      else router.refresh();
    });
  };

  const getStatusColor = (status: any) => {
    if (typeof status === 'string') {
      switch(status) {
        case 'PLANNING': return 'bg-[#fbfaf7]0/10 text-slate-500 border-slate-500/20';
        case 'IN_PROGRESS': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
        case 'ON_HOLD': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
        case 'COMPLETE': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
        default: return 'bg-[#fbfaf7]0/10 text-slate-500 border-slate-500/20';
      }
    }
    return '';
  };

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'LOW': return 'text-slate-500 bg-slate-100 dark:bg-slate-800';
      case 'MEDIUM': return 'text-blue-500 bg-blue-100 dark:bg-blue-900/30';
      case 'HIGH': return 'text-orange-500 bg-orange-100 dark:bg-orange-900/30';
      case 'CRITICAL': return 'text-red-500 bg-red-100 dark:bg-red-900/30 font-bold';
      default: return 'text-slate-500';
    }
  };

  const handleAssigneeToggle = (userId: string) => {
    setNewTaskAssignees(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      
      {/* Header */}
      <div className="relative flex flex-col gap-4 overflow-hidden bg-background p-6 rounded-2xl border shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-blue-500/5 pointer-events-none" />
        <div className="relative z-10">
          <Link href="/workspace/teamops" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 w-fit transition-colors font-semibold">
            <ArrowLeft size={14} /> Back to TeamOps Hub
          </Link>
          <div className="flex justify-between items-start mt-3">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">{project.name}</h1>
                <Badge 
                  variant="outline" 
                  style={project.status ? { 
                    backgroundColor: `${project.status.color}20`, 
                    color: project.status.color, 
                    borderColor: `${project.status.color}40` 
                  } : {}}
                  className="font-bold uppercase tracking-wider text-[10px]"
                >
                  {project.status?.name || 'No Status'}
                </Badge>
                <Badge variant="secondary" className={getPriorityColor(project.priority)}>
                  {project.priority}
                </Badge>
                {project.isRepeated && (
                  <Badge variant="outline" className="text-xs bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-950/20 dark:text-purple-400 py-0.5 px-2 font-semibold flex items-center gap-1">
                    <Repeat size={10} /> Recurring {project.repeatTime && `(${project.repeatTime})`}
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-4 mt-2 text-xs font-semibold text-muted-foreground">
                {project.department && <span>Department: {project.department}</span>}
                {project.team && <span>Team: {project.team}</span>}
              </div>
              {project.description && (
                <div 
                  className="text-muted-foreground mt-4 max-w-3xl prose prose-sm dark:prose-invert" 
                  dangerouslySetInnerHTML={{ __html: project.description }}
                />
              )}
            </div>
          </div>
          {(isOwner || isPM) && (
            <div className="relative z-10 mt-4">
              <Dialog open={isEditProjectOpen} onOpenChange={setIsEditProjectOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="shadow-sm font-semibold">
                    <Settings className="mr-2 h-4 w-4" /> Edit Project
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[700px] h-[90vh] p-0 flex flex-col overflow-hidden">
                  <DialogHeader className="px-6 py-4 border-b shrink-0 shadow-sm">
                    <DialogTitle>Edit Internal Project</DialogTitle>
                  </DialogHeader>
                  <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
                    <form onSubmit={handleUpdateProject} className="space-y-6 pb-6">
                      
                      {/* Rules Selector */}
                      <div className="space-y-3 bg-indigo-50/50 dark:bg-indigo-950/10 p-4 rounded-xl border">
                        <div className="flex justify-between items-center">
                          <label className="text-sm font-bold text-foreground">Automation Rules</label>
                        </div>
                        <div className="flex gap-2 items-center flex-wrap">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button type="button" variant="outline" size="sm" className="h-9 rounded-xl border bg-background px-3 text-xs font-semibold flex items-center gap-1.5 shadow-sm">
                                Select Rules... <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-58 bg-white dark:bg-[#1f1f1f] rounded-xl shadow-lg border p-1.5 z-50">
                              {rules.filter(r => r.isActive).length === 0 ? (
                                <div className="p-2.5 text-center text-xs text-muted-foreground">No active rules</div>
                              ) : (
                                rules.filter((r) => r.isActive).map((r) => {
                                  const isAttached = attachedRuleIds.includes(r.id);
                                  return (
                                    <DropdownMenuItem
                                      key={r.id}
                                      onClick={() => {
                                        if (isAttached) {
                                          setAttachedRuleIds(prev => prev.filter(id => id !== r.id));
                                        } else {
                                          setAttachedRuleIds(prev => [...prev, r.id]);
                                        }
                                      }}
                                      className="cursor-pointer rounded-lg px-2.5 py-2 text-xs flex items-center justify-between hover:bg-muted"
                                    >
                                      <span>{r.name}</span>
                                      {isAttached && <Check className="h-3.5 w-3.5 text-primary shrink-0 ml-2" />}
                                    </DropdownMenuItem>
                                  );
                                })
                              )}
                              <DropdownMenuSeparator className="my-1 border-t" />
                              <DropdownMenuItem
                                onClick={() => setIsCreateRuleOpen(true)}
                                className="cursor-pointer rounded-lg px-2.5 py-2 text-xs text-primary hover:bg-primary/5 font-semibold flex items-center gap-1"
                              >
                                <Plus className="h-3.5 w-3.5" /> Create New Rule
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>

                          <div className="flex flex-wrap gap-1.5 items-center">
                            {attachedRuleIds.map((id) => {
                              const r = rules.find((rule) => rule.id === id);
                              if (!r) return null;
                              return (
                                <Badge
                                  key={id}
                                  variant="secondary"
                                  className="py-1 px-2.5 rounded-lg flex items-center gap-1.5 bg-indigo-50 text-indigo-700 border text-xs font-semibold"
                                >
                                  {r.name}
                                  <button
                                    type="button"
                                    onClick={() => setAttachedRuleIds((prev) => prev.filter((rid) => rid !== id))}
                                    className="hover:text-destructive text-indigo-500 rounded-full p-0.5"
                                  >
                                    <X size={10} />
                                  </button>
                                </Badge>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Basics */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2 col-span-2">
                          <label className="text-sm font-medium">Project Name *</label>
                          <Input name="name" defaultValue={project.name} required />
                        </div>
                        <div className="space-y-2 col-span-2">
                          <label className="text-sm font-medium">Description</label>
                          <RichTextEditor content={editDescription} onChange={setEditDescription} />
                        </div>
                      </div>

                      {/* Internal Details */}
                      <div className="grid grid-cols-2 gap-4 bg-muted/20 p-4 rounded-xl border">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Department</label>
                          <Input value={editDepartment} onChange={(e) => setEditDepartment(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Team</label>
                          <Input value={editTeam} onChange={(e) => setEditTeam(e.target.value)} />
                        </div>
                        <div className="space-y-2 col-span-2">
                          <label className="text-sm font-medium">Project Owner / PM</label>
                          <select
                            name="projectManagerId"
                            defaultValue={project.projectManagerId || ''}
                            className="flex h-9 w-full rounded-xl border bg-background px-3 text-sm focus:ring-1"
                          >
                            <option value="">Unassigned</option>
                            {members.map((m) => (
                              <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Config */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Status</label>
                          <select
                            name="statusId"
                            defaultValue={project.statusId || ''}
                            className="flex h-9 w-full rounded-xl border bg-background px-3 text-sm focus:ring-1"
                          >
                            <option value="">No Status</option>
                            {projectStatuses.map((s) => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Priority</label>
                          <select
                            name="priority"
                            defaultValue={project.priority}
                            className="flex h-9 w-full rounded-xl border bg-background px-3 text-sm focus:ring-1"
                          >
                            <option value="LOW">Low</option>
                            <option value="MEDIUM">Medium</option>
                            <option value="HIGH">High</option>
                            <option value="CRITICAL">Critical</option>
                          </select>
                        </div>
                      </div>

                      {/* Timeline */}
                      <div className="grid grid-cols-2 gap-4 bg-muted/20 p-4 rounded-xl border">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Start Date *</label>
                          <Input
                            type="date"
                            name="startDate"
                            defaultValue={project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : ''}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <label className="text-sm font-medium">End Date</label>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="checkbox"
                                id="edit-ongoing"
                                checked={editIsOngoing}
                                onChange={(e) => setEditIsOngoing(e.target.checked)}
                                className="rounded text-primary focus:ring-primary cursor-pointer h-3.5 w-3.5"
                              />
                              <label htmlFor="edit-ongoing" className="text-xs text-muted-foreground font-semibold cursor-pointer">Ongoing</label>
                            </div>
                          </div>
                          {!editIsOngoing ? (
                            <Input
                              type="date"
                              name="endDate"
                              defaultValue={project.endDate ? new Date(project.endDate).toISOString().split('T')[0] : ''}
                              required={!editIsOngoing}
                            />
                          ) : (
                            <div className="flex h-9 w-full items-center justify-center rounded-xl border bg-muted/50 text-xs text-muted-foreground italic">
                              Project has no end date
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Repeat Time Picker */}
                      {project.isRepeated && (
                        <div className="space-y-2 p-4 bg-purple-50/50 dark:bg-purple-950/10 border border-purple-100 rounded-xl">
                          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Execution Time (Repeat At)</label>
                          <div className="flex gap-1.5 items-center mt-1">
                            <select
                              value={editRepeatHour}
                              onChange={(e) => setEditRepeatHour(e.target.value)}
                              className="flex h-10 w-16 text-center rounded-xl border bg-background px-2 text-sm focus:outline-none"
                            >
                              {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0")).map((h) => (
                                <option key={h} value={h}>{h}</option>
                              ))}
                            </select>
                            <span className="text-sm font-bold">:</span>
                            <select
                              value={editRepeatMinute}
                              onChange={(e) => setEditRepeatMinute(e.target.value)}
                              className="flex h-10 w-16 text-center rounded-xl border bg-background px-2 text-sm focus:outline-none"
                            >
                              {["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"].map((m) => (
                                <option key={m} value={m}>{m}</option>
                              ))}
                            </select>
                            <select
                              value={editRepeatAmPm}
                              onChange={(e) => setEditRepeatAmPm(e.target.value)}
                              className="flex h-10 w-16 text-center rounded-xl border bg-background px-2 text-sm focus:outline-none"
                            >
                              <option value="AM">AM</option>
                              <option value="PM">PM</option>
                            </select>
                          </div>
                        </div>
                      )}

                      {/* Budget */}
                      <div className="grid grid-cols-2 gap-4 bg-muted/10 p-4 rounded-xl border">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Budget ($)</label>
                          <NumberStepper name="projectBudget" step={1} min={0} defaultValue={project.projectBudget || ''} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Allocated Hours</label>
                          <NumberStepper name="totalAllocatedHours" step={1} min={0} defaultValue={project.totalAllocatedHours || ''} />
                        </div>
                      </div>

                      <DialogFooter className="pt-4 border-t mt-4">
                        <Button type="button" variant="outline" onClick={() => setIsEditProjectOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={isPending}>Save Changes</Button>
                      </DialogFooter>
                    </form>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="flex border-b overflow-x-auto gap-6 no-scrollbar">
        {[
          { id: 'overview', label: 'Overview', icon: LayoutDashboard },
          { id: 'tasks', label: 'Tasks & Checklists', icon: CheckSquare },
          { id: 'team', label: 'Operational Team', icon: Users },
          { id: 'time', label: 'Hours Tracked', icon: Timer }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-semibold transition-all shrink-0 ${
                isActive 
                  ? 'border-purple-600 text-purple-600 dark:border-purple-400 dark:text-purple-400' 
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      {activeTab === 'overview' && (
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Hours Logged</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold text-slate-800 dark:text-white">
                {displayTotalTrackedHours}h
              </div>
              <p className="text-xs text-muted-foreground mt-1 font-semibold">
                Of {displayTotalAllocatedHours ? `${displayTotalAllocatedHours}h allocated` : 'unlimited allocation'}
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Budget Used</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold text-slate-800 dark:text-white">
                {project.projectBudget ? `$${project.projectBudget.toLocaleString()}` : '—'}
              </div>
              <p className="text-xs text-muted-foreground mt-1 font-semibold">Total internal budget allowance.</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Attached Automation Rules</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {project.rules && project.rules.length > 0 ? (
                project.rules.map((pr: any) => (
                  <Badge key={pr.ruleId} variant="secondary" className="mr-1 text-[10px] py-0.5">
                    {pr.rule?.name || 'Rule'}
                  </Badge>
                ))
              ) : (
                <p className="text-xs text-muted-foreground italic">No rules attached.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'tasks' && (
        <div className="bg-white dark:bg-zinc-900 border rounded-2xl p-5 shadow-sm space-y-6">
          <div className="flex justify-between items-center border-b pb-4">
            <h3 className="text-lg font-bold text-foreground">Operational Checklist Tasks</h3>
            {canManageTasks && (
              <Button size="sm" onClick={() => setIsNewTaskModalOpen(true)}>
                <Plus size={16} className="mr-1" /> Add Task
              </Button>
            )}
          </div>

          <div className="space-y-4">
            {project.tasks?.map((task: any) => (
              <div key={task.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border rounded-xl bg-muted/10 gap-4 hover:border-purple-400 transition-colors">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">{task.title}</span>
                    <Badge variant="secondary" className={getPriorityColor(task.priority)}>
                      {task.priority}
                    </Badge>
                  </div>
                  {task.description && (
                    <p className="text-xs text-muted-foreground leading-relaxed">{task.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <select
                    value={task.statusId || task.status?.id || ''}
                    onChange={(e) => handleTaskStatusChange(task.id, e.target.value)}
                    className="h-8 rounded-xl border bg-background px-3 text-xs font-semibold focus:outline-none"
                  >
                    {taskStatuses.map((ts) => (
                      <option key={ts.id} value={ts.id}>{ts.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
            {project.tasks?.length === 0 && (
              <div className="text-center py-12 text-sm text-muted-foreground italic border border-dashed rounded-xl">
                No tasks exist in this workspace. Click "Add Task" to create one.
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'team' && (
        <div className="bg-white dark:bg-zinc-900 border rounded-2xl p-5 shadow-sm space-y-6">
          <div className="border-b pb-4">
            <h3 className="text-lg font-bold text-foreground">Assigned Operational Team</h3>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {projectMembers.map((member) => (
              <div key={member.id} className="border rounded-xl p-4 flex items-center gap-3 bg-muted/15">
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarFallback className="font-bold">{member.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">{member.name}</div>
                  <div className="text-xs text-muted-foreground font-semibold truncate">{member.email}</div>
                  <div className="flex gap-2.5 mt-1.5">
                    <Badge variant="outline" className="text-[9px] py-0 px-1.5 uppercase font-bold tracking-wider">{member.role}</Badge>
                    <span className={`h-2.5 w-2.5 rounded-full shrink-0 self-center ${presenceMap[member.id] === 'ONLINE' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'time' && (
        <div className="bg-white dark:bg-zinc-900 border rounded-2xl p-5 shadow-sm space-y-6">
          <div className="border-b pb-4">
            <h3 className="text-lg font-bold text-foreground">Operational Hours Log</h3>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Team Member</TableHead>
                <TableHead>Checklist Task</TableHead>
                <TableHead>Start Time</TableHead>
                <TableHead>End Time</TableHead>
                <TableHead>Duration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {project.timeEntries?.map((entry: any) => {
                const start = new Date(entry.startTime);
                const end = entry.endTime ? new Date(entry.endTime) : null;
                const workedHours = entry.activeWorkedDuration 
                  ? Math.round((entry.activeWorkedDuration / 3600) * 100) / 100 
                  : 0;

                return (
                  <TableRow key={entry.id}>
                    <TableCell className="font-semibold text-xs">{entry.member?.name || '—'}</TableCell>
                    <TableCell className="text-xs font-semibold">{entry.task?.title || 'General Operation'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground font-medium">{start.toLocaleString()}</TableCell>
                    <TableCell className="text-xs text-muted-foreground font-medium">{end ? end.toLocaleString() : 'Active...'}</TableCell>
                    <TableCell className="font-bold text-xs">{workedHours} hrs</TableCell>
                  </TableRow>
                );
              })}
              {project.timeEntries?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-xs text-muted-foreground italic">
                    No hours have been logged for this operation checklist.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* CREATE NEW TASK MODAL */}
      <Dialog open={isNewTaskModalOpen} onOpenChange={setIsNewTaskModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Add Checklist Task</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateTask} className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Task Name *</label>
              <Input
                required
                value={newTaskName}
                onChange={(e) => setNewTaskName(e.target.value)}
                placeholder="e.g. Weekly Standup Review"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Input
                value={newTaskDescription}
                onChange={(e) => setNewTaskDescription(e.target.value)}
                placeholder="Provide task scope details..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Priority</label>
                <select
                  value={newTaskPriority}
                  onChange={(e) => setNewTaskPriority(e.target.value)}
                  className="flex h-9 w-full rounded-xl border bg-background px-3 text-sm focus:ring-1"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Allocated Hours</label>
                <NumberStepper
                  step={1}
                  min={0}
                  value={newTaskHours}
                  onChange={(e) => setNewTaskHours(e.target.value)}
                  placeholder="e.g. 10"
                />
              </div>
            </div>

            {/* Task Assignees Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex justify-between">
                <span>Assign Team Members</span>
                <span className="text-xs text-muted-foreground">({newTaskAssignees.length} selected)</span>
              </label>
              <div className="border rounded-xl p-3 max-h-[160px] overflow-y-auto space-y-2 custom-scrollbar">
                {members.map((member) => {
                  const isChecked = newTaskAssignees.includes(member.id);
                  return (
                    <div
                      key={member.id}
                      onClick={() => handleAssigneeToggle(member.id)}
                      className="flex items-center gap-2 p-2 hover:bg-muted rounded-lg cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // Controlled by div click
                        className="rounded text-primary cursor-pointer h-4 w-4"
                      />
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-[10px]">{member.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-semibold">{member.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <DialogFooter className="pt-4 border-t mt-4">
              <Button type="button" variant="outline" onClick={() => setIsNewTaskModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isPending}>Create Task</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* CREATE NEW RULE DIALOG */}
      <Dialog open={isCreateRuleOpen} onOpenChange={setIsCreateRuleOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Create Workflow Rule</DialogTitle>
            <DialogDescription>Setup a rule to trigger actions based on criteria.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateRule} className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Rule Name <span className="text-destructive">*</span></label>
              <Input
                value={ruleFormName}
                onChange={(e) => setRuleFormName(e.target.value)}
                required
                placeholder="e.g. Daily Progress Reminder"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Input
                value={ruleFormDescription}
                onChange={(e) => setRuleFormDescription(e.target.value)}
                placeholder="Describe the automation rule behavior"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Frequency</label>
                <select
                  value={ruleFormFrequency}
                  onChange={(e) => setRuleFormFrequency(e.target.value)}
                  className="flex h-9 w-full rounded-xl border bg-background px-3 text-sm focus:ring-1"
                >
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Reminder Time</label>
                <select
                  value={ruleFormReminderTime}
                  onChange={(e) => setRuleFormReminderTime(e.target.value)}
                  className="flex h-9 w-full rounded-xl border bg-background px-3 text-sm focus:ring-1"
                >
                  <option value="09:00 AM">09:00 AM</option>
                  <option value="12:00 PM">12:00 PM</option>
                  <option value="04:00 PM">04:00 PM</option>
                  <option value="06:00 PM">06:00 PM</option>
                </select>
              </div>
            </div>
            <DialogFooter className="pt-4 border-t mt-4">
              <Button type="button" variant="outline" onClick={() => setIsCreateRuleOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isPending}>Create Rule</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
