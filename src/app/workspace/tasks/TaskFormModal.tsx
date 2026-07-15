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
import { Badge } from "@/components/ui/badge";
import {
  Plus, Trash2, Hash, Globe, Mail, Phone, Tags, CheckSquare, CircleDashed, Type, EyeOff, Settings, X, ChevronDown, AlignLeft, Sparkles, Smile, List as ListIcon, Calendar as CalendarIcon, PlusSquare
} from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { toast } from "sonner";
import { createTaskAction, updateTaskAction, createTaskTemplateAction } from "@/app/actions/tasks";
import { quickCreateProjectAction } from "@/app/actions/projects";
import { RichTextEditor } from "@/components/ui/RichTextEditor";

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

  // Custom Fields Drawer States
  const [isFieldsDrawerOpen, setIsFieldsDrawerOpen] = useState(false);
  const [fieldsTab, setFieldsTab] = useState<"create_new" | "add_existing">(currentUser?.role === 'OWNER' ? "create_new" : "add_existing");
  const [selectedFieldType, setSelectedFieldType] = useState<string | null>(null);
  const [newCustomFieldName, setNewCustomFieldName] = useState("");
  const [newFieldOptions, setNewFieldOptions] = useState<string[]>([]);
  const [newOptionInput, setNewOptionInput] = useState("");
  const [activeTaskIndexForFields, setActiveTaskIndexForFields] = useState<number | null>(null);
  const [fieldsSearchTerm, setFieldsSearchTerm] = useState("");

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
            toast.success("Repeated tasks created successfully");
            onSuccess();
          }
          return;
        }

        // Multi-create
        let errors = 0;
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
          }
        }

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
          className="sm:max-w-[700px] p-0 flex flex-col h-[85vh] overflow-hidden bg-background"
          onInteractOutside={(e) => {
            if (isQuickProjectOpen || activeTaskAssigneeIndex !== null)
              e.preventDefault();
          }}
        >
          <DialogHeader className="px-6 py-4 border-b shrink-0 bg-background sticky top-0 z-20">
            <DialogTitle className="text-xl">
              {isEditing
                ? isLimitedEdit
                  ? "Update Task Status"
                  : "Edit Task"
                : "Create Tasks"}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Update the details of your task."
                : "Select a project and create one or multiple tasks for it."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
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
                {!isClient && projectTotalHours > 0 && (
                  <div
                    className={`p-4 rounded-lg border text-sm space-y-2 shadow-sm ${isExceeded ? "bg-destructive/10 border-destructive text-destructive" : "bg-muted/30 border-slate-200 dark:border-slate-800"}`}
                  >
                    <div className="flex justify-between font-medium">
                      <span>Project Total Hours:</span>
                      <span>{projectTotalHours}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Already Allocated to Tasks:</span>
                      <span>{alreadyAllocated}</span>
                    </div>
                    <div className="flex justify-between font-bold border-t pt-2 border-slate-200 dark:border-slate-800/50 mt-1">
                      <span>Remaining Available Hours:</span>
                      <span>{remainingHours}</span>
                    </div>
                    {isExceeded && (
                      <p className="text-xs font-bold mt-2">
                        Task allocated hours exceed the project’s total
                        allocated hours. Increase project hours or reduce task
                        hours.
                      </p>
                    )}
                  </div>
                )}

                {/* Project Selection (only when creating) */}
                {!isEditing && (
                  <div className="space-y-2 bg-white dark:bg-[#1f1f1f] p-4 rounded-lg border shadow-sm">
                    <label className="text-sm font-medium">
                      Project <span className="text-destructive">*</span>
                    </label>
                    <select
                      required
                      value={projectId}
                      onChange={handleProjectSelectChange}
                      className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="" disabled>
                        Select a project
                      </option>
                      {assignableProjects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                      {isOwner && (
                        <option
                          value="NEW_PROJECT"
                          className="font-bold text-primary"
                        >
                          + Create New Project
                        </option>
                      )}
                    </select>
                  </div>
                )}

                {/* If Member is doing a limited edit */}
                {isLimitedEdit ? (
                  <div className="grid grid-cols-2 gap-4 bg-white dark:bg-[#1f1f1f] p-4 rounded-lg border shadow-sm">
                    <div className="col-span-2 p-3 bg-muted/50 rounded-xl border text-sm">
                      <strong>Task:</strong> {task.title}
                      <br />
                      <span className="text-muted-foreground">
                        {task.description}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Status</label>
                      <select
                        value={tasksInput[0].statusId}
                        onChange={(e) =>
                          updateTaskInput(0, "statusId", e.target.value)
                        }
                        className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="">No Status</option>
                        {taskStatuses.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Tracked Hours
                      </label>
                      <NumberStepper
                        step={0.1}
                        min={0}
                        value={trackedHours}
                        onChange={(e) => setTrackedHours(e.target.value)}
                        placeholder="e.g. 5.5"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {tasksInput.map((tInput, index) => (
                      <div
                        key={tInput.id}
                        className="bg-white dark:bg-[#1f1f1f] p-4 rounded-lg border shadow-sm space-y-4 relative"
                      >
                        {!isEditing && tasksInput.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2 h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => removeTask(index)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2 col-span-2 md:col-span-1">
                            <label className="text-sm font-medium">
                              Task Title{" "}
                              <span className="text-destructive">*</span>
                            </label>
                            <Input
                              required
                              value={tInput.title}
                              onChange={(e) =>
                                updateTaskInput(index, "title", e.target.value)
                              }
                              placeholder="e.g. Design Landing Page"
                            />
                          </div>

                          {!isClient && (
                            <div className="space-y-2 col-span-2 md:col-span-1">
                              <label className="text-sm font-medium">
                                Status
                              </label>
                              <select
                                value={tInput.statusId}
                              onChange={(e) =>
                                updateTaskInput(
                                  index,
                                  "statusId",
                                  e.target.value,
                                )
                              }
                              className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                            >
                              <option value="">No Status</option>
                              {taskStatuses.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          )}

                          <div className="space-y-2 col-span-2">
                            <label className="text-sm font-medium">
                              Description
                            </label>
                            <RichTextEditor
                              content={tInput.description}
                              onChange={(val) =>
                                updateTaskInput(
                                  index,
                                  "description",
                                  val,
                                )
                              }
                              placeholder="Task details and instructions..."
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium">
                              Priority
                            </label>
                            <select
                              value={tInput.priority}
                              onChange={(e) =>
                                updateTaskInput(
                                  index,
                                  "priority",
                                  e.target.value,
                                )
                              }
                              className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                            >
                              <option value="LOW">Low</option>
                              <option value="MEDIUM">Medium</option>
                              <option value="HIGH">High</option>
                              <option value="CRITICAL">Critical</option>
                            </select>
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium">
                              Due Date
                            </label>
                            <Input
                              type="date"
                              value={tInput.dueDate}
                              onChange={(e) =>
                                updateTaskInput(
                                  index,
                                  "dueDate",
                                  e.target.value,
                                )
                              }
                            />
                          </div>

                          {!isClient && (
                            <div className="space-y-2">
                              <label className="text-sm font-medium">
                                Allocated Hours{" "}
                                <span className="text-destructive">*</span>
                              </label>
                              <NumberStepper
                              step={0.1}
                              min={0.1}
                              required
                              value={tInput.allocatedHours}
                              onChange={(e) =>
                                updateTaskInput(
                                  index,
                                  "allocatedHours",
                                  e.target.value,
                                )
                              }
                              placeholder="e.g. 10.5"
                            />
                          </div>
                          )}

                          {isEditing && !isClient && (
                            <div className="space-y-2">
                              <label className="text-sm font-medium">
                                Tracked Hours
                              </label>
                              <NumberStepper
                                step={0.1}
                                min={0}
                                value={trackedHours}
                                onChange={(e) =>
                                  setTrackedHours(e.target.value)
                                }
                                placeholder="e.g. 5.5"
                              />
                            </div>
                          )}

                          {!isClient && (
                            <div className="space-y-2 col-span-2">
                              <label className="text-sm font-medium">
                                Assignees
                              </label>
                            <div
                              className="min-h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm cursor-pointer hover:border-primary/50 transition-colors flex flex-wrap gap-2 items-center"
                              onClick={() => setActiveTaskAssigneeIndex(index)}
                            >
                              {tInput.assignees.length === 0 ? (
                                <span className="text-muted-foreground">
                                  Click to assign team members...
                                </span>
                              ) : (
                                tInput.assignees.map((id) => {
                                  const u = users.find(
                                    (user) => user.id === id,
                                  );
                                  return u ? (
                                    <Badge
                                      key={id}
                                      variant="secondary"
                                      className="font-normal"
                                    >
                                      {u.name}
                                    </Badge>
                                  ) : null;
                                })
                              )}
                            </div>
                          </div>
                          )}

                          {/* Custom Fields */}
                          <div className="space-y-3 col-span-2 pt-2 border-t">
                            <div className="flex justify-between items-center mb-1">
                              <label className="text-sm font-semibold flex items-center gap-1.5 text-muted-foreground">
                                Custom Fields
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
                                className="h-8 px-3 text-[13px] bg-white dark:bg-[#252525] border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-slate-700 dark:text-slate-300 shadow-sm rounded-lg"
                              >
                                <Plus className="mr-1.5 h-3.5 w-3.5 text-slate-400" /> Add Field
                              </Button>
                            </div>

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

                                switch(fieldType) {
                                  case 'text area':
                                    return <textarea value={field.value || ''} onChange={e => updateValue(e.target.value)} placeholder="—" className={`${commonClasses} py-2.5 resize-none custom-scrollbar`} />;
                                  case 'checkbox':
                                    return <div className="flex items-center h-full px-4"><input type="checkbox" checked={!!field.value} onChange={e => updateValue(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" /></div>;
                                  case 'dropdown':
                                    return (
                                      <select value={field.value || ''} onChange={e => updateValue(e.target.value)} className={`${commonClasses} cursor-pointer`}>
                                        <option value="" disabled>Select an option</option>
                                        {(field.options || []).map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                                      </select>
                                    );
                                  case 'labels':
                                    const currentValues = Array.isArray(field.value) ? field.value : [];
                                    return (
                                      <div className="flex items-center flex-wrap gap-1.5 h-full px-4 py-1 overflow-y-auto custom-scrollbar">
                                        {currentValues.map((v: string) => (
                                           <span key={v} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[12px] font-medium bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300">
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
                                           className="bg-transparent text-[12px] text-slate-500 outline-none cursor-pointer"
                                        >
                                           <option value="" disabled>+ Add label</option>
                                           {(field.options || []).filter((o: string) => !currentValues.includes(o)).map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                                        </select>
                                      </div>
                                    );
                                  case 'number':
                                    return <NumberStepper value={field.value || ''} onChange={e => updateValue(e.target.value)} placeholder="0" min={0} step={1} className={commonClasses} inputClassName="text-[14px] text-slate-700 dark:text-slate-300" />;
                                  case 'date':
                                    return <Input type="date" value={field.value || ''} onChange={e => updateValue(e.target.value)} className={commonClasses} />;
                                  case 'website':
                                  case 'url':
                                    return <Input type="url" value={field.value || ''} onChange={e => updateValue(e.target.value)} placeholder="https://..." className={commonClasses} />;
                                  case 'phone':
                                    return <Input type="tel" value={field.value || ''} onChange={e => updateValue(e.target.value)} placeholder="+1..." className={commonClasses} />;
                                  case 'email':
                                    return <Input type="email" value={field.value || ''} onChange={e => updateValue(e.target.value)} placeholder="email@example.com" className={commonClasses} />;
                                  default:
                                    return <Input type="text" value={field.value || ''} onChange={e => updateValue(e.target.value)} placeholder="—" className={commonClasses} />;
                                }
                              };

                              return (tInput.customFields || []).length > 0 && (
                                <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1 custom-scrollbar">
                                  {(tInput.customFields || []).map((field, fIndex) => (
                                    <div
                                      key={fIndex}
                                      className={`flex items-stretch w-full border border-slate-200 dark:border-white/10 rounded-md overflow-hidden group transition-all ${field.type === 'text area' ? 'h-[80px]' : field.type === 'labels' ? 'min-h-[42px]' : 'h-[42px]'}`}
                                    >
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
                                          className="h-7 text-[14px] bg-transparent border-0 focus-visible:ring-1 focus-visible:ring-slate-300 px-1 font-medium text-slate-700 dark:text-slate-300 w-full shadow-none"
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
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Repeat Task settings (only when creating a single task) */}
                    {!isEditing && tasksInput.length === 1 && (
                      <div className="space-y-4 bg-purple-50/50 dark:bg-purple-950/10 p-4 rounded-xl border border-purple-100 dark:border-purple-900/30">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <label className="text-sm font-bold text-foreground flex items-center gap-1.5">
                              Repeat Task
                            </label>
                            <p className="text-xs text-muted-foreground">
                              Automatically create duplicate tasks based on frequency.
                            </p>
                          </div>
                          <input
                            type="checkbox"
                            checked={isRepeatEnabled}
                            onChange={(e) => setIsRepeatEnabled(e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                          />
                        </div>

                        {isRepeatEnabled && (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-purple-100/50 dark:border-purple-900/20 animate-in fade-in slide-in-from-top-1 duration-200">
                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold text-muted-foreground">Frequency</label>
                              <select
                                value={repeatFrequency}
                                onChange={(e) => setRepeatFrequency(e.target.value as any)}
                                className="flex h-9 w-full rounded-xl border bg-background px-3 text-sm focus:ring-1 focus:ring-ring"
                              >
                                <option value="DAILY">Daily</option>
                                <option value="WEEKLY">Weekly</option>
                                <option value="MONTHLY">Monthly</option>
                              </select>
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold text-muted-foreground">Start Date</label>
                              <Input
                                type="date"
                                required={isRepeatEnabled}
                                value={repeatStartDate}
                                onChange={(e) => setRepeatStartDate(e.target.value)}
                                className="h-9 text-xs"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold text-muted-foreground">End Date</label>
                              <Input
                                type="date"
                                required={isRepeatEnabled}
                                value={repeatEndDate}
                                onChange={(e) => setRepeatEndDate(e.target.value)}
                                className="h-9 text-xs"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <DialogFooter className="px-6 py-4 border-t shrink-0 bg-background sticky bottom-0 z-20 flex justify-between items-center">
                  {!isEditing && tasksInput.length === 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsSaveTemplateOpen(true)}
                      className="text-purple-600 border-purple-200 hover:bg-purple-50 dark:text-purple-400 dark:border-purple-900/50 dark:hover:bg-purple-950/20"
                    >
                      Save as Template
                    </Button>
                  )}
                  <div className="flex gap-2 ml-auto">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => onOpenChange(false)}
                      className="rounded-full shadow-sm hover:bg-slate-50 transition-colors h-10 px-5 font-semibold text-sm border-slate-200"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={
                        isPending || (!isEditing && !projectId) || isExceeded
                      }
                      className="rounded-full shadow-sm h-10 px-5 font-semibold text-sm bg-foreground text-background hover:bg-foreground/90 transition-colors"
                    >
                      {isPending
                        ? "Saving..."
                        : isEditing
                          ? "Update Task"
                          : "Save Tasks"}
                    </Button>
                  </div>
                </DialogFooter>
              </form>
            );
          })()}
          </div>
        </DialogContent>
      </Dialog>

      {/* Quick Create Project Nested Modal */}
      <Dialog open={isQuickProjectOpen} onOpenChange={setIsQuickProjectOpen}>
        <DialogContent
          className="sm:max-w-[400px]"
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          {" "}
          <DialogHeader>
            <DialogTitle>Quick Create Project</DialogTitle>
            <DialogDescription>
              Create a new project instantly to add tasks to it.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleQuickCreateProject} className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Project Name</label>
              <Input
                required
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="e.g. Q3 Marketing Campaign"
              />
            </div>
            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsQuickProjectOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Creating..." : "Create Project"}
              </Button>
            </DialogFooter>
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
          className="sm:max-w-[400px]"
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          {" "}
          <DialogHeader>
            <DialogTitle>Select Assignees</DialogTitle>
            <DialogDescription>Assign members to this task.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="border rounded-xl p-3 max-h-[300px] overflow-y-auto space-y-1 bg-background shadow-inner custom-scrollbar">
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
                      className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded cursor-pointer transition-colors"
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
            <DialogFooter className="pt-4 border-t mt-4">
              <Button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setActiveTaskAssigneeIndex(null);
                }}
                className="w-full"
              >
                Done
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Save Template Name Modal */}
      <Dialog open={isSaveTemplateOpen} onOpenChange={setIsSaveTemplateOpen}>
        <DialogContent className="sm:max-w-[400px] bg-background border-border">
          <DialogHeader>
            <DialogTitle>Save as Template</DialogTitle>
            <DialogDescription>
              Enter a name for this task template. This will save the task details, priority, config, and custom fields.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveTemplate} className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Template Name</label>
              <Input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                required
                placeholder="e.g. SEO Audit Template"
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
