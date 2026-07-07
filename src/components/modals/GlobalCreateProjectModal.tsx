"use client";

import React, { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Users, Trash2, X, Loader2 } from "lucide-react";
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
import { createProjectAction, quickCreateClientAction } from "@/app/actions/projects";
import { getProjectFormDataAction } from "@/app/actions/getProjectFormDataAction";
import { RichTextEditor } from "@/components/ui/RichTextEditor";

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
    }
  }, [isOpen]);

  const clients = users.filter((u) => u.role === "CLIENT");
  const members = users.filter((u) => u.role !== "CLIENT");

  const handleCreateProject = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const data = {
      name: formData.get("name") as string,
      clientId: (formData.get("clientId") as string) || undefined,
      projectManagerId:
        (formData.get("projectManagerId") as string) || undefined,
      description: description,
      statusId: (formData.get("statusId") as string) || undefined,
      priority: formData.get("priority") as any,
      startDate: formData.get("startDate") as string,
      endDate: formData.get("endDate") as string,
      isOngoing,
      projectBudget: formData.get("projectBudget")
        ? Number(formData.get("projectBudget"))
        : undefined,
      totalAllocatedHours: formData.get("totalAllocatedHours")
        ? Number(formData.get("totalAllocatedHours"))
        : undefined,
      notes: formData.get("notes") as string,
      assigneeIds: [],
      customFields,
      tasks: projectTasks
        .filter((t) => t.title.trim() !== "")
        .map((t) => ({
          title: t.title,
          description: t.description,
          priority: t.priority as any,
          status: t.status as any,
          assigneeIds: t.assigneeId ? [t.assigneeId] : [],
        })),
    };

    startTransition(async () => {
      const res = await createProjectAction(data);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Project created successfully");
        setIsOpen(false);
        // Reset state
        setDescription("");
        setIsOngoing(false);
        setProjectTasks([]);
        setCustomFields([]);
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
          <DialogHeader className="sticky top-0 bg-background z-10 px-6 py-4 border-b shrink-0 shadow-sm">
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Setup a new project workspace, assign a PM, and configure
              timelines.
            </DialogDescription>
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
                    defaultValue="MEDIUM"
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
                  <Input name="startDate" type="date" required />
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
                    <Input name="endDate" type="date" required={!isOngoing} />
                  ) : (
                    <div className="flex h-9 w-full items-center justify-center rounded-xl border bg-muted/50 text-xs text-muted-foreground italic">
                      Project has no end date
                    </div>
                  )}
                </div>
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

              <DialogFooter className="pt-4 border-t mt-6 sticky bottom-0 bg-background pb-2">
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


    </>
  );
}
