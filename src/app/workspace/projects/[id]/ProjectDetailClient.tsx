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
  Search, Check, X, Hash, Trash2, Repeat, ChevronDown, ChevronUp, Award, UserCheck, CalendarDays, Globe, Mail, Phone, Type,
  FolderKanban, Star, PhoneCall, Sparkles, Zap, Brain, UserPlus, Target, Edit2, Eye, EyeOff, TrendingUp, Flag, Pin
} from 'lucide-react';
import TaskFormModal from '@/app/workspace/tasks/TaskFormModal';
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
import { formatHours } from '@/lib/utils';
import { createTaskAction, updateTaskAction, deleteTaskAction } from '@/app/actions/tasks';
import { updateProjectAction } from '@/app/actions/projects';
import { getRulesAction, createRuleAction } from '@/app/actions/rules';
import { createMilestoneAction, updateMilestoneAction, deleteMilestoneAction } from '@/app/actions/milestones';
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

const stripHtmlTags = (str?: string) => {
  if (!str) return '';
  return str
    .replace(/<[^>]*>?/gm, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
};

export default function ProjectDetailClient({ project, currentUser, users = [], taskStatuses = [], projectStatuses = [], milestones: initialMilestones = [] }: { project: any, currentUser: any, users?: any[], taskStatuses?: any[], projectStatuses?: any[], milestones?: any[] }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState('overview');
  const [isPending, startTransition] = useTransition();
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any | null>(null);
  const [pinnedTaskIds, setPinnedTaskIds] = useState<string[]>([]);

  const togglePinTask = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPinnedTaskIds(prev => {
      const isPinned = prev.includes(taskId);
      if (isPinned) {
        toast.success("Task unpinned");
        return prev.filter(id => id !== taskId);
      } else {
        toast.success("Task pinned to top");
        return [...prev, taskId];
      }
    });
  };

  const handleOpenEditTask = (task: any) => {
    setEditingTask(task);
    setIsNewTaskModalOpen(true);
  };

  const sortedTasks = useMemo(() => {
    if (!project.tasks) return [];
    return [...project.tasks].sort((a, b) => {
      const aPinned = pinnedTaskIds.includes(a.id);
      const bPinned = pinnedTaskIds.includes(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      return 0;
    });
  }, [project.tasks, pinnedTaskIds]);
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('MEDIUM');
  const [newTaskHours, setNewTaskHours] = useState('');
  const [newTaskAssignees, setNewTaskAssignees] = useState<string[]>([]);
  const [newTaskMilestoneId, setNewTaskMilestoneId] = useState('');
  const [isAssigneeModalOpen, setIsAssigneeModalOpen] = useState(false);
  const [assigneeSearchQuery, setAssigneeSearchQuery] = useState('');

  // Milestone State
  const [milestones, setMilestones] = useState<any[]>(initialMilestones);
  const [isCreateMilestoneOpen, setIsCreateMilestoneOpen] = useState(false);
  const [isEditMilestoneOpen, setIsEditMilestoneOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<any>(null);
  // Create milestone form
  const [mTitle, setMTitle] = useState('');
  const [mDescription, setMDescription] = useState('');
  const [mDueDate, setMDueDate] = useState('');
  const [mStatus, setMStatus] = useState('NOT_STARTED');
  const [mProgress, setMProgress] = useState(0);
  const [mClientVisible, setMClientVisible] = useState(false);
  const [mAutoComplete, setMAutoComplete] = useState(false);
  // Edit milestone form
  const [emTitle, setEmTitle] = useState('');
  const [emDescription, setEmDescription] = useState('');
  const [emDueDate, setEmDueDate] = useState('');
  const [emStatus, setEmStatus] = useState('NOT_STARTED');
  const [emProgress, setEmProgress] = useState(0);
  const [emClientVisible, setEmClientVisible] = useState(false);
  const [emAutoComplete, setEmAutoComplete] = useState(false);
  
  // Project Edit
  const [isEditProjectOpen, setIsEditProjectOpen] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
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
      ? Number(((displayTotalTrackedHours / displayTotalAllocatedHours) * 100).toFixed(1))
      : 0;
  } else {
    const entryHours = project.timeEntries?.reduce((acc: number, t: any) => acc + (t.duration || 0), 0) || 0;
    const activeSeconds = project.activeTimers?.reduce((acc: number, t: any) => acc + (t.activeWorkedDuration || 0), 0) || 0;
    const activeHours = activeSeconds / 3600;
    displayTotalTrackedHours = Math.round((entryHours + activeHours) * 100) / 100;
    displayProgressPercent = project.totalAllocatedHours 
      ? Number(((displayTotalTrackedHours / project.totalAllocatedHours) * 100).toFixed(1))
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
        newTaskAssignees,
        undefined, // customFields
        undefined, // isRepeated
        undefined, // repeatSettings
        newTaskMilestoneId || undefined, // milestoneId
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
        setNewTaskMilestoneId('');
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

  const getMilestoneStatusColor = (status: string) => {
    switch (status) {
      case 'NOT_STARTED': return { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-300', border: 'border-slate-200 dark:border-slate-700', dot: 'bg-slate-400' };
      case 'IN_PROGRESS': return { bg: 'bg-blue-50 dark:bg-blue-950/40', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800', dot: 'bg-blue-500' };
      case 'COMPLETED': return { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800', dot: 'bg-emerald-500' };
      case 'ON_HOLD': return { bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800', dot: 'bg-amber-500' };
      default: return { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-300', border: 'border-slate-200 dark:border-slate-700', dot: 'bg-slate-400' };
    }
  };

  const handleCreateMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mTitle.trim()) return;
    startTransition(async () => {
      const res = await createMilestoneAction(project.id, {
        title: mTitle,
        description: mDescription || undefined,
        dueDate: mDueDate || undefined,
        status: mStatus,
        progress: mProgress,
        clientVisible: mClientVisible,
        autoComplete: mAutoComplete,
      });
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success('Milestone created!');
        setMilestones(prev => [...prev, res.milestone]);
        setMTitle(''); setMDescription(''); setMDueDate('');
        setMStatus('NOT_STARTED'); setMProgress(0);
        setMClientVisible(false); setMAutoComplete(false);
        setIsCreateMilestoneOpen(false);
      }
    });
  };

  const openEditMilestone = (milestone: any) => {
    setEditingMilestone(milestone);
    setEmTitle(milestone.title);
    setEmDescription(milestone.description || '');
    let formattedDueDate = '';
    if (milestone.dueDate) {
      try {
        const d = new Date(milestone.dueDate);
        if (!isNaN(d.getTime())) {
          formattedDueDate = d.toISOString().slice(0, 10);
        }
      } catch (err) {}
    }
    setEmDueDate(formattedDueDate);
    setEmStatus(milestone.status);
    setEmProgress(milestone.progress);
    setEmClientVisible(milestone.clientVisible);
    setEmAutoComplete(milestone.autoComplete);
    setIsEditMilestoneOpen(true);
  };

  const handleEditMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMilestone) return;
    startTransition(async () => {
      const res = await updateMilestoneAction(editingMilestone.id, {
        title: emTitle,
        description: emDescription || undefined,
        dueDate: emDueDate || undefined,
        status: emStatus,
        progress: emProgress,
        clientVisible: emClientVisible,
        autoComplete: emAutoComplete,
      });
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success('Milestone updated!');
        setMilestones(prev => prev.map(m => m.id === editingMilestone.id ? res.milestone : m));
        setIsEditMilestoneOpen(false);
        setEditingMilestone(null);
      }
    });
  };

  const handleDeleteMilestone = async (milestoneId: string) => {
    if (!confirm('Delete this milestone? Tasks linked to it will be unlinked.')) return;
    startTransition(async () => {
      const res = await deleteMilestoneAction(milestoneId);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success('Milestone deleted');
        setMilestones(prev => prev.filter(m => m.id !== milestoneId));
        router.refresh();
      }
    });
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
        <div className="flex items-center gap-2 flex-nowrap shrink-0">
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

          <button
            type="button"
            onClick={() => setActiveTab('milestones')}
            className={`px-3.5 py-1.5 rounded-[8px] text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'milestones'
                ? 'bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white border border-slate-200/80 dark:border-white/10 shadow-2xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <Target size={14} />
            <span>Milestones</span>
            <span className="px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-white/20 text-[10px] font-black">
              {milestones.length}
            </span>
          </button>

          {canManageTasks && (
            <Button
              type="button"
              onClick={() => setIsNewTaskModalOpen(true)}
              className="h-8 px-3 rounded-[8px] bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer ml-2"
            >
              <Plus size={14} />
              <span>Create Task</span>
            </Button>
          )}

          {(isOwner || isPM) && (
            <Button
              type="button"
              onClick={() => setIsCreateMilestoneOpen(true)}
              className="h-8 px-3 rounded-[8px] bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer ml-1.5"
            >
              <Plus size={14} />
              <span>Add Milestone</span>
            </Button>
          )}

          {(isOwner || isPM) && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsEditProjectOpen(true)}
              className="h-8 rounded-[8px] border text-xs font-semibold flex items-center gap-1 ml-1.5"
            >
              <Settings size={13} />
              <span>Edit</span>
            </Button>
          )}
        </div>
      </header>

      {/* Main Body Content */}
      <div className="flex-1 w-full overflow-hidden flex">
        {/* Left Panel: Active Tab Content (Overview, Tasks Table, Milestones) */}
        <div className="flex-1 h-full min-w-0 overflow-y-auto custom-scrollbar bg-white dark:bg-[#151518]">
          {activeTab === 'overview' ? (
            /* OVERVIEW TAB */
            <div className="p-6 flex flex-col gap-6">
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
              </div>

              {/* Details Section */}
              <div className="space-y-3 mt-4">
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
                        {formatHours(displayTotalTrackedHours)}
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
                      style={{ width: `${Math.max(displayProgressPercent > 0 ? 1 : 0, Math.min(100, displayProgressPercent))}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Description Card (Rendered below Details and Progress) */}
              {project.description && (
                <div className="mt-4 p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 space-y-2">
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Description
                  </h4>
                  <div className="relative">
                    <div
                      className={`text-sm text-slate-800 dark:text-slate-200 leading-relaxed prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1 [&_p]:my-2 transition-all duration-300 ${
                        !isDescriptionExpanded ? 'max-h-[180px] overflow-hidden' : ''
                      }`}
                      dangerouslySetInnerHTML={{ __html: project.description }}
                    />
                    {!isDescriptionExpanded && (
                      <div className="absolute bottom-0 left-0 right-0 h-14 bg-gradient-to-t from-slate-50 dark:from-[#151518] to-transparent pointer-events-none" />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsDescriptionExpanded(prev => !prev)}
                    className="text-xs font-bold text-slate-900 dark:text-white hover:underline flex items-center gap-1 mt-2 cursor-pointer"
                  >
                    {isDescriptionExpanded ? (
                      <>Show Less <ChevronUp size={14} /></>
                    ) : (
                      <>View More <ChevronDown size={14} /></>
                    )}
                  </button>
                </div>
              )}

              {/* Edit Project Dialog */}
              <Dialog open={isEditProjectOpen} onOpenChange={setIsEditProjectOpen}>
                <DialogContent className="sm:max-w-[700px] h-[90vh] p-0 flex flex-col overflow-hidden">
                  <DialogHeader className="sticky top-0 bg-background z-10 px-6 py-4 border-b shadow-sm">
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
          ) : activeTab === 'tasks' ? (
            /* ======= TASKS TAB - TABLE VIEW ======= */
            <div className="p-6 space-y-4">
              {/* Header Bar */}
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <CheckSquare size={20} className="text-slate-700 dark:text-slate-300" />
                    Tasks ({project.tasks?.length || 0})
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    View and manage tasks for this project.
                  </p>
                </div>
                {/* {canManageTasks && (
                  <Button
                    onClick={() => setIsNewTaskModalOpen(true)}
                    className="flex items-center gap-2 rounded-[8px] bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800"
                  >
                    <Plus size={16} /> Create New Task
                  </Button>
                )} */}
              </div>

              {/* Tasks Table */}
              <div className="border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden bg-white dark:bg-[#151518]">
                <Table>
                  <TableHeader className="bg-slate-50/80 dark:bg-white/[0.03]">
                    <TableRow className="border-b border-slate-200 dark:border-white/10">
                      <TableHead className="w-8 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center whitespace-nowrap px-2"></TableHead>
                      <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Task Title</TableHead>
                      <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Status</TableHead>
                      <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Priority</TableHead>
                      <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Milestone</TableHead>
                      <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Assignees</TableHead>
                      <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right whitespace-nowrap">Tracked / Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(!sortedTasks || sortedTasks.length === 0) ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12 text-xs text-slate-400">
                          No tasks found for this project.
                        </TableCell>
                      </TableRow>
                    ) : (
                      sortedTasks.map((t: any) => {
                        const isPinned = pinnedTaskIds.includes(t.id);
                        const trackedHours = getTaskTrackedHours(t.id);
                        const formattedTracked = formatTrackedTime(trackedHours);
                        const allocatedStr = t.allocatedHours ? `${t.allocatedHours}h` : '0h';

                        return (
                          <TableRow
                            key={t.id}
                            onClick={() => handleOpenEditTask(t)}
                            className="group hover:bg-slate-50/80 dark:hover:bg-white/[0.04] border-b border-slate-100 dark:border-white/5 transition-colors cursor-pointer"
                          >
                            <TableCell className="w-8 text-center px-2 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={(e) => togglePinTask(t.id, e)}
                                className={`p-1 rounded-md transition-colors ${
                                  isPinned
                                    ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40'
                                    : 'text-slate-300 dark:text-slate-600 group-hover:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10'
                                }`}
                                title={isPinned ? 'Unpin task' : 'Pin task to top'}
                              >
                                <Pin size={13} className={isPinned ? 'fill-blue-600 dark:fill-blue-400' : ''} />
                              </button>
                            </TableCell>

                            <TableCell className="font-medium text-xs text-slate-900 dark:text-white whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors whitespace-nowrap">
                                  {t.title}
                                </span>
                                {isPinned && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800 whitespace-nowrap">
                                    Pinned
                                  </span>
                                )}
                              </div>
                            </TableCell>

                            <TableCell className="whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                              <select
                                value={t.statusId || taskStatuses[0]?.id || ''}
                                onChange={(e) => handleTaskStatusChange(t.id, e.target.value)}
                                disabled={!canManageTasks || isPending}
                                className="text-[11px] font-bold bg-slate-100 dark:bg-white/10 border-0 rounded-[6px] px-2 py-1 cursor-pointer outline-none text-slate-700 dark:text-slate-300 whitespace-nowrap"
                              >
                                {taskStatuses.map((s: any) => (
                                  <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                              </select>
                            </TableCell>

                            <TableCell className="whitespace-nowrap">
                              <Badge variant="outline" className={`text-[10px] font-bold px-2 py-0.5 rounded-[6px] border whitespace-nowrap ${getPriorityColor(t.priority)}`}>
                                {t.priority}
                              </Badge>
                            </TableCell>

                            <TableCell className="whitespace-nowrap">
                              {t.milestone ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[6px] bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 text-[10px] font-semibold border border-slate-200/60 dark:border-white/10 whitespace-nowrap">
                                  <Target size={10} className="shrink-0" />
                                  <span className="whitespace-nowrap">{t.milestone.title}</span>
                                </span>
                              ) : (
                                <span className="text-[11px] text-slate-400 italic whitespace-nowrap">—</span>
                              )}
                            </TableCell>

                            <TableCell className="whitespace-nowrap">
                              <div className="flex -space-x-1.5 items-center whitespace-nowrap">
                                {t.assignees?.map((a: any) => (
                                  <Avatar key={a.user.id} title={a.user.name} className="h-6 w-6 border-2 border-background shrink-0">
                                    <AvatarFallback className="text-[9px] bg-slate-500 text-white font-bold">{a.user.name.substring(0,2).toUpperCase()}</AvatarFallback>
                                  </Avatar>
                                ))}
                              </div>
                            </TableCell>

                            <TableCell className="text-right text-xs font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                              <span className="font-bold text-blue-600 dark:text-blue-400">{formattedTracked}</span>
                              <span className="text-slate-400 mx-1">/</span>
                              <span className="text-slate-600 dark:text-slate-300">{allocatedStr}</span>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Task Form Modal for Create & Edit */}
              {isNewTaskModalOpen && (
                <TaskFormModal
                  isOpen={isNewTaskModalOpen}
                  onOpenChange={(open) => {
                    setIsNewTaskModalOpen(open);
                    if (!open) setEditingTask(null);
                  }}
                  task={editingTask}
                  projects={[{ id: project.id, name: project.name, title: project.name }]}
                  taskStatuses={taskStatuses}
                  users={users}
                  currentUser={currentUser}
                  onSuccess={() => {
                    setIsNewTaskModalOpen(false);
                    setEditingTask(null);
                    router.refresh();
                  }}
                />
              )}
            </div>
          ) : activeTab === 'milestones' ? (
            /* ======= MILESTONES TAB ======= */
            <div className="p-6 space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Target size={20} className="text-slate-700 dark:text-slate-300" />
                Milestones
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isClient ? 'Track project milestones and deliverables.' : 'Manage project milestones. Clients see only client-visible milestones.'}
              </p>
            </div>
            {/* {(isOwner || isPM) && (
              <Button
                onClick={() => setIsCreateMilestoneOpen(true)}
                className="flex items-center gap-2 rounded-[8px]"
              >
                <Plus size={16} />
                Add Milestone
              </Button>
            )} */}
          </div>

          {/* ======= MILESTONES TAB - TABLE VIEW ======= */}
          <div className="border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden bg-white dark:bg-[#151518]">
            <Table>
              <TableHeader className="bg-slate-50/80 dark:bg-white/[0.03]">
                <TableRow className="border-b border-slate-200 dark:border-white/10">
                  <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Milestone Name</TableHead>
                  <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Status</TableHead>
                  <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Progress</TableHead>
                  <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Due Date</TableHead>
                  <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Linked Tasks</TableHead>
                  <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right whitespace-nowrap">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {milestones.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-xs text-slate-400 whitespace-nowrap">
                      No milestones found for this project.
                    </TableCell>
                  </TableRow>
                ) : (
                  milestones.map((milestone: any) => {
                    const sc = getMilestoneStatusColor(milestone.status);
                    const dueDate = milestone.dueDate ? new Date(milestone.dueDate) : null;
                    const isOverdue = dueDate && dueDate < new Date() && milestone.status !== 'COMPLETED';
                    const linkedTaskCount = project.tasks?.filter((t: any) => t.milestoneId === milestone.id).length || 0;

                    return (
                      <TableRow key={milestone.id} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] border-b border-slate-100 dark:border-white/5 transition-colors">
                        <TableCell className="font-medium text-xs text-slate-900 dark:text-white whitespace-nowrap">
                          <div className="flex items-center gap-2 whitespace-nowrap">
                            <span className="font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">{milestone.title}</span>
                            {milestone.clientVisible && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-300 border border-sky-200 dark:border-sky-800 whitespace-nowrap">
                                <Eye size={9} /> Client
                              </span>
                            )}
                            {isOverdue && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-300 border border-red-200 dark:border-red-800 whitespace-nowrap">
                                Overdue
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border whitespace-nowrap ${sc.bg} ${sc.text} ${sc.border}`}>
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${sc.dot}`} />
                            <span className="whitespace-nowrap">{milestone.status.replace('_', ' ')}</span>
                          </span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div className="space-y-1 w-32">
                            <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 dark:text-slate-400 whitespace-nowrap">
                              <span>Progress</span>
                              <span>{milestone.progress}%</span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-300"
                                style={{
                                  width: `${Math.min(100, milestone.progress)}%`,
                                  background: milestone.progress === 100
                                    ? 'linear-gradient(90deg, #10b981, #059669)'
                                    : 'linear-gradient(90deg, #334155, #0f172a)'
                                }}
                              />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {dueDate ? (
                            <span className={`flex items-center gap-1 text-[11px] whitespace-nowrap ${isOverdue ? 'text-red-500 font-bold' : ''}`}>
                              <CalendarDays size={13} className="text-slate-400 shrink-0" />
                              <span className="whitespace-nowrap">{dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px] whitespace-nowrap">No due date</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                            <CheckSquare size={13} className="shrink-0" />
                            <span className="whitespace-nowrap">{linkedTaskCount} {linkedTaskCount === 1 ? 'task' : 'tasks'}</span>
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {(isOwner || isPM) && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 cursor-pointer">
                                  <MoreHorizontal size={16} />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuItem onClick={() => openEditMilestone(milestone)} className="gap-2 cursor-pointer">
                                  <Edit2 size={14} /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleDeleteMilestone(milestone.id)}
                                  className="gap-2 text-red-600 focus:text-red-600 cursor-pointer"
                                >
                                  <Trash2 size={14} /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Create Milestone Dialog */}
          <Dialog open={isCreateMilestoneOpen} onOpenChange={setIsCreateMilestoneOpen}>
            <DialogContent className="w-[calc(100%-2rem)] max-w-md p-0 gap-0 flex flex-col rounded-[8px] sm:rounded-[8px] overflow-hidden border-slate-200 dark:border-white/10 bg-white dark:bg-[#1f1f1f] shadow-[0_24px_70px_rgba(0,0,0,0.28)] [&>button]:right-5 [&>button]:top-5 [&>button]:text-slate-400 [&>button]:opacity-100 [&>button_svg]:size-5">
              {/* Header */}
              <div className="px-6 py-[18px] border-b border-slate-200/80 dark:border-white/10">
                <DialogTitle className="pr-10 text-[17px] font-bold text-slate-900 dark:text-white leading-tight tracking-[-0.01em] flex items-center gap-2">
                  <Target size={16} className="text-slate-500 dark:text-slate-400" /> New Milestone
                </DialogTitle>
                <DialogDescription className="text-[12.5px] leading-5 text-slate-500 dark:text-slate-400 mt-1">
                  Define a key milestone for this project.
                </DialogDescription>
              </div>

              <form onSubmit={handleCreateMilestone} className="overflow-y-auto custom-scrollbar">
                <div className="px-6 py-5 space-y-4">
                  {/* Title */}
                  <div className="space-y-1.5">
                    <label className="block text-[13px] leading-4 font-bold text-slate-600 dark:text-slate-300">
                      Title <span className="text-red-500">*</span>
                    </label>
                    <Input
                      placeholder="e.g. Design Phase Complete"
                      value={mTitle}
                      onChange={e => setMTitle(e.target.value)}
                      required
                      className="h-[42px] rounded-[8px] border-slate-200 px-4 text-[15px] text-slate-900 placeholder:text-slate-400 focus-visible:border-slate-700 focus-visible:ring-1 focus-visible:ring-slate-700 dark:border-white/10 dark:bg-transparent dark:text-white"
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-1.5">
                    <label className="block text-[13px] leading-4 font-bold text-slate-600 dark:text-slate-300">
                      Description
                    </label>
                    <textarea
                      placeholder="Describe what this milestone represents..."
                      value={mDescription}
                      onChange={e => setMDescription(e.target.value)}
                      rows={3}
                      className="w-full rounded-[8px] border border-slate-200 dark:border-white/10 bg-transparent px-4 py-2.5 text-[14px] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-700 dark:focus:ring-slate-300 resize-none"
                    />
                  </div>

                  {/* Due Date + Status */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-[13px] leading-4 font-bold text-slate-600 dark:text-slate-300">
                        Due Date
                      </label>
                      <Input
                        type="date"
                        value={mDueDate}
                        onChange={e => setMDueDate(e.target.value)}
                        className="h-[42px] rounded-[8px] border-slate-200 px-4 text-[14px] text-slate-900 focus-visible:border-slate-700 focus-visible:ring-1 focus-visible:ring-slate-700 dark:border-white/10 dark:bg-transparent dark:text-white"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[13px] leading-4 font-bold text-slate-600 dark:text-slate-300">
                        Status
                      </label>
                      <select
                        value={mStatus}
                        onChange={e => setMStatus(e.target.value)}
                        className="h-[42px] w-full rounded-[8px] border border-slate-200 dark:border-white/10 bg-transparent px-3 text-[14px] text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-700 dark:focus:ring-slate-300 cursor-pointer"
                      >
                        <option value="NOT_STARTED">Not Started</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="ON_HOLD">On Hold</option>
                        <option value="COMPLETED">Completed</option>
                      </select>
                    </div>
                  </div>

                  {/* Toggles */}
                  <div className="flex items-center gap-6 pt-1">
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <div
                        onClick={() => setMClientVisible(v => !v)}
                        className={`relative w-10 h-5 rounded-full transition-colors ${mClientVisible ? 'bg-sky-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                      >
                        <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${mClientVisible ? 'translate-x-5' : ''}`} />
                      </div>
                      <span className="text-[13px] font-medium flex items-center gap-1 text-slate-700 dark:text-slate-300">
                        <Eye size={14} /> Client Visible
                      </span>
                    </label>
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <div
                        onClick={() => setMAutoComplete(v => !v)}
                        className={`relative w-10 h-5 rounded-full transition-colors ${mAutoComplete ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                      >
                        <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${mAutoComplete ? 'translate-x-5' : ''}`} />
                      </div>
                      <span className="text-[13px] font-medium flex items-center gap-1 text-slate-700 dark:text-slate-300">
                        <TrendingUp size={14} /> Auto-Complete at 100%
                      </span>
                    </label>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-200/80 dark:border-white/10 bg-slate-50/60 dark:bg-[#19191c] flex justify-end items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsCreateMilestoneOpen(false)}
                    className="h-9 px-4 text-sm font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 rounded-[16px] transition-colors outline-none cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending || !mTitle.trim()}
                    className="h-9 min-w-[130px] px-5 text-sm font-bold rounded-[16px] bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed outline-none cursor-pointer flex items-center gap-1.5 justify-center"
                  >
                    <Flag size={14} /> Create Milestone
                  </button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* Edit Milestone Dialog */}
          <Dialog open={isEditMilestoneOpen} onOpenChange={setIsEditMilestoneOpen}>
            <DialogContent className="w-[calc(100%-2rem)] max-w-md p-0 gap-0 flex flex-col rounded-[8px] sm:rounded-[8px] overflow-hidden border-slate-200 dark:border-white/10 bg-white dark:bg-[#1f1f1f] shadow-[0_24px_70px_rgba(0,0,0,0.28)] [&>button]:right-5 [&>button]:top-5 [&>button]:text-slate-400 [&>button]:opacity-100 [&>button_svg]:size-5">
              {/* Header */}
              <div className="px-6 py-[18px] border-b border-slate-200/80 dark:border-white/10">
                <DialogTitle className="pr-10 text-[17px] font-bold text-slate-900 dark:text-white leading-tight tracking-[-0.01em] flex items-center gap-2">
                  <Edit2 size={16} className="text-slate-500 dark:text-slate-400" /> Edit Milestone
                </DialogTitle>
                <DialogDescription className="text-[12.5px] leading-5 text-slate-500 dark:text-slate-400 mt-1">
                  Update the milestone details below.
                </DialogDescription>
              </div>

              <form onSubmit={handleEditMilestone} className="overflow-y-auto custom-scrollbar">
                <div className="px-6 py-5 space-y-4">
                  {/* Title */}
                  <div className="space-y-1.5">
                    <label className="block text-[13px] leading-4 font-bold text-slate-600 dark:text-slate-300">
                      Title <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={emTitle}
                      onChange={e => setEmTitle(e.target.value)}
                      required
                      placeholder="e.g. Design Phase"
                      className="h-[42px] rounded-[8px] border-slate-200 px-4 text-[15px] text-slate-900 placeholder:text-slate-400 focus-visible:border-slate-700 focus-visible:ring-1 focus-visible:ring-slate-700 dark:border-white/10 dark:bg-transparent dark:text-white"
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-1.5">
                    <label className="block text-[13px] leading-4 font-bold text-slate-600 dark:text-slate-300">
                      Description
                    </label>
                    <textarea
                      value={emDescription}
                      onChange={e => setEmDescription(e.target.value)}
                      rows={3}
                      placeholder="Add a description…"
                      className="w-full rounded-[8px] border border-slate-200 dark:border-white/10 bg-transparent px-4 py-2.5 text-[14px] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-700 dark:focus:ring-slate-300 resize-none"
                    />
                  </div>

                  {/* Due Date + Status */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-[13px] leading-4 font-bold text-slate-600 dark:text-slate-300">
                        Due Date
                      </label>
                      <Input
                        type="date"
                        value={emDueDate}
                        onChange={e => setEmDueDate(e.target.value)}
                        className="h-[42px] rounded-[8px] border-slate-200 px-4 text-[14px] text-slate-900 focus-visible:border-slate-700 focus-visible:ring-1 focus-visible:ring-slate-700 dark:border-white/10 dark:bg-transparent dark:text-white"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[13px] leading-4 font-bold text-slate-600 dark:text-slate-300">
                        Status
                      </label>
                      <select
                        value={emStatus}
                        onChange={e => setEmStatus(e.target.value)}
                        className="h-[42px] w-full rounded-[8px] border border-slate-200 dark:border-white/10 bg-transparent px-3 text-[14px] text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-700 dark:focus:ring-slate-300 cursor-pointer"
                      >
                        <option value="NOT_STARTED">Not Started</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="ON_HOLD">On Hold</option>
                        <option value="COMPLETED">Completed</option>
                      </select>
                    </div>
                  </div>

                  {/* Toggles */}
                  <div className="flex items-center gap-6 pt-1">
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <div
                        onClick={() => setEmClientVisible(v => !v)}
                        className={`relative w-10 h-5 rounded-full transition-colors ${emClientVisible ? 'bg-sky-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                      >
                        <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${emClientVisible ? 'translate-x-5' : ''}`} />
                      </div>
                      <span className="text-[13px] font-medium flex items-center gap-1 text-slate-700 dark:text-slate-300">
                        <Eye size={14} /> Client Visible
                      </span>
                    </label>
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <div
                        onClick={() => setEmAutoComplete(v => !v)}
                        className={`relative w-10 h-5 rounded-full transition-colors ${emAutoComplete ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                      >
                        <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${emAutoComplete ? 'translate-x-5' : ''}`} />
                      </div>
                      <span className="text-[13px] font-medium flex items-center gap-1 text-slate-700 dark:text-slate-300">
                        <TrendingUp size={14} /> Auto-Complete at 100%
                      </span>
                    </label>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-200/80 dark:border-white/10 bg-slate-50/60 dark:bg-[#19191c] flex justify-end items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsEditMilestoneOpen(false)}
                    className="h-9 px-4 text-sm font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 rounded-[16px] transition-colors outline-none cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending || !emTitle.trim()}
                    className="h-9 min-w-[110px] px-5 text-sm font-bold rounded-[16px] bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed outline-none cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      ) : null}
    </div>

        {/* Right Panel: Integrated Project Conversation (Always present in ALL tabs) */}
        <div className="w-[360px] lg:w-[400px] xl:w-[440px] h-full shrink-0 border-l border-slate-200 dark:border-slate-800 bg-[#fafbfc] dark:bg-[#0f0f11]">
          <ProjectConversation
            ref={conversationRef}
            projectId={project.id}
            currentUser={currentUser}
            organizationId={project.organizationId}
            isClient={isClient}
          />
        </div>
      </div>

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
  );
}
