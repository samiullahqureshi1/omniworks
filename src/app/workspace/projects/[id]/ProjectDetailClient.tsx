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
  Search, Check, X, Hash, Trash2, Repeat, ChevronDown, Award, UserCheck, CalendarDays, Globe, Mail, Phone, Type,
  FolderKanban, Star, PhoneCall, Sparkles, Zap, Brain, UserPlus
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { createTaskAction, updateTaskAction, deleteTaskAction } from '@/app/actions/tasks';
import { updateProjectAction } from '@/app/actions/projects';
import { getRulesAction, createRuleAction } from '@/app/actions/rules';
import ProjectConversation, { ProjectConversationRef } from './ProjectConversation';
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { useRealtime } from '@/hooks/useRealtime';

const formatTrackedTime = (hours: number) => {
  if (hours <= 0) return '0h';
  if (hours < 1) {
    const mins = Math.round(hours * 60);
    return `${mins}m`;
  }
  return `${hours.toFixed(1)}h`;
};

const renderTrackedTime = (hours: number) => {
  if (hours <= 0) {
    return (
      <>0 <span className="text-xs font-semibold text-muted-foreground">h</span></>
    );
  }
  if (hours < 1) {
    const mins = Math.round(hours * 60);
    return (
      <>{mins} <span className="text-xs font-semibold text-muted-foreground">m</span></>
    );
  }
  return (
    <>{hours.toFixed(1)} <span className="text-xs font-semibold text-muted-foreground">h</span></>
  );
};

export default function ProjectDetailClient({ project, currentUser, users = [], taskStatuses = [], projectStatuses = [] }: { project: any, currentUser: any, users?: any[], taskStatuses?: any[], projectStatuses?: any[] }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
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
        // Reset form
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
  
  const conversationRef = useRef<ProjectConversationRef>(null);

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

  // Re-fetch server data (logged hours, allocated hours, etc.) whenever
  // someone starts/stops/updates a timer or adds manual time on this project,
  // so the numbers on this page stay live instead of requiring a manual reload.
  useEffect(() => {
    if ([
      'timer_started',
      'timer_stopped',
      'timer_idle',
      'timer_resumed',
      'manual_time_added',
      'task_hours_updated',
      'time_entry_updated',
      'time_entry_deleted',
    ].includes(lastEvent?.event || '')) {
      router.refresh();
    }
  }, [lastEvent, router]);

  const handleMentionTask = (taskId: string, taskTitle: string) => {
    conversationRef.current?.insertMention(taskId, taskTitle, 'task');
  };

  const handleMentionUser = (userId: string, userName: string) => {
    conversationRef.current?.insertMention(userId, userName, 'user');
  };

  const projectMembers = useMemo(() => {
    const membersMap = new Map();
    
    // 1. Add all Owners
    users.filter((u: any) => u.role === 'OWNER').forEach((u: any) => membersMap.set(u.id, u));
    
    // 2. Add Project Manager
    if (project.projectManagerId) {
      const pm = users.find((u: any) => u.id === project.projectManagerId);
      if (pm) membersMap.set(pm.id, pm);
    }
    
    // 3. Add Client
    if (project.clientId) {
      const client = users.find((u: any) => u.id === project.clientId);
      if (client) membersMap.set(client.id, client);
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


  useEffect(() => {
    if (searchParams.get('edit') === 'true') {
      setIsEditProjectOpen(true);
      // Clean up the URL
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.delete('edit');
      router.replace(`${pathname}${newParams.toString() ? `?${newParams.toString()}` : ''}`, { scroll: false });
    }
  }, [searchParams, pathname, router]);
  
  const clients = users.filter((u: any) => u.role === 'CLIENT' && u.status === 'ACTIVE');
  const members = users.filter((u: any) => u.role === 'MEMBER' && u.status === 'ACTIVE');

  // Inline Status Creation States
  const [localProjectStatuses, setLocalProjectStatuses] = useState<any[]>(projectStatuses);
  const [isCreatingStatus, setIsCreatingStatus] = useState(false);
  const [newStatusName, setNewStatusName] = useState("");
  const [isSavingStatus, setIsSavingStatus] = useState(false);

  const handleCreateStatus = async () => {
    if (!newStatusName.trim()) return;
    setIsSavingStatus(true);
    try {
      const res = await fetch("/api/project-statuses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newStatusName.trim() }),
      });
      if (res.ok) {
        const newStatus = await res.json();
        setLocalProjectStatuses((prev) => [...prev, newStatus]);
        setNewStatusName("");
        setIsCreatingStatus(false);
        toast.success("Status created successfully");
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to create status");
      }
    } catch (e: any) {
      toast.error("Failed to create status");
    } finally {
      setIsSavingStatus(false);
    }
  };

  // Permissions
  const isOwner = currentUser.role === 'OWNER';
  const isPM = project.projectManagerId === currentUser.userId;
  const isClient = currentUser.role === 'CLIENT';
  const canManageTasks = isOwner || isPM || isClient; // As per rules: Clients can create tasks in own projects.

  // Metrics
  // NOTE: activeWorkedDuration on TimeEntry rows is stored in seconds, so we
  // convert seconds -> ms (*1000) below before converting to hours. Live/
  // in-progress timers (not yet stopped) live in the separate `activeTimers`
  // relation and must be included too, otherwise a member who is actively
  // tracking time but hasn't stopped the timer yet would show 0h logged.
  const getTaskTrackedHours = (taskId: string) => {
    const entryHours = project.timeEntries?.filter((t: any) => t.taskId === taskId).reduce((acc: number, t: any) => acc + (t.duration || 0), 0) || 0;
    const activeSeconds = project.activeTimers?.filter((t: any) => t.taskId === taskId).reduce((acc: number, t: any) => acc + (t.activeWorkedDuration || 0), 0) || 0;
    const activeHours = activeSeconds / 3600;
    return Math.round((entryHours + activeHours) * 100) / 100;
  };

  const getMemberTrackedHours = (userId: string) => {
    const entryHours = project.timeEntries?.filter((t: any) => t.memberId === userId).reduce((acc: number, t: any) => acc + (t.duration || 0), 0) || 0;
    const activeSeconds = project.activeTimers?.filter((t: any) => t.memberId === userId).reduce((acc: number, t: any) => acc + (t.activeWorkedDuration || 0), 0) || 0;
    const activeHours = activeSeconds / 3600;
    return Math.round((entryHours + activeHours) * 100) / 100;
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
    const entryHours = project.timeEntries?.reduce((acc: number, t: any) => acc + (t.duration || 0), 0) || 0;
    const activeSeconds = project.activeTimers?.reduce((acc: number, t: any) => acc + (t.activeWorkedDuration || 0), 0) || 0;
    const activeHours = activeSeconds / 3600;
    displayTotalTrackedHours = Math.round((entryHours + activeHours) * 100) / 100;
    displayProgressPercent = project.totalAllocatedHours 
      ? Math.round((displayTotalTrackedHours / project.totalAllocatedHours) * 100)
      : 0;
  }

  async function handleUpdateProject(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await updateProjectAction(project.id, {
        name: formData.get('name') as string,
        description: editDescription,
        notes: project.notes,
        clientId: formData.get('clientId') as string || undefined,
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
        ruleIds: attachedRuleIds,
      });
      
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success('Project updated successfully');
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
        undefined, // dueDate
        undefined, // statusId
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
        case 'PLANNING': return 'bg-\[#fbfaf7\]0/10 text-slate-500 border-slate-500/20';
        case 'IN_PROGRESS': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
        case 'ON_HOLD': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
        case 'COMPLETE': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
        default: return 'bg-\[#fbfaf7\]0/10 text-slate-500 border-slate-500/20';
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

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-white dark:bg-[#151518]">
      {/* Sticky Fixed Top Header */}
      <header className="sticky top-0 z-30 bg-white dark:bg-[#151518] border-b border-slate-200 dark:border-slate-800 px-6 py-3 flex items-center justify-between shadow-2xs shrink-0">
        {/* Left: Breadcrumbs */}
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
          <span className="flex items-center justify-center w-5 h-5 rounded bg-blue-600 text-white font-bold text-[10px]">P</span>
          <Link href="/workspace/projects" className="hover:text-slate-800 dark:hover:text-white transition-colors">
            Project Space
          </Link>
          <span className="text-slate-300 dark:text-white/20">/</span>
          <div className="flex items-center gap-1.5 text-slate-900 dark:text-white font-bold text-base">
            <FolderKanban size={16} className="text-primary" />
            <span>{project.name}</span>
            <ChevronDown size={14} className="text-slate-400 cursor-pointer" />
          </div>
          <Star size={14} className="text-slate-400 hover:text-yellow-500 cursor-pointer ml-1" />
        </div>

        {/* Right: View Tabs Header Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-1.5 rounded-[8px] text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'overview'
                ? 'bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white border border-slate-200/80 dark:border-white/10 shadow-2xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <LayoutDashboard size={14} />
            <span>Overview</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tasks')}
            className={`px-3.5 py-1.5 rounded-[8px] text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'tasks'
                ? 'bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white border border-slate-200/80 dark:border-white/10 shadow-2xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <CheckSquare size={14} />
            <span>Tasks</span>
            <span className="px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-white/20 text-[10px] font-black">
              {project.tasks?.length || 0}
            </span>
          </button>

          {(isOwner || isPM) && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsEditProjectOpen(true)}
              className="h-8 rounded-[8px] border text-xs font-semibold flex items-center gap-1 ml-2"
            >
              <Settings size={13} />
              <span>Edit</span>
            </Button>
          )}
        </div>
      </header>

      {/* Main Body Content */}
      <div className="flex-1 w-full overflow-hidden flex">
        {activeTab === 'overview' ? (
          <div className="flex w-full h-full overflow-hidden">
            {/* Left Column: Project Details Panel */}
            <div className="w-full lg:w-[480px] xl:w-[520px] shrink-0 border-r border-slate-200 dark:border-slate-800 p-6 overflow-y-auto custom-scrollbar flex flex-col gap-6 bg-white dark:bg-[#151518]">
              {/* Back to Projects */}
              <Link
                href="/workspace/projects"
                className="text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 w-fit transition-colors"
              >
                <ArrowLeft size={13} /> Back to Projects
              </Link>

              {/* Title & Badges */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                    {project.name}
                  </h1>
                  <Badge
                    variant="outline"
                    className={`text-xs font-bold ${typeof project.status === 'string' ? getStatusColor(project.status) : ''}`}
                    style={typeof project.status !== 'string' && project.status ? {
                      backgroundColor: `${project.status.color}20`,
                      color: project.status.color,
                      borderColor: `${project.status.color}40`
                    } : {}}
                  >
                    {typeof project.status === 'string'
                      ? project.status.replace('_', ' ')
                      : project.status?.name || 'No Status'}
                  </Badge>
                  <Badge variant="secondary" className={`text-xs font-bold ${getPriorityColor(project.priority)}`}>
                    {project.priority}
                  </Badge>
                </div>

                {/* Description Card */}
                {project.description && (
                  <div className="mt-3 p-4 rounded-2xl bg-red-600 dark:bg-red-700 text-white font-medium text-xs leading-relaxed shadow-sm">
                    <div dangerouslySetInnerHTML={{ __html: project.description }} />
                  </div>
                )}
              </div>

              {/* Details Section */}
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                  <Briefcase size={14} className="text-indigo-500" />
                  <span>Details</span>
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  {!isStrictMember && (
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-white/10 flex items-center justify-center text-indigo-500 shrink-0">
                        <Users size={16} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Client</span>
                        <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                          {project.client?.name || 'Internal'}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-white/10 flex items-center justify-center text-indigo-500 shrink-0">
                      <UserCheck size={16} />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Manager</span>
                      <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                        {project.projectManager?.name || 'Unassigned'}
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-white/10 flex items-center justify-center text-indigo-500 shrink-0">
                      <Calendar size={16} />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Start Date</span>
                      <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                        {new Date(project.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-white/10 flex items-center justify-center text-indigo-500 shrink-0">
                      <CalendarDays size={16} />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">End Date</span>
                      <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                        {project.isOngoing
                          ? 'Ongoing'
                          : project.endDate
                          ? new Date(project.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                          : 'Not set'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress & Hours Section */}
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                  <Timer size={14} className="text-indigo-500" />
                  <span>Progress & Hours</span>
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-1">
                        Logged Hours
                      </span>
                      <div className="text-2xl font-black text-slate-900 dark:text-white">
                        {displayTotalTrackedHours} <span className="text-xs font-semibold text-slate-400">h</span>
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                      <Clock size={16} />
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block mb-1">
                        Allocated Limit
                      </span>
                      <div className="text-2xl font-black text-slate-900 dark:text-white">
                        {displayTotalAllocatedHours || project.totalAllocatedHours || 0} <span className="text-xs font-semibold text-slate-400">h</span>
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                      <Timer size={16} />
                    </div>
                  </div>
                </div>

                {/* Progress Percentage Bar */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between items-center text-xs font-black text-indigo-600 dark:text-indigo-400">
                    <span>{displayProgressPercent}% Complete</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, displayProgressPercent)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Edit Project Dialog */}
              <Dialog open={isEditProjectOpen} onOpenChange={setIsEditProjectOpen}>
                <DialogContent className="sm:max-w-[700px] h-[90vh] p-0 flex flex-col overflow-hidden">
                  <DialogHeader className="sticky top-0 bg-background z-10 px-6 py-4 border-b shrink-0 shadow-sm">
                    <DialogTitle>Edit Project</DialogTitle>
                  </DialogHeader>
                  <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
                    <form onSubmit={handleUpdateProject} className="space-y-6 pb-6">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Project Name</label>
                        <Input name="name" defaultValue={project.name} required />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Description</label>
                        <RichTextEditor
                          content={editDescription}
                          onChange={setEditDescription}
                          placeholder="Describe the project..."
                        />
                      </div>
                      <Button type="submit" className="w-full" disabled={isPending}>
                        {isPending ? 'Saving...' : 'Update Project'}
                      </Button>
                    </form>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Right Column: Integrated Project Conversation */}
            <div className="flex-1 h-full min-w-0 bg-[#fafbfc] dark:bg-[#0f0f11]">
              <ProjectConversation
                ref={conversationRef}
                projectId={project.id}
                currentUser={currentUser}
                organizationId={project.organizationId}
                isClient={isClient}
              />
            </div>
          </div>
        ) : (
          /* TASKS TAB CONTENT */
          <div className="flex-1 overflow-y-auto p-6 w-full custom-scrollbar space-y-6">
            {canManageTasks && (
              <div className="flex justify-end mb-4">
                <Dialog open={isNewTaskModalOpen} onOpenChange={setIsNewTaskModalOpen}>
                  <DialogTrigger asChild>
                    <Button className="shadow-sm bg-primary text-primary-foreground hover:bg-primary/90">
                      <Plus className="mr-2 h-4 w-4" /> Create New Task
                    </Button>
                  </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Create New Task</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateTask} className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Task Title</label>
                      <Input placeholder="e.g. Design Landing Page" value={newTaskName} onChange={e => setNewTaskName(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Description</label>
                      <textarea 
                        placeholder="Add more details about this task..."
                        className="flex min-h-[80px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={newTaskDescription}
                        onChange={e => setNewTaskDescription(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Priority</label>
                        <select 
                          className="flex h-10 w-full items-center justify-between rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          value={newTaskPriority}
                          onChange={e => setNewTaskPriority(e.target.value)}
                        >
                          <option value="LOW">Low</option>
                          <option value="MEDIUM">Medium</option>
                          <option value="HIGH">High</option>
                          <option value="CRITICAL">Critical</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Allocated Hours</label>
                        <NumberStepper step={0.5} min={0} placeholder="e.g. 5.5" value={newTaskHours} onChange={e => setNewTaskHours(e.target.value)} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Assignees (Project Members)</label>
                      <div 
                        className="flex items-center min-h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => setIsAssigneeModalOpen(true)}
                      >
                        {newTaskAssignees.length === 0 ? (
                          <span className="text-muted-foreground">Select members...</span>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {newTaskAssignees.map(id => {
                              const member = project.assignees.find((a: any) => a.userId === id);
                              return member ? (
                                <Badge key={id} variant="secondary" className="gap-1 pr-1 pl-2 font-medium">
                                  <Avatar className="h-4 w-4 mr-0.5">
                                    <AvatarFallback className="text-[8px] bg-primary/20">{member.user.name.substring(0,2)}</AvatarFallback>
                                  </Avatar>
                                  {member.user.name}
                                  <div 
                                    className="hover:bg-muted rounded-full p-0.5 cursor-pointer ml-1"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setNewTaskAssignees(prev => prev.filter(a => a !== id));
                                    }}
                                  >
                                    <X size={12} />
                                  </div>
                                </Badge>
                              ) : null;
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => setIsNewTaskModalOpen(false)}>Cancel</Button>
                      <Button type="submit" disabled={isPending || !newTaskName.trim()}>Create Task</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {/* Simple Kanban Board Layout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {taskStatuses.map((status, index) => {
              const statusTasks = project.tasks.filter((t: any) => {
                if (t.statusId === status.id) return true;
                // If a task lacks a status, map it to the very first column by default
                if (!t.statusId && index === 0) return true;
                return false;
              });

              return (
                <div key={status.id} className="flex flex-col bg-\[#fbfaf7\] dark:bg-slate-900/50 rounded-xl p-3 border shadow-sm">
                  <div className="flex items-center justify-between mb-3 px-1">
                    <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: status.color || '#cccccc' }}></div>
                      {status.name}
                    </h3>
                    <Badge variant="secondary">{statusTasks.length}</Badge>
                  </div>
                  
                  <div className="flex-1 flex flex-col gap-3">
                    {statusTasks.length === 0 ? (
                      <div className="h-24 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-center text-xs text-muted-foreground">
                        No tasks
                      </div>
                    ) : (
                      statusTasks.map((t: any) => (
                        <div key={t.id} className="bg-background border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow group">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2">
                              <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 cursor-grab shrink-0 mt-0.5" />
                              <div>
                                <p className="text-sm font-medium leading-snug">{t.title}</p>
                                {t.description && <p className="text-[10px] text-muted-foreground line-clamp-2 mt-1">{t.description}</p>}
                                {t.allocatedHours && <p className="text-[10px] text-primary/80 font-medium mt-1">{t.allocatedHours} hrs allocated</p>}
                              </div>
                            </div>
                            <Badge variant="outline" className={`text-[8px] px-1 py-0 h-4 border leading-none shrink-0 ${
                              t.priority === 'CRITICAL' ? 'bg-red-50 text-red-700 border-red-200' : 
                              t.priority === 'HIGH' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                              t.priority === 'MEDIUM' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                              'bg-\[#fbfaf7\] text-slate-600 border-slate-200'
                            }`}>{t.priority}</Badge>
                          </div>
                          
                          <div className="flex items-center justify-between mt-3 pl-6">
                            <select 
                              value={t.statusId || taskStatuses[0]?.id || ''}
                              onChange={(e) => handleTaskStatusChange(t.id, e.target.value)}
                              disabled={!canManageTasks || isPending}
                              className="text-[10px] font-medium bg-muted/50 border-0 rounded px-1.5 py-0.5"
                            >
                              {taskStatuses.map((s: any) => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                              ))}
                            </select>

                            <div className="flex -space-x-1.5">
                              {t.assignees?.map((a: any) => (
                                <Avatar key={a.user.id} title={a.user.name} className="h-5 w-5 border-2 border-background">
                                  <AvatarFallback className="text-[8px] bg-primary/20 text-primary font-bold">{a.user.name.substring(0,2)}</AvatarFallback>
                                </Avatar>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Assignee Selection Modal */}
      <Dialog open={isAssigneeModalOpen} onOpenChange={setIsAssigneeModalOpen}>
        <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden gap-0">
          <div className="sticky top-0 bg-background border-b z-10 p-4 space-y-4 shadow-sm">
            <DialogHeader>
              <DialogTitle>Select Assignees</DialogTitle>
            </DialogHeader>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search members..." 
                className="pl-9 bg-muted/50 border-none focus-visible:ring-1 rounded-xl"
                value={assigneeSearchQuery}
                onChange={e => setAssigneeSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="p-3 max-h-[350px] overflow-y-auto custom-scrollbar">
            {project.assignees?.filter((a: any) => a.user.name.toLowerCase().includes(assigneeSearchQuery.toLowerCase()) && a.user.role === 'MEMBER').map((a: any) => {
              const isSelected = newTaskAssignees.includes(a.userId);
              return (
                <div 
                  key={a.userId} 
                  className={`flex items-center justify-between p-3 rounded-xl cursor-pointer mb-2 transition-all ${isSelected ? 'bg-primary/5 border-primary/20 shadow-sm' : 'hover:bg-muted/50 border-transparent'} border`}
                  onClick={() => {
                    if (isSelected) setNewTaskAssignees(prev => prev.filter(id => id !== a.userId));
                    else setNewTaskAssignees(prev => [...prev, a.userId]);
                  }}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border shadow-sm">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary font-medium">{a.user.name.substring(0,2)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold">{a.user.name}</span>
                      <span className="text-xs text-muted-foreground font-medium">{a.user.role}</span>
                    </div>
                  </div>
                  <div>
                    {isSelected ? (
                      <div className="bg-primary text-primary-foreground p-1 rounded-full shadow-sm animate-in zoom-in duration-200">
                        <Check size={14} strokeWidth={3} />
                      </div>
                    ) : (
                      <div className="border-2 border-muted-foreground/30 text-transparent p-1 rounded-full">
                        <Check size={14} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {(!project.assignees || project.assignees.length === 0) && (
              <div className="text-sm text-muted-foreground text-center p-8">No members assigned to this project.</div>
            )}
            {project.assignees && project.assignees.length > 0 && project.assignees.filter((a: any) => a.user.name.toLowerCase().includes(assigneeSearchQuery.toLowerCase())).length === 0 && (
              <div className="text-sm text-muted-foreground text-center p-8">No members found matching "{assigneeSearchQuery}".</div>
            )}
          </div>
          <div className="p-4 border-t bg-muted/20">
            <Button className="w-full" onClick={() => setIsAssigneeModalOpen(false)}>Done</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* CREATE RULE DIALOG */}
      <Dialog open={isCreateRuleOpen} onOpenChange={setIsCreateRuleOpen}>
        <DialogContent className="sm:max-w-[500px] bg-background border-border max-h-[85vh] overflow-y-auto custom-scrollbar">
          <DialogHeader>
            <DialogTitle>Create Automation Rule</DialogTitle>
            <DialogDescription>
              Define automation trigger schedules and actions.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateRule} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Rule Name</label>
              <Input
                required
                value={ruleFormName}
                onChange={(e) => setRuleFormName(e.target.value)}
                placeholder="e.g. Daily Project Report Reminder"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Description</label>
              <Input
                value={ruleFormDescription}
                onChange={(e) => setRuleFormDescription(e.target.value)}
                placeholder="Send daily reminder to PM"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 bg-muted/20 p-4 rounded-xl border">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Frequency</label>
                <select
                  value={ruleFormFrequency}
                  onChange={(e) => setRuleFormFrequency(e.target.value)}
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
                  value={ruleFormReminderTime}
                  onChange={(e) => setRuleFormReminderTime(e.target.value)}
                  placeholder="e.g. 06:00 PM"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Action Type</label>
              <select
                value={ruleFormActionType}
                onChange={(e) => setRuleFormActionType(e.target.value)}
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
                    checked={ruleFormRecipients.includes('PROJECT_OWNER')}
                    onChange={() => toggleRuleRecipient('PROJECT_OWNER')}
                    className="rounded border-gray-300 text-primary"
                  />
                  Project Owner
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ruleFormRecipients.includes('PROJECT_MANAGER')}
                    onChange={() => toggleRuleRecipient('PROJECT_MANAGER')}
                    className="rounded border-gray-300 text-primary"
                  />
                  Project Manager
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ruleFormRecipients.includes('ASSIGNED_USER')}
                    onChange={() => toggleRuleRecipient('ASSIGNED_USER')}
                    className="rounded border-gray-300 text-primary"
                  />
                  Assigned Users
                </label>
              </div>
            </div>

            <DialogFooter className="pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setIsCreateRuleOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Creating...' : 'Create & Attach'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
    </div>
  );
}
