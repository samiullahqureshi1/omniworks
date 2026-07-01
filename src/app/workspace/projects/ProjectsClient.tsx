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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  createProjectAction,
  deleteProjectAction,
  quickCreateClientAction,
  updateProjectStatusAction,
} from "@/app/actions/projects";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
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
      
      {project.client && (
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
          {project.assignees.slice(0, 3).map((a: any) => (
            <Avatar key={a.user.id} className="h-7 w-7 border-2 border-background shadow-sm transition-transform group-hover:scale-110 duration-300">
              <AvatarFallback className="bg-gradient-to-br from-primary/10 to-primary/20 text-primary text-[10px] font-bold">{a.user.name.substring(0,2).toUpperCase()}</AvatarFallback>
            </Avatar>
          ))}
          {project.assignees.length > 3 && (
            <div className="h-7 w-7 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground shadow-sm z-10">
              +{project.assignees.length - 3}
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
  const [description, setDescription] = useState("");
  const [viewMode, setViewMode] = useState<"TABLE" | "KANBAN" | "LIST">("TABLE");

  useEffect(() => {
    const savedView = localStorage.getItem("omniwork_project_view");
    if (savedView === "TABLE" || savedView === "KANBAN" || savedView === "LIST") {
      setViewMode(savedView);
    }
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
        window.location.reload();
      } else {
        toast.success(`Project moved to ${newStatusName}`);
      }
    });
  };

  const handleCreateProject = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const data = {
      name: formData.get("name") as string,
      clientId: (formData.get("clientId") as string) || undefined,
      projectManagerId:
        (formData.get("projectManagerId") as string) || undefined,
      description: description,
      statusId: formData.get("status") as string,
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
      tasks: projectTasks
        .filter((t) => t.title.trim() !== "")
        .map((t) => ({
          title: t.title,
          description: t.description,
          priority: t.priority as any,
          statusId: t.status as string,
          assigneeIds: t.assigneeId ? [t.assigneeId] : [],
        })),
    };

    startTransition(async () => {
      const res = await createProjectAction(data);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Project created successfully");
        setIsCreateOpen(false);
        setProjectTasks([]);
        window.location.reload();
      }
    });
  };

  const handleQuickCreateClient = async (
    e: React.FormEvent<HTMLFormElement>,
  ) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    startTransition(async () => {
      const res = await quickCreateClientAction(
        formData.get("name") as string,
        formData.get("email") as string,
        password,
      );
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Client created successfully");
        setIsQuickClientOpen(false);
        window.location.reload(); // Refresh to update client list
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
          <Button
            onClick={() => setIsCreateOpen(true)}
            className="w-full sm:w-auto shadow-md"
          >
            <Plus className="mr-2 h-4 w-4" /> New Project
          </Button>
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
                      </Link>
                      {p.client && (
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
                      {p.assignees.map((a: any) => (
                        <div
                          key={a.user.id}
                          title={a.user.name}
                          className="relative border-2 border-background rounded-full"
                        >
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                              {a.user.name.substring(0, 2)}
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
                    <Badge variant="outline" className="border-transparent font-medium text-white" style={{ backgroundColor: p.status?.color || '#cccccc' }}>{p.status?.name || "No Status"}</Badge>
                  </div>
                  {p.description ? (
                    <div className="text-sm text-muted-foreground line-clamp-2 max-w-3xl" dangerouslySetInnerHTML={{ __html: p.description }} />
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No description provided.</p>
                  )}
                  {p.client && <p className="text-xs text-muted-foreground mt-2 font-medium">Client: {p.client.name}</p>}
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
                      {p.assignees.slice(0, 4).map((a: any) => (
                        <Avatar key={a.user.id} className="h-8 w-8 border-2 border-background" title={a.user.name}>
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">{a.user.name.substring(0,2)}</AvatarFallback>
                        </Avatar>
                      ))}
                      {p.assignees.length > 4 && (
                        <div className="h-8 w-8 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[10px] font-medium text-muted-foreground z-10">
                          +{p.assignees.length - 4}
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
                <label className="text-sm font-medium">Status</label>
                <select
                  name="status"
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

            <DialogFooter className="pt-4 border-t mt-6 sticky bottom-0 bg-background pb-2">
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
                <div className="space-y-2">
                  <label className="text-sm font-medium">Password</label>
                  <Input
                    name="password"
                    type="password"
                    required
                    placeholder="••••••••"
                    minLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Confirm Password
                  </label>
                  <Input
                    name="confirmPassword"
                    type="password"
                    required
                    placeholder="••••••••"
                    minLength={6}
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
    </div>
  );
}
