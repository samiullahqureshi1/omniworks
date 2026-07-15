'use client';

import React, { useState, useTransition, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberStepper } from "@/components/ui/NumberStepper";
import {
  FolderKanban,
  Search,
  Plus,
  Calendar,
  Clock,
  MoreHorizontal,
  Users,
  ShieldAlert,
  ArrowRight,
  X,
  Trash2,
  LayoutGrid,
  List as ListIcon,
  Table as TableIcon,
  Edit2,
  ChevronDown,
  Repeat,
  Check,
  Pin,
  Workflow,
  BarChart3,
  Cpu,
  ShieldCheck,
  Activity,
  PlusCircle,
  FileText,
  Shield,
  Crown,
  Star,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  createTeamOpsProjectAction,
  deleteTeamOpsProjectAction,
  updateTeamOpsProjectAction,
  createTeamOpsProjectTemplateAction,
  getTeamOpsProjectTemplatesAction,
  deleteTeamOpsProjectTemplateAction,
  getTeamOpsProjectsAction,
} from "@/app/actions/teamops";
import { getRulesAction, createRuleAction } from "@/app/actions/rules";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const formatDate = (dateInput: any) => {
  if (!dateInput) return "";
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${month}/${day}/${year}`;
  } catch (e) {
    return String(dateInput);
  }
};

const getStatusColor = (statusName?: string) => {
  if (!statusName) return "bg-[#fbfaf7]0/10 text-slate-500 border-slate-500/20";
  const name = statusName.toUpperCase();
  if (name.includes("PLAN") || name.includes("BACKLOG")) {
    return "bg-slate-500/10 text-slate-500 border-slate-500/20";
  } else if (name.includes("PROGRESS") || name.includes("ACTIVE")) {
    return "bg-blue-500/10 text-blue-500 border-blue-500/20";
  } else if (name.includes("HOLD") || name.includes("DELAY")) {
    return "bg-amber-500/10 text-amber-500 border-amber-500/20";
  } else if (name.includes("COMPLETE") || name.includes("DONE") || name.includes("FINISH")) {
    return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
  }
  return "bg-slate-500/10 text-slate-500 border-slate-500/20";
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "CRITICAL":
      return "bg-red-500/10 text-red-600 border-red-200 dark:border-red-900/50";
    case "HIGH":
      return "bg-orange-500/10 text-orange-600 border-orange-200 dark:border-orange-900/50";
    case "MEDIUM":
      return "bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-900/50";
    case "LOW":
      return "bg-slate-500/10 text-slate-600 border-slate-200 dark:border-slate-900/50";
    default:
      return "bg-slate-500/10 text-slate-600 border-slate-200 dark:border-slate-900/50";
  }
};

export default function TeamOpsClient({
  initialProjects,
  users,
  currentUser,
  projectStatuses,
  taskStatuses,
}: {
  initialProjects: any[];
  users: any[];
  currentUser: any;
  projectStatuses: any[];
  taskStatuses: any[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const activeTab = (tabParam === 'dashboard' || tabParam === 'projects' || tabParam === 'templates' || tabParam === 'rules' || tabParam === 'reports')
    ? tabParam
    : 'dashboard';
  const [projects, setProjects] = useState(initialProjects);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [viewMode, setViewMode] = useState<"TABLE" | "KANBAN" | "LIST">("TABLE");
  const [isPending, startTransition] = useTransition();

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isTemplateSelectOpen, setIsTemplateSelectOpen] = useState(false);
  const [isSaveTemplateOpen, setIsSaveTemplateOpen] = useState(false);
  const [isCreateRuleOpen, setIsCreateRuleOpen] = useState(false);

  // Project Fields
  const [formName, setFormName] = useState("");
  const [formPMId, setFormPMId] = useState("");
  const [formStatusId, setFormStatusId] = useState("");
  const [formPriority, setFormPriority] = useState("MEDIUM");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [isOngoing, setIsOngoing] = useState(false);
  const [formBudget, setFormBudget] = useState("");
  const [formAllocatedHours, setFormAllocatedHours] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [description, setDescription] = useState("");
  const [formDepartment, setFormDepartment] = useState("");
  const [formTeam, setFormTeam] = useState("");
  const [customFields, setCustomFields] = useState<{ name: string; type: string; value: string }[]>([]);
  const [attachedRuleIds, setAttachedRuleIds] = useState<string[]>([]);

  // Repeat Settings
  const [isRepeatEnabled, setIsRepeatEnabled] = useState(false);
  const [repeatFrequency, setRepeatFrequency] = useState<"DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY">("DAILY");
  const [repeatTime, setRepeatTime] = useState("09:00");
  const [repeatHour, setRepeatHour] = useState("09");
  const [repeatMinute, setRepeatMinute] = useState("00");
  const [repeatAmPm, setRepeatAmPm] = useState("AM");

  // Task Template List inside Creation Form
  type DraftTask = {
    id: string;
    title: string;
    description: string;
    status: string;
    priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    assigneeId: string;
  };
  const [projectTasks, setProjectTasks] = useState<DraftTask[]>([]);

  // Templates & Rules States
  const [templates, setTemplates] = useState<any[]>([]);
  const [templateSearchQuery, setTemplateSearchQuery] = useState("");
  const [pinnedTemplateIds, setPinnedTemplateIds] = useState<string[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [ruleName, setRuleName] = useState("");
  const [ruleDesc, setRuleDesc] = useState("");
  const [ruleTriggerField, setRuleTriggerField] = useState("Status");
  const [ruleTriggerOperator, setRuleTriggerOperator] = useState("Equals");
  const [ruleTriggerValue, setRuleTriggerValue] = useState("");
  const [ruleAction, setRuleAction] = useState("In-app Notification");
  const [ruleRecipients, setRuleRecipients] = useState<string[]>([]);
  const [ruleRecipientSearch, setRuleRecipientSearch] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [defaultTemplateId, setDefaultTemplateId] = useState<string | null>(null);

  // Project Selection & Deletion States
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);

  const pinnedTemplates = useMemo(() => {
    return templates.filter((t) => pinnedTemplateIds.includes(t.id));
  }, [templates, pinnedTemplateIds]);

  const fetchTemplates = async () => {
    setIsLoadingTemplates(true);
    try {
      const res = await getTeamOpsProjectTemplatesAction();
      if (res.success && res.templates) {
        setTemplates(res.templates);
      }
    } catch (e) {
      toast.error("Failed to load templates");
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  const fetchRules = async () => {
    try {
      const res = await getRulesAction();
      if (res.success && res.rules) {
        setRules(res.rules);
      }
    } catch (e) {
      toast.error("Failed to load rules");
    }
  };

  useEffect(() => {
    fetchTemplates();
    fetchRules();
    const savedPinned = localStorage.getItem("omniwork_pinned_teamops_templates");
    if (savedPinned) {
      try {
        setPinnedTemplateIds(JSON.parse(savedPinned));
      } catch (e) {}
    }
    const savedDefault = localStorage.getItem("omniwork_default_teamops_template_id");
    if (savedDefault) {
      setDefaultTemplateId(savedDefault);
    }
    const savedView = localStorage.getItem("omniwork_teamops_view");
    if (savedView === "TABLE" || savedView === "KANBAN" || savedView === "LIST") {
      setViewMode(savedView);
    }
  }, []);

  const handleSetDefaultTemplate = (templateId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newDefault = defaultTemplateId === templateId ? null : templateId;
    setDefaultTemplateId(newDefault);
    if (newDefault) {
      localStorage.setItem("omniwork_default_teamops_template_id", newDefault);
      toast.success("Template set as default");
    } else {
      localStorage.removeItem("omniwork_default_teamops_template_id");
      toast.success("Default template removed");
    }
  };

  const handleTogglePinTemplate = (templateId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPinnedTemplateIds((prev) => {
      const isPinned = prev.includes(templateId);
      const next = isPinned
        ? prev.filter((id) => id !== templateId)
        : [...prev, templateId];
      localStorage.setItem("omniwork_pinned_teamops_templates", JSON.stringify(next));
      setTimeout(() => {
        window.dispatchEvent(new Event('omniwork_templates_pinned_changed'));
      }, 50);
      return next;
    });
  };

  const handleDeleteTemplate = async (templateId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this template?")) return;
    const res = await deleteTeamOpsProjectTemplateAction(templateId);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Template deleted successfully");
      setTemplates(templates.filter((t) => t.id !== templateId));
      setPinnedTemplateIds((prev) => {
        const next = prev.filter((id) => id !== templateId);
        localStorage.setItem("omniwork_pinned_teamops_templates", JSON.stringify(next));
        setTimeout(() => {
          window.dispatchEvent(new Event('omniwork_templates_pinned_changed'));
        }, 50);
        return next;
      });
    }
  };

  const handleUseTemplate = (template: any) => {
    const config = template.config;
    if (!config) return;

    setFormName(config.name || "");
    setFormPMId(config.projectManagerId || "");
    setFormStatusId(config.statusId || "");
    setFormPriority(config.priority || "MEDIUM");
    setFormDepartment(config.department || "");
    setFormTeam(config.team || "");
    setIsRepeatEnabled(config.isRepeatEnabled || false);
    setRepeatFrequency(config.repeatFrequency || "DAILY");
    setRepeatTime(config.repeatTime || "09:00");
    if (config.repeatTime) {
      const match = config.repeatTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
      if (match) {
        setRepeatHour(match[1]);
        setRepeatMinute(match[2]);
        setRepeatAmPm(match[3].toUpperCase());
      }
    }

    const formatDateForInput = (dateStr: string) => {
      if (!dateStr) return "";
      try {
        return new Date(dateStr).toISOString().split("T")[0];
      } catch (err) {
        return "";
      }
    };
    
    setFormStartDate(formatDateForInput(config.startDate));
    setFormEndDate(formatDateForInput(config.endDate));
    setIsOngoing(config.isOngoing || false);
    setFormBudget(config.projectBudget ? String(config.projectBudget) : "");
    setFormAllocatedHours(config.totalAllocatedHours ? String(config.totalAllocatedHours) : "");
    setFormNotes(config.notes || "");
    setDescription(config.description || "");

    if (config.customFields && Array.isArray(config.customFields)) {
      setCustomFields(config.customFields);
    } else {
      setCustomFields([]);
    }

    if (config.tasks && Array.isArray(config.tasks)) {
      setProjectTasks(
        config.tasks.map((t: any) => ({
          id: t.id || Math.random().toString(),
          title: t.title || "",
          description: t.description || "",
          status: t.statusId || t.status || "",
          priority: t.priority || "MEDIUM",
          assigneeId: (t.assigneeIds && t.assigneeIds[0]) || t.assigneeId || "",
        }))
      );
    } else {
      setProjectTasks([]);
    }

    if (config.attachedRuleIds && Array.isArray(config.attachedRuleIds)) {
      setAttachedRuleIds(config.attachedRuleIds);
    } else {
      setAttachedRuleIds([]);
    }

    setIsTemplateSelectOpen(false);
    setIsCreateOpen(true);
    toast.success("Applied template configuration");
  };

  const handleOpenCreateProject = () => {
    if (defaultTemplateId) {
      const defaultTemplate = templates.find((t) => t.id === defaultTemplateId);
      if (defaultTemplate) {
        handleUseTemplate(defaultTemplate);
        return;
      }
    }
    setIsRepeatEnabled(false);
    setFormName("");
    setFormPMId("");
    setFormStatusId("");
    setFormPriority("MEDIUM");
    setFormStartDate("");
    setFormEndDate("");
    setFormBudget("");
    setFormAllocatedHours("");
    setFormNotes("");
    setDescription("");
    setFormDepartment("");
    setFormTeam("");
    setProjectTasks([]);
    setCustomFields([]);
    setAttachedRuleIds([]);
    setIsCreateOpen(true);
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName.trim()) {
      toast.error("Please enter a template name");
      return;
    }

    const repeatTime = `${repeatHour}:${repeatMinute} ${repeatAmPm}`;

    const config = {
      name: formName,
      projectManagerId: formPMId || undefined,
      statusId: formStatusId || undefined,
      priority: formPriority,
      startDate: formStartDate,
      endDate: formEndDate,
      isOngoing,
      projectBudget: formBudget ? Number(formBudget) : undefined,
      totalAllocatedHours: formAllocatedHours ? Number(formAllocatedHours) : undefined,
      notes: formNotes,
      description: description,
      customFields,
      department: formDepartment,
      team: formTeam,
      isRepeatEnabled,
      repeatFrequency,
      repeatTime,
      tasks: projectTasks.map((t) => ({
        title: t.title,
        description: t.description,
        priority: t.priority,
        statusId: t.status || undefined,
        assigneeIds: t.assigneeId ? [t.assigneeId] : [],
      })),
      attachedRuleIds,
    };

    startTransition(async () => {
      const res = await createTeamOpsProjectTemplateAction(templateName.trim(), config);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Template saved successfully");
        setIsSaveTemplateOpen(false);
        setTemplateName("");
        fetchTemplates();
      }
    });
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleName.trim()) {
      toast.error("Rule name is required");
      return;
    }

    startTransition(async () => {
      const res = await createRuleAction({
        name: ruleName,
        description: ruleDesc,
        triggerField: ruleTriggerField,
        triggerOperator: ruleTriggerOperator,
        triggerValue: ruleTriggerValue,
        actionType: ruleAction,
        actionRecipients: ruleRecipients,
        recipients: ruleRecipients,
      });

      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Rule created successfully");
        if (res.rule) {
          setAttachedRuleIds((prev) => [...prev, res.rule.id]);
        }
        setIsCreateRuleOpen(false);
        setRuleName("");
        setRuleDesc("");
        setRuleTriggerField("Status");
        setRuleTriggerOperator("Equals");
        setRuleTriggerValue("");
        setRuleAction("In-app Notification");
        setRuleRecipients([]);
        setRuleRecipientSearch("");
        fetchRules();
      }
    });
  };

  const toggleRuleRecipient = (role: string) => {
    if (ruleRecipients.includes(role)) {
      setRuleRecipients((prev) => prev.filter((r) => r !== role));
    } else {
      setRuleRecipients((prev) => [...prev, role]);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isRepeatEnabled && (!formEndDate || isOngoing)) {
      toast.error("An End Date is required to schedule repeated projects.");
      return;
    }

    const repeatTime = `${repeatHour}:${repeatMinute} ${repeatAmPm}`;

    const data = {
      name: formName,
      department: formDepartment,
      team: formTeam,
      description,
      notes: formNotes,
      projectManagerId: formPMId || undefined,
      statusId: formStatusId || undefined,
      priority: formPriority as any,
      startDate: formStartDate,
      endDate: formEndDate,
      isOngoing,
      projectBudget: formBudget ? Number(formBudget) : undefined,
      totalAllocatedHours: formAllocatedHours ? Number(formAllocatedHours) : 0,
      assigneeIds: [], // Assigned directly via tasks or custom logic
      customFields,
      isRepeated: isRepeatEnabled,
      repeatSettings: {
        enabled: isRepeatEnabled,
        frequency: repeatFrequency,
          time: repeatTime,
      },
      repeatTime,
      tasks: projectTasks
        .filter((t) => t.title.trim() !== "")
        .map((t) => ({
          title: t.title,
          description: t.description,
          priority: t.priority as any,
          statusId: t.status as string,
          assigneeIds: t.assigneeId ? [t.assigneeId] : [],
        })),
      ruleIds: attachedRuleIds,
    };

    startTransition(async () => {
      const res = await createTeamOpsProjectAction(data);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Internal project created successfully");
        setIsCreateOpen(false);
        setProjectTasks([]);
        setCustomFields([]);
        setAttachedRuleIds([]);
        setFormName("");
        setFormPMId("");
        setFormStatusId("");
        setFormPriority("MEDIUM");
        setFormStartDate("");
        setFormEndDate("");
        setFormBudget("");
        setFormAllocatedHours("");
        setFormNotes("");
        setDescription("");
        setFormDepartment("");
        setFormTeam("");
        setIsRepeatEnabled(false);
        setRepeatFrequency("DAILY");
        setRepeatTime("09:00");
        // Reload projects list
        const reloadRes = await getTeamOpsProjectsAction();
        if (reloadRes.success && reloadRes.projects) {
          setProjects(reloadRes.projects);
        }
      }
    });
  };

  const toggleSelectProject = (projectId: string) => {
    setSelectedProjectIds((prev) =>
      prev.includes(projectId) ? prev.filter((id) => id !== projectId) : [...prev, projectId]
    );
  };

  const toggleSelectAllProjects = () => {
    if (selectedProjectIds.length === filteredProjects.length) {
      setSelectedProjectIds([]);
    } else {
      setSelectedProjectIds(filteredProjects.map((p) => p.id));
    }
  };

  const confirmDeleteProject = (projectId: string) => {
    setProjectToDelete(projectId);
    setIsDeleteConfirmOpen(true);
  };

  const confirmBulkDelete = () => {
    setProjectToDelete(null);
    setIsDeleteConfirmOpen(true);
  };

  const executeDeletion = async () => {
    startTransition(async () => {
      if (projectToDelete) {
        // Single delete
        const res = await deleteTeamOpsProjectAction(projectToDelete);
        if (res.error) {
          toast.error(res.error);
        } else {
          toast.success("Project deleted successfully");
          setProjects((prev) => prev.filter((p) => p.id !== projectToDelete));
          setSelectedProjectIds((prev) => prev.filter((id) => id !== projectToDelete));
        }
      } else {
        // Bulk delete
        let successCount = 0;
        let failCount = 0;
        for (const id of selectedProjectIds) {
          const res = await deleteTeamOpsProjectAction(id);
          if (res.success) {
            successCount++;
          } else {
            failCount++;
          }
        }
        if (successCount > 0) {
          toast.success(`Deleted ${successCount} project(s) successfully.`);
          setProjects((prev) => prev.filter((p) => !selectedProjectIds.includes(p.id)));
          setSelectedProjectIds([]);
        }
        if (failCount > 0) {
          toast.error(`Failed to delete ${failCount} project(s).`);
        }
      }
      setIsDeleteConfirmOpen(false);
      setProjectToDelete(null);
    });
  };

  const members = users.filter((u) => u.role === "MEMBER" || u.role === "OWNER");

  // Filters & Calculations
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (p.department && p.department.toLowerCase().includes(searchQuery.toLowerCase())) || 
        (p.team && p.team.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus = statusFilter === "ALL" || p.statusId === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [projects, searchQuery, statusFilter]);

  // Dashboard Stats
  const activeProjectsCount = useMemo(() => {
    return projects.filter((p) => {
      const statusName = p.status?.name?.toUpperCase() || "";
      return !statusName.includes("COMPLETE") && !statusName.includes("DONE") && !statusName.includes("FINISH");
    }).length;
  }, [projects]);

  const upcomingRepeatsCount = useMemo(() => {
    return projects.filter((p) => p.isRepeated && new Date(p.startDate) > new Date()).length;
  }, [projects]);

  const pendingTasksCount = useMemo(() => {
    let count = 0;
    projects.forEach((p) => {
      const statusName = p.status?.name?.toUpperCase() || "";
      if (!statusName.includes("COMPLETE") && !statusName.includes("DONE")) {
        p.tasks?.forEach((t: any) => {
          const taskStatus = t.statusId || t.status || "";
          if (taskStatus !== "COMPLETE" && taskStatus !== "DONE") {
            count++;
          }
        });
      }
    });
    return count;
  }, [projects]);

  const activeTeamMembersCount = useMemo(() => {
    const ids = new Set<string>();
    projects.forEach((p) => {
      if (p.projectManagerId) ids.add(p.projectManagerId);
      p.assignees?.forEach((a: any) => {
        if (a.userId) ids.add(a.userId);
      });
      p.tasks?.forEach((t: any) => {
        t.assignees?.forEach((ta: any) => {
          if (ta.userId) ids.add(ta.userId);
        });
      });
    });
    return ids.size;
  }, [projects]);

  const departmentData = useMemo(() => {
    const map = new Map<string, number>();
    projects.forEach((p) => {
      const dept = p.department || "General Operations";
      map.set(dept, (map.get(dept) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [projects]);

  const weeklyHoursData = [
    { name: 'Mon', hours: 14.5 },
    { name: 'Tue', hours: 22.0 },
    { name: 'Wed', hours: 25.5 },
    { name: 'Thu', hours: 19.0 },
    { name: 'Fri', hours: 16.5 },
    { name: 'Sat', hours: 0 },
    { name: 'Sun', hours: 0 },
  ];

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe', '#00c49f', '#ffbb28', '#ff8042'];

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-5">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2.5 text-slate-900 dark:text-white">
            <Workflow className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            TeamOps Hub
          </h1>
          <p className="text-sm text-muted-foreground font-medium">
            Internal Operations, Team Projects, and Workflow Automation Workspace.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex items-center -space-x-px shadow-sm rounded-xl overflow-hidden self-stretch sm:self-auto">
          <Button
            onClick={handleOpenCreateProject}
            className="rounded-r-none h-10 px-4 flex-1 sm:flex-initial"
          >
            <Plus className="mr-2 h-4 w-4" /> New Internal Project
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="rounded-l-none border-l border-white/20 px-2.5 h-10 flex-none">
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-[#1f1f1f] rounded-xl shadow-lg border border-black/5 dark:border-white/10 p-1.5 z-50">
              <DropdownMenuItem
                onClick={handleOpenCreateProject}
                className="cursor-pointer rounded-lg px-3 py-2 text-sm hover:bg-muted"
              >
                Create New Internal Project
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setIsTemplateSelectOpen(true)}
                className="cursor-pointer rounded-lg px-3 py-2 text-sm hover:bg-muted"
              >
                Use Existing Template
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setIsRepeatEnabled(true);
                  setIsOngoing(false);
                  setIsCreateOpen(true);
                }}
                className="cursor-pointer rounded-lg px-3 py-2 text-sm hover:bg-muted"
              >
                Create Repeated Internal Project
              </DropdownMenuItem>

              {pinnedTemplates.length > 0 && (
                <>
                  <DropdownMenuSeparator className="my-1 border-t border-black/5 dark:border-white/10" />
                  <div className="px-3 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider select-none">
                    Pinned Templates
                  </div>
                  {pinnedTemplates.map((template) => (
                    <DropdownMenuItem
                      key={template.id}
                      onClick={() => handleUseTemplate(template)}
                      className="cursor-pointer rounded-lg px-3 py-2 text-sm hover:bg-muted flex items-center gap-2"
                    >
                      <Pin className="h-3.5 w-3.5 fill-purple-600 text-purple-600 dark:fill-purple-400 dark:text-purple-400 rotate-45 shrink-0" />
                      <span className="truncate">{template.name}</span>
                    </DropdownMenuItem>
                  ))}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>



      {/* Content tabs */}
      {activeTab === "dashboard" && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Stats KPI */}
          <div className="grid gap-4 md:grid-cols-4">
            <div className="bg-white dark:bg-zinc-900 border rounded-2xl p-5 shadow-sm space-y-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Active Internal Projects</span>
              <div className="text-3xl font-extrabold">{activeProjectsCount}</div>
            </div>
            <div className="bg-white dark:bg-zinc-900 border rounded-2xl p-5 shadow-sm space-y-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Upcoming Repeats</span>
              <div className="text-3xl font-extrabold">{upcomingRepeatsCount}</div>
            </div>
            <div className="bg-white dark:bg-zinc-900 border rounded-2xl p-5 shadow-sm space-y-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Pending Tasks</span>
              <div className="text-3xl font-extrabold">{pendingTasksCount}</div>
            </div>
            <div className="bg-white dark:bg-zinc-900 border rounded-2xl p-5 shadow-sm space-y-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Team Members Active</span>
              <div className="text-3xl font-extrabold">{activeTeamMembersCount}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Active internal projects list */}
            <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border rounded-2xl p-5 shadow-sm space-y-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <ShieldCheck className="text-purple-600 dark:text-purple-400" size={20} />
                Ongoing Team Operations
              </h3>
              <div className="divide-y">
                {projects.slice(0, 5).map((p) => (
                  <div key={p.id} className="py-3.5 flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <Link href={`/workspace/teamops/${p.id}`} className="font-semibold text-sm hover:underline block truncate text-slate-900 dark:text-white">
                        {p.name}
                      </Link>
                      <div className="flex gap-2.5 text-xs text-muted-foreground font-medium mt-1">
                        {p.department && <span>Dept: {p.department}</span>}
                        {p.team && <span>• Team: {p.team}</span>}
                      </div>
                    </div>
                    <Badge variant="outline" className={getStatusColor(p.status?.name)}>
                      {p.status?.name || "No Status"}
                    </Badge>
                  </div>
                ))}
                {projects.length === 0 && (
                  <div className="text-center py-6 text-sm text-muted-foreground">No operations workspace setup yet.</div>
                )}
              </div>
            </div>

            {/* Rules list */}
            <div className="bg-white dark:bg-zinc-900 border rounded-2xl p-5 shadow-sm space-y-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Cpu className="text-purple-600 dark:text-purple-400" size={20} />
                Workflow Automation
              </h3>
              <div className="divide-y">
                {rules.slice(0, 4).map((rule) => (
                  <div key={rule.id} className="py-3 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">{rule.name}</span>
                      <Badge variant="secondary" className="text-[10px] py-0.5">{rule.frequency}</Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-1">{rule.description || "No description provided."}</p>
                  </div>
                ))}
                {rules.length === 0 && (
                  <div className="text-center py-6 text-sm text-muted-foreground">No rules created yet.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "projects" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Controls */}
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, department, or team..."
                className="pl-9 bg-background shadow-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex bg-muted/50 p-1 rounded-xl shadow-sm border">
                <button
                  onClick={() => setViewMode("TABLE")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    viewMode === "TABLE"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <TableIcon size={16} /> Table
                </button>
                <button
                  onClick={() => setViewMode("KANBAN")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    viewMode === "KANBAN"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <LayoutGrid size={16} /> Kanban
                </button>
                <button
                  onClick={() => setViewMode("LIST")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    viewMode === "LIST"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <ListIcon size={16} /> List
                </button>
              </div>
            </div>
          </div>

          {/* Bulk Actions Panel */}
          {selectedProjectIds.length > 0 && (
            <div className="flex items-center justify-between p-3.5 bg-purple-50 dark:bg-purple-950/15 border border-purple-100 dark:border-purple-900/30 rounded-2xl animate-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-2.5">
                <div className="h-5 w-5 bg-purple-600 text-white rounded-full flex items-center justify-center text-[10px] font-extrabold shadow-sm">
                  {selectedProjectIds.length}
                </div>
                <span className="text-xs font-semibold text-purple-950 dark:text-purple-300">
                  Project{selectedProjectIds.length > 1 ? 's' : ''} Selected
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedProjectIds([])}
                  className="h-8 rounded-xl text-xs font-semibold"
                >
                  Clear Selection
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={confirmBulkDelete}
                  className="h-8 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-700 flex items-center gap-1.5"
                >
                  <Trash2 size={13} /> Delete Selected
                </Button>
              </div>
            </div>
          )}

          {/* Table View */}
          {viewMode === "TABLE" && (
            <div className="border rounded-2xl bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 px-4">
                      <input
                        type="checkbox"
                        checked={filteredProjects.length > 0 && selectedProjectIds.length === filteredProjects.length}
                        onChange={toggleSelectAllProjects}
                        className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                      />
                    </TableHead>
                    <TableHead>Internal Project</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Timeline</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProjects.map((p) => {
                    const isSel = selectedProjectIds.includes(p.id);
                    return (
                      <TableRow key={p.id} className={isSel ? "bg-purple-50/20 dark:bg-purple-950/5 hover:bg-purple-50/30 dark:hover:bg-purple-950/10" : ""}>
                        <TableCell className="w-12 px-4">
                          <input
                            type="checkbox"
                            checked={isSel}
                            onChange={() => toggleSelectProject(p.id)}
                            className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                          />
                        </TableCell>
                        <TableCell className="font-semibold">
                          <Link href={`/workspace/teamops/${p.id}`} className="hover:underline text-purple-600 dark:text-purple-400">
                            {p.name}
                          </Link>
                        </TableCell>
                        <TableCell className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          {p.department || "—"}
                        </TableCell>
                        <TableCell className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          {p.team || "—"}
                        </TableCell>
                        <TableCell>
                          {p.projectManager ? (
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-[10px]">{p.projectManager.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <span className="text-xs font-medium">{p.projectManager.name}</span>
                            </div>
                          ) : "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground font-semibold">
                          {formatDate(p.startDate)} - {p.isOngoing ? "Ongoing" : formatDate(p.endDate)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getStatusColor(p.status?.name)}>
                            {p.status?.name || "No Status"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <button
                            type="button"
                            onClick={() => confirmDeleteProject(p.id)}
                            className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
                            title="Delete internal project"
                          >
                            <Trash2 size={16} />
                          </button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredProjects.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-10 text-muted-foreground text-sm">
                        No projects match filters.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Kanban View */}
          {viewMode === "KANBAN" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {projectStatuses.map((status) => {
                const statusProjects = filteredProjects.filter((p) => p.statusId === status.id);
                return (
                  <div key={status.id} className="bg-muted/30 border rounded-2xl p-4 space-y-4">
                    <div className="flex justify-between items-center border-b pb-2">
                      <span className="font-bold text-sm text-foreground flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: status.color || "#cccccc" }} />
                        {status.name}
                      </span>
                      <Badge variant="secondary" className="text-xs font-semibold">{statusProjects.length}</Badge>
                    </div>

                    <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                      {statusProjects.map((p) => (
                        <div key={p.id} className="bg-white dark:bg-zinc-900 border rounded-xl p-4 shadow-sm space-y-3 hover:border-purple-400 transition-colors">
                          <Link href={`/workspace/teamops/${p.id}`} className="font-bold text-sm block hover:underline text-slate-800 dark:text-white">
                            {p.name}
                          </Link>
                          {p.department && (
                            <div className="text-xs text-muted-foreground font-semibold">
                              Dept: {p.department}
                            </div>
                          )}
                          <div className="flex justify-between items-center pt-2 border-t text-[11px] text-muted-foreground font-medium">
                            <span className="flex items-center gap-1">
                              <Calendar size={12} /> {formatDate(p.startDate)}
                            </span>
                            {p.projectManager && (
                              <Avatar className="h-5 w-5">
                                <AvatarFallback className="text-[8px]">{p.projectManager.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                            )}
                          </div>
                        </div>
                      ))}
                      {statusProjects.length === 0 && (
                        <div className="text-center py-8 text-xs text-muted-foreground">Empty column</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* List View */}
          {viewMode === "LIST" && (
            <div className="space-y-4">
              {filteredProjects.map((p) => {
                const isSel = selectedProjectIds.includes(p.id);
                return (
                  <div key={p.id} className={`bg-white dark:bg-zinc-900 border rounded-2xl p-5 shadow-sm flex flex-row items-center gap-4 hover:border-purple-400 transition-colors ${isSel ? 'border-purple-300 dark:border-purple-800 bg-purple-50/10' : ''}`}>
                    <input
                      type="checkbox"
                      checked={isSel}
                      onChange={() => toggleSelectProject(p.id)}
                      className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer shrink-0"
                    />
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <Link href={`/workspace/teamops/${p.id}`} className="text-base font-bold hover:underline text-purple-600 dark:text-purple-400 block truncate">
                        {p.name}
                      </Link>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground font-semibold">
                        {p.department && <span>Dept: {p.department}</span>}
                        {p.team && <span>• Team: {p.team}</span>}
                        <span>• PM: {p.projectManager?.name || "Unassigned"}</span>
                        <span>• Timeline: {formatDate(p.startDate)} - {p.isOngoing ? "Ongoing" : formatDate(p.endDate)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Badge variant="outline" className={getStatusColor(p.status?.name)}>
                        {p.status?.name || "No Status"}
                      </Badge>
                      <button
                        type="button"
                        onClick={() => confirmDeleteProject(p.id)}
                        className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
              {filteredProjects.length === 0 && (
                <div className="text-center py-12 text-sm text-muted-foreground bg-white dark:bg-zinc-900 border rounded-2xl">
                  No projects match filters.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === "templates" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex justify-between items-center border-b pb-4">
            <h3 className="text-lg font-bold text-foreground">Operational Checklists & Templates</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {templates.map((template) => {
              const config = template.config || {};
              const tasksCount = Array.isArray(config.tasks) ? config.tasks.length : 0;
              return (
                <div key={template.id} className="bg-white dark:bg-zinc-900 border rounded-2xl p-5 shadow-sm flex flex-col justify-between group relative">
                  <div className="absolute right-3 top-3 flex gap-1">
                    <button
                      onClick={(e) => handleTogglePinTemplate(template.id, e)}
                      className="text-muted-foreground hover:text-primary p-1 rounded"
                    >
                      <Pin className={`h-4 w-4 ${pinnedTemplateIds.includes(template.id) ? "fill-purple-600 text-purple-600 dark:fill-purple-400 dark:text-purple-400" : "opacity-0 group-hover:opacity-100"}`} />
                    </button>
                    <button
                      onClick={(e) => handleDeleteTemplate(template.id, e)}
                      className="text-muted-foreground hover:text-destructive p-1 rounded opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="space-y-2 mb-6">
                    <h4 className="font-bold text-base text-slate-800 dark:text-white truncate pr-16">{template.name}</h4>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground font-semibold">
                      {config.department && <span>Dept: {config.department}</span>}
                      <span>Tasks: {tasksCount}</span>
                    </div>
                  </div>

                  <Button
                    onClick={() => handleUseTemplate(template)}
                    className="w-full text-xs font-semibold h-9"
                  >
                    Apply Template
                  </Button>
                </div>
              );
            })}
            {templates.length === 0 && (
              <div className="col-span-3 text-center py-12 text-sm text-muted-foreground border border-dashed rounded-2xl">
                No templates saved yet. Create an internal project and save it as template.
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "rules" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex justify-between items-center border-b pb-4">
            <h3 className="text-lg font-bold text-foreground">Active Automation Rules</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rules.map((rule) => (
              <div key={rule.id} className="bg-white dark:bg-zinc-900 border rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">{rule.name}</h4>
                  <Badge variant="outline" className="text-xs font-semibold uppercase">{rule.frequency}</Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{rule.description || "No description provided."}</p>
                <div className="pt-3 border-t text-[10px] font-semibold text-muted-foreground flex justify-between items-center">
                  <span>Execution: {rule.reminderTime}</span>
                  <span>Action: {rule.actionType}</span>
                </div>
              </div>
            ))}
            {rules.length === 0 && (
              <div className="col-span-3 text-center py-12 text-sm text-muted-foreground border border-dashed rounded-2xl">
                No automation rules defined.
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "reports" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex justify-between items-center border-b pb-4">
            <h3 className="text-lg font-bold text-foreground">Operational Reports & Hours Breakdown</h3>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Hours Logged Chart */}
            <div className="bg-white dark:bg-zinc-900 border rounded-2xl p-5 shadow-sm space-y-4">
              <div>
                <h4 className="font-bold text-sm">Hours Logged Across Operations</h4>
                <p className="text-xs text-muted-foreground font-semibold">Weekly aggregate of team operation activities.</p>
              </div>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyHoursData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(200,200,200,0.15)" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 11 }} />
                    <RechartsTooltip />
                    <Bar dataKey="hours" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Department Breakdown */}
            <div className="bg-white dark:bg-zinc-900 border rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-sm">Department Operations Share</h4>
                <p className="text-xs text-muted-foreground font-semibold">Percentage share of projects per department.</p>
              </div>
              {departmentData.length > 0 ? (
                <div className="flex flex-col sm:flex-row items-center justify-around gap-4">
                  <div className="h-[180px] w-[180px] shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={departmentData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {departmentData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2 text-xs font-semibold">
                    {departmentData.map((item, index) => (
                      <div key={item.name} className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <span className="truncate max-w-[150px]">{item.name} ({item.value})</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 text-xs text-muted-foreground">No data available</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CREATE MODAL */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[700px] h-[90vh] p-0 flex flex-col overflow-hidden">
          <DialogHeader className="sticky top-0 bg-background z-10 px-6 py-4 border-b shrink-0 shadow-sm flex flex-row justify-between items-center gap-4">
            <div className="space-y-1">
              <DialogTitle>Create New Internal Project</DialogTitle>
              <DialogDescription>
                Create a checklist and workspace for internal department, team operations, or planning.
              </DialogDescription>
            </div>

            {/* Rules Selector in Header */}
            <div className="flex items-center gap-2 shrink-0">
              {attachedRuleIds.length > 0 && (
                <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 border border-indigo-100 dark:bg-indigo-950/30 dark:text-indigo-400 text-[10px] font-bold px-2 py-0.5 rounded-lg">
                  {attachedRuleIds.length} Rule{attachedRuleIds.length > 1 ? 's' : ''} Attached
                </Badge>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" size="sm" className="h-9 rounded-xl border bg-background px-3 text-xs font-semibold flex items-center gap-1.5 shadow-sm">
                    Select Rules... <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-58 bg-white dark:bg-[#1f1f1f] rounded-xl shadow-lg border border-black/5 dark:border-white/10 p-1.5 z-50">
                  {rules.length === 0 ? (
                    <div className="p-2.5 text-center text-xs text-muted-foreground">No active rules</div>
                  ) : (
                    rules.map((r) => {
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
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 custom-scrollbar">
            <form onSubmit={handleCreateProject} className="space-y-6 pb-6">

              {/* Project Basics */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <label className="text-sm font-medium">Project Name <span className="text-destructive">*</span></label>
                  <Input
                    name="name"
                    required
                    placeholder="e.g. Marketing Campaign Planning"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <label className="text-sm font-medium">Description</label>
                  <RichTextEditor
                    content={description}
                    onChange={setDescription}
                    placeholder="Describe the scope and objective of this operation..."
                  />
                </div>
              </div>

              {/* Internal Assignments */}
              <div className="grid grid-cols-2 gap-4 bg-muted/20 p-4 rounded-xl border">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Department</label>
                  <Input
                    placeholder="e.g. Marketing Department"
                    value={formDepartment}
                    onChange={(e) => setFormDepartment(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Team</label>
                  <Input
                    placeholder="e.g. Brand & Content Team"
                    value={formTeam}
                    onChange={(e) => setFormTeam(e.target.value)}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <label className="text-sm font-medium">Project Owner / PM <span className="text-xs text-muted-foreground">(Team Members only)</span></label>
                  <select
                    name="projectManagerId"
                    value={formPMId}
                    onChange={(e) => setFormPMId(e.target.value)}
                    className="flex h-9 w-full rounded-xl border bg-background px-3 text-sm focus:ring-1 focus:ring-ring"
                  >
                    <option value="">Unassigned</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Configuration */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <select
                    value={formStatusId}
                    onChange={(e) => setFormStatusId(e.target.value)}
                    className="flex h-9 w-full rounded-xl border bg-background px-3 text-sm focus:ring-1 focus:ring-ring"
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
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value)}
                    className="flex h-9 w-full rounded-xl border bg-background px-3 text-sm focus:ring-1 focus:ring-ring"
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
                  <label className="text-sm font-medium">Start Date <span className="text-destructive">*</span></label>
                  <Input
                    type="date"
                    required
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium">End Date</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        id="form-ongoing"
                        checked={isOngoing}
                        disabled={isRepeatEnabled}
                        onChange={(e) => setIsOngoing(e.target.checked)}
                        className="rounded text-primary focus:ring-primary cursor-pointer h-3.5 w-3.5 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <label htmlFor="form-ongoing" className={`text-xs ${isRepeatEnabled ? 'text-muted-foreground/50 cursor-not-allowed' : 'text-muted-foreground cursor-pointer'} select-none font-semibold`}>Ongoing</label>
                    </div>
                  </div>
                  {isRepeatEnabled && (
                    <div className="text-[10px] text-amber-600 dark:text-amber-400 -mt-1 mb-1">
                      * Ongoing is disabled for repeating projects.
                    </div>
                  )}
                  {!isOngoing ? (
                    <Input
                      type="date"
                      required={!isOngoing}
                      value={formEndDate}
                      onChange={(e) => setFormEndDate(e.target.value)}
                    />
                  ) : (
                    <div className="flex h-9 w-full items-center justify-center rounded-xl border bg-muted/50 text-xs text-muted-foreground italic">
                      Project has no end date
                    </div>
                  )}
                </div>
              </div>

              {/* Repeat Settings */}
              <div className="space-y-4 bg-gradient-to-r from-purple-500/5 to-indigo-500/5 dark:from-purple-950/10 dark:to-indigo-950/10 p-5 rounded-2xl border border-purple-100/80 dark:border-purple-900/20 shadow-sm transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Repeat className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      Repeat Project
                    </label>
                    <p className="text-xs text-muted-foreground">Automatically duplicate this internal project and task checklist.</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isRepeatEnabled}
                    onClick={() => {
                      const val = !isRepeatEnabled;
                      setIsRepeatEnabled(val);
                      if (val) setIsOngoing(false);
                    }}
                    className={`${
                      isRepeatEnabled ? "bg-purple-600" : "bg-zinc-200 dark:bg-zinc-800"
                    } relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none`}
                  >
                    <span
                      className={`${
                        isRepeatEnabled ? "translate-x-5" : "translate-x-0"
                      } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200`}
                    />
                  </button>
                </div>

                {isRepeatEnabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-purple-100/50 dark:border-purple-900/20 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground tracking-wide uppercase">Frequency</label>
                      <div className="relative">
                        <select
                          value={repeatFrequency}
                          onChange={(e) => setRepeatFrequency(e.target.value as any)}
                          className="flex h-10 w-full appearance-none rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none cursor-pointer pr-10"
                        >
                          <option value="DAILY">Daily</option>
                          <option value="WEEKLY">Weekly</option>
                          <option value="MONTHLY">Monthly</option>
                          <option value="QUARTERLY">Quarterly</option>
                          <option value="YEARLY">Yearly</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground tracking-wide uppercase">Repeat Time</label>
                      <div className="relative">
                        <input
                          type="time"
                          value={repeatTime}
                          onChange={(e) => setRepeatTime(e.target.value)}
                          className="flex h-10 w-full appearance-none rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground tracking-wide uppercase">Execution Time (Repeat At)</label>
                      <div className="flex gap-1.5 items-center">
                        <select
                          value={repeatHour}
                          onChange={(e) => setRepeatHour(e.target.value)}
                          className="flex h-10 w-16 text-center rounded-xl border bg-background px-2 text-sm focus:outline-none"
                        >
                          {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0")).map((h) => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                        <span className="text-sm font-bold">:</span>
                        <select
                          value={repeatMinute}
                          onChange={(e) => setRepeatMinute(e.target.value)}
                          className="flex h-10 w-16 text-center rounded-xl border bg-background px-2 text-sm focus:outline-none"
                        >
                          {["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"].map((m) => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                        <select
                          value={repeatAmPm}
                          onChange={(e) => setRepeatAmPm(e.target.value)}
                          className="flex h-10 w-16 text-center rounded-xl border bg-background px-2 text-sm focus:outline-none"
                        >
                          <option value="AM">AM</option>
                          <option value="PM">PM</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Task Checklist Creation */}
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b pb-2">
                  <label className="text-sm font-bold text-foreground">Task Checklist Template</label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setProjectTasks((prev) => [
                        ...prev,
                        {
                          id: Math.random().toString(),
                          title: "",
                          description: "",
                          status: taskStatuses[0]?.id || "",
                          priority: "MEDIUM",
                          assigneeId: "",
                        },
                      ]);
                    }}
                  >
                    <Plus size={14} className="mr-1" /> Add Task
                  </Button>
                </div>

                <div className="space-y-3">
                  {projectTasks.map((task, index) => (
                    <div key={task.id} className="border rounded-xl p-3 space-y-3 bg-muted/10 relative">
                      <button
                        type="button"
                        onClick={() => setProjectTasks(projectTasks.filter((t) => t.id !== task.id))}
                        className="absolute right-2 top-2 text-muted-foreground hover:text-destructive p-0.5 rounded"
                      >
                        <X size={14} />
                      </button>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
                        <div className="space-y-1 sm:col-span-2">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase">Task Title</label>
                          <Input
                            placeholder="e.g. Compile reports"
                            required
                            value={task.title}
                            onChange={(e) => {
                              const newTasks = [...projectTasks];
                              newTasks[index].title = e.target.value;
                              setProjectTasks(newTasks);
                            }}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase">Priority</label>
                          <select
                            value={task.priority}
                            onChange={(e) => {
                              const newTasks = [...projectTasks];
                              newTasks[index].priority = e.target.value as any;
                              setProjectTasks(newTasks);
                            }}
                            className="flex h-8 w-full rounded-xl border bg-background px-2 text-xs focus:outline-none"
                          >
                            <option value="LOW">Low</option>
                            <option value="MEDIUM">Medium</option>
                            <option value="HIGH">High</option>
                            <option value="CRITICAL">Critical</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase">Assignee</label>
                          <select
                            value={task.assigneeId}
                            onChange={(e) => {
                              const newTasks = [...projectTasks];
                              newTasks[index].assigneeId = e.target.value;
                              setProjectTasks(newTasks);
                            }}
                            className="flex h-8 w-full rounded-xl border bg-background px-2 text-xs focus:outline-none"
                          >
                            <option value="">Unassigned</option>
                            {members.map((m) => (
                              <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                  {projectTasks.length === 0 && (
                    <div className="text-center py-6 text-xs text-muted-foreground italic border border-dashed rounded-xl">
                      No tasks added yet. These tasks will automatically populate when using this checklist.
                    </div>
                  )}
                </div>
              </div>

              {/* Form Budget & Hours */}
              <div className="grid grid-cols-2 gap-4 bg-muted/10 p-4 rounded-xl border">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Budget Limit ($)</label>
                  <NumberStepper
                    step={1}
                    min={0}
                    placeholder="e.g. 5000"
                    value={formBudget}
                    onChange={(e) => setFormBudget(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Allocated Hours</label>
                  <NumberStepper
                    step={1}
                    min={0}
                    placeholder="e.g. 120"
                    value={formAllocatedHours}
                    onChange={(e) => setFormAllocatedHours(e.target.value)}
                  />
                </div>
              </div>

              {/* Dialog Footer */}
              <DialogFooter className="pt-4 border-t mt-6 bg-background pb-2 flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsSaveTemplateOpen(true)}
                  className="text-purple-600 border-purple-200 hover:bg-purple-50"
                >
                  Save as Template
                </Button>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isPending}>
                    {isPending ? "Creating..." : "Create Project"}
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* SAVE TEMPLATE DIALOG */}
      <Dialog open={isSaveTemplateOpen} onOpenChange={setIsSaveTemplateOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Save as Template</DialogTitle>
            <DialogDescription>
              Save this checklist configuration to reuse for future operations.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveTemplate} className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Template Name</label>
              <Input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                required
                placeholder="e.g. Marketing Campaign Planning Template"
              />
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsSaveTemplateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isPending}>{isPending ? "Saving..." : "Save Template"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* TEMPLATE SELECTION DIALOG */}
      <Dialog open={isTemplateSelectOpen} onOpenChange={setIsTemplateSelectOpen}>
        <DialogContent className="sm:max-w-[850px] h-[80vh] flex flex-col overflow-hidden bg-background border-border p-0 rounded-2xl shadow-xl">
          <DialogHeader className="px-6 py-5 border-b shrink-0 bg-slate-50/50 dark:bg-zinc-900/50 z-10 sticky top-0">
            <DialogTitle className="text-xl font-extrabold tracking-tight">Select an Operational Checklist</DialogTitle>
            <DialogDescription className="text-xs mt-1 text-muted-foreground">
              Choose one of your saved custom configurations. You can set any template as default using the star icon.
            </DialogDescription>
          </DialogHeader>

          {/* Search bar inside modal */}
          <div className="px-6 pt-4 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search templates by name..."
                value={templateSearchQuery}
                onChange={(e) => setTemplateSearchQuery(e.target.value)}
                className="pl-9 h-10 rounded-xl border bg-background text-sm shadow-sm"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
            {isLoadingTemplates ? (
              <div className="flex items-center justify-center h-48">
                <span className="text-sm text-muted-foreground animate-pulse font-medium">Loading templates...</span>
              </div>
            ) : templates.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 border border-dashed rounded-2xl p-6 text-center">
                <FolderKanban className="h-8 w-8 text-muted-foreground mb-2" />
                <h3 className="font-semibold text-sm">No templates saved yet</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-[280px]">
                  Create an internal project and click "Save as Template" to add one.
                </p>
              </div>
            ) : (() => {
              const query = templateSearchQuery.toLowerCase();
              const filtered = templates.filter(t => t.name.toLowerCase().includes(query));

              if (filtered.length === 0) {
                return (
                  <div className="text-center py-16 text-sm text-muted-foreground font-medium italic border border-dashed rounded-2xl p-8">
                    No templates match "{templateSearchQuery}"
                  </div>
                );
              }

              // Sort default template to the top
              const sorted = [...filtered].sort((a, b) => {
                if (a.id === defaultTemplateId) return -1;
                if (b.id === defaultTemplateId) return 1;
                return 0;
              });

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {sorted.map((template) => {
                    const config = template.config || {};
                    const customFieldsCount = Array.isArray(config.customFields) ? config.customFields.length : 0;
                    const tasksCount = Array.isArray(config.tasks) ? config.tasks.length : 0;
                    const isPinned = pinnedTemplateIds.includes(template.id);
                    const isDefault = template.id === defaultTemplateId;

                    return (
                      <div
                        key={template.id}
                        className={`border rounded-2xl p-4.5 bg-slate-50/40 dark:bg-zinc-900/20 hover:shadow-md transition-all duration-300 flex flex-col justify-between group relative animate-in fade-in duration-200 ${
                          isDefault 
                            ? 'border-amber-400 dark:border-amber-600 bg-amber-50/5 dark:bg-amber-950/5 shadow-sm' 
                            : 'border-slate-200/60 dark:border-zinc-800/80 hover:border-purple-400'
                        }`}
                      >
                        <div className="absolute right-3 top-3 flex items-center gap-1.5">
                          {isDefault && (
                            <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[9px] font-bold py-0.5 px-1.5 rounded-lg border border-amber-200 dark:border-amber-900 mr-1.5">
                              Default
                            </Badge>
                          )}
                          <button
                            type="button"
                            onClick={(e) => handleSetDefaultTemplate(template.id, e)}
                            className="text-muted-foreground hover:text-amber-400 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                            title={isDefault ? "Remove default status" : "Set as default template"}
                          >
                            <Star className={`h-4 w-4 transition-all duration-200 ${isDefault ? "fill-amber-400 text-amber-400" : "opacity-40 group-hover:opacity-100"}`} />
                          </button>

                          <button
                            type="button"
                            onClick={(e) => handleTogglePinTemplate(template.id, e)}
                            className="text-muted-foreground hover:text-purple-600 dark:hover:text-purple-400 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                            title={isPinned ? "Unpin template" : "Pin template"}
                          >
                            <Pin className={`h-4 w-4 transition-all duration-200 ${isPinned ? "fill-purple-600 text-purple-600 dark:fill-purple-400 dark:text-purple-400 rotate-45" : "opacity-40 group-hover:opacity-100"}`} />
                          </button>

                          <button
                            type="button"
                            onClick={(e) => handleDeleteTemplate(template.id, e)}
                            className="text-muted-foreground hover:text-destructive p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 opacity-0 group-hover:opacity-100 transition-all duration-200"
                            title="Delete template"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="space-y-3.5 mb-4">
                          <h4 className="font-bold text-base text-slate-900 dark:text-white leading-tight truncate pr-28" title={template.name}>
                            {template.name}
                          </h4>
                          
                          <div className="flex flex-wrap gap-1.5">
                            <Badge variant="secondary" className="bg-purple-50 text-purple-700 dark:bg-purple-950/20 dark:text-purple-400 border border-purple-100/50 dark:border-purple-900/30 text-[10px] font-bold py-0.5 px-2">
                              {customFieldsCount} {customFieldsCount === 1 ? 'Field' : 'Fields'}
                            </Badge>
                            <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400 border border-indigo-100/50 dark:border-indigo-900/30 text-[10px] font-bold py-0.5 px-2">
                              {tasksCount} {tasksCount === 1 ? 'Task' : 'Tasks'}
                            </Badge>
                          </div>

                          <p className="text-[10px] text-muted-foreground font-semibold flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            Created: {new Date(template.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                          </p>
                        </div>

                        <Button
                          type="button"
                          onClick={() => handleUseTemplate(template)}
                          className={`w-full text-xs font-semibold h-9 rounded-xl shadow-sm transition-all duration-200 ${
                            isDefault
                              ? 'bg-amber-500 hover:bg-amber-600 text-white'
                              : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white'
                          }`}
                        >
                          Use Template
                        </Button>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          <DialogFooter className="px-6 py-4 border-t shrink-0 bg-slate-50/50 dark:bg-zinc-900/50 sticky bottom-0 z-10">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsTemplateSelectOpen(false)}
              className="rounded-xl shadow-sm text-xs font-bold"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
         {/* CREATE NEW RULE DIALOG */}
      <Dialog open={isCreateRuleOpen} onOpenChange={setIsCreateRuleOpen}>
        <DialogContent className="sm:max-w-[550px] bg-background border-border max-h-[85vh] p-0 flex flex-col overflow-hidden">
          <DialogHeader className="p-6 pb-4 border-b shrink-0">
            <DialogTitle>Create Workflow Rule</DialogTitle>
            <DialogDescription>Setup a rule to trigger actions based on criteria.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateRule} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Rule Name <span className="text-destructive">*</span></label>
                <Input
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  required
                  placeholder="e.g. Daily Progress Reminder"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Description</label>
                <Input
                  value={ruleDesc}
                  onChange={(e) => setRuleDesc(e.target.value)}
                  placeholder="Describe the automation rule behavior"
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
                      value={ruleTriggerField}
                      onChange={(e) => setRuleTriggerField(e.target.value)}
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
                      value={ruleTriggerOperator}
                      onChange={(e) => setRuleTriggerOperator(e.target.value)}
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
                      value={ruleTriggerValue}
                      onChange={(e) => setRuleTriggerValue(e.target.value)}
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
                    value={ruleAction}
                    onChange={(e) => setRuleAction(e.target.value)}
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
                  {ruleRecipients.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 dark:bg-zinc-900 border rounded-xl">
                      {ruleRecipients.map(id => {
                        const roleLabel = id === 'PROJECT_MANAGER' ? 'Project Manager' : id === 'PROJECT_OWNER' ? 'Project Owner' : id === 'ASSIGNED_USER' ? 'All Assigned Users' : '';
                        const userLabel = users.find(u => u.id === id)?.name || id;
                        const displayName = roleLabel || userLabel;
                        return (
                          <Badge key={id} variant="secondary" className="gap-1.5 pl-2 pr-1 py-0.5 rounded-lg text-[10px] font-semibold bg-background shadow-sm border border-slate-200 text-slate-800 dark:text-slate-200">
                            {displayName}
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); toggleRuleRecipient(id); }}
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
                      value={ruleRecipientSearch}
                      onChange={(e) => setRuleRecipientSearch(e.target.value)}
                      className="pl-9 pr-4 rounded-xl text-sm"
                    />
                  </div>

                  {/* Scroll Box */}
                  <div className="border rounded-2xl p-2.5 max-h-[200px] overflow-y-auto space-y-3 bg-background custom-scrollbar">
                    
                    {/* Default Roles Grid */}
                    {('project manager'.includes(ruleRecipientSearch.toLowerCase()) || 
                      'project owner'.includes(ruleRecipientSearch.toLowerCase()) || 
                      'all assigned users'.includes(ruleRecipientSearch.toLowerCase())) && (
                      <div className="space-y-1.5">
                        <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block px-1">Roles</span>
                        <div className="grid grid-cols-1 gap-2">
                          {[
                            { id: 'PROJECT_MANAGER', label: 'Project Manager (PM)', desc: 'Person leading project operations', icon: Shield },
                            { id: 'PROJECT_OWNER', label: 'Project Owner', desc: 'Organization owner or creator', icon: Crown },
                            { id: 'ASSIGNED_USER', label: 'All Assigned Users', desc: 'All members assigned to the task/project', icon: Users }
                          ].filter(role => role.label.toLowerCase().includes(ruleRecipientSearch.toLowerCase())).map(role => {
                            const isSel = ruleRecipients.includes(role.id);
                            const IconComp = role.icon;
                            return (
                              <div 
                                key={role.id} 
                                onClick={() => toggleRuleRecipient(role.id)}
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
                        {users.filter(u => 
                          u.name.toLowerCase().includes(ruleRecipientSearch.toLowerCase()) || 
                          u.email.toLowerCase().includes(ruleRecipientSearch.toLowerCase())
                        ).map(user => {
                          const isSel = ruleRecipients.includes(user.id);
                          return (
                            <div 
                              key={user.id} 
                              onClick={() => toggleRuleRecipient(user.id)}
                              className={`flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer ${
                                isSel 
                                  ? 'border-primary bg-primary/5 text-primary' 
                                  : 'border-slate-100 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-900'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-slate-200 to-slate-300 text-slate-700 dark:from-zinc-700 dark:to-zinc-800 dark:text-zinc-300 flex items-center justify-center text-xs font-extrabold shrink-0">
                                  {user.name.substring(0, 2).toUpperCase()}
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
              <Button type="button" variant="outline" onClick={() => setIsCreateRuleOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isPending}>{isPending ? "Creating..." : "Create Rule"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {/* DELETE CONFIRMATION DIALOG */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-[420px] bg-background border-border p-6 flex flex-col gap-4">
          <div className="flex items-center gap-3 text-red-600">
            <div className="p-2 bg-red-50 dark:bg-red-950/30 rounded-full">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <DialogHeader className="p-0 border-none shrink-0 shadow-none text-left">
              <DialogTitle className="text-lg font-bold text-foreground">
                {projectToDelete ? "Delete Internal Project" : "Delete Selected Projects"}
              </DialogTitle>
            </DialogHeader>
          </div>

          <div className="text-sm text-muted-foreground leading-relaxed">
            {projectToDelete ? (
              <>
                Are you sure you want to delete this internal project? This action cannot be undone and will permanently delete all related tasks.
              </>
            ) : (
              <>
                Are you sure you want to delete the <span className="font-semibold text-foreground">{selectedProjectIds.length}</span> selected internal projects? This action cannot be undone and will permanently delete all related tasks for these projects.
              </>
            )}
          </div>

          <DialogFooter className="pt-2 border-t flex flex-row justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsDeleteConfirmOpen(false);
                setProjectToDelete(null);
              }}
              className="rounded-xl px-4 py-2 text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isPending}
              onClick={executeDeletion}
              className="rounded-xl px-4 py-2 text-xs font-semibold bg-red-600 hover:bg-red-700"
            >
              {isPending ? "Deleting..." : "Permanently Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
