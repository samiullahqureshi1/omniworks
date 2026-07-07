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
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
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
  customFields?: { name: string; type: string; value: string }[];
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
  const isEditing = !!task;
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
        statusId: "",
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
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
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
                              <Input
                              type="number"
                              step="0.1"
                              min="0.1"
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
                              <Input
                                type="number"
                                step="0.1"
                                min="0"
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
                            <div className="flex justify-between items-center">
                              <label className="text-sm font-semibold flex items-center gap-1.5 text-muted-foreground">
                                Custom Fields
                              </label>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const updated = [...tasksInput];
                                  const currentFields = updated[index].customFields || [];
                                  updated[index].customFields = [
                                    ...currentFields,
                                    { name: "", type: "text", value: "" }
                                  ];
                                  setTasksInput(updated);
                                }}
                                className="h-8 text-xs rounded-lg"
                              >
                                <Plus className="mr-1 h-3 w-3" /> Add Field
                              </Button>
                            </div>

                            {(tInput.customFields || []).length > 0 && (
                              <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1 custom-scrollbar">
                                {(tInput.customFields || []).map((field, fIndex) => (
                                  <div
                                    key={fIndex}
                                    className="p-3 border rounded-xl bg-muted/20 space-y-3 relative group"
                                  >
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const updated = [...tasksInput];
                                        updated[index].customFields = (updated[index].customFields || []).filter((_, i) => i !== fIndex);
                                        setTasksInput(updated);
                                      }}
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
                                            const updated = [...tasksInput];
                                            if (updated[index].customFields) {
                                              updated[index].customFields[fIndex].name = e.target.value;
                                              setTasksInput(updated);
                                            }
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
                                            const updated = [...tasksInput];
                                            if (updated[index].customFields) {
                                              updated[index].customFields[fIndex].type = e.target.value;
                                              updated[index].customFields[fIndex].value = "";
                                              setTasksInput(updated);
                                            }
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
                                          const updated = [...tasksInput];
                                          if (updated[index].customFields) {
                                            updated[index].customFields[fIndex].value = e.target.value;
                                            setTasksInput(updated);
                                          }
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
    </>
  );
}
