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
import { createTaskAction, updateTaskAction } from "@/app/actions/tasks";
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
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  task?: any;
  projects: any[];
  taskStatuses: any[];
  users: any[];
  currentUser: any;
  onSuccess: () => void;
}) {
  const isEditing = !!task;
  const [isPending, startTransition] = useTransition();

  const [projectId, setProjectId] = useState(
    task?.projectId || (projects.length > 0 ? projects[0].id : ""),
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
        },
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
  const availableAssignees = users.filter((u) => u.role !== "CLIENT");

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
          });
        }
        if (res.error) toast.error(res.error);
        else {
          toast.success("Task updated successfully");
          onSuccess();
        }
      } else {
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
                        </div>
                      </div>
                    ))}

                    {!isEditing && (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full border-dashed"
                        onClick={addTask}
                      >
                        <Plus className="w-4 h-4 mr-2" /> Add Another Task
                      </Button>
                    )}
                  </div>
                )}

                <DialogFooter className="px-6 py-4 border-t shrink-0 bg-background sticky bottom-0 z-20">
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
    </>
  );
}
