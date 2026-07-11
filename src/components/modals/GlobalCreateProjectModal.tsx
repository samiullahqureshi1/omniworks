"use client";

import React, { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Users, Trash2, X, Loader2, ChevronDown, Check, Repeat, FolderKanban, Pin, Star, LayoutGrid, Search, Edit2, Calendar, Clock, ShieldAlert, Crown, Shield, MoreHorizontal, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { createProjectAction, quickCreateClientAction, createProjectTemplateAction, getProjectTemplatesAction, deleteProjectTemplateAction } from "@/app/actions/projects";
import { getProjectFormDataAction } from "@/app/actions/getProjectFormDataAction";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { getRulesAction, createRuleAction } from "@/app/actions/rules";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function GlobalCreateProjectModal({
  isOpen,
  setIsOpen,
}: {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [users, setUsers] = useState<any[]>([]);
  const [projectStatuses, setProjectStatuses] = useState<any[]>([]);

  // Modal States
  const [isQuickClientOpen, setIsQuickClientOpen] = useState(false);

  // Form States
  const [description, setDescription] = useState("");
  const [isOngoing, setIsOngoing] = useState(false);

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

  // Repeat Settings States
  const [isRepeatEnabled, setIsRepeatEnabled] = useState(false);
  const [repeatFrequency, setRepeatFrequency] = useState<"DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY">("DAILY");
  const [repeatTime, setRepeatTime] = useState("09:00");

  // Template Save States
  const [isSaveTemplateOpen, setIsSaveTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");

  const [isTemplateSelectOpen, setIsTemplateSelectOpen] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [templateSearchQuery, setTemplateSearchQuery] = useState("");
  const [pinnedTemplateIds, setPinnedTemplateIds] = useState<string[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [defaultTemplateId, setDefaultTemplateId] = useState<string | null>(null);

  // Rule States
  const [rules, setRules] = useState<any[]>([]);
  const [attachedRuleIds, setAttachedRuleIds] = useState<string[]>([]);
  const [isCreateRuleOpen, setIsCreateRuleOpen] = useState(false);

  // Rule Form States
  const [ruleFormName, setRuleFormName] = useState("");
  const [ruleFormDescription, setRuleFormDescription] = useState("");
  const [ruleFormFrequency, setRuleFormFrequency] = useState("DAILY");
  const [ruleFormReminderTime, setRuleFormReminderTime] = useState("09:00 AM");
  const [ruleFormActionType, setRuleFormActionType] = useState("SEND_REMINDER");
  const [ruleFormRecipients, setRuleFormRecipients] = useState<string[]>(["PROJECT_MANAGER"]);

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
        // Refresh rule list
        const rulesRes = await getRulesAction();
        if (rulesRes.success && rulesRes.rules) {
          setRules(rulesRes.rules);
        }
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
      repeatTime,
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
    setRepeatTime(config.repeatTime || "09:00");

    setIsTemplateSelectOpen(false);
    setIsOpen(true);
  };

  const [projectTasks, setProjectTasks] = useState<
    {
      id: string;
      title: string;
      description: string;
      status: string;
      priority: string;
      assigneeId: string;
    }[]
  >([]);
  const [customFields, setCustomFields] = useState<
    { name: string; type: string; value: string }[]
  >([]);

  // Inline Status Creation States
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
        setProjectStatuses((prev) => [...prev, newStatus]);
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

  useEffect(() => {
    if (isOpen) {
      getProjectFormDataAction().then((res) => {
        if (res.success && res.users) {
          setUsers(res.users);
        }
        if (res.projectStatuses) {
          setProjectStatuses(res.projectStatuses);
        }
      });
      getRulesAction().then((res: any) => {
        if (res.success && res.rules) {
          setRules(res.rules);
        }
      });
    }
  }, [isOpen]);

  const clients = users.filter((u) => u.role === "CLIENT");
  const members = users.filter((u) => u.role !== "CLIENT");

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
      isRepeated: isRepeatEnabled,
      repeatSettings: {
        enabled: isRepeatEnabled,
        frequency: repeatFrequency,
          time: repeatTime,
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
        setIsOpen(false);
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
        setRepeatTime("09:00");
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
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;

    startTransition(async () => {
      const res = await quickCreateClientAction(name, email);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Client created successfully");
        setIsQuickClientOpen(false);
        setUsers([...users, res.client]);
      }
    });
  };

  return (
    <>
      {/* Create Project Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
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
            
            <div className="flex items-center gap-2 shrink-0">
              {/* Templates Selector in Header */}
              <Button type="button" variant="outline" size="sm" className="h-9 rounded-xl border bg-background px-3 text-xs font-semibold flex items-center gap-1.5 shadow-sm" onClick={() => setIsTemplateSelectOpen(true)}>
                <FolderKanban className="h-3.5 w-3.5 text-muted-foreground" /> Select from Template...
              </Button>
              
              {/* Rules Selector in Header */}
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
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium">Status</label>
                    <button 
                      type="button" 
                      onClick={() => setIsCreatingStatus(!isCreatingStatus)} 
                      className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                    >
                      {isCreatingStatus ? "Cancel" : "+ New Status"}
                    </button>
                  </div>

                  {isCreatingStatus ? (
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Status Name (e.g. Planning)"
                        value={newStatusName}
                        onChange={(e) => setNewStatusName(e.target.value)}
                        disabled={isSavingStatus}
                        className="h-9"
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleCreateStatus}
                        disabled={isSavingStatus || !newStatusName.trim()}
                        className="h-9"
                      >
                        {isSavingStatus ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                      </Button>
                    </div>
                  ) : (
                    <>
                      {projectStatuses.length === 0 ? (
                        <div className="text-sm text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-200">
                          No statuses available.{' '}
                          <button type="button" onClick={() => setIsCreatingStatus(true)} className="font-semibold underline">
                            Create one here.
                          </button>
                        </div>
                      ) : (
                        <select
                          name="statusId"
                          value={formStatusId}
                          onChange={(e) => setFormStatusId(e.target.value)}
                          className="flex h-9 w-full rounded-xl border bg-background px-3 text-sm focus:ring-1 focus:ring-ring"
                        >
                          {projectStatuses.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </>
                  )}
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
                        disabled={isRepeatEnabled}
                        className="rounded border-gray-300 text-primary focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <label
                        htmlFor="ongoing"
                        className={`text-xs ${isRepeatEnabled ? 'text-muted-foreground/50 cursor-not-allowed' : 'text-muted-foreground cursor-pointer'}`}
                      >
                        Ongoing
                      </label>
                    </div>
                  </div>
                  {isRepeatEnabled && (
                    <div className="text-[10px] text-amber-600 dark:text-amber-400 -mt-1 mb-1">
                      * Ongoing is disabled for repeating projects.
                    </div>
                  )}
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
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-purple-100/50 dark:border-purple-900/20 animate-in fade-in slide-in-from-top-2 duration-200">
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
                          status: "TODO",
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
                            <option value="TODO">To Do</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="DONE">Done</option>
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
                    onClick={() => setIsOpen(false)}
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
                {isPending ? "Creating..." : "Create Client"}
              </Button>
            </DialogFooter>
          </form>
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
                          <option value="QUARTERLY">Quarterly</option>
                          <option value="YEARLY">Yearly</option>
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
    </>
  );
}
