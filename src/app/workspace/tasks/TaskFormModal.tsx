"use client";

import React, { useState, useTransition, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberStepper } from "@/components/ui/NumberStepper";
import { ModalTabsHeader } from "@/components/ui/ModalTabsHeader";
import { DocumentsPanel, DraftDocument } from "@/components/documents/DocumentsPanel";
import { createDocumentAction } from "@/app/actions/documents";
import { Badge } from "@/components/ui/badge";
import {
  Plus, Trash2, Hash, Globe, Mail, Phone, Tags, CheckSquare, CircleDashed, Type, EyeOff, Settings, X, ChevronDown, AlignLeft, Sparkles, Smile, List as ListIcon, Calendar as CalendarIcon, PlusSquare, Wand2, Save, RefreshCw, Search, Repeat, Star, Paperclip, Check
} from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { toast } from "sonner";
import { createTaskAction, updateTaskAction, createTaskTemplateAction, getTaskTemplatesAction, deleteTaskTemplateAction, updateTaskTemplateAction } from "@/app/actions/tasks";
import { quickCreateProjectAction } from "@/app/actions/projects";
import { ProjectDescriptionEditor } from "@/components/ui/RichTextEditor";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

type TaskInput = {
  id: string; // temp unique id
  title: string;
  description: string;
  statusId: string;
  priority: string;
  dueDate: string;
  allocatedHours: string;
  assignees: string[];
  customFields?: { name: string; type: string; value: any; options?: string[] }[];
};

export default function TaskFormModal({
  isOpen,
  onOpenChange,
  task,
  projects,
  taskStatuses,
  users,
  currentUser,
  onSuccess,
  initialRepeatEnabled = false,
  initialTemplateConfig,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  task?: any;
  projects: any[];
  taskStatuses: any[];
  users: any[];
  currentUser: any;
  onSuccess: () => void;
  initialRepeatEnabled?: boolean;
  initialTemplateConfig?: any;
}) {
  const isEditing = !!task && typeof task.id === "string" && task.id !== "";
  const [isPending, startTransition] = useTransition();

  const [projectId, setProjectId] = useState(
    task?.projectId || initialTemplateConfig?.projectId || (projects.length > 0 ? projects[0].id : ""),
  );

  // Array of tasks for multi-create, or single task for edit
  const [tasksInput, setTasksInput] = useState<TaskInput[]>(() => {
    if (isEditing) {
      return [
        {
          id: "edit",
          title: task.title || "",
          description: task.description || "",
          statusId: task.statusId || "",
          priority: task.priority || "MEDIUM",
          dueDate: task.dueDate
            ? new Date(task.dueDate).toISOString().split("T")[0]
            : "",
          allocatedHours: task.allocatedHours?.toString() || "",
          assignees: task.assignees.map((a: any) => a.userId),
          customFields: (task.customFields as any) || [],
        },
      ];
    }
    if (initialTemplateConfig) {
      return [
        {
          id: Date.now().toString(),
          title: initialTemplateConfig.title || "",
          description: initialTemplateConfig.description || "",
          statusId: initialTemplateConfig.statusId || "",
          priority: initialTemplateConfig.priority || "MEDIUM",
          dueDate: initialTemplateConfig.dueDate || "",
          allocatedHours: initialTemplateConfig.allocatedHours?.toString() || "",
          assignees: initialTemplateConfig.assigneeIds || [],
          customFields: initialTemplateConfig.customFields || [],
        }
      ];
    }
    return [
      {
        id: Date.now().toString(),
        title: "",
        description: "",
        statusId: task?.statusId || "",
        priority: "MEDIUM",
        dueDate: "",
        allocatedHours: "",
        assignees: [],
        customFields: [],
      },
    ];
  });

  const [trackedHours, setTrackedHours] = useState<string>(
    task?.trackedHours?.toString() || "",
  );

  // Modals state
  const [isQuickProjectOpen, setIsQuickProjectOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");

  const [activeTaskAssigneeIndex, setActiveTaskAssigneeIndex] = useState<
    number | null
  >(null);

  // Repeat Settings States
  const [isRepeatEnabled, setIsRepeatEnabled] = useState(initialRepeatEnabled);
  const [repeatFrequency, setRepeatFrequency] = useState<"DAILY" | "WEEKLY" | "MONTHLY">("DAILY");
  const [repeatStartDate, setRepeatStartDate] = useState("");
  const [repeatEndDate, setRepeatEndDate] = useState("");

  // Template Save States
  const [isSaveTemplateOpen, setIsSaveTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [isTemplateSelectOpen, setIsTemplateSelectOpen] = useState(false);
  const [templateModalMode, setTemplateModalMode] = useState<'USE' | 'UPDATE'>('USE');
  const [templates, setTemplates] = useState<any[]>([]);
  const [templateSearchQuery, setTemplateSearchQuery] = useState("");
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [isDeleteTemplateOpen, setIsDeleteTemplateOpen] = useState(false);
  const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null);

  // Custom Fields Drawer States
  const [isFieldsDrawerOpen, setIsFieldsDrawerOpen] = useState(false);
  const [fieldsTab, setFieldsTab] = useState<"create_new" | "add_existing">(currentUser?.role === 'OWNER' ? "create_new" : "add_existing");
  const [selectedFieldType, setSelectedFieldType] = useState<string | null>(null);
  const [newCustomFieldName, setNewCustomFieldName] = useState("");
  const [newFieldOptions, setNewFieldOptions] = useState<string[]>([]);
  const [newOptionInput, setNewOptionInput] = useState("");
  const [activeTaskIndexForFields, setActiveTaskIndexForFields] = useState<number | null>(null);
  const [fieldsSearchTerm, setFieldsSearchTerm] = useState("");

  // Per-task popover open states for Status / Priority / Assignee
  const [openStatusIdx, setOpenStatusIdx] = useState<number | null>(null);
  const [openPriorityIdx, setOpenPriorityIdx] = useState<number | null>(null);
  const [openAssigneeIdx, setOpenAssigneeIdx] = useState<number | null>(null);
  const [statusSearch, setStatusSearch] = useState("");

  // Priority config
  const PRIORITY_OPTIONS = [
    { value: "CRITICAL", label: "Urgent",  color: "#ef4444", emoji: "🚩" },
    { value: "HIGH",     label: "High",    color: "#f59e0b", emoji: "🏳️" },
    { value: "MEDIUM",   label: "Normal",  color: "#3b82f6", emoji: "🚩" },
    { value: "LOW",      label: "Low",     color: "#94a3b8", emoji: "🏳️" },
  ] as const;

  // Tabbed header (Task | Doc) + attached documents
  const [activeTab, setActiveTab] = useState<"task" | "doc">("task");
  const [minimized, setMinimized] = useState(false);
  const [draftDocs, setDraftDocs] = useState<DraftDocument[]>([]);

  // Attachments State & Ref (matching Project modal behavior)
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState<string[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).map(f => f.name);
      setAttachments(prev => [...prev, ...newFiles]);
    }
  };

  const persistDraftDocs = async (taskIds: string[]) => {
    if (draftDocs.length === 0 || taskIds.length === 0) return;
    for (const taskId of taskIds) {
      for (const d of draftDocs) {
        await createDocumentAction({
          type: d.type,
          title: d.title,
          content: d.content ?? null,
          fileUrl: d.fileUrl ?? null,
          fileName: d.fileName ?? null,
          fileSize: d.fileSize ?? null,
          taskId,
        });
      }
    }
  };

  const existingCustomFields = useMemo(() => {
    const fieldsSet = new Set<string>();
    
    // From projects
    projects.forEach((p: any) => {
      if (p.customFields && Array.isArray(p.customFields)) {
        p.customFields.forEach((f: any) => {
          if (f.name) fieldsSet.add(f.name);
        });
      }
      // From tasks in projects
      if (p.tasks && Array.isArray(p.tasks)) {
        p.tasks.forEach((t: any) => {
          if (t.customFields && Array.isArray(t.customFields)) {
            t.customFields.forEach((f: any) => {
              if (f.name) fieldsSet.add(f.name);
            });
          }
        });
      }
    });

    return Array.from(fieldsSet).sort();
  }, [projects]);

  const filteredExistingCustomFields = useMemo(() => {
    if (!fieldsSearchTerm.trim()) return existingCustomFields;
    return existingCustomFields.filter(name => name.toLowerCase().includes(fieldsSearchTerm.toLowerCase()));
  }, [existingCustomFields, fieldsSearchTerm]);

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName.trim()) {
      toast.error("Please enter a template name");
      return;
    }

    const tInput = tasksInput[0];
    const config = {
      title: tInput.title,
      description: tInput.description,
      priority: tInput.priority,
      statusId: tInput.statusId || undefined,
      dueDate: tInput.dueDate,
      allocatedHours: tInput.allocatedHours ? parseFloat(tInput.allocatedHours) : undefined,
      assigneeIds: tInput.assignees,
      customFields: tInput.customFields || [],
      projectId: projectId || undefined,
    };

    startTransition(async () => {
      const res = await createTaskTemplateAction(templateName.trim(), config);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Task template saved successfully");
        setIsSaveTemplateOpen(false);
        setTemplateName("");
      }
    });
  };

  // Load templates when selection modal is open
  React.useEffect(() => {
    if (isTemplateSelectOpen) {
      setIsLoadingTemplates(true);
      getTaskTemplatesAction().then((res: any) => {
        setIsLoadingTemplates(false);
        if (res.success && res.templates) {
          setTemplates(res.templates);
        } else {
          toast.error(res.error || "Failed to load templates");
        }
      });
    }
  }, [isTemplateSelectOpen]);

  const handleUseTemplate = (config: any) => {
    setTasksInput([
      {
        id: tasksInput[0]?.id || Math.random().toString(),
        title: config.title || "",
        description: config.description || "",
        statusId: config.statusId || (taskStatuses.length > 0 ? taskStatuses[0].id : ""),
        priority: config.priority || "MEDIUM",
        dueDate: config.dueDate || "",
        allocatedHours: config.allocatedHours?.toString() || "",
        assignees: config.assigneeIds || [],
        customFields: config.customFields || [],
      },
    ]);
    if (config.projectId) {
      setProjectId(config.projectId);
    }
    setIsTemplateSelectOpen(false);
    toast.success("Template applied");
  };

  const handleUpdateTemplate = async (template: any) => {
    const tInput = tasksInput[0];
    const config = {
      title: tInput.title,
      description: tInput.description,
      priority: tInput.priority,
      statusId: tInput.statusId || undefined,
      dueDate: tInput.dueDate,
      allocatedHours: tInput.allocatedHours ? parseFloat(tInput.allocatedHours) : undefined,
      assigneeIds: tInput.assignees,
      customFields: tInput.customFields || [],
      projectId: projectId || undefined,
    };

    startTransition(async () => {
      const res = await updateTaskTemplateAction(template.id, config);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Template updated successfully");
        setTemplates((prev) =>
          prev.map((t) => (t.id === template.id ? { ...t, config } : t))
        );
        setIsTemplateSelectOpen(false);
      }
    });
  };

  const handleDeleteTemplate = (id: string) => {
    setDeleteTemplateId(id);
    setIsDeleteTemplateOpen(true);
  };

  const confirmDeleteTemplate = async () => {
    if (!deleteTemplateId) return;
    startTransition(async () => {
      const res = await deleteTaskTemplateAction(deleteTemplateId);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Template deleted successfully");
        setTemplates((prev) => prev.filter((t) => t.id !== deleteTemplateId));
        setIsDeleteTemplateOpen(false);
        setDeleteTemplateId(null);
      }
    });
  };

  // RBAC checks for the modal
  const isOwner = currentUser.role === "OWNER";
  const isClient = currentUser.role === "CLIENT";
  const selectedProject = projects.find((p) => p.id === projectId);
  const isPM = selectedProject?.projectManagerId === currentUser.userId;
  const isAssignedToTask = task?.assignees?.some(
    (a: any) => a.userId === currentUser.userId,
  );

  // If Member but not PM, they can only edit status and tracked hours (only applies when editing)
  const isLimitedEdit = isEditing && !isOwner && !isPM && isAssignedToTask;

  // Hoisted hours variables
  const projectTotalHours = selectedProject?.totalAllocatedHours || 0;
  const projectUsedHours = selectedProject?.usedHours || 0;
  const oldTaskHours =
    isEditing && task ? task.allocatedHours || 0 : 0;
  const alreadyAllocated =
    (selectedProject?.tasks || []).reduce(
      (sum: number, t: any) => sum + (t.allocatedHours || 0),
      0,
    ) - oldTaskHours;
  const draftHours = tasksInput.reduce(
    (sum, t) => sum + (parseFloat(t.allocatedHours) || 0),
    0,
  );
  const remainingHours = projectTotalHours - alreadyAllocated;
  const isExceeded =
    projectTotalHours > 0 && draftHours > remainingHours;

  // Available assignees based on selected project
  // We show all members of the organization, except clients.
  const availableAssignees = users.filter((u) => u.role === "MEMBER");

  const handleProjectSelectChange = (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const val = e.target.value;
    if (val === "NEW_PROJECT") {
      setIsQuickProjectOpen(true);
      // Revert to previous selected or empty
      // We don't set projectId to 'NEW_PROJECT'
    } else {
      setProjectId(val);
      // Clear assignees when project changes because available members change
      setTasksInput(tasksInput.map((t) => ({ ...t, assignees: [] })));
    }
  };

  const handleQuickCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    startTransition(async () => {
      const res = await quickCreateProjectAction(newProjectName);
      if (res.error) {
        toast.error(res.error);
      } else if (res.project) {
        toast.success("Project created");
        projects.push(res.project);
        setProjectId(res.project.id);
        setIsQuickProjectOpen(false);
        setNewProjectName("");
      }
    });
  };

  const updateTaskInput = (
    index: number,
    field: keyof TaskInput,
    value: any,
  ) => {
    const updated = [...tasksInput];
    updated[index] = { ...updated[index], [field]: value };
    setTasksInput(updated);
  };

  const addTask = () => {
    setTasksInput([
      ...tasksInput,
      {
        id: Date.now().toString(),
        title: "",
        description: "",
        statusId: "",
        priority: "MEDIUM",
        dueDate: "",
        allocatedHours: "",
        assignees: [],
        customFields: [],
      },
    ]);
  };

  const removeTask = (index: number) => {
    if (tasksInput.length > 1) {
      setTasksInput(tasksInput.filter((_, i) => i !== index));
    }
  };

  const toggleAssignee = (userId: string) => {
    if (activeTaskAssigneeIndex === null) return;
    const currentAssignees = tasksInput[activeTaskAssigneeIndex].assignees;
    if (currentAssignees.includes(userId)) {
      updateTaskInput(
        activeTaskAssigneeIndex,
        "assignees",
        currentAssignees.filter((id) => id !== userId),
      );
    } else {
      updateTaskInput(activeTaskAssigneeIndex, "assignees", [
        ...currentAssignees,
        userId,
      ]);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (isRepeatEnabled && (!repeatStartDate || !repeatEndDate)) {
      toast.error("Start Date and End Date are required to schedule repeated tasks.");
      return;
    }

    startTransition(async () => {
      if (isEditing) {
        const tInput = tasksInput[0];
        let res;
        if (isLimitedEdit) {
          res = await updateTaskAction(task.id, {
            statusId: tInput.statusId || undefined,
            trackedHours: trackedHours ? parseFloat(trackedHours) : 0,
          });
        } else {
          res = await updateTaskAction(task.id, {
            title: tInput.title,
            description: tInput.description,
            priority: tInput.priority as any,
            statusId: tInput.statusId || undefined,
            allocatedHours: tInput.allocatedHours
              ? parseFloat(tInput.allocatedHours)
              : undefined,
            trackedHours: trackedHours ? parseFloat(trackedHours) : 0,
            dueDate: tInput.dueDate || undefined,
            assigneeIds: tInput.assignees,
            customFields: tInput.customFields || [],
          });
        }
        if (res.error) toast.error(res.error);
        else {
          toast.success("Task updated successfully");
          onSuccess();
        }
      } else {
        // Repeated task create (if active)
        if (isRepeatEnabled) {
          const tInput = tasksInput[0];
          const res = await createTaskAction(
            projectId,
            tInput.title,
            tInput.description,
            tInput.priority as any,
            tInput.allocatedHours ? parseFloat(tInput.allocatedHours) : undefined,
            undefined, // Due date is auto-calculated per repeat occurrence
            tInput.statusId || undefined,
            tInput.assignees,
            tInput.customFields || [],
            true, // isRepeated
            {
              enabled: true,
              frequency: repeatFrequency,
              startDate: repeatStartDate,
              endDate: repeatEndDate,
            }
          );

          if (res.error) {
            toast.error(res.error);
          } else {
            if (res.success && (res as any).task) await persistDraftDocs([(res as any).task.id]);
            toast.success("Repeated tasks created successfully");
            onSuccess();
          }
          return;
        }

        // Multi-create
        let errors = 0;
        const createdTaskIds: string[] = [];
        for (const tInput of tasksInput) {
          if (!tInput.title.trim()) continue; // Skip empty titles
          const res = await createTaskAction(
            projectId,
            tInput.title,
            tInput.description,
            tInput.priority as any,
            tInput.allocatedHours
              ? parseFloat(tInput.allocatedHours)
              : undefined,
            tInput.dueDate || undefined,
            tInput.statusId || undefined,
            tInput.assignees,
            tInput.customFields || [],
          );
          if (res.error) {
            toast.error(`Error creating "${tInput.title}": ${res.error}`);
            errors++;
          } else if (res.success && (res as any).task) {
            createdTaskIds.push((res as any).task.id);
          }
        }

        await persistDraftDocs(createdTaskIds);

        if (errors === 0) {
          toast.success(
            tasksInput.length > 1
              ? "Tasks created successfully"
              : "Task created successfully",
          );
          onSuccess();
        } else if (errors < tasksInput.length) {
          toast.success("Some tasks created successfully");
          onSuccess();
        }
      }
    });
  };

  const assignableProjects = isOwner
    ? projects
    : isClient
      ? projects.filter((p) => p.clientId === currentUser.userId)
      : projects.filter((p) => p.projectManagerId === currentUser.userId);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent
          className="sm:max-w-[860px] p-0 flex flex-col h-[85vh] overflow-hidden bg-white dark:bg-[#151518] border border-slate-200/80 dark:border-white/10 sm:!rounded-[8px] !rounded-[8px] shadow-2xl [&>button]:hidden"
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <ModalTabsHeader
            tabs={[
              { id: "task", label: "Task" },
              { id: "doc", label: "Doc" },
            ]}
            activeTab={activeTab}
            onTabChange={(id) => setActiveTab(id as "task" | "doc")}
            onClose={() => onOpenChange(false)}
            onMinimize={() => setMinimized((m) => !m)}
            rightSlot={
              !isLimitedEdit && selectedProject && projectTotalHours > 0 && (
                <div className="hidden sm:flex items-center gap-4 text-right text-[11px] leading-tight text-slate-500 dark:text-slate-400 font-semibold mr-3 bg-slate-50 dark:bg-white/5 px-3.5 py-1.5 rounded-lg border border-slate-100 dark:border-white/5">
                  <div>Project Total Hours: <span className="text-slate-900 dark:text-white font-bold">{projectTotalHours}h</span></div>
                  <div className="h-3 w-px bg-slate-250 dark:bg-white/10" />
                  <div>Allocated to Tasks: <span className="text-slate-900 dark:text-white font-bold">{alreadyAllocated + draftHours}h</span></div>
                  <div className="h-3 w-px bg-slate-250 dark:bg-white/10" />
                  <div>Remaining Hours: <span className="text-slate-900 dark:text-white font-bold">{Math.max(0, projectTotalHours - alreadyAllocated - draftHours)}h</span></div>
                </div>
              )
            }
          />

          <div className={`flex-1 overflow-y-auto px-6 py-4 custom-scrollbar ${minimized ? "hidden" : ""}`}>
          <div className={activeTab === "doc" ? "" : "hidden"}>
            <DocumentsPanel
              taskId={isEditing ? task.id : undefined}
              entityLabel="task"
              drafts={isEditing ? undefined : draftDocs}
              onDraftsChange={isEditing ? undefined : setDraftDocs}
            />
            {!isEditing && (
              <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
        Documents will be saved and attached when you create the task.
              </p>
            )}
          </div>
          <div className={activeTab === "task" ? "" : "hidden"}>
            {(() => {
              const projectTotalHours = selectedProject?.totalAllocatedHours || 0;
              const projectUsedHours = selectedProject?.usedHours || 0;
              const oldTaskHours =
                isEditing && task ? task.allocatedHours || 0 : 0;
              const alreadyAllocated =
                (selectedProject?.tasks || []).reduce(
                  (sum: number, t: any) => sum + (t.allocatedHours || 0),
                  0,
                ) - oldTaskHours;
              const draftHours = tasksInput.reduce(
                (sum, t) => sum + (parseFloat(t.allocatedHours) || 0),
                0,
              );
              const remainingHours = projectTotalHours - alreadyAllocated;
              const isExceeded =
                projectTotalHours > 0 && draftHours > remainingHours;

              return (
                <form id="task-form" onSubmit={handleSave} className="space-y-6">
                  {/* Exceeded hours alert banner */}
                  {isExceeded && (
                    <div className="p-3 text-xs font-bold bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400 border border-red-100 dark:border-red-900/30 rounded-[8px]">
                      Task allocated hours ({draftHours}h) exceed the project’s remaining available hours ({remainingHours}h). Please increase project hours or reduce task hours.
                    </div>
                  )}

                  {isLimitedEdit ? (
                    <>
                      <div className="project-properties-grid">
                        <div className="grid grid-cols-2 gap-x-8 gap-y-1">
                          {/* Project */}
                          <div className="space-y-2 opacity-60">
                            <label className="text-sm font-medium">Project</label>
                            <div className="flex h-[36px] w-full rounded-[8px] bg-slate-50 dark:bg-white/5 px-3 items-center text-[13px] text-slate-700 dark:text-slate-350">
                              {task.project?.name || "No Project"}
                            </div>
                          </div>

                          {/* Task Title */}
                          <div className="space-y-2 opacity-60">
                            <label className="text-sm font-medium">Task Title</label>
                            <div className="flex h-[36px] w-full rounded-[8px] bg-slate-50 dark:bg-white/5 px-3 items-center text-[13px] text-slate-700 dark:text-slate-350 truncate">
                              {task.title}
                            </div>
                          </div>

                          {/* Status */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Status</label>
                            <DropdownMenu
                              open={openStatusIdx === 0}
                              onOpenChange={(open) => {
                                setOpenStatusIdx(open ? 0 : null);
                                if (open) setStatusSearch("");
                              }}
                            >
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  className="w-full h-[36px] bg-slate-50 dark:bg-white/5 border-0 rounded-[8px] px-3 flex items-center gap-2 text-[13px] text-left cursor-pointer hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                                >
                                  {tasksInput[0].statusId ? (() => {
                                    const st = taskStatuses.find(s => s.id === tasksInput[0].statusId);
                                    return st ? (
                                      <>
                                        <span className="inline-block w-3.5 h-3.5 rounded-full border-2 border-dashed shrink-0" style={{ borderColor: st.color || '#94a3b8' }} />
                                        <span className="text-slate-800 dark:text-slate-200 truncate">{st.name}</span>
                                      </>
                                    ) : <span className="text-slate-400">Select status...</span>;
                                  })() : <span className="text-slate-400">Select status...</span>}
                                  <ChevronDown size={14} className="ml-auto text-slate-400 shrink-0" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="start"
                                sideOffset={4}
                                className="w-[240px] rounded-2xl shadow-xl border border-slate-100 dark:border-white/10 bg-white dark:bg-[#1c1c1c] p-2 z-[9999]"
                                onInteractOutside={(e) => e.stopPropagation()}
                              >
                                <div className="px-2 pb-2">
                                  <input
                                    autoFocus
                                    placeholder="Search..."
                                    value={statusSearch}
                                    onChange={e => setStatusSearch(e.target.value)}
                                    className="w-full h-9 px-3 rounded-xl bg-slate-100 dark:bg-white/5 text-sm outline-none placeholder:text-slate-400 text-slate-700 dark:text-slate-300"
                                  />
                                </div>
                                <DropdownMenuItem
                                  onSelect={() => { updateTaskInput(0, "statusId", ""); setOpenStatusIdx(null); }}
                                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5"
                                >
                                  <span className="inline-block w-3.5 h-3.5 rounded-full border-2 border-dashed border-slate-300 shrink-0" />
                                  <span className="text-[13.5px] text-slate-500">No Status</span>
                                  {!tasksInput[0].statusId && <Check size={14} className="ml-auto text-slate-400" />}
                                </DropdownMenuItem>
                                {taskStatuses
                                  .filter(s => !statusSearch || s.name.toLowerCase().includes(statusSearch.toLowerCase()))
                                  .map((s) => (
                                  <DropdownMenuItem
                                    key={s.id}
                                    onSelect={() => { updateTaskInput(0, "statusId", s.id); setOpenStatusIdx(null); }}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 ${
                                      tasksInput[0].statusId === s.id ? "bg-slate-50 dark:bg-white/5" : ""
                                    }`}
                                  >
                                    <span className="inline-block w-3.5 h-3.5 rounded-full border-2 border-dashed shrink-0" style={{ borderColor: s.color || '#94a3b8' }} />
                                    <span className="text-[13.5px] font-medium text-slate-800 dark:text-slate-200">{s.name}</span>
                                    {tasksInput[0].statusId === s.id && <Check size={14} className="ml-auto text-slate-500" />}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          {/* Priority */}
                          <div className="space-y-2 opacity-60">
                            <label className="text-sm font-medium">Priority</label>
                            <div className="flex h-[36px] w-full rounded-[8px] bg-slate-50 dark:bg-white/5 px-3 items-center text-[13px] text-slate-700 dark:text-slate-350 gap-2">
                              {(() => {
                                const p = PRIORITY_OPTIONS.find(o => o.value === tasksInput[0].priority) || PRIORITY_OPTIONS[2];
                                return (
                                  <>
                                    <span style={{ color: p.color }} className="text-base leading-none">
                                      {p.value === 'MEDIUM' || p.value === 'CRITICAL' ? '🚩' : '🏳️'}
                                    </span>
                                    <span>{p.label}</span>
                                  </>
                                );
                              })()}
                            </div>
                          </div>

                          {/* Due Date */}
                          <div className="space-y-2 opacity-60">
                            <label className="text-sm font-medium">Due Date</label>
                            <div className="flex h-[36px] w-full rounded-[8px] bg-slate-50 dark:bg-white/5 px-3 items-center text-[13px] text-slate-700 dark:text-slate-350">
                              {tasksInput[0].dueDate ? new Date(tasksInput[0].dueDate).toLocaleDateString() : "No Due Date"}
                            </div>
                          </div>

                          {/* Allocated Hours */}
                          <div className="space-y-2 opacity-60">
                            <label className="text-sm font-medium">Allocated Hours</label>
                            <div className="flex h-[36px] w-full rounded-[8px] bg-slate-50 dark:bg-white/5 px-3 items-center text-[13px] text-slate-700 dark:text-slate-350">
                              {tasksInput[0].allocatedHours || "—"}
                            </div>
                          </div>

                          {/* Tracked Hours */}
                          <div className="space-y-2 opacity-60">
                            <label className="text-sm font-medium">Tracked Hours</label>
                            <div className="flex h-[36px] w-full rounded-[8px] bg-slate-50 dark:bg-white/5 px-3 items-center text-[13px] text-slate-700 dark:text-slate-350">
                              {trackedHours || "0"}
                            </div>
                          </div>

                          {/* Assignee */}
                          <div className="space-y-2 col-span-1 opacity-60">
                            <label className="text-sm font-medium">Assignee</label>
                            <div className="flex flex-wrap gap-1.5 items-center w-full min-h-[36px] bg-slate-50 dark:bg-white/5 rounded-[8px] px-3 py-2 text-[13px]">
                              {tasksInput[0].assignees.length === 0 ? (
                                <span className="text-slate-400">Unassigned</span>
                              ) : (
                                tasksInput[0].assignees.map((id) => {
                                  const u = users.find(usr => usr.id === id);
                                  return u ? (
                                    <Badge key={id} variant="secondary" className="font-normal !rounded-[6px] text-[11px]">
                                      {u.name}
                                    </Badge>
                                  ) : null;
                                })
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Description for Member View (Full Area, Outside the grid) */}
                      <div className="space-y-3 mt-6 pt-4 border-t border-slate-100 dark:border-white/5 w-full">
                        <label className="text-sm font-semibold text-slate-900 dark:text-white">
                          Description
                        </label>
                        <div className="text-[13.5px] text-slate-700 dark:text-slate-300 leading-relaxed w-full">
                          {tasksInput[0].description ? (
                            <div dangerouslySetInnerHTML={{ __html: tasksInput[0].description }} className="w-full prose prose-sm max-w-none dark:prose-invert" />
                          ) : (
                            <span className="text-slate-450 dark:text-slate-400 italic">No description.</span>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-6">
                      {tasksInput.map((tInput, index) => (
                        <div
                          key={tInput.id}
                          className={`space-y-4 relative ${index > 0 ? "border-t pt-6 mt-6 border-slate-100 dark:border-white/5" : ""}`}
                        >
                          {!isEditing && tasksInput.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute top-2 right-2 h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive !rounded-[8px]"
                              onClick={() => removeTask(index)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}

                          <div className="project-properties-grid">
                            <div className="grid grid-cols-2 gap-x-8 gap-y-1">

                              {/* Project */}
                              {!isEditing ? (
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">
                                    Project <span className="text-destructive">*</span>
                                  </label>
                                  <select
                                    required
                                    value={projectId}
                                    onChange={handleProjectSelectChange}
                                    className="w-full h-[36px] bg-slate-50 dark:bg-white/5 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-3 text-[13px] text-slate-700 dark:text-slate-300 rounded-[8px] outline-none cursor-pointer"
                                  >
                                    <option value="" disabled>Select a project</option>
                                    {assignableProjects.map((p) => (
                                      <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                    {isOwner && (
                                      <option value="NEW_PROJECT" className="font-bold text-primary">
                                        + Create New Project
                                      </option>
                                    )}
                                  </select>
                                </div>
                              ) : (
                                <div className="space-y-2 opacity-60">
                                  <label className="text-sm font-medium">Project</label>
                                  <div className="flex h-[36px] w-full rounded-[8px] bg-slate-50 dark:bg-white/5 px-3 items-center text-[13px] text-slate-700 dark:text-slate-300">
                                    {task.project?.name || "No Project"}
                                  </div>
                                </div>
                              )}

                              {/* Task Title */}
                              <div className="space-y-2">
                                <label className="text-sm font-medium">
                                  Task Title <span className="text-destructive">*</span>
                                </label>
                                <input
                                  required
                                  value={tInput.title}
                                  onChange={(e) => updateTaskInput(index, "title", e.target.value)}
                                  placeholder="e.g. Design Landing Page"
                                  className="w-full h-[36px] bg-slate-50 dark:bg-white/5 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-3 text-[13px] text-slate-700 dark:text-slate-300 rounded-[8px] outline-none placeholder:text-slate-400/80"
                                />
                              </div>

                              {/* Status */}
                              {!isClient && (
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Status</label>
                                  <DropdownMenu
                                    open={openStatusIdx === index}
                                    onOpenChange={(open) => {
                                      setOpenStatusIdx(open ? index : null);
                                      if (open) setStatusSearch("");
                                    }}
                                  >
                                    <DropdownMenuTrigger asChild>
                                      <button
                                        type="button"
                                        className="w-full h-[36px] bg-slate-50 dark:bg-white/5 border-0 rounded-[8px] px-3 flex items-center gap-2 text-[13px] text-left cursor-pointer hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                                      >
                                        {tInput.statusId ? (() => {
                                          const st = taskStatuses.find(s => s.id === tInput.statusId);
                                          return st ? (
                                            <>
                                              <span className="inline-block w-3.5 h-3.5 rounded-full border-2 border-dashed shrink-0" style={{ borderColor: st.color || '#94a3b8' }} />
                                              <span className="text-slate-800 dark:text-slate-200 truncate">{st.name}</span>
                                            </>
                                          ) : <span className="text-slate-400">Select status...</span>;
                                        })() : <span className="text-slate-400">Select status...</span>}
                                        <ChevronDown size={14} className="ml-auto text-slate-400 shrink-0" />
                                      </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                      align="start"
                                      sideOffset={4}
                                      className="w-[240px] rounded-2xl shadow-xl border border-slate-100 dark:border-white/10 bg-white dark:bg-[#1c1c1c] p-2 z-[9999]"
                                      onInteractOutside={(e) => e.stopPropagation()}
                                    >
                                      {/* Search */}
                                      <div className="px-2 pb-2">
                                        <input
                                          autoFocus
                                          placeholder="Search..."
                                          value={statusSearch}
                                          onChange={e => setStatusSearch(e.target.value)}
                                          className="w-full h-9 px-3 rounded-xl bg-slate-100 dark:bg-white/5 text-sm outline-none placeholder:text-slate-400 text-slate-700 dark:text-slate-300"
                                        />
                                      </div>
                                      {/* No Status option */}
                                      <DropdownMenuItem
                                        onSelect={() => { updateTaskInput(index, "statusId", ""); setOpenStatusIdx(null); }}
                                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5"
                                      >
                                        <span className="inline-block w-3.5 h-3.5 rounded-full border-2 border-dashed border-slate-300 shrink-0" />
                                        <span className="text-[13.5px] text-slate-500">No Status</span>
                                        {!tInput.statusId && <Check size={14} className="ml-auto text-slate-400" />}
                                      </DropdownMenuItem>
                                      {taskStatuses
                                        .filter(s => !statusSearch || s.name.toLowerCase().includes(statusSearch.toLowerCase()))
                                        .map((s) => (
                                        <DropdownMenuItem
                                          key={s.id}
                                          onSelect={() => { updateTaskInput(index, "statusId", s.id); setOpenStatusIdx(null); }}
                                          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 ${
                                            tInput.statusId === s.id ? "bg-slate-50 dark:bg-white/5" : ""
                                          }`}
                                        >
                                          <span className="inline-block w-3.5 h-3.5 rounded-full border-2 border-dashed shrink-0" style={{ borderColor: s.color || '#94a3b8' }} />
                                          <span className="text-[13.5px] font-medium text-slate-800 dark:text-slate-200">{s.name}</span>
                                          {tInput.statusId === s.id && <Check size={14} className="ml-auto text-slate-500" />}
                                        </DropdownMenuItem>
                                      ))}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              )}

                              {/* Priority */}
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Priority</label>
                                <DropdownMenu
                                  open={openPriorityIdx === index}
                                  onOpenChange={(open) => setOpenPriorityIdx(open ? index : null)}
                                >
                                  <DropdownMenuTrigger asChild>
                                    <button
                                      type="button"
                                      className="w-full h-[36px] bg-slate-50 dark:bg-white/5 border-0 rounded-[8px] px-3 flex items-center gap-2 text-[13px] cursor-pointer hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                                    >
                                      {(() => {
                                        const p = PRIORITY_OPTIONS.find(o => o.value === tInput.priority) || PRIORITY_OPTIONS[2];
                                        return (
                                          <>
                                            <span style={{ color: p.color }} className="text-base leading-none">
                                              {p.value === 'MEDIUM' || p.value === 'CRITICAL' ? '🚩' : '🏳️'}
                                            </span>
                                            <span className="text-slate-800 dark:text-slate-200 font-medium">{p.label}</span>
                                          </>
                                        );
                                      })()}
                                      <ChevronDown size={14} className="ml-auto text-slate-400 shrink-0" />
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent
                                    align="start"
                                    sideOffset={4}
                                    className="w-[220px] rounded-2xl shadow-xl border border-slate-100 dark:border-white/10 bg-white dark:bg-[#1c1c1c] p-2 z-[9999]"
                                    onInteractOutside={(e) => e.stopPropagation()}
                                  >
                                    <p className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Priority</p>
                                    {PRIORITY_OPTIONS.map((opt) => (
                                      <DropdownMenuItem
                                        key={opt.value}
                                        onSelect={() => { updateTaskInput(index, "priority", opt.value); setOpenPriorityIdx(null); }}
                                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 ${
                                          tInput.priority === opt.value ? "bg-slate-50 dark:bg-white/5" : ""
                                        }`}
                                      >
                                        <span style={{ color: opt.color }} className="text-xl leading-none">
                                          {opt.value === 'MEDIUM' || opt.value === 'CRITICAL' ? '🚩' : '🏳️'}
                                        </span>
                                        <span className="text-[14px] font-medium text-slate-800 dark:text-slate-200">{opt.label}</span>
                                        {tInput.priority === opt.value && <Check size={14} className="ml-auto text-slate-500" />}
                                      </DropdownMenuItem>
                                    ))}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>

                              {/* Due Date */}
                              <div className="space-y-2">
                                <label className="text-sm font-medium">
                                  Due Date
                                </label>
                                <input
                                  type="date"
                                  value={tInput.dueDate}
                                  onChange={(e) => updateTaskInput(index, "dueDate", e.target.value)}
                                  className="w-full h-[36px] bg-slate-50 dark:bg-white/5 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-3 text-[13px] text-slate-700 dark:text-slate-350 rounded-[8px] outline-none cursor-pointer"
                                />
                              </div>

                              {/* Make This Task Repeat */}
                              {!isEditing && tasksInput.length === 1 ? (
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Make  task repeat</label>
                                  <div className="flex items-center gap-2 h-[36px]">
                                    <input
                                      type="checkbox"
                                      id={`repeat-${index}`}
                                      checked={isRepeatEnabled}
                                      onChange={(e) => setIsRepeatEnabled(e.target.checked)}
                                      className="h-4 w-4 rounded border-gray-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                                    />
                                    <label htmlFor={`repeat-${index}`} className="text-[13px] text-slate-600 dark:text-slate-400 cursor-pointer">
                                      Enable repeat
                                    </label>
                                  </div>
                                  {isRepeatEnabled && (
                                    <div className="grid grid-cols-3 gap-2 mt-1">
                                      <div className="space-y-1">
                                        <span className="text-[11px] text-slate-400">Frequency</span>
                                        <select
                                          value={repeatFrequency}
                                          onChange={(e) => setRepeatFrequency(e.target.value as any)}
                                          className="w-full h-8 bg-slate-100 dark:bg-white/5 border-0 px-2 text-xs text-slate-700 dark:text-slate-300 rounded-[6px] outline-none"
                                        >
                                          <option value="DAILY">Daily</option>
                                          <option value="WEEKLY">Weekly</option>
                                          <option value="MONTHLY">Monthly</option>
                                        </select>
                                      </div>
                                      <div className="space-y-1">
                                        <span className="text-[11px] text-slate-400">Start</span>
                                        <input
                                          type="date"
                                          required={isRepeatEnabled}
                                          value={repeatStartDate}
                                          onChange={(e) => setRepeatStartDate(e.target.value)}
                                          className="w-full h-8 bg-slate-100 dark:bg-white/5 border-0 px-2 text-xs text-slate-700 dark:text-slate-300 rounded-[6px] outline-none"
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <span className="text-[11px] text-slate-400">End</span>
                                        <input
                                          type="date"
                                          required={isRepeatEnabled}
                                          value={repeatEndDate}
                                          onChange={(e) => setRepeatEndDate(e.target.value)}
                                          className="w-full h-8 bg-slate-100 dark:bg-white/5 border-0 px-2 text-xs text-slate-700 dark:text-slate-300 rounded-[6px] outline-none"
                                        />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div />
                              )}

                              {/* Allocated Hours */}
                              {!isClient && (
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">
                                    Allocated Hours <span className="text-destructive">*</span>
                                  </label>
                                  <input
                                    type="number"
                                    step="0.1"
                                    min="0.1"
                                    required
                                    value={tInput.allocatedHours}
                                    onChange={(e) => updateTaskInput(index, "allocatedHours", e.target.value)}
                                    placeholder="e.g. 10.5"
                                    className="w-full h-[36px] bg-slate-50 dark:bg-white/5 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-3 text-[13px] text-slate-700 dark:text-slate-300 rounded-[8px] outline-none placeholder:text-slate-400/80"
                                  />
                                  {isEditing && (
                                    <>
                                      <label className="text-sm font-medium mt-2 block">Tracked Hours</label>
                                      <input
                                        type="number"
                                        step="0.1"
                                        min="0"
                                        value={trackedHours}
                                        onChange={(e) => setTrackedHours(e.target.value)}
                                        placeholder="e.g. 5.5"
                                        className="w-full h-[36px] bg-slate-50 dark:bg-white/5 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-3 text-[13px] text-slate-700 dark:text-slate-300 rounded-[8px] outline-none placeholder:text-slate-400/80"
                                      />
                                    </>
                                  )}
                                </div>
                              )}

                              {/* Assignee */}
                              {!isClient && (
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Assignee</label>
                                  <DropdownMenu
                                    open={openAssigneeIdx === index}
                                    onOpenChange={(open) => setOpenAssigneeIdx(open ? index : null)}
                                  >
                                    <DropdownMenuTrigger asChild>
                                      <button
                                        type="button"
                                        className="w-full min-h-[36px] bg-slate-50 dark:bg-white/5 border-0 rounded-[8px] px-3 py-2 flex flex-wrap gap-1.5 items-center text-[13px] cursor-pointer hover:bg-slate-100 dark:hover:bg-white/10 transition-colors text-left"
                                      >
                                        {tInput.assignees.length === 0 ? (
                                          <span className="text-slate-400">Assign users...</span>
                                        ) : (
                                          tInput.assignees.map((id) => {
                                            const u = users.find(usr => usr.id === id);
                                            return u ? (
                                              <Badge key={id} variant="secondary" className="font-normal !rounded-[6px] text-[11px]">
                                                {u.name}
                                              </Badge>
                                            ) : null;
                                          })
                                        )}
                                        <ChevronDown size={14} className="ml-auto text-slate-400 shrink-0" />
                                      </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                      align="start"
                                      sideOffset={4}
                                      className="w-[280px] rounded-2xl shadow-xl border border-slate-100 dark:border-white/10 bg-white dark:bg-[#1c1c1c] p-2 z-[9999] max-h-[320px] overflow-y-auto custom-scrollbar"
                                      onInteractOutside={(e) => e.stopPropagation()}
                                    >
                                      {users.filter(u => u.role !== 'CLIENT' && u.status === 'ACTIVE').length === 0 ? (
                                        <div className="py-4 text-center text-sm text-slate-400">No team members found</div>
                                      ) : (
                                        users.filter(u => u.role !== 'CLIENT' && u.status === 'ACTIVE').map((u) => {
                                          const isSelected = tInput.assignees.includes(u.id);
                                          return (
                                            <DropdownMenuItem
                                              key={u.id}
                                              onSelect={(e) => {
                                                e.preventDefault();
                                                const newList = isSelected
                                                  ? tInput.assignees.filter(id => id !== u.id)
                                                  : [...tInput.assignees, u.id];
                                                updateTaskInput(index, "assignees", newList);
                                              }}
                                              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 ${
                                                isSelected ? "bg-slate-50 dark:bg-white/5" : ""
                                              }`}
                                            >
                                              {/* Avatar */}
                                              <div className="h-8 w-8 rounded-full bg-slate-500 text-white flex items-center justify-center text-xs font-bold shrink-0">
                                                {u.name?.substring(0, 2).toUpperCase()}
                                              </div>
                                              <div className="flex flex-col min-w-0">
                                                <span className="text-[13.5px] font-semibold text-slate-800 dark:text-slate-200 truncate">{u.name}</span>
                                                <span className="text-[11px] text-slate-400 truncate">{u.email}</span>
                                              </div>
                                              {isSelected && <Check size={14} className="ml-auto text-slate-500 shrink-0" />}
                                            </DropdownMenuItem>
                                          );
                                        })
                                      )}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              )}

                            </div>
                          </div>




                          {/* Description field - full width */}
                          <div className="space-y-3 mt-4">
                            <div>
                              <label className="text-sm font-semibold text-slate-900 dark:text-white">
                                Description
                              </label>
                              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                Add context, type “/” for blocks, or “@” to mention a teammate.
                              </p>
                            </div>
                            <ProjectDescriptionEditor
                              content={tInput.description}
                              onChange={(val) =>
                                updateTaskInput(index, "description", val)
                              }
                              placeholder="Add description, or write with AI"
                              people={users.filter(u => u.role !== 'CLIENT' && u.status === 'ACTIVE')}
                              plain
                            />
                          </div>

                          {/* Fields Header and Row */}
                          <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-100 dark:border-white/5">
                            <label className="text-sm font-bold text-slate-900 dark:text-white">
                              Fields
                            </label>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setActiveTaskIndexForFields(index);
                                setFieldsTab("create_new");
                                setIsFieldsDrawerOpen(true);
                              }}
                              className="h-8 px-3 text-[13px] bg-white dark:bg-[#252525] border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-slate-700 dark:text-slate-300 shadow-sm rounded-[8px]"
                            >
                              <Plus className="mr-1.5 h-3.5 w-3.5 text-slate-400" /> Add Field
                            </Button>
                          </div>

                          {/* Custom Fields List */}
                          {(() => {
                            const getIconForType = (type: string) => {
                              switch (type?.toLowerCase()) {
                                case 'number': return <Hash size={14} className="text-slate-400" />;
                                case 'url':
                                case 'website': return <Globe size={14} className="text-slate-400" />;
                                case 'email': return <Mail size={14} className="text-slate-400" />;
                                case 'phone': return <Phone size={14} className="text-slate-400" />;
                                case 'dropdown': return <Tags size={14} className="text-slate-400" />;
                                case 'checkbox': return <CheckSquare size={14} className="text-slate-400" />;
                                case 'labels': return <Tags size={14} className="text-slate-400" />;
                                case 'date': return <CircleDashed size={14} className="text-slate-400" />;
                                default: return <Type size={14} className="text-slate-400" />;
                              }
                            };

                            const renderFieldValueInput = (field: any, fIndex: number) => {
                              const updateValue = (val: any) => {
                                const updated = [...tasksInput];
                                if (updated[index].customFields) {
                                  updated[index].customFields[fIndex].value = val;
                                  setTasksInput(updated);
                                }
                              };
                              
                              const commonClasses = "h-full w-full border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-4 bg-transparent text-[14px] text-slate-700 dark:text-slate-300 rounded-none shadow-none outline-none appearance-none";
                              const fieldType = (field.type || 'text').toLowerCase();

                              switch (fieldType) {
                                case 'dropdown':
                                  return (
                                    <select value={field.value || ''} onChange={e => updateValue(e.target.value)} className={commonClasses}>
                                      <option value="">—</option>
                                      {(field.options || []).map((o: string) => <option key={o} value={o}>{o}</option>)}
                                    </select>
                                  );
                                case 'checkbox':
                                  return (
                                    <div className="flex items-center h-full px-4">
                                      <input type="checkbox" checked={!!field.value} onChange={e => updateValue(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900" />
                                    </div>
                                  );
                                case 'labels':
                                  const currentValues = Array.isArray(field.value) ? field.value : [];
                                  return (
                                    <div className="flex items-center flex-wrap gap-1.5 h-full px-4 py-1 overflow-y-auto custom-scrollbar">
                                      {currentValues.map((v: string) => (
                                        <span key={v} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                                          {v}
                                          <button type="button" onClick={() => updateValue(currentValues.filter((val: string) => val !== v))} className="text-slate-400 hover:text-red-500"><X size={10} /></button>
                                        </span>
                                      ))}
                                      <select 
                                        value="" 
                                        onChange={e => {
                                            if (e.target.value && !currentValues.includes(e.target.value)) {
                                              updateValue([...currentValues, e.target.value]);
                                            }
                                        }}
                                        className="bg-transparent text-[11px] text-slate-500 outline-none cursor-pointer"
                                      >
                                        <option value="" disabled>+ Add label</option>
                                        {(field.options || []).filter((o: string) => !currentValues.includes(o)).map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                                      </select>
                                    </div>
                                  );
                                case 'number':
                                  return <input type="number" value={field.value || ''} onChange={e => updateValue(e.target.value)} placeholder="—" className={commonClasses} />;
                                case 'date':
                                  return <input type="date" value={field.value || ''} onChange={e => updateValue(e.target.value)} className={commonClasses} />;
                                case 'website':
                                case 'url':
                                  return <input type="url" value={field.value || ''} onChange={e => updateValue(e.target.value)} placeholder="—" className={commonClasses} />;
                                case 'phone':
                                  return <input type="tel" value={field.value || ''} onChange={e => updateValue(e.target.value)} placeholder="—" className={commonClasses} />;
                                case 'email':
                                  return <input type="email" value={field.value || ''} onChange={e => updateValue(e.target.value)} placeholder="—" className={commonClasses} />;
                                default:
                                  return <input type="text" value={field.value || ''} onChange={e => updateValue(e.target.value)} placeholder="—" className={commonClasses} />;
                              }
                            };

                            return (
                              <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1 custom-scrollbar mt-3">
                                {(tInput.customFields || []).map((field, fIndex) => (
                                  <div key={field.name} className="flex border border-slate-200 dark:border-white/10 rounded-[8px] overflow-hidden h-10 group bg-slate-50/50 dark:bg-white/[0.02]">
                                    {/* Left Side: Field info */}
                                    <div className="flex items-center gap-2 px-3 py-2 min-w-[150px] w-1/3 border-r border-slate-200 dark:border-white/10 bg-[#FAFAFA] dark:bg-[#1A1A1A] relative">
                                      {getIconForType(field.type)}
                                      <Input
                                        value={field.name}
                                        onChange={(e) => {
                                          const updated = [...tasksInput];
                                          if (updated[index].customFields) {
                                            updated[index].customFields[fIndex].name = e.target.value;
                                            setTasksInput(updated);
                                          }
                                        }}
                                        className="h-7 text-[14px] bg-transparent border-0 focus-visible:ring-1 focus-visible:ring-slate-350 px-1 font-medium text-slate-700 dark:text-slate-300 w-full shadow-none !rounded-[8px]"
                                      />
                                    </div>

                                    {/* Right Side: Value */}
                                    <div className="flex-1 relative bg-white dark:bg-[#252525]">
                                      {renderFieldValueInput(field, fIndex)}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const updated = [...tasksInput];
                                          updated[index].customFields = (updated[index].customFields || []).filter((_, i) => i !== fIndex);
                                          setTasksInput(updated);
                                        }}
                                        className="absolute right-2 top-2 border border-slate-200 dark:border-white/10 rounded p-[3px] text-slate-500 hover:text-destructive hover:bg-slate-50 dark:hover:bg-white/5 transition-all bg-white dark:bg-[#252525] opacity-0 group-hover:opacity-100 shadow-sm z-10"
                                      >
                                        <X size={13} />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            );
                          })()}

                          {/* File attachments section inside form body */}
                          {attachments.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/5 space-y-2">
                              <h3 className="text-xs font-bold text-slate-900 dark:text-white">Attachments</h3>
                              <div className="grid grid-cols-2 gap-2">
                                {attachments.map((file, idx) => (
                                  <div key={idx} className="flex items-center justify-between p-2 border border-slate-200 dark:border-white/10 rounded-[8px] bg-slate-50 dark:bg-[#19191c] text-xs">
                                    <span className="truncate">{file}</span>
                                    <button
                                      type="button"
                                      onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                                    >
                                      <X className="h-4 w-4" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Hidden File Input */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileChange}
                    multiple
                  />
                </form>
              );
            })()}
            </div>
            </div>

          {/* ── Fixed footer — direct child of DialogContent (flex-col), always pinned ── */}
          <div className="px-6 py-4 border-t shrink-0 bg-white dark:bg-[#151518] border-slate-100 dark:border-white/5 flex items-center justify-between">
            {/* Left: Templates (create-only) */}
            {!isEditing && tasksInput.length === 1 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="text-slate-700 border-slate-200 hover:bg-slate-50 dark:text-slate-350 dark:border-white/10 dark:hover:bg-white/5 rounded-[8px] flex items-center gap-1.5 h-9"
                  >
                    <Wand2 size={15} className="text-slate-400" />
                    <span>Templates</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[240px] rounded-xl shadow-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1c1c1c] p-1.5 z-[9999]">
                  <DropdownMenuItem onClick={() => { setTemplateModalMode('USE'); setIsTemplateSelectOpen(true); }} className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer text-slate-800 dark:text-slate-200">
                    <Wand2 size={15} className="text-slate-500" />
                    <span>Use Template</span>
                  </DropdownMenuItem>
                  <div className="h-[1px] bg-slate-100 dark:bg-white/5 my-1" />
                  <DropdownMenuItem onClick={() => { setIsSaveTemplateOpen(true); }} className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer text-slate-800 dark:text-slate-200">
                    <Save size={15} />
                    <span>Save as template</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setTemplateModalMode('UPDATE'); setIsTemplateSelectOpen(true); }} className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer text-slate-800 dark:text-slate-200">
                    <RefreshCw size={15} />
                    <span>Update existing template</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Right: Attach + Cancel + Save */}
            <div className="flex items-center gap-3.5 ml-auto">
              {!isLimitedEdit && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-350 transition-colors cursor-pointer"
                >
                  <Paperclip size={18} />
                </button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLimitedEdit && isPending}
                className="!rounded-[8px] shadow-sm hover:bg-slate-50 dark:hover:bg-white/5 transition-colors h-9 px-4 font-semibold text-sm border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="task-form"
                disabled={isPending || (isLimitedEdit && !tasksInput[0].statusId)}
                className="!rounded-[8px] shadow-sm h-9 px-4 font-semibold text-sm bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
              >
                {isPending ? "Saving..." : isEditing ? "Update Task" : "Save Tasks"}
              </Button>
            </div>
          </div>
          </DialogContent>

        </Dialog>

        {/* Quick Create Project Nested Modal */}
        <Dialog open={isQuickProjectOpen} onOpenChange={setIsQuickProjectOpen}>
        <DialogContent
          className="sm:max-w-[450px] bg-white dark:bg-[#151518] border border-slate-200/80 dark:border-white/10 p-0 sm:!rounded-[8px] !rounded-[8px] shadow-2xl overflow-hidden [&>button]:hidden"
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#19191c] relative shrink-0">
            <h2 className="text-[16.5px] font-bold text-slate-900 dark:text-white leading-tight">Quick Create Project</h2>
            <p className="text-xs text-slate-450 dark:text-slate-400 mt-1">
              Create a new project instantly to add tasks to it.
            </p>
            <DialogPrimitive.Close className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-250 dark:hover:bg-zinc-700 transition-all rounded-full p-1.5 cursor-pointer outline-none flex items-center justify-center h-7 w-7">
              <X size={14} />
            </DialogPrimitive.Close>
          </div>
          <form onSubmit={handleQuickCreateProject} className="flex flex-col">
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-[12.5px] font-bold text-slate-600 dark:text-slate-350">Project Name</label>
                <Input
                  required
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="e.g. Q3 Marketing Campaign"
                  className="h-10 !rounded-[8px] border-slate-200 focus-visible:ring-1 focus-visible:ring-slate-450 dark:border-white/10 dark:bg-transparent"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#19191c] flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsQuickProjectOpen(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 !rounded-[8px] transition-colors outline-none cursor-pointer"
                disabled={isPending}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="px-5 py-2 text-sm font-bold !rounded-[8px] bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors shadow-sm disabled:opacity-50 outline-none cursor-pointer"
              >
                {isPending ? "Creating..." : "Create Project"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Select Assignees Nested Modal */}
      <Dialog
        modal={false}
        open={activeTaskAssigneeIndex !== null}
        onOpenChange={(open) => {
          if (!open) setActiveTaskAssigneeIndex(null);
        }}
      >
        <DialogContent
          className="sm:max-w-[450px] bg-white dark:bg-[#151518] border border-slate-200/80 dark:border-white/10 p-0 sm:!rounded-[8px] !rounded-[8px] shadow-2xl overflow-hidden [&>button]:hidden"
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#19191c] relative shrink-0">
            <h2 className="text-[16.5px] font-bold text-slate-900 dark:text-white leading-tight">Select Assignees</h2>
            <p className="text-xs text-slate-450 dark:text-slate-400 mt-1">Assign members to this task.</p>
            <DialogPrimitive.Close className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-250 dark:hover:bg-zinc-700 transition-all rounded-full p-1.5 cursor-pointer outline-none flex items-center justify-center h-7 w-7">
              <X size={14} />
            </DialogPrimitive.Close>
          </div>
          <div className="p-6 space-y-4">
            <div className="border border-slate-150 dark:border-white/5 rounded-[8px] p-3 max-h-[300px] overflow-y-auto space-y-1 bg-background shadow-inner custom-scrollbar">
              {availableAssignees.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">
                  No members available in this organization.
                </p>
              ) : (
                availableAssignees.map((m) => {
                  const isSelected =
                    activeTaskAssigneeIndex !== null &&
                    tasksInput[activeTaskAssigneeIndex].assignees.includes(
                      m.id,
                    );
                  return (
                    <label
                      key={m.id}
                      className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded-[8px] cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleAssignee(m.id)}
                        className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                      />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{m.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {m.email}
                        </span>
                      </div>
                    </label>
                  );
                })
              )}
            </div>
          </div>
          <div className="px-6 py-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#19191c] flex justify-end gap-2.5">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setActiveTaskAssigneeIndex(null);
              }}
              className="px-5 py-2 text-sm font-bold !rounded-[8px] bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors shadow-sm outline-none cursor-pointer w-full text-center"
            >
              Done
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Save Template Name Modal */}
      <Dialog open={isSaveTemplateOpen} onOpenChange={setIsSaveTemplateOpen}>
        <DialogContent className="sm:max-w-[450px] bg-white dark:bg-[#151518] border border-slate-200/80 dark:border-white/10 p-0 sm:!rounded-[8px] !rounded-[8px] shadow-2xl overflow-hidden [&>button]:hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#19191c] relative shrink-0">
            <h2 className="text-[16.5px] font-bold text-slate-900 dark:text-white leading-tight">Save as Template</h2>
            <p className="text-xs text-slate-450 dark:text-slate-400 mt-1">
              Enter a name for this template.
            </p>
            <DialogPrimitive.Close className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-250 dark:hover:bg-zinc-700 transition-all rounded-full p-1.5 cursor-pointer outline-none flex items-center justify-center h-7 w-7">
              <X size={14} />
            </DialogPrimitive.Close>
          </div>
          <form onSubmit={handleSaveTemplate} className="flex flex-col">
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-[12.5px] font-bold text-slate-600 dark:text-slate-350">Template Name</label>
                <Input
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  required
                  placeholder="e.g. SEO Audit Template"
                  className="h-10 !rounded-[8px] border-slate-200 focus-visible:ring-1 focus-visible:ring-slate-450 dark:border-white/10 dark:bg-transparent"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#19191c] flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsSaveTemplateOpen(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 !rounded-[8px] transition-colors outline-none cursor-pointer"
                disabled={isPending}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending || !templateName.trim()}
                className="px-5 py-2 text-sm font-bold !rounded-[8px] bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors shadow-sm disabled:opacity-50 outline-none cursor-pointer"
              >
                {isPending ? "Saving..." : "Save Template"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Template Selection Modal */}
      <Dialog open={isTemplateSelectOpen} onOpenChange={setIsTemplateSelectOpen}>
        <DialogContent className="sm:max-w-[850px] h-[80vh] flex flex-col overflow-hidden bg-white dark:bg-[#151518] border border-slate-200/80 dark:border-white/10 p-0 sm:!rounded-[8px] !rounded-[8px] shadow-2xl [&>button]:hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#19191c] relative shrink-0">
            <h2 className="text-[16.5px] font-bold text-slate-900 dark:text-white leading-tight">
              {templateModalMode === 'UPDATE' ? 'Update Existing Template' : 'Select a Template'}
            </h2>
            <p className="text-xs text-slate-450 dark:text-slate-400 mt-1">
              {templateModalMode === 'UPDATE'
                ? 'Choose an existing template to overwrite with current task configuration.'
                : 'Choose one of your saved custom configurations.'}
            </p>
            <DialogPrimitive.Close className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-250 dark:hover:bg-zinc-700 transition-all rounded-full p-1.5 cursor-pointer outline-none flex items-center justify-center h-7 w-7">
              <X size={14} />
            </DialogPrimitive.Close>
          </div>

          {/* Search bar inside modal */}
          <div className="px-6 pt-4 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search templates by name..."
                value={templateSearchQuery}
                onChange={(e) => setTemplateSearchQuery(e.target.value)}
                className="pl-9 h-10 !rounded-[8px] border bg-background text-sm shadow-sm"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
            {isLoadingTemplates ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm font-semibold">
                Loading templates...
              </div>
            ) : templates.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center border border-dashed rounded-2xl border-slate-200 dark:border-white/10 text-slate-455 dark:text-slate-400 p-6">
                <Repeat size={32} className="opacity-20 mb-2" />
                <p className="text-sm font-medium">No templates saved yet.</p>
                <p className="text-xs text-center mt-1">Save a template using the button in the footer to reuse it here.</p>
              </div>
            ) : (() => {
              const filtered = templates.filter(t =>
                t.name.toLowerCase().includes(templateSearchQuery.toLowerCase())
              );

              if (filtered.length === 0) {
                return (
                  <div className="h-48 flex flex-col items-center justify-center text-muted-foreground">
                    <p className="text-sm font-medium">No templates match "{templateSearchQuery}"</p>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filtered.map((template) => {
                    const cfg = template.config || {};
                    const fieldsCount = (cfg.customFields || []).length;

                    return (
                      <div
                        key={template.id}
                        className="relative overflow-hidden group hover:border-slate-350 dark:hover:border-white/20 transition-all duration-300 shadow-sm border border-slate-100 dark:border-white/5 rounded-lg bg-white dark:bg-[#151518] p-5 flex flex-col justify-between h-44"
                      >
                        {currentUser?.role === 'OWNER' && (
                          <button
                            type="button"
                            onClick={() => handleDeleteTemplate(template.id)}
                            className="absolute right-4 top-4 text-slate-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}

                        <div className="space-y-1.5 pr-6">
                          <div className="flex items-center gap-1.5">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">{template.name}</h3>
                          </div>
                          
                          <div className="flex flex-wrap gap-1.5">
                            <Badge variant="secondary" className="bg-purple-50 text-purple-700 dark:bg-purple-950/20 dark:text-purple-400 border border-purple-100/50 dark:border-purple-900/30 text-[10px] font-bold py-0.5 px-2">
                              {fieldsCount} {fieldsCount === 1 ? 'Field' : 'Fields'}
                            </Badge>
                          </div>

                          <p className="text-[10px] text-muted-foreground font-semibold flex items-center">
                            <CalendarIcon className="h-3 w-3 mr-1" />
                            Created: {new Date(template.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (templateModalMode === 'UPDATE') {
                              handleUpdateTemplate(template);
                            } else {
                              handleUseTemplate(cfg);
                            }
                          }}
                          className="w-full text-xs font-bold h-9 !rounded-[8px] shadow-sm transition-colors cursor-pointer bg-slate-900 hover:bg-slate-800 dark:bg-white text-white dark:text-slate-900 dark:hover:bg-slate-100"
                        >
                          {templateModalMode === 'UPDATE' ? 'Update Template' : 'Use Template'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          <div className="px-6 py-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#19191c] flex justify-end gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsTemplateSelectOpen(false)}
              className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 !rounded-[8px] transition-colors outline-none cursor-pointer"
            >
              Close
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Template Confirmation Modal */}
      <Dialog open={isDeleteTemplateOpen} onOpenChange={setIsDeleteTemplateOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-[#151518] border border-slate-200/80 dark:border-white/10 p-0 sm:!rounded-[8px] !rounded-[8px] shadow-2xl [&>button]:hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#19191c] relative shrink-0">
            <h2 className="text-[16.5px] font-bold text-slate-900 dark:text-white leading-tight">Delete Template</h2>
            <p className="text-xs text-slate-450 dark:text-slate-400 mt-1">Are you sure you want to delete this template?</p>
            <DialogPrimitive.Close className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-250 dark:hover:bg-zinc-700 transition-all rounded-full p-1.5 cursor-pointer outline-none flex items-center justify-center h-7 w-7">
              <X size={14} />
            </DialogPrimitive.Close>
          </div>
          <div className="p-6">
            <p className="text-sm text-slate-500">This action cannot be undone. This template will be permanently removed.</p>
          </div>
          <div className="px-6 py-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#19191c] flex justify-end gap-2.5">
            <Button type="button" variant="outline" onClick={() => setIsDeleteTemplateOpen(false)} className="!rounded-[8px] h-9">Cancel</Button>
            <Button type="button" onClick={confirmDeleteTemplate} className="bg-red-650 hover:bg-red-700 text-white !rounded-[8px] h-9">Delete</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Fields UI (Drawer or Modal) */}
      <DialogPrimitive.Root open={isFieldsDrawerOpen} onOpenChange={setIsFieldsDrawerOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay 
            id="omniwork-task-form-fields-drawer-overlay"
            className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm transition-opacity" 
          />
          <DialogPrimitive.Content 
            id="omniwork-task-form-fields-drawer"
            onInteractOutside={(e) => {
              e.preventDefault(); // Stop Radix from bubbling the outside click to the task Modal
              setIsFieldsDrawerOpen(false); // Only close the Add Field modal
            }}
            className="fixed z-[9999] outline-none bg-white dark:bg-[#1C1C1C] flex flex-col left-[50%] top-[50%] w-full max-w-md translate-x-[-50%] translate-y-[-50%] border border-slate-200 dark:border-white/10 shadow-xl sm:rounded-xl overflow-hidden max-h-[85vh] animate-in fade-in zoom-in-95 duration-200"
          >
            {selectedFieldType ? (
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-white/5">
                  <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100 font-semibold">
                    <span className="capitalize">{selectedFieldType}</span> <ChevronDown size={14} className="text-slate-400 cursor-pointer" />
                  </div>
                  <button onClick={() => { setSelectedFieldType(null); setNewCustomFieldName(""); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-full transition-colors">
                    <X size={16} />
                  </button>
                </div>
                
                <div className="p-5 flex-1">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
                    Field name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative mb-8">
                    <Smile size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input 
                      autoFocus 
                      placeholder="Enter name..." 
                      value={newCustomFieldName} 
                      onChange={(e) => setNewCustomFieldName(e.target.value)} 
                      className="pl-10 h-10 bg-white dark:bg-[#252525] border-slate-300 dark:border-white/10 rounded-lg text-[14px]" 
                    />
                  </div>
                  
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 block">Fill method</label>
                  <div className="flex gap-2 p-1 bg-slate-100 dark:bg-white/5 rounded-lg mb-6">
                    <button type="button" className="flex-1 py-1.5 bg-white dark:bg-[#303030] text-slate-800 dark:text-slate-200 text-[13px] font-medium rounded-md shadow-sm border border-slate-200 dark:border-white/10">Manual fill</button>
                    <button type="button" className="flex-1 py-1.5 flex items-center justify-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 text-[13px] font-medium rounded-md transition-colors"><Sparkles size={14} className="text-purple-500" /> Fill with AI</button>
                  </div>
                  
                  {(selectedFieldType === "Dropdown" || selectedFieldType === "Labels") && (
                    <div className="mb-6 border border-slate-200 dark:border-white/10 rounded-lg p-4 bg-slate-50 dark:bg-[#151515]">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 block">Options <span className="text-red-500">*</span></label>
                      <div className="flex gap-2 mb-3">
                        <Input 
                          placeholder="Type an option and press Add..." 
                          value={newOptionInput}
                          onChange={(e) => setNewOptionInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && newOptionInput.trim()) {
                              e.preventDefault();
                              if (!newFieldOptions.includes(newOptionInput.trim())) {
                                setNewFieldOptions([...newFieldOptions, newOptionInput.trim()]);
                              }
                              setNewOptionInput("");
                            }
                          }}
                          className="h-9 text-[13px] bg-white dark:bg-[#252525]"
                        />
                        <Button 
                          type="button"
                          variant="secondary"
                          className="h-9 px-3"
                          onClick={() => {
                            if (newOptionInput.trim() && !newFieldOptions.includes(newOptionInput.trim())) {
                              setNewFieldOptions([...newFieldOptions, newOptionInput.trim()]);
                              setNewOptionInput("");
                            }
                          }}
                        >
                          Add
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {newFieldOptions.map((opt) => (
                          <span key={opt} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[13px] font-medium bg-white dark:bg-[#252525] border border-slate-200 dark:border-white/10">
                            {opt}
                            <button 
                              type="button"
                              onClick={() => setNewFieldOptions(newFieldOptions.filter(o => o !== opt))}
                              className="text-slate-400 hover:text-red-500 ml-1 focus:outline-none"
                            >
                              <X size={12} />
                            </button>
                          </span>
                        ))}
                        {newFieldOptions.length === 0 && (
                          <span className="text-[13px] text-slate-400 italic">No options added yet.</span>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="border-t border-slate-100 dark:border-white/5 pt-5">
                    <button type="button" className="w-full flex items-center justify-between text-[14px] font-semibold text-slate-800 dark:text-slate-200 hover:text-slate-600 dark:hover:text-slate-400 transition-colors">
                      More settings and permissions <ChevronDown size={16} className="text-slate-400" />
                    </button>
                  </div>
                </div>
                
                <div className="p-4 border-t border-slate-100 dark:border-white/5 flex justify-end gap-3 bg-slate-50 dark:bg-[#151515]">
                  <Button 
                    type="button" 
                    onPointerDown={(e) => e.stopPropagation()} 
                    variant="outline" 
                    className="h-9 px-4 rounded-lg font-medium" 
                    onClick={() => { setSelectedFieldType(null); setNewCustomFieldName(""); }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    disabled={!newCustomFieldName.trim() || ((selectedFieldType === "Dropdown" || selectedFieldType === "Labels") && newFieldOptions.length === 0)} 
                    onClick={() => {
                      const newFieldType = (selectedFieldType || "text").toLowerCase();
                      if (activeTaskIndexForFields !== null) {
                        const newField: any = { name: newCustomFieldName, type: newFieldType, value: "" };
                        if (newFieldType === "dropdown" || newFieldType === "labels") {
                          newField.options = newFieldOptions;
                          if (newFieldType === "labels") {
                             newField.value = []; // Array for multi-select
                          }
                        }
                        const updated = [...tasksInput];
                        const currentFields = updated[activeTaskIndexForFields].customFields || [];
                        if (!currentFields.some((f: any) => f.name === newCustomFieldName)) {
                          updated[activeTaskIndexForFields].customFields = [...currentFields, newField];
                          setTasksInput(updated);
                        }
                      }
                      setSelectedFieldType(null);
                      setNewCustomFieldName("");
                      setNewFieldOptions([]);
                      setNewOptionInput("");
                      setIsFieldsDrawerOpen(false);
                    }}
                    className="h-9 px-5 rounded-lg font-medium bg-slate-400 hover:bg-slate-500 text-white disabled:opacity-50 transition-colors"
                  >
                    Create
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-white/5">
                  <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Fields</h2>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setIsFieldsDrawerOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-full transition-colors">
                      <X size={16} />
                    </button>
                  </div>
                </div>

                <div className="p-4 border-b border-slate-100 dark:border-white/5 space-y-4">
                  <div className="relative">
                    <Input 
                      placeholder="Search Task Fields" 
                      value={fieldsSearchTerm}
                      onChange={(e) => setFieldsSearchTerm(e.target.value)}
                      className="pl-3 py-5 text-sm rounded-lg border-slate-300 dark:border-white/10 bg-transparent focus-visible:ring-1" 
                    />
                  </div>
                  <div className="flex gap-6 text-sm font-medium">
                    {currentUser?.role === 'OWNER' && (
                      <button 
                        type="button"
                        onClick={() => setFieldsTab("create_new")}
                        className={`relative pb-2 ${fieldsTab === "create_new" ? "text-slate-900 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
                      >
                        Create new
                        {fieldsTab === "create_new" && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-slate-900 dark:bg-white rounded-t" />}
                      </button>
                    )}
                    <button 
                      type="button"
                      onClick={() => setFieldsTab("add_existing")}
                      className={`relative pb-2 ${fieldsTab === "add_existing" ? "text-slate-900 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
                    >
                      Add existing
                      {fieldsTab === "add_existing" && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-slate-900 dark:bg-white rounded-t" />}
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                  {fieldsTab === "create_new" && (
                    <div className="py-2">
                      <div className="px-4 py-2">
                        <h3 className="text-[13px] font-medium text-slate-500 mb-2">Popular</h3>
                        <div className="space-y-1">
                          <button type="button" onClick={() => setSelectedFieldType("Dropdown")} className="w-full flex items-center gap-3 px-3 py-2 text-[14px] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 rounded-md transition-colors">
                            <ListIcon size={16} className="text-emerald-600" /> Dropdown
                          </button>
                          <button type="button" onClick={() => setSelectedFieldType("Text")} className="w-full flex items-center gap-3 px-3 py-2 text-[14px] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 rounded-md transition-colors">
                            <Type size={16} className="text-blue-500" /> Text
                          </button>
                          <button type="button" onClick={() => setSelectedFieldType("Date")} className="w-full flex items-center gap-3 px-3 py-2 text-[14px] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 rounded-md transition-colors">
                            <CalendarIcon size={16} className="text-emerald-600" /> Date
                          </button>
                          <button type="button" onClick={() => setSelectedFieldType("Text area")} className="w-full flex items-center gap-3 px-3 py-2 text-[14px] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 rounded-md transition-colors">
                            <AlignLeft size={16} className="text-blue-500" /> Text area <span className="text-slate-400 ml-1">(Long Text)</span>
                          </button>
                          <button type="button" onClick={() => setSelectedFieldType("Number")} className="w-full flex items-center gap-3 px-3 py-2 text-[14px] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 rounded-md transition-colors">
                            <Hash size={16} className="text-emerald-500" /> Number
                          </button>
                          <button type="button" onClick={() => setSelectedFieldType("Checkbox")} className="w-full flex items-center gap-3 px-3 py-2 text-[14px] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 rounded-md transition-colors">
                            <CheckSquare size={16} className="text-purple-500" /> Checkbox
                          </button>
                          <button type="button" onClick={() => setSelectedFieldType("Website")} className="w-full flex items-center gap-3 px-3 py-2 text-[14px] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 rounded-md transition-colors">
                            <Globe size={16} className="text-pink-500" /> Website
                          </button>
                          <button type="button" onClick={() => setSelectedFieldType("Phone")} className="w-full flex items-center gap-3 px-3 py-2 text-[14px] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 rounded-md transition-colors">
                            <Phone size={16} className="text-emerald-600" /> Phone
                          </button>
                          <button type="button" onClick={() => setSelectedFieldType("Email")} className="w-full flex items-center gap-3 px-3 py-2 text-[14px] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 rounded-md transition-colors">
                            <Mail size={16} className="text-blue-500" /> Email
                          </button>
                          <button type="button" onClick={() => setSelectedFieldType("Labels")} className="w-full flex items-center gap-3 px-3 py-2 text-[14px] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 rounded-md transition-colors">
                            <Tags size={16} className="text-emerald-600" /> Labels <span className="text-slate-400 ml-1">(Multi-select)</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  {fieldsTab === "add_existing" && (
                    <div className="py-2">
                      <div className="px-4 py-2">
                        {filteredExistingCustomFields.length > 0 ? (
                          <div className="space-y-1">
                            {filteredExistingCustomFields.map((fieldName) => (
                              <button 
                                key={fieldName} 
                                type="button"
                                onClick={() => {
                                  // Find type and options from projects/tasks if they exist
                                  let matchedType = "Text";
                                  let matchedOptions = undefined;
                                  const otherProj = projects.find((p: any) => {
                                    const pFields = Array.isArray(p.customFields) ? p.customFields : [];
                                    return pFields.some((f: any) => f.name === fieldName);
                                  });
                                  if (otherProj) {
                                    const f = otherProj.customFields.find((f: any) => f.name === fieldName);
                                    matchedType = f?.type || "Text";
                                    matchedOptions = f?.options;
                                  } else {
                                    // Try to find in tasks
                                    const otherTaskProj = projects.find((p: any) => {
                                      const pTasks = Array.isArray(p.tasks) ? p.tasks : [];
                                      return pTasks.some((t: any) => {
                                        const tFields = Array.isArray(t.customFields) ? t.customFields : [];
                                        return tFields.some((f: any) => f.name === fieldName);
                                      });
                                    });
                                    if (otherTaskProj) {
                                      const t = otherTaskProj.tasks.find((t: any) => {
                                        const tFields = Array.isArray(t.customFields) ? t.customFields : [];
                                        return tFields.some((f: any) => f.name === fieldName);
                                      });
                                      const f = t.customFields.find((f: any) => f.name === fieldName);
                                      matchedType = f?.type || "Text";
                                      matchedOptions = f?.options;
                                    }
                                  }

                                  const newField = { name: fieldName, type: matchedType.toLowerCase(), value: matchedType.toLowerCase() === "labels" ? [] : "", options: matchedOptions };

                                  if (activeTaskIndexForFields !== null) {
                                    const updated = [...tasksInput];
                                    const currentFields = updated[activeTaskIndexForFields].customFields || [];
                                    if (!currentFields.some((f: any) => f.name === fieldName)) {
                                      updated[activeTaskIndexForFields].customFields = [...currentFields, newField];
                                      setTasksInput(updated);
                                    }
                                  }
                                  setIsFieldsDrawerOpen(false);
                                }}
                                className="w-full flex items-center justify-between px-3 py-2 text-[14px] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 rounded-md transition-colors group"
                              >
                                <div className="flex items-center gap-3">
                                  <Tags size={16} className="text-slate-400" />
                                  <span className="truncate">{fieldName}</span>
                                </div>
                                <Plus size={14} className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center text-sm text-slate-500 py-6">
                            No existing custom fields found.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  );
}
