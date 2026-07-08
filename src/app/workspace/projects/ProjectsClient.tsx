"use client";

import React, { useState, useTransition, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  createProjectAction,
  deleteProjectAction,
  quickCreateClientAction,
  updateProjectStatusAction,
  createProjectTemplateAction,
  getProjectTemplatesAction,
  deleteProjectTemplateAction,
} from "@/app/actions/projects";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { getRulesAction, createRuleAction } from "@/app/actions/rules";
import { DndContext, DragEndEvent, useDraggable, useDroppable, DragOverlay } from "@dnd-kit/core";

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

const getStatusColor = (status: string) => {
  switch (status) {
    case "PLANNING":
      return "bg-[#fbfaf7]0/10 text-slate-500 border-slate-500/20";
    case "IN_PROGRESS":
      return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    case "ON_HOLD":
      return "bg-amber-500/10 text-amber-500 border-amber-500/20";
    case "COMPLETE":
      return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
    default:
      return "bg-[#fbfaf7]0/10 text-slate-500 border-slate-500/20";
  }
};

const getProjectMembers = (project: any) => {
  const membersMap = new Map();
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
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "LOW":
      return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
    case "MEDIUM":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    case "HIGH":
      return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
    case "CRITICAL":
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-bold";
    default:
      return "bg-slate-100 text-slate-600";
  }
};

function KanbanColumn({ status, title, count, projectStatuses, children }: any) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  });

  const getStatusBorderColor = (statusId: string) => {
    const statusObj = projectStatuses?.find((s: any) => s.id === statusId);
    if (statusObj && statusObj.color) {
      return { borderTopColor: statusObj.color };
    }
    return { borderTopColor: '#94a3b8' }; // default slate-400
  };

  return (
    <div ref={setNodeRef} className={`flex flex-col min-w-[340px] max-w-[340px] rounded-3xl border border-t-[4px] shadow-sm backdrop-blur-xl p-4 transition-all duration-300 ${isOver ? 'bg-muted/80 shadow-md scale-[1.01]' : 'bg-muted/30 hover:bg-muted/40'}`} style={getStatusBorderColor(status)}>
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2.5">
          <h3 className="font-bold text-sm tracking-wide uppercase text-foreground/80">{title}</h3>
          <Badge variant="secondary" className="text-[11px] font-bold h-6 px-2.5 bg-background rounded-full shadow-sm">
            {count}
          </Badge>
        </div>
      </div>
      <div className="flex flex-col gap-4 overflow-y-auto custom-scrollbar pr-2 flex-1">
        {children}
      </div>
    </div>
  );
}

function KanbanCard({ project, currentUser, handleDelete }: any) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: project.id,
    data: project,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  const priorityHex = getPriorityColor(project.priority).includes("red") ? "#ef4444" : getPriorityColor(project.priority).includes("orange") ? "#f97316" : getPriorityColor(project.priority).includes("blue") ? "#3b82f6" : "#cbd5e1";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-background border border-border/50 rounded-2xl p-5 shadow-sm hover:shadow-xl hover:border-primary/40 hover:-translate-y-1 transition-all duration-300 group flex flex-col gap-4 cursor-grab active:cursor-grabbing relative overflow-hidden ${isDragging ? 'opacity-40 scale-95 z-50 shadow-2xl' : ''}`}
      {...attributes}
      {...listeners}
    >
      {/* Decorative Gradient Background on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      
      {/* Dynamic Priority Indicator */}
      <div className="absolute top-0 left-0 w-1.5 h-full rounded-l-2xl transition-all duration-300 group-hover:w-2" style={{ backgroundColor: priorityHex }} />
      
      <div className="flex justify-between items-start gap-3 pl-2 relative z-10">
        <Link href={`/workspace/projects/${project.id}`} className="font-bold text-[15px] leading-tight text-foreground/90 group-hover:text-primary transition-colors line-clamp-2" onPointerDown={(e) => e.stopPropagation()}>
          {project.name}
          {project.isRepeated && (
            <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/50 py-0 px-1.5 font-semibold inline-flex items-center gap-1 ml-1.5 align-middle">
              <Repeat size={8} /> Recurring
            </Badge>
          )}
        </Link>
        {currentUser.role === "OWNER" && (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 shrink-0" onPointerDown={(e) => e.stopPropagation()}>
            <Link href={`/workspace/projects/${project.id}?edit=true`} className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg cursor-pointer">
              <Edit2 size={16} />
            </Link>
            <div onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(project.id); }} className="p-1.5 hover:bg-destructive/10 text-destructive/70 hover:text-destructive rounded-lg cursor-pointer">
              <Trash2 size={16} />
            </div>
          </div>
        )}
      </div>
      
      {project.client && currentUser.role !== "MEMBER" && (
        <span className="text-[12px] font-medium text-muted-foreground pl-2 truncate relative z-10 flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
          {project.client.name}
        </span>
      )}

      <div className="flex items-center gap-2 pl-2 relative z-10">
        <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-sm" style={{ backgroundColor: `${priorityHex}20`, color: priorityHex }}>
          {project.priority}
        </span>
        {project.totalAllocatedHours ? (
          <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
            <Clock size={11} /> {project.totalAllocatedHours} hrs
          </span>
        ) : null}
      </div>
      
      <div className="flex justify-between items-end mt-auto pt-3 pl-2 border-t border-border/40 relative z-10">
        <div className="flex -space-x-2 overflow-hidden py-1">
          {project.projectManager && (
            <Avatar className="h-7 w-7 border-2 border-background ring-2 ring-purple-500/20 z-10 shadow-sm transition-transform group-hover:scale-110 duration-300">
              <AvatarFallback className="bg-gradient-to-br from-purple-100 to-purple-200 text-purple-700 text-[10px] font-bold">{project.projectManager.name.substring(0,2).toUpperCase()}</AvatarFallback>
            </Avatar>
          )}
          {getProjectMembers(project).slice(0, 3).map((u: any) => (
            <Avatar key={u.id} className="h-7 w-7 border-2 border-background shadow-sm transition-transform group-hover:scale-110 duration-300" title={u.name}>
              <AvatarFallback className="bg-gradient-to-br from-primary/10 to-primary/20 text-primary text-[10px] font-bold">{u.name.substring(0,2).toUpperCase()}</AvatarFallback>
            </Avatar>
          ))}
          {getProjectMembers(project).length > 3 && (
            <div className="h-7 w-7 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground shadow-sm z-10">
              +{getProjectMembers(project).length - 3}
            </div>
          )}
        </div>
        
        <div className={`text-[11px] font-medium flex items-center gap-1.5 px-2.5 py-1 rounded-full shadow-sm ${project.isOngoing ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'}`}>
          {project.isOngoing ? <Clock size={12} className="text-emerald-500 animate-pulse" /> : <Calendar size={12} />}
          {formatDate(project.startDate)} - {project.isOngoing ? "Ongoing" : project.endDate ? formatDate(project.endDate) : "No Date"}
        </div>
      </div>
    </div>
  );
}

export default function ProjectsClient({
  initialProjects,
  users,
  currentUser,
  projectStatuses = [],
  taskStatuses = []
}: {
  initialProjects: any[];
  users: any[];
  currentUser: any;
  projectStatuses?: any[];
  taskStatuses?: any[];
}) {
  const [projects, setProjects] = useState(initialProjects);
  const [isPending, startTransition] = useTransition();

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Modal States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isQuickClientOpen, setIsQuickClientOpen] = useState(false);

  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setIsCreateOpen(true);
      router.replace('/workspace/projects');
    }
  }, [searchParams, router]);
  // Form States
  const [isOngoing, setIsOngoing] = useState(false);

  type DraftTask = {
    id: string;
    title: string;
    description: string;
    status: string;
    priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    assigneeId: string;
  };
  const [projectTasks, setProjectTasks] = useState<DraftTask[]>([]);
  const [customFields, setCustomFields] = useState<
    { name: string; type: string; value: string }[]
  >([]);
  const [description, setDescription] = useState("");
  const [viewMode, setViewMode] = useState<"TABLE" | "KANBAN" | "LIST">("TABLE");

  // Form Control States for Project Creation
  const [formName, setFormName] = useState("");
  const [formClientId, setFormClientId] = useState("");
  const [formPMId, setFormPMId] = useState("");
  const [formStatusId, setFormStatusId] = useState("");
  const [formPriority, setFormPriority] = useState("MEDIUM");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [formBudget, setFormBudget] = useState("");
  const [formAllocatedHours, setFormAllocatedHours] = useState("");
  const [formNotes, setFormNotes] = useState("");

  const [isRepeatEnabled, setIsRepeatEnabled] = useState(false);
  const [repeatFrequency, setRepeatFrequency] = useState<"DAILY" | "WEEKLY" | "MONTHLY">("DAILY");

  // Template Management States
  const [isTemplateSelectOpen, setIsTemplateSelectOpen] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [templateSearchQuery, setTemplateSearchQuery] = useState("");
  const [pinnedTemplateIds, setPinnedTemplateIds] = useState<string[]>([]);
  const pinnedTemplates = React.useMemo(() => {
    return templates.filter((t) => pinnedTemplateIds.includes(t.id));
  }, [templates, pinnedTemplateIds]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [isSaveTemplateOpen, setIsSaveTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [defaultTemplateId, setDefaultTemplateId] = useState<string | null>(null);

  // Rule States
  const [rules, setRules] = useState<any[]>([]);
  const [attachedRuleIds, setAttachedRuleIds] = useState<string[]>([]);
  const [isCreateRuleOpen, setIsCreateRuleOpen] = useState(false);

  // Rule Form States
  const [ruleFormName, setRuleFormName] = useState("");
  const [ruleFormDescription, setRuleFormDescription] = useState("");
  const [ruleFormTriggerField, setRuleFormTriggerField] = useState("Status");
  const [ruleFormTriggerOperator, setRuleFormTriggerOperator] = useState("Equals");
  const [ruleFormTriggerValue, setRuleFormTriggerValue] = useState("");
  const [ruleFormActionType, setRuleFormActionType] = useState("In-app Notification");
  const [ruleFormRecipients, setRuleFormRecipients] = useState<string[]>([]);
  const [ruleFormRecipientSearch, setRuleFormRecipientSearch] = useState("");

  const fetchRules = async () => {
    const res = await getRulesAction();
    if (res.success && res.rules) {
      setRules(res.rules);
    }
  };

  useEffect(() => {
    if (isCreateOpen) {
      fetchRules();
    }
  }, [isCreateOpen]);

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
        triggerField: ruleFormTriggerField,
        triggerOperator: ruleFormTriggerOperator,
        triggerValue: ruleFormTriggerValue,
        actionType: ruleFormActionType,
        actionRecipients: ruleFormRecipients,
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
        setRuleFormTriggerField("Status");
        setRuleFormTriggerOperator("Equals");
        setRuleFormTriggerValue("");
        setRuleFormActionType("In-app Notification");
        setRuleFormRecipients([]);
        setRuleFormRecipientSearch("");
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

  const fetchTemplates = async () => {
    setIsLoadingTemplates(true);
    try {
      const res = await getProjectTemplatesAction();
      if (res.success && res.templates) {
        setTemplates(res.templates);
      } else {
        toast.error(res.error || "Failed to load templates");
      }
    } catch (e) {
      toast.error("Failed to load templates");
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  useEffect(() => {
    if (isTemplateSelectOpen) {
      fetchTemplates();
    }
  }, [isTemplateSelectOpen]);

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName.trim()) {
      toast.error("Please enter a template name");
      return;
    }

    const config = {
      name: formName,
      clientId: formClientId || undefined,
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
      tasks: projectTasks.map((t) => ({
        title: t.title,
        description: t.description,
        priority: t.priority,
        statusId: t.status || undefined,
        assigneeIds: t.assigneeId ? [t.assigneeId] : [],
      })),
      attachedRuleIds,
      isRepeatEnabled,
      repeatFrequency,
    };

    startTransition(async () => {
      const res = await createProjectTemplateAction(templateName.trim(), config);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Template saved successfully");
        setIsSaveTemplateOpen(false);
        setTemplateName("");
      }
    });
  };

  const handleDeleteTemplate = async (templateId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this template?")) return;
    try {
      const res = await deleteProjectTemplateAction(templateId);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Template deleted");
        setTemplates(templates.filter((t) => t.id !== templateId));
        // Remove from pinned list if deleted
        setPinnedTemplateIds((prev) => {
          const next = prev.filter((id) => id !== templateId);
          localStorage.setItem("omniwork_pinned_templates", JSON.stringify(next));
          return next;
        });
      }
    } catch (err) {
      toast.error("Failed to delete template");
    }
  };

  const handleSetDefaultTemplate = (templateId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newDefault = defaultTemplateId === templateId ? null : templateId;
    setDefaultTemplateId(newDefault);
    if (newDefault) {
      localStorage.setItem("omniwork_default_project_template_id", newDefault);
      toast.success("Template set as default");
    } else {
      localStorage.removeItem("omniwork_default_project_template_id");
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
      localStorage.setItem("omniwork_pinned_templates", JSON.stringify(next));
      return next;
    });
  };

  const handleUseTemplate = (template: any) => {
    const config = template.config;
    if (!config) return;

    setFormName(config.name || "");
    setFormClientId(config.clientId || "");
    setFormPMId(config.projectManagerId || "");
    setFormStatusId(config.statusId || "");
    setFormPriority(config.priority || "MEDIUM");
    
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

    setIsRepeatEnabled(config.isRepeatEnabled || false);
    setRepeatFrequency(config.repeatFrequency || "DAILY");

    setIsTemplateSelectOpen(false);
    setIsCreateOpen(true);
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
    setFormClientId("");
    setFormPMId("");
    setFormStatusId("");
    setFormPriority("MEDIUM");
    setFormStartDate("");
    setFormEndDate("");
    setFormBudget("");
    setFormAllocatedHours("");
    setFormNotes("");
    setDescription("");
    setProjectTasks([]);
    setCustomFields([]);
    setAttachedRuleIds([]);
    setIsCreateOpen(true);
  };

  useEffect(() => {
    const savedView = localStorage.getItem("omniwork_project_view");
    if (savedView === "TABLE" || savedView === "KANBAN" || savedView === "LIST") {
      setViewMode(savedView);
    }
    const savedPinned = localStorage.getItem("omniwork_pinned_templates");
    if (savedPinned) {
      try {
        setPinnedTemplateIds(JSON.parse(savedPinned));
      } catch (e) {}
    }
    const savedDefault = localStorage.getItem("omniwork_default_project_template_id");
    if (savedDefault) {
      setDefaultTemplateId(savedDefault);
    }
    fetchTemplates();
  }, []);

  const handleSetViewMode = (mode: "TABLE" | "KANBAN" | "LIST") => {
    setViewMode(mode);
    localStorage.setItem("omniwork_project_view", mode);
  };

  // DND State
  const [confirmStatusModal, setConfirmStatusModal] = useState<{
    isOpen: boolean;
    projectId: string | null;
    projectName: string;
    newStatus: string | null;
    newStatusName?: string | null;
  }>({ isOpen: false, projectId: null, projectName: "", newStatus: null, newStatusName: null });
  const [activeDragProject, setActiveDragProject] = useState<any>(null);

  const clients = users.filter(
    (u) => u.role === "CLIENT" && u.status === "ACTIVE",
  );
  const members = users.filter(
    (u) => u.role === "MEMBER" && u.status === "ACTIVE",
  );

  // Filtered Projects
  const filteredProjects = projects.filter((p) => {
    const matchesSearch = p.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || p.status?.name === statusFilter || p.status?.id === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PLANNING":
        return "bg-[#fbfaf7]0/10 text-slate-500 border-slate-500/20";
      case "IN_PROGRESS":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "ON_HOLD":
        return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "COMPLETE":
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      default:
        return "bg-[#fbfaf7]0/10 text-slate-500 border-slate-500/20";
    }
  };

  const handleDragStart = (e: any) => {
    setActiveDragProject(e.active.data.current);
  };

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveDragProject(null);
    const { active, over } = e;
    
    if (!over) return;
    
    const projectId = active.id as string;
    const project = projects.find(p => p.id === projectId);
    const newStatus = over.id as string;

    if (project && project.statusId !== newStatus) {
      const statusObj = projectStatuses?.find((s: any) => s.id === newStatus);
      setConfirmStatusModal({
        isOpen: true,
        projectId,
        projectName: project.name,
        newStatus,
        newStatusName: statusObj?.name || newStatus
      });
    }
  };

  const handleConfirmStatusChange = () => {
    if (!confirmStatusModal.projectId || !confirmStatusModal.newStatus) return;
    
    const { projectId, newStatus, newStatusName } = confirmStatusModal;
    
    startTransition(async () => {
      // Optimistic update
      setProjects(projects.map(p => p.id === projectId ? { ...p, statusId: newStatus } : p));
      setConfirmStatusModal({ isOpen: false, projectId: null, projectName: "", newStatus: null, newStatusName: null });
      
      const res = await updateProjectStatusAction(projectId, newStatus as any);
      if (res.error) {
        toast.error(res.error);
        // Revert optimistic update
        router.refresh();
      } else {
        toast.success(`Project moved to ${newStatusName}`);
      }
    });
  };

  const handleCreateProject = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (isRepeatEnabled && (!formEndDate || isOngoing)) {
      toast.error("An End Date is required to schedule repeated projects.");
      return;
    }

    const data = {
      name: formName,
      clientId: formClientId || undefined,
      projectManagerId: formPMId || undefined,
      description: description,
      statusId: formStatusId || undefined,
      priority: formPriority as any,
      startDate: formStartDate,
      endDate: formEndDate,
      isOngoing,
      projectBudget: formBudget ? Number(formBudget) : undefined,
      totalAllocatedHours: formAllocatedHours ? Number(formAllocatedHours) : undefined,
      notes: formNotes,
      assigneeIds: [],
      customFields,
      repeatSettings: {
        enabled: isRepeatEnabled,
        frequency: repeatFrequency,
      },
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
      const res = await createProjectAction(data);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Project created successfully");
        setIsCreateOpen(false);
        setProjectTasks([]);
        setCustomFields([]);
        setFormName("");
        setFormClientId("");
        setFormPMId("");
        setFormStatusId("");
        setFormPriority("MEDIUM");
        setFormStartDate("");
        setFormEndDate("");
        setFormBudget("");
        setFormAllocatedHours("");
        setFormNotes("");
        setDescription("");
        setIsRepeatEnabled(false);
        setRepeatFrequency("DAILY");
        setAttachedRuleIds([]);
        router.refresh();
      }
    });
  };

  const handleQuickCreateClient = async (
    e: React.FormEvent<HTMLFormElement>,
  ) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await quickCreateClientAction(
        formData.get("name") as string,
        formData.get("email") as string
      );
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Client created successfully");
        setIsQuickClientOpen(false);
        router.refresh(); // Refresh to update client list
      }
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this project?")) return;
    startTransition(async () => {
      const res = await deleteProjectAction(id);
      if (res.error) toast.error(res.error);
      else {
        toast.success("Project deleted");
        setProjects(projects.filter((p) => p.id !== id));
      }
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FolderKanban className="text-primary" size={28} />
            Projects
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage your organization's projects and team assignments.
          </p>
        </div>

        {currentUser.role === "OWNER" && (
          <div className="flex items-center -space-x-px w-full sm:w-auto shadow-md rounded-xl overflow-hidden">
            <Button
              onClick={handleOpenCreateProject}
              className="rounded-r-none h-10 px-4 flex-1 sm:flex-initial"
            >
              <Plus className="mr-2 h-4 w-4" /> New Project
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="rounded-l-none border-l border-white/20 px-2.5 h-10 flex-none">
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 bg-white dark:bg-[#1f1f1f] rounded-xl shadow-lg border border-black/5 dark:border-white/10 p-1.5 z-50">
                <DropdownMenuItem
                  onClick={handleOpenCreateProject}
                  className="cursor-pointer rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted focus:bg-muted"
                >
                  Create New Project
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setIsRepeatEnabled(false);
                    setIsTemplateSelectOpen(true);
                  }}
                  className="cursor-pointer rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted focus:bg-muted"
                >
                  Use Existing Template
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setIsRepeatEnabled(true);
                    setIsOngoing(false);
                    setFormName("");
                    setFormClientId("");
                    setFormPMId("");
                    setFormStatusId("");
                    setFormPriority("MEDIUM");
                    setFormStartDate("");
                    setFormEndDate("");
                    setFormBudget("");
                    setFormAllocatedHours("");
                    setFormNotes("");
                    setDescription("");
                    setProjectTasks([]);
                    setCustomFields([]);
                    setIsCreateOpen(true);
                  }}
                  className="cursor-pointer rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted focus:bg-muted"
                >
                  Create Repeated Project
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
                        className="cursor-pointer rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted focus:bg-muted flex items-center gap-2"
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
        )}
      </div>

      {/* Filters & Views */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 p-1">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            className="pl-9 bg-background shadow-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex bg-muted/50 p-1 rounded-xl shadow-sm border">
            <button
              onClick={() => handleSetViewMode("TABLE")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                viewMode === "TABLE"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <TableIcon size={14} /> Table
            </button>
            <button
              onClick={() => handleSetViewMode("KANBAN")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                viewMode === "KANBAN"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutGrid size={14} /> Kanban
            </button>
            <button
              onClick={() => handleSetViewMode("LIST")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                viewMode === "LIST"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ListIcon size={14} /> List
            </button>
          </div>
          
          <select
            className="flex h-9 rounded-xl border bg-background px-3 text-sm shadow-sm focus:ring-1 focus:ring-ring min-w-[140px]"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Statuses</option>
            {projectStatuses.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Projects Views */}
      {viewMode === "TABLE" && (
      <div className="bg-background rounded-xl border shadow-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="w-[300px]">Project Details</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Timeline</TableHead>
              <TableHead>Team</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProjects.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-48 text-center text-muted-foreground"
                >
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <FolderKanban size={40} className="opacity-20" />
                    <p>No projects found.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredProjects.map((p: any) => (
                <TableRow
                  key={p.id}
                  className="group hover:bg-muted/40 transition-colors"
                >
                  <TableCell>
                    <div className="flex flex-col">
                      <Link
                        href={`/workspace/projects/${p.id}`}
                        className="font-semibold text-foreground hover:text-primary transition-colors flex items-center gap-2"
                      >
                        {p.name}
                        {p.isRepeated && (
                          <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/50 py-0 px-1.5 font-semibold flex items-center gap-1">
                            <Repeat size={8} /> Recurring
                          </Badge>
                        )}
                      </Link>
                      {p.client && currentUser.role !== "MEMBER" && (
                        <span className="text-xs text-muted-foreground mt-1">
                          Client: {p.client.name}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="shadow-sm border-transparent text-white"
                      style={{ backgroundColor: p.status?.color || '#cccccc' }}
                    >
                      {p.status?.name || "No Status"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={`${getPriorityColor(p.priority)} border-transparent`}
                    >
                      {p.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} /> {formatDate(p.startDate)}
                      </span>
                      {p.isOngoing ? (
                        <span className="flex items-center gap-1 text-emerald-600">
                          <Clock size={12} /> Ongoing
                        </span>
                      ) : p.endDate ? (
                        <span className="flex items-center gap-1">
                          <ArrowRight size={12} /> {formatDate(p.endDate)}
                        </span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex -space-x-2 overflow-hidden">
                      {p.projectManager && (
                        <div
                          title={`PM: ${p.projectManager.name}`}
                          className="relative z-10 border-2 border-background rounded-full ring-1 ring-purple-500"
                        >
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className="bg-purple-100 text-purple-700 text-[10px]">
                              {p.projectManager.name.substring(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                      )}
                      {getProjectMembers(p).map((u: any) => (
                        <div
                          key={u.id}
                          title={u.name}
                          className="relative border-2 border-background rounded-full"
                        >
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                              {u.name.substring(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      asChild
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Link href={`/workspace/projects/${p.id}`}>
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                    {currentUser.role === "OWNER" && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="opacity-0 group-hover:opacity-100 transition-opacity ml-1"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/workspace/projects/${p.id}`}>
                              View Project
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive cursor-pointer"
                            onClick={() => handleDelete(p.id)}
                          >
                            Delete Project
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      )}

      {viewMode === "KANBAN" && (
        <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar h-[calc(100vh-220px)] animate-in fade-in zoom-in-95 duration-200">
            {projectStatuses.map((status) => {
              const statusProjects = filteredProjects.filter(p => p.statusId === status.id);
              return (
                <KanbanColumn key={status.id} status={status.id} title={status.name} count={statusProjects.length} projectStatuses={projectStatuses}>
                  {statusProjects.map(p => (
                    <KanbanCard key={p.id} project={p} currentUser={currentUser} handleDelete={handleDelete} />
                  ))}
                  {statusProjects.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-24 border-2 border-dashed rounded-xl text-muted-foreground text-xs bg-background/50">
                      No projects
                    </div>
                  )}
                </KanbanColumn>
              );
            })}
          </div>
          <DragOverlay>
            {activeDragProject ? (
              <div className="opacity-80 rotate-2 scale-105 transition-transform cursor-grabbing">
                <KanbanCard project={activeDragProject} currentUser={currentUser} handleDelete={handleDelete} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {viewMode === "LIST" && (
        <div className="flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
          {filteredProjects.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center space-y-3 bg-background rounded-xl border border-dashed">
              <FolderKanban size={40} className="opacity-20" />
              <p className="text-muted-foreground text-sm">No projects found.</p>
            </div>
          ) : (
            filteredProjects.map(p => (
              <div key={p.id} className="bg-background border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row gap-5 items-start sm:items-center relative overflow-hidden group">
                <div className="absolute left-0 top-0 w-1.5 h-full" style={{ backgroundColor: getPriorityColor(p.priority).includes("red") ? "#ef4444" : getPriorityColor(p.priority).includes("orange") ? "#f97316" : getPriorityColor(p.priority).includes("blue") ? "#3b82f6" : "#cbd5e1" }} />
                
                <div className="flex-1 min-w-0 pl-2">
                  <div className="flex items-center gap-3 mb-1">
                    <Link href={`/workspace/projects/${p.id}`} className="text-lg font-bold text-foreground hover:text-primary transition-colors truncate">
                      {p.name}
                    </Link>
                    {p.isRepeated && (
                      <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/50 py-0 px-1.5 font-semibold flex items-center gap-1">
                        <Repeat size={8} /> Recurring
                      </Badge>
                    )}
                    <Badge variant="outline" className="border-transparent font-medium text-white" style={{ backgroundColor: p.status?.color || '#cccccc' }}>{p.status?.name || "No Status"}</Badge>
                  </div>
                  {p.description ? (
                    <div className="text-sm text-muted-foreground line-clamp-2 max-w-3xl" dangerouslySetInnerHTML={{ __html: p.description }} />
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No description provided.</p>
                  )}
                  {p.client && currentUser.role !== "MEMBER" && <p className="text-xs text-muted-foreground mt-2 font-medium">Client: {p.client.name}</p>}
                </div>
                
                <div className="flex items-center gap-6 sm:ml-auto w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
                  <div className="flex flex-col gap-1 min-w-[120px]">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Timeline</span>
                    <div className="flex flex-col gap-0.5 text-xs font-medium">
                      <span className="flex items-center gap-1.5 text-foreground"><Calendar size={12} className="text-muted-foreground" /> {formatDate(p.startDate)}</span>
                      {p.isOngoing ? (
                        <span className="flex items-center gap-1.5 text-emerald-600"><Clock size={12} /> Ongoing</span>
                      ) : p.endDate ? (
                        <span className="flex items-center gap-1.5 text-foreground"><ArrowRight size={12} className="text-muted-foreground" /> {formatDate(p.endDate)}</span>
                      ) : null}
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-1 min-w-[120px]">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Team</span>
                    <div className="flex -space-x-2 overflow-hidden py-1">
                      {p.projectManager && (
                        <Avatar className="h-8 w-8 border-2 border-background ring-2 ring-purple-500 z-10" title={`PM: ${p.projectManager.name}`}>
                          <AvatarFallback className="bg-purple-100 text-purple-700 text-xs">{p.projectManager.name.substring(0,2)}</AvatarFallback>
                        </Avatar>
                      )}
                      {getProjectMembers(p).slice(0, 4).map((u: any) => (
                        <Avatar key={u.id} className="h-8 w-8 border-2 border-background" title={u.name}>
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">{u.name.substring(0,2)}</AvatarFallback>
                        </Avatar>
                      ))}
                      {getProjectMembers(p).length > 4 && (
                        <div className="h-8 w-8 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[10px] font-medium text-muted-foreground z-10">
                          +{getProjectMembers(p).length - 4}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 pl-4 border-l border-border/50">
                    <Button variant="outline" size="sm" asChild className="h-9 font-medium shadow-sm">
                      <Link href={`/workspace/projects/${p.id}`}>View</Link>
                    </Button>
                    {currentUser.role === "OWNER" && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-9 w-9">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="text-destructive focus:text-destructive cursor-pointer" onClick={() => handleDelete(p.id)}>
                            <Trash2 className="mr-2 h-4 w-4" /> Delete Project
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Create Project Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent
          className="sm:max-w-[700px] h-[90vh] p-0 flex flex-col overflow-hidden"
          onInteractOutside={(e) => {
            if (isQuickClientOpen) e.preventDefault();
          }}
        >
          <DialogHeader className="sticky top-0 bg-background z-10 px-6 py-4 border-b shrink-0 shadow-sm flex flex-row justify-between items-center gap-4">
            <div className="space-y-1">
              <DialogTitle>Create New Project</DialogTitle>
              <DialogDescription>
                Setup a new project workspace, assign a PM, and configure
                timelines.
              </DialogDescription>
            </div>
            
            {/* Rules Selector in Header */}
            <div className="flex items-center gap-2 shrink-0">
              {attachedRuleIds.length > 0 && (
                <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 border border-indigo-100 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-900/50 text-[10px] font-bold px-2 py-0.5 rounded-lg">
                  {attachedRuleIds.length} Rule{attachedRuleIds.length > 1 ? 's' : ''} Attached
                </Badge>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" size="sm" className="h-9 rounded-xl border bg-background px-3 text-xs font-semibold flex items-center gap-1.5 shadow-sm">
                    Select Rules... <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-[#1f1f1f] rounded-xl shadow-lg border border-black/5 dark:border-white/10 p-1.5 z-50">
                  {rules.filter(r => r.isActive).length === 0 ? (
                    <div className="p-2.5 text-center text-xs text-muted-foreground">
                      No active rules
                    </div>
                  ) : (
                    rules
                      .filter((r) => r.isActive)
                      .map((r) => {
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
                            className="cursor-pointer rounded-lg px-2.5 py-2 text-xs flex items-center justify-between hover:bg-muted focus:bg-muted"
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
                    className="cursor-pointer rounded-lg px-2.5 py-2 text-xs text-primary hover:bg-primary/5 focus:bg-primary/5 font-semibold flex items-center gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" /> Create New Rule
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
            <form onSubmit={handleCreateProject} className="space-y-6 pb-6">

              {/* Basics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <label className="text-sm font-medium">
                  Project Name <span className="text-destructive">*</span>
                </label>
                <Input
                  name="name"
                  required
                  placeholder="e.g. Website Redesign"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <label className="text-sm font-medium">Description</label>
                <RichTextEditor
                  content={description}
                  onChange={setDescription}
                  placeholder="Brief overview of the project..."
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-muted/30 p-4 rounded-lg border">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium">Client</label>
                  <button
                    type="button"
                    onClick={() => setIsQuickClientOpen(true)}
                    className="text-[10px] font-semibold text-primary hover:underline flex items-center"
                  >
                    <Plus size={10} className="mr-0.5" /> Quick Add
                  </button>
                </div>
                <select
                  name="clientId"
                  value={formClientId}
                  onChange={(e) => setFormClientId(e.target.value)}
                  className="flex h-9 w-full rounded-xl border bg-background px-3 text-sm focus:ring-1 focus:ring-ring"
                >
                  <option value="">No Client (Internal)</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.email})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Project Manager{" "}
                  <span className="text-xs text-muted-foreground font-normal">
                    (Members only)
                  </span>
                </label>
                <select
                  name="projectManagerId"
                  value={formPMId}
                  onChange={(e) => setFormPMId(e.target.value)}
                  className="flex h-9 w-full rounded-xl border bg-background px-3 text-sm focus:ring-1 focus:ring-ring"
                >
                  <option value="">Unassigned</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Configuration */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <select
                  name="status"
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
                  name="priority"
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
            <div className="grid grid-cols-2 gap-4 bg-muted/30 p-4 rounded-lg border">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Start Date <span className="text-destructive">*</span>
                </label>
                <Input
                  name="startDate"
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
                      id="ongoing"
                      checked={isOngoing}
                      onChange={(e) => setIsOngoing(e.target.checked)}
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <label
                      htmlFor="ongoing"
                      className="text-xs text-muted-foreground cursor-pointer"
                    >
                      Ongoing
                    </label>
                  </div>
                </div>
                {!isOngoing ? (
                  <Input
                    name="endDate"
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
                  <p className="text-xs text-muted-foreground">
                    Automatically create duplicate projects based on frequency.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isRepeatEnabled}
                  onClick={() => {
                    const newVal = !isRepeatEnabled;
                    setIsRepeatEnabled(newVal);
                    if (newVal) {
                      setIsOngoing(false);
                    }
                  }}
                  className={`${
                    isRepeatEnabled ? "bg-purple-600" : "bg-zinc-200 dark:bg-zinc-800"
                  } relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2`}
                >
                  <span
                    aria-hidden="true"
                    className={`${
                      isRepeatEnabled ? "translate-x-5" : "translate-x-0"
                    } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out`}
                  />
                </button>
              </div>

              {isRepeatEnabled && (
                <div className="grid grid-cols-1 gap-4 pt-4 border-t border-purple-100/50 dark:border-purple-900/20 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground tracking-wide uppercase">Repeat Frequency</label>
                    <div className="relative">
                      <select
                        value={repeatFrequency}
                        onChange={(e) => setRepeatFrequency(e.target.value as any)}
                        className="flex h-10 w-full appearance-none rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 cursor-pointer pr-10"
                      >
                        <option value="DAILY">Daily</option>
                        <option value="WEEKLY">Weekly</option>
                        <option value="MONTHLY">Monthly</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Resources */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Project Budget ($){" "}
                  <span className="text-xs text-muted-foreground font-normal">
                    (Optional)
                  </span>
                </label>
                <Input
                  name="projectBudget"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g. 5000"
                  value={formBudget}
                  onChange={(e) => setFormBudget(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Total Allocated Hours{" "}
                  <span className="text-destructive">*</span>
                </label>
                <Input
                  name="totalAllocatedHours"
                  type="number"
                  step="0.1"
                  min="0"
                  required
                  placeholder="e.g. 120"
                  value={formAllocatedHours}
                  onChange={(e) => setFormAllocatedHours(e.target.value)}
                />
              </div>
            </div>



            {/* Custom Fields */}
            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  Custom Fields{" "}
                  <span className="text-xs text-muted-foreground font-normal">
                    (Optional)
                  </span>
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCustomFields([
                      ...customFields,
                      {
                        name: "",
                        type: "text",
                        value: "",
                      },
                    ])
                  }
                  className="h-8 text-xs"
                >
                  <Plus className="mr-1 h-3 w-3" /> Add Field
                </Button>
              </div>

              {customFields.length > 0 && (
                <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1 custom-scrollbar">
                  {customFields.map((field, index) => (
                    <div
                      key={index}
                      className="p-3 border rounded-xl bg-muted/20 space-y-3 relative group"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setCustomFields(
                            customFields.filter((_, i) => i !== index)
                          )
                        }
                        className="absolute right-2 top-2 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-muted-foreground">Field Name</label>
                          <Input
                            placeholder="e.g. Skype ID, Website"
                            value={field.name}
                            onChange={(e) => {
                              const newFields = [...customFields];
                              newFields[index].name = e.target.value;
                              setCustomFields(newFields);
                            }}
                            className="h-8 text-xs bg-background"
                            required
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-muted-foreground">Field Type</label>
                          <select
                            value={field.type}
                            onChange={(e) => {
                              const newFields = [...customFields];
                              newFields[index].type = e.target.value;
                              newFields[index].value = "";
                              setCustomFields(newFields);
                            }}
                            className="flex h-8 w-full rounded-xl border bg-background px-2 text-xs focus:ring-1 focus:ring-ring"
                          >
                            <option value="text">Text</option>
                            <option value="number">Number</option>
                            <option value="url">URL</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Value</label>
                        <Input
                          type={field.type === "number" ? "number" : "text"}
                          placeholder={
                            field.type === "url"
                              ? "https://example.com"
                              : field.type === "number"
                              ? "0"
                              : "Enter value..."
                          }
                          value={field.value}
                          onChange={(e) => {
                            const newFields = [...customFields];
                            newFields[index].value = e.target.value;
                            setCustomFields(newFields);
                          }}
                          className="h-8 text-xs bg-background"
                          required
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Project Tasks */}
            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium">
                  Initial Tasks{" "}
                  <span className="text-xs text-muted-foreground font-normal">
                    (Optional)
                  </span>
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setProjectTasks([
                      ...projectTasks,
                      {
                        id: Math.random().toString(),
                        title: "",
                        description: "",
                        status: "",
                        priority: "MEDIUM",
                        assigneeId: "",
                      },
                    ])
                  }
                  className="h-8 text-xs"
                >
                  <Plus className="mr-1 h-3 w-3" /> Add Task
                </Button>
              </div>

              {projectTasks.length > 0 && (
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                  {projectTasks.map((task, index) => (
                    <div
                      key={task.id}
                      className="p-3 border rounded-xl bg-muted/20 space-y-3 relative group"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setProjectTasks(
                            projectTasks.filter((t) => t.id !== task.id),
                          )
                        }
                        className="absolute right-2 top-2 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>

                      <div className="space-y-1.5 pr-6">
                        <Input
                          placeholder="Task Title *"
                          value={task.title}
                          onChange={(e) => {
                            const newTasks = [...projectTasks];
                            newTasks[index].title = e.target.value;
                            setProjectTasks(newTasks);
                          }}
                          className="h-8 text-sm bg-background"
                          required
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Input
                          placeholder="Description (Optional)"
                          value={task.description}
                          onChange={(e) => {
                            const newTasks = [...projectTasks];
                            newTasks[index].description = e.target.value;
                            setProjectTasks(newTasks);
                          }}
                          className="h-8 text-sm bg-background"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <select
                          value={task.status}
                          onChange={(e) => {
                            const newTasks = [...projectTasks];
                            newTasks[index].status = e.target.value;
                            setProjectTasks(newTasks);
                          }}
                          className="flex h-8 w-full rounded-xl border bg-background px-2 text-xs focus:ring-1 focus:ring-ring"
                        >
                          <option value="">No Status</option>
                          {taskStatuses.map((ts) => (
                            <option key={ts.id} value={ts.id}>{ts.name}</option>
                          ))}
                        </select>

                        <select
                          value={task.priority}
                          onChange={(e) => {
                            const newTasks = [...projectTasks];
                            newTasks[index].priority = e.target.value as any;
                            setProjectTasks(newTasks);
                          }}
                          className="flex h-8 w-full rounded-xl border bg-background px-2 text-xs focus:ring-1 focus:ring-ring"
                        >
                          <option value="LOW">Low</option>
                          <option value="MEDIUM">Medium</option>
                          <option value="HIGH">High</option>
                          <option value="CRITICAL">Critical</option>
                        </select>

                        <select
                          value={task.assigneeId}
                          onChange={(e) => {
                            const newTasks = [...projectTasks];
                            newTasks[index].assigneeId = e.target.value;
                            setProjectTasks(newTasks);
                          }}
                          className="flex h-8 w-full rounded-xl border bg-background px-2 text-xs focus:ring-1 focus:ring-ring"
                        >
                          <option value="">Unassigned</option>
                          {members.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter className="pt-4 border-t mt-6 sticky bottom-0 bg-background pb-2 flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsSaveTemplateOpen(true)}
                className="text-purple-600 border-purple-200 hover:bg-purple-50 dark:text-purple-400 dark:border-purple-900/50 dark:hover:bg-purple-950/20"
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

          {/* Quick Create Client Modal */}
          <Dialog open={isQuickClientOpen} onOpenChange={setIsQuickClientOpen}>
            <DialogContent className="sm:max-w-[400px]">
              <DialogHeader>
                <DialogTitle>Quick Add Client</DialogTitle>
                <DialogDescription>
                  Create a client record instantly to assign to this project.
                </DialogDescription>
              </DialogHeader>
              <form
                onSubmit={handleQuickCreateClient}
                className="space-y-4 pt-4"
              >
                <div className="space-y-2">
                  <label className="text-sm font-medium">Client Name</label>
                  <Input name="name" required placeholder="Acme Corp" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Client Email</label>
                  <Input
                    name="email"
                    type="email"
                    required
                    placeholder="contact@acme.com"
                  />
                </div>
                <DialogFooter className="pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsQuickClientOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isPending}>
                    {isPending ? "Adding..." : "Add Client"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </DialogContent>
      </Dialog>

      {/* Save Template Name Modal */}
      <Dialog open={isSaveTemplateOpen} onOpenChange={setIsSaveTemplateOpen}>
        <DialogContent className="sm:max-w-[400px] bg-background border-border">
          <DialogHeader>
            <DialogTitle>Save as Template</DialogTitle>
            <DialogDescription>
              Enter a name for this template. This will save the project structure, custom fields, and task template.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveTemplate} className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Template Name</label>
              <Input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                required
                placeholder="e.g. Website Development Template"
              />
            </div>
            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsSaveTemplateOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : "Save Template"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Template Selection Modal */}
      <Dialog open={isTemplateSelectOpen} onOpenChange={setIsTemplateSelectOpen}>
        <DialogContent className="sm:max-w-[850px] h-[80vh] flex flex-col overflow-hidden bg-background border-border p-0 rounded-2xl shadow-xl">
          <DialogHeader className="px-6 py-5 border-b shrink-0 bg-slate-50/50 dark:bg-zinc-900/50 z-10 sticky top-0">
            <DialogTitle className="text-xl font-extrabold tracking-tight">Select a Template</DialogTitle>
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
                  Create a new project and click "Save as Template" to add one.
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
      {/* Status Confirmation Modal */}
      <Dialog open={confirmStatusModal.isOpen} onOpenChange={(isOpen) => !isOpen && setConfirmStatusModal({ isOpen: false, projectId: null, projectName: "", newStatus: null, newStatusName: null })}>
        <DialogContent className="sm:max-w-md bg-background border-border">
          <DialogHeader>
            <DialogTitle className="text-xl">Change Project Status</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to move <strong>{confirmStatusModal.projectName}</strong> to <strong>{confirmStatusModal.newStatusName}</strong>?
            </p>
          </div>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setConfirmStatusModal({ isOpen: false, projectId: null, projectName: "", newStatus: null, newStatusName: null })} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleConfirmStatusChange} disabled={isPending}>
              {isPending ? "Moving..." : "Confirm Move"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CREATE RULE DIALOG */}
      <Dialog open={isCreateRuleOpen} onOpenChange={setIsCreateRuleOpen}>
        <DialogContent className="sm:max-w-[550px] bg-background border-border max-h-[85vh] p-0 flex flex-col overflow-hidden">
          <DialogHeader className="p-6 pb-4 border-b shrink-0">
            <DialogTitle>Create Automation Rule</DialogTitle>
            <DialogDescription>
              Define automation trigger conditions and actions.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateRule} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Rule Name</label>
                <Input
                  required
                  value={ruleFormName}
                  onChange={(e) => setRuleFormName(e.target.value)}
                  placeholder="e.g. Bug Auto-Notification"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Description</label>
                <Input
                  value={ruleFormDescription}
                  onChange={(e) => setRuleFormDescription(e.target.value)}
                  placeholder="Alerts when a new bug is reported"
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
                      value={ruleFormTriggerField}
                      onChange={(e) => setRuleFormTriggerField(e.target.value)}
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
                      value={ruleFormTriggerOperator}
                      onChange={(e) => setRuleFormTriggerOperator(e.target.value)}
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
                      value={ruleFormTriggerValue}
                      onChange={(e) => setRuleFormTriggerValue(e.target.value)}
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
                    value={ruleFormActionType}
                    onChange={(e) => setRuleFormActionType(e.target.value)}
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
                  {ruleFormRecipients.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 dark:bg-zinc-900 border rounded-xl">
                      {ruleFormRecipients.map(id => {
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
                      value={ruleFormRecipientSearch}
                      onChange={(e) => setRuleFormRecipientSearch(e.target.value)}
                      className="pl-9 pr-4 rounded-xl text-sm"
                    />
                  </div>

                  {/* Scroll Box */}
                  <div className="border rounded-2xl p-2.5 max-h-[200px] overflow-y-auto space-y-3 bg-background custom-scrollbar">
                    
                    {/* Default Roles Grid */}
                    {('project manager'.includes(ruleFormRecipientSearch.toLowerCase()) || 
                      'project owner'.includes(ruleFormRecipientSearch.toLowerCase()) || 
                      'all assigned users'.includes(ruleFormRecipientSearch.toLowerCase())) && (
                      <div className="space-y-1.5">
                        <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block px-1">Roles</span>
                        <div className="grid grid-cols-1 gap-2">
                          {[
                            { id: 'PROJECT_MANAGER', label: 'Project Manager (PM)', desc: 'Person leading project operations', icon: Shield },
                            { id: 'PROJECT_OWNER', label: 'Project Owner', desc: 'Organization owner or creator', icon: Crown },
                            { id: 'ASSIGNED_USER', label: 'All Assigned Users', desc: 'All members assigned to the task/project', icon: Users }
                          ].filter(role => role.label.toLowerCase().includes(ruleFormRecipientSearch.toLowerCase())).map(role => {
                            const isSel = ruleFormRecipients.includes(role.id);
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
                          u.name.toLowerCase().includes(ruleFormRecipientSearch.toLowerCase()) || 
                          u.email.toLowerCase().includes(ruleFormRecipientSearch.toLowerCase())
                        ).map(user => {
                          const isSel = ruleFormRecipients.includes(user.id);
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
