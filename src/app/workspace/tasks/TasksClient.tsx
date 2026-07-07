'use client';

import React, { useState, useTransition, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatHours } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Settings, Calendar, Clock, LayoutGrid, List, Columns } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Trash2, ChevronDown, Repeat } from 'lucide-react';
import { deleteTaskAction, updateTaskAction, getTaskTemplatesAction, deleteTaskTemplateAction } from '@/app/actions/tasks';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import TaskFormModal from './TaskFormModal';
import StatusManagementModal from './StatusManagementModal';
import { DndContext, DragOverlay, useDraggable, useDroppable, closestCorners, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';

function KanbanTaskCard({ task, currentUser, openEdit, handleDelete, router, isDraggingOverlay = false }: any) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: task,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  const priorityHex = task.priority === 'CRITICAL' ? '#ef4444' : task.priority === 'HIGH' ? '#f97316' : task.priority === 'MEDIUM' ? '#3b82f6' : '#cbd5e1';

  return (
    <div 
      ref={isDraggingOverlay ? null : setNodeRef} 
      style={style} 
      {...(isDraggingOverlay ? {} : attributes)} 
      {...(isDraggingOverlay ? {} : listeners)}
      className={`bg-background border border-border/40 rounded-xl p-4 shadow-sm hover:shadow-lg hover:border-primary/30 transition-all duration-300 group flex flex-col gap-3 cursor-grab active:cursor-grabbing relative overflow-hidden ${isDragging ? 'opacity-40' : ''} ${isDraggingOverlay ? 'cursor-grabbing shadow-2xl scale-105' : ''}`}
    >
      <div className="absolute top-0 left-0 w-[4px] h-full transition-all duration-300 group-hover:w-[6px]" style={{ backgroundColor: priorityHex }} />
      
      <div className="flex justify-between items-start gap-3 pl-2">
        <span className="font-semibold text-[14px] leading-snug text-foreground/90 transition-colors line-clamp-2 flex items-center gap-1.5 flex-wrap">
          {task.title}
          {task.isRepeated && (
            <Badge variant="outline" className="text-[9px] bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/50 py-0 px-1 font-semibold flex items-center gap-0.5 shrink-0 align-middle">
              <Repeat size={8} /> Recurring
            </Badge>
          )}
        </span>
        {currentUser.role !== 'CLIENT' && !isDraggingOverlay && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-muted rounded-md cursor-pointer shrink-0" onPointerDown={(e) => e.stopPropagation()}>
                <MoreHorizontal size={14} className="text-muted-foreground hover:text-foreground" />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEdit(task); }} className="cursor-pointer">
                <Edit className="w-4 h-4 mr-2" /> Edit Task
              </DropdownMenuItem>
              {(currentUser.role === 'OWNER' || task.project?.projectManagerId === currentUser.userId) && (
                <DropdownMenuItem className="text-destructive focus:text-destructive cursor-pointer" onClick={(e) => { e.stopPropagation(); handleDelete(task.id); }}>
                  <Trash2 className="w-4 h-4 mr-2" /> Delete Task
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      
      <div className="pl-2 flex items-center justify-between">
        <span className="text-[12px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded flex items-center hover:bg-primary/20 transition-colors cursor-pointer" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); router.push(`/workspace/projects/${task.projectId}`); }}>
          {task.project?.name}
        </span>
        
        {task.dueDate && (
          <div className="text-[11px] font-semibold flex items-center gap-1.5 text-muted-foreground">
            <Calendar size={12} className="opacity-70" /> {formatDate(task.dueDate)}
          </div>
        )}
      </div>
      
      <div className="flex justify-between items-center mt-2 pl-2">
        <div className="flex -space-x-2 overflow-hidden py-1">
          {task.assignees?.map((a: any) => (
            <div key={a.userId} className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-background shadow-sm transition-transform group-hover:scale-110 duration-200 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 text-[9px]" title={a.user?.name}>
              {a.user?.name?.charAt(0).toUpperCase()}
            </div>
          ))}
          {(!task.assignees || task.assignees.length === 0) && (
            <div className="w-6 h-6 rounded-full bg-slate-50 dark:bg-slate-900 border-2 border-background border-dashed flex items-center justify-center">
              <Plus size={10} className="text-muted-foreground" />
            </div>
          )}
        </div>
        
        {task.allocatedHours > 0 && (
          <div className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
            <Clock size={12} className="opacity-70" />
            <span>{formatHours(task.trackedHours || 0)} / {task.allocatedHours}h</span>
          </div>
        )}
      </div>
    </div>
  );
}

function KanbanColumn({ status, statusTasks, currentUser, openEdit, handleDelete, router, setSelectedTaskForChat }: any) {
  const { setNodeRef } = useDroppable({
    id: status.id,
    data: status,
  });

  return (
    <div className="flex flex-col w-[320px] shrink-0 bg-muted/30 rounded-2xl border border-border/50">
      <div className="flex items-center justify-between p-4 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: status.color }} />
          <h3 className="font-semibold text-sm text-foreground/80 tracking-wide uppercase">{status.name}</h3>
          <span className="text-xs font-medium bg-background border px-1.5 py-0.5 rounded-md text-muted-foreground">{statusTasks.length}</span>
        </div>
      </div>
      
      <div ref={setNodeRef} className="flex-1 p-3 flex flex-col gap-3 min-h-[150px] transition-colors rounded-b-2xl">
        {statusTasks.length === 0 ? (
          <div className="h-24 border-2 border-dashed border-border/50 rounded-xl flex items-center justify-center text-xs font-medium text-muted-foreground/60 bg-background/30">
            Drag tasks here
          </div>
        ) : (
          statusTasks.map((task: any) => (
            <KanbanTaskCard 
              key={task.id} 
              task={task} 
              currentUser={currentUser}
              openEdit={openEdit}
              handleDelete={handleDelete}
              router={router}
              setSelectedTaskForChat={setSelectedTaskForChat}
            />
          ))
        )}
      </div>
    </div>
  );
}

const formatDate = (dateInput: any) => {
  if (!dateInput) return '';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${month}/${day}/${year}`;
  } catch (e) {
    return String(dateInput);
  }
};

export default function TasksClient({ initialTasks, taskStatuses, projects, users, currentUser }: { 
  initialTasks: any[], 
  taskStatuses: any[], 
  projects: any[], 
  users: any[], 
  currentUser: any 
}) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [selectedStatusId, setSelectedStatusId] = useState<string>('all');
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  
  const [activeDragTask, setActiveDragTask] = useState<any>(null);
  const [confirmDropState, setConfirmDropState] = useState<{ task: any, targetStatus: any } | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const handleDragStart = (event: any) => {
    setActiveDragTask(event.active.data.current);
  };

  const handleDragEnd = (event: any) => {
    setActiveDragTask(null);
    const { active, over } = event;
    if (!over) return;

    const task = active.data.current;
    const targetStatus = over.data.current;

    if (task.statusId !== targetStatus.id) {
      setConfirmDropState({ task, targetStatus });
    }
  };

  const confirmStatusChange = async () => {
    if (!confirmDropState) return;
    setIsUpdatingStatus(true);
    try {
      const res = await updateTaskAction(confirmDropState.task.id, {
        statusId: confirmDropState.targetStatus.id
      });
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(`Task moved to ${confirmDropState.targetStatus.name}`);
        setTasks(tasks.map((t: any) => t.id === confirmDropState.task.id ? { ...t, statusId: confirmDropState.targetStatus.id, status: confirmDropState.targetStatus } : t));
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to update status");
    } finally {
      setIsUpdatingStatus(false);
      setConfirmDropState(null);
    }
  };

  React.useEffect(() => {
    const savedView = localStorage.getItem("omniwork_task_view");
    if (savedView === "table" || savedView === "kanban") {
      setViewMode(savedView as any);
    }
  }, []);

  const handleSetViewMode = (mode: 'table' | 'kanban') => {
    setViewMode(mode);
    localStorage.setItem("omniwork_task_view", mode);
  };

  const [isPending, startTransition] = useTransition();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isStatusManageOpen, setIsStatusManageOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);

  const [taskTemplates, setTaskTemplates] = useState<any[]>([]);
  const [isTemplateSelectOpen, setIsTemplateSelectOpen] = useState(false);
  const [selectedTemplateConfig, setSelectedTemplateConfig] = useState<any>(null);
  const [isRepeatFromDropdown, setIsRepeatFromDropdown] = useState(false);

  useEffect(() => {
    if (isTemplateSelectOpen) {
      getTaskTemplatesAction().then((res: any) => {
        if (res.success && res.templates) {
          setTaskTemplates(res.templates);
        }
      });
    }
  }, [isTemplateSelectOpen]);

  const handleDeleteTemplate = async (templateId: string) => {
    const res = await deleteTaskTemplateAction(templateId);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Task template deleted");
      setTaskTemplates((prev) => prev.filter((t) => t.id !== templateId));
    }
  };

  const isClient = currentUser.role === 'CLIENT';
  const canCreateTask = currentUser.role === 'OWNER' || 
                        (currentUser.role === 'MEMBER' && projects.some(p => p.projectManagerId === currentUser.userId)) ||
                        isClient;
  const canManageStatuses = currentUser.role === 'OWNER';

  // For Client role, only show assignees who are actually assigned to tasks in their projects
  const availableUsers = isClient ? 
    users.filter(u => initialTasks.some(t => t.assignees.some((a: any) => a.userId === u.id))) 
    : users;

  // Filters
  const filteredTasks = tasks.filter(t => {
    if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (selectedProjectId !== 'all' && t.projectId !== selectedProjectId) return false;
    if (selectedStatusId !== 'all' && t.statusId !== selectedStatusId) return false;
    if (selectedAssigneeId !== 'all' && !t.assignees.some((a: any) => a.userId === selectedAssigneeId)) return false;
    return true;
  });

  const totalAllocated = filteredTasks.reduce((acc, t) => acc + (t.allocatedHours || 0), 0);
  const totalTracked = filteredTasks.reduce((acc, t) => acc + (t.trackedHours || 0), 0);
  const remainingHours = Math.max(0, totalAllocated - totalTracked);

  const handleDelete = (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    startTransition(async () => {
      const res = await deleteTaskAction(taskId);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success('Task deleted successfully');
        setTasks(tasks.filter(t => t.id !== taskId));
        router.refresh();
      }
    });
  };

  const openEdit = (task: any) => {
    setEditingTask(task);
    setIsCreateOpen(true);
  };

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'CRITICAL': return 'bg-red-100 text-red-800';
      case 'HIGH': return 'bg-orange-100 text-orange-800';
      case 'MEDIUM': return 'bg-blue-100 text-blue-800';
      case 'LOW': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground">Manage your tasks, track hours, and monitor timelines.</p>
        </div>
        <div className="flex items-center gap-3">
          {canManageStatuses && (
            <Button variant="outline" onClick={() => setIsStatusManageOpen(true)}>
              <Settings className="w-4 h-4 mr-2" />
              Manage Statuses
            </Button>
          )}
          {canCreateTask && (
            <div className="flex items-center -space-x-px shadow-sm rounded-xl overflow-hidden">
              <Button
                onClick={() => {
                  setEditingTask(null);
                  setSelectedTemplateConfig(null);
                  setIsRepeatFromDropdown(false);
                  setIsCreateOpen(true);
                }}
                className="rounded-r-none h-10 px-4"
              >
                <Plus className="mr-2 h-4 w-4" /> Create Task
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="rounded-l-none border-l border-white/20 px-2.5 h-10">
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 bg-white dark:bg-[#1f1f1f] rounded-xl shadow-lg border border-black/5 dark:border-white/10 p-1.5 z-50">
                  <DropdownMenuItem
                    onClick={() => {
                      setEditingTask(null);
                      setSelectedTemplateConfig(null);
                      setIsRepeatFromDropdown(false);
                      setIsCreateOpen(true);
                    }}
                    className="cursor-pointer rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted focus:bg-muted"
                  >
                    Create New Task
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setIsTemplateSelectOpen(true);
                    }}
                    className="cursor-pointer rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted focus:bg-muted"
                  >
                    Use Existing Task Template
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setEditingTask(null);
                      setSelectedTemplateConfig(null);
                      setIsRepeatFromDropdown(true);
                      setIsCreateOpen(true);
                    }}
                    className="cursor-pointer rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted focus:bg-muted"
                  >
                    Create Repeated Task
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex flex-col gap-1">
            <span className="text-sm font-medium text-muted-foreground">Allocated Hours</span>
            <span className="text-2xl font-bold">{totalAllocated.toFixed(1)}h</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex flex-col gap-1">
            <span className="text-sm font-medium text-muted-foreground">Tracked Hours</span>
            <span className="text-2xl font-bold">{totalTracked.toFixed(1)}h</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex flex-col gap-1">
            <span className="text-sm font-medium text-muted-foreground">Remaining Hours</span>
            <span className="text-2xl font-bold">{remainingHours.toFixed(1)}h</span>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center bg-card p-4 rounded-lg border shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search tasks..." 
            className="pl-8 w-full bg-background"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <select 
          value={selectedProjectId} 
          onChange={(e) => setSelectedProjectId(e.target.value)}
          className="flex h-10 w-full md:w-[180px] rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <option value="all">All Tasks</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        <select 
          value={selectedStatusId} 
          onChange={(e) => setSelectedStatusId(e.target.value)}
          className="flex h-10 w-full md:w-[180px] rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">All Statuses</option>
          {taskStatuses.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        {currentUser.role !== 'MEMBER' && (
          <select 
            value={selectedAssigneeId} 
            onChange={(e) => setSelectedAssigneeId(e.target.value)}
            className="flex h-10 w-full md:w-[180px] rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">All Assignees</option>
            {availableUsers.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        )}

        <div className="flex items-center gap-1 bg-muted p-1 rounded-xl">
          <Button variant={viewMode === 'table' ? 'secondary' : 'ghost'} size="sm" className="px-2" onClick={() => handleSetViewMode('table')}>
            <List className="w-4 h-4" />
          </Button>
          <Button variant={viewMode === 'kanban' ? 'secondary' : 'ghost'} size="sm" className="px-2" onClick={() => handleSetViewMode('kanban')}>
            <Columns className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {viewMode === 'table' && (
        <div className="border rounded-lg bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Task</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Assignees</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                    No tasks found matching your filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredTasks.map((task: any) => (
                  <TableRow key={task.id} className="group hover:bg-muted/30">
                    <TableCell>
                      <div className="font-medium flex items-center gap-1.5 flex-wrap">
                        {task.title}
                        {task.isRepeated && (
                          <Badge variant="outline" className="text-[9px] bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/50 py-0 px-1 font-semibold flex items-center gap-0.5 align-middle">
                            <Repeat size={8} /> Recurring
                          </Badge>
                        )}
                      </div>
                      {task.dueDate && <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><Calendar size={12} /> {formatDate(task.dueDate)}</div>}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium hover:underline cursor-pointer" onClick={() => router.push(`/workspace/projects/${task.projectId}`)}>
                        {task.project.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      {task.status ? (
                        <Badge variant="outline" style={{ borderColor: task.status.color, color: task.status.color, backgroundColor: `${task.status.color}10` }}>
                          {task.status.name}
                        </Badge>
                      ) : (
                        <Badge variant="outline">No Status</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={`${getPriorityColor(task.priority)} border-transparent`}>
                        {task.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex -space-x-2">
                        {task.assignees.map((a: any) => (
                          <div key={a.userId} className="w-7 h-7 rounded-full bg-primary/10 border-2 border-background flex items-center justify-center text-[10px] font-bold text-primary" title={a.user.name}>
                            {a.user.name.charAt(0).toUpperCase()}
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs">
                        <span className="font-medium text-emerald-600">{formatHours(task.trackedHours)}</span>
                        <span className="text-muted-foreground"> / {task.allocatedHours ? formatHours(task.allocatedHours) : '-'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {currentUser.role !== 'CLIENT' && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(task)}><Edit className="w-4 h-4 mr-2" /> Edit Task</DropdownMenuItem>
                            {(currentUser.role === 'OWNER' || task.project.projectManagerId === currentUser.userId) && (
                              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDelete(task.id)}>
                                <Trash2 className="w-4 h-4 mr-2" /> Delete Task
                              </DropdownMenuItem>
                            )}
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

      {viewMode === 'kanban' && (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-5 overflow-x-auto pb-6 pt-2 custom-scrollbar min-h-[calc(100vh-220px)] animate-in fade-in zoom-in-95 duration-200 px-2">
            {taskStatuses.map((status) => {
              const statusTasks = filteredTasks.filter(t => t.statusId === status.id);
              return (
                <KanbanColumn 
                  key={status.id} 
                  status={status} 
                  statusTasks={statusTasks}
                  currentUser={currentUser}
                  openEdit={openEdit}
                  handleDelete={handleDelete}
                  router={router}
                />
              );
            })}
          </div>
          <DragOverlay>
            {activeDragTask ? (
              <KanbanTaskCard 
                task={activeDragTask} 
                currentUser={currentUser}
                openEdit={openEdit}
                handleDelete={handleDelete}
                router={router}
                isDraggingOverlay
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      <Dialog open={!!confirmDropState} onOpenChange={(open) => !open && !isUpdatingStatus && setConfirmDropState(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Status Change</DialogTitle>
            <DialogDescription>
              Are you sure you want to move &quot;{confirmDropState?.task.title}&quot; to {confirmDropState?.targetStatus.name}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDropState(null)} disabled={isUpdatingStatus}>Cancel</Button>
            <Button onClick={confirmStatusChange} disabled={isUpdatingStatus}>
              {isUpdatingStatus ? 'Moving...' : 'Confirm Move'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>



      {isCreateOpen && (
        <TaskFormModal 
          isOpen={isCreateOpen} 
          onOpenChange={(open) => {
            setIsCreateOpen(open);
            if (!open) {
              setEditingTask(null);
              setSelectedTemplateConfig(null);
              setIsRepeatFromDropdown(false);
            }
          }} 
          task={editingTask} 
          projects={projects} 
          taskStatuses={taskStatuses} 
          users={users} 
          currentUser={currentUser}
          initialRepeatEnabled={isRepeatFromDropdown}
          initialTemplateConfig={selectedTemplateConfig}
          onSuccess={() => {
            setIsCreateOpen(false);
            setEditingTask(null);
            setSelectedTemplateConfig(null);
            setIsRepeatFromDropdown(false);
            router.refresh();
          }}
        />
      )}

      {/* Template Selection Modal */}
      <Dialog open={isTemplateSelectOpen} onOpenChange={setIsTemplateSelectOpen}>
        <DialogContent className="sm:max-w-[600px] bg-background border-border flex flex-col h-[70vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Use Task Template</DialogTitle>
            <DialogDescription>
              Select a task template to pre-populate details and custom fields.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-4 space-y-4 custom-scrollbar">
            {taskTemplates.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center border border-dashed rounded-2xl text-muted-foreground p-6">
                <Repeat size={32} className="opacity-20 mb-2" />
                <p className="text-sm font-medium">No task templates saved yet.</p>
                <p className="text-xs text-center mt-1">Save a task template inside the creation form to reuse it here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {taskTemplates.map((tpl) => {
                  const config = tpl.config || {};
                  const fieldsCount = (config.customFields || []).length;
                  const dateFormatted = new Date(tpl.createdAt).toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  });

                  return (
                    <Card key={tpl.id} className="relative overflow-hidden group hover:border-purple-200 dark:hover:border-purple-900/50 transition-all duration-300 shadow-sm flex flex-col justify-between">
                      {currentUser.role === "OWNER" && (
                        <button
                          type="button"
                          onClick={() => handleDeleteTemplate(tpl.id)}
                          className="absolute right-3 top-3 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                      <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-sm font-bold truncate pr-6">{tpl.name}</CardTitle>
                        <CardDescription className="text-xs truncate">{config.title || "Untitled Task"}</CardDescription>
                      </CardHeader>
                      <CardContent className="p-4 pt-0 space-y-2 text-xs">
                        <div className="flex justify-between text-muted-foreground">
                          <span>Custom Fields:</span>
                          <span className="font-semibold text-foreground">{fieldsCount}</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                          <span>Created:</span>
                          <span className="font-semibold text-foreground">{dateFormatted}</span>
                        </div>
                        <Button
                          onClick={() => {
                            setSelectedTemplateConfig(config);
                            setIsTemplateSelectOpen(false);
                            setIsCreateOpen(true);
                          }}
                          className="w-full mt-2 h-8 text-xs font-semibold bg-purple-600 text-white hover:bg-purple-700"
                        >
                          Use Template
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
          <DialogFooter className="pt-4 border-t shrink-0">
            <Button variant="outline" onClick={() => setIsTemplateSelectOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isStatusManageOpen && (
        <StatusManagementModal
          isOpen={isStatusManageOpen}
          onOpenChange={setIsStatusManageOpen}
          taskStatuses={taskStatuses}
          onSuccess={() => {
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
