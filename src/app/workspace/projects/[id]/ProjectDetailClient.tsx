'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  ArrowLeft, Calendar, Clock, MoreHorizontal, Settings, 
  LayoutDashboard, CheckSquare, Users, Timer, Activity,
  Briefcase, MessageSquare, GripVertical, Plus, ShieldAlert
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { createTaskAction, updateTaskStatusAction, deleteTaskAction } from '@/app/actions/projects';

export default function ProjectDetailClient({ project, currentUser }: { project: any, currentUser: any }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [isPending, startTransition] = useTransition();
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('MEDIUM');
  const [newTaskHours, setNewTaskHours] = useState('');
  const [newTaskAssignees, setNewTaskAssignees] = useState<string[]>([]);

  // Permissions
  const isOwner = currentUser.role === 'OWNER';
  const isPM = project.projectManagerId === currentUser.userId;
  const isClient = currentUser.role === 'CLIENT';
  const canManageTasks = isOwner || isPM || isClient; // As per rules: Clients can create tasks in own projects.

  // Metrics
  const totalTrackedMs = project.timeTrackings.reduce((acc: number, t: any) => {
    if (t.endTime) {
      return acc + (new Date(t.endTime).getTime() - new Date(t.startTime).getTime());
    }
    return acc;
  }, 0);
  const totalTrackedHours = Math.round((totalTrackedMs / (1000 * 60 * 60)) * 100) / 100;
  
  const progressPercent = project.totalAllocatedHours 
    ? Math.round((totalTrackedHours / project.totalAllocatedHours) * 100)
    : 0;

  async function handleCreateTask(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!newTaskName.trim()) return;

    const hours = newTaskHours ? parseFloat(newTaskHours) : undefined;

    startTransition(async () => {
      const res = await createTaskAction(
        project.id, 
        newTaskName, 
        newTaskDescription || undefined, 
        newTaskPriority as any,
        hours,
        newTaskAssignees
      );
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success('Task created successfully');
        setNewTaskName('');
        setNewTaskDescription('');
        setNewTaskHours('');
        setNewTaskPriority('MEDIUM');
        setNewTaskAssignees([]);
        setIsNewTaskModalOpen(false);
        window.location.reload();
      }
    });
  }

  const handleTaskStatusChange = async (taskId: string, newStatus: string) => {
    startTransition(async () => {
      const res = await updateTaskStatusAction(taskId, newStatus);
      if (res.error) toast.error(res.error);
      else window.location.reload();
    });
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'PLANNING': return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
      case 'IN_PROGRESS': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'ON_HOLD': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'COMPLETE': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      default: return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'LOW': return 'text-slate-500 bg-slate-100 dark:bg-slate-800';
      case 'MEDIUM': return 'text-blue-500 bg-blue-100 dark:bg-blue-900/30';
      case 'HIGH': return 'text-orange-500 bg-orange-100 dark:bg-orange-900/30';
      case 'CRITICAL': return 'text-red-500 bg-red-100 dark:bg-red-900/30 font-bold';
      default: return 'text-slate-500';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col gap-4 bg-background p-6 rounded-xl border shadow-sm">
        <Link href="/workspace/projects" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 w-fit transition-colors">
          <ArrowLeft size={14} /> Back to Projects
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-extrabold tracking-tight text-foreground">{project.name}</h1>
              <Badge variant="outline" className={getStatusColor(project.status)}>
                {project.status.replace('_', ' ')}
              </Badge>
              <Badge variant="secondary" className={getPriorityColor(project.priority)}>
                {project.priority}
              </Badge>
            </div>
            {project.description && (
              <p className="text-muted-foreground mt-2 max-w-3xl">{project.description}</p>
            )}
          </div>
          {(isOwner || isPM) && (
            <Button variant="outline" size="sm" className="shadow-sm">
              <Settings className="mr-2 h-4 w-4" /> Project Settings
            </Button>
          )}
        </div>
      </div>

      {/* Tabs Layout */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-background border shadow-sm p-1">
          <TabsTrigger value="overview" className="flex items-center gap-2"><LayoutDashboard size={14}/> Overview</TabsTrigger>
          <TabsTrigger value="tasks" className="flex items-center gap-2"><CheckSquare size={14}/> Tasks <Badge variant="secondary" className="ml-1 text-[10px] px-1.5">{project.tasks.length}</Badge></TabsTrigger>
          {!isClient && <TabsTrigger value="team" className="flex items-center gap-2"><Users size={14}/> Team</TabsTrigger>}
          {!isClient && <TabsTrigger value="time" className="flex items-center gap-2"><Timer size={14}/> Time Tracking</TabsTrigger>}
          <TabsTrigger value="activity" className="flex items-center gap-2"><Activity size={14}/> Activity</TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Meta Info */}
            <Card className="col-span-1 shadow-sm border-slate-200 dark:border-slate-800">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/50">
                <CardTitle className="text-lg">Project Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4 text-sm">
                <div className="grid grid-cols-3 gap-1">
                  <span className="text-muted-foreground font-medium col-span-1">Client:</span>
                  <span className="col-span-2 font-medium">{project.client?.name || 'Internal'}</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <span className="text-muted-foreground font-medium col-span-1">Manager:</span>
                  <span className="col-span-2">{project.projectManager?.name || 'Unassigned'}</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <span className="text-muted-foreground font-medium col-span-1">Start Date:</span>
                  <span className="col-span-2">{new Date(project.startDate).toLocaleDateString()}</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <span className="text-muted-foreground font-medium col-span-1">End Date:</span>
                  <span className="col-span-2">{project.isOngoing ? 'Ongoing' : project.endDate ? new Date(project.endDate).toLocaleDateString() : 'Not set'}</span>
                </div>
                {project.notes && (
                  <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/50">
                    <span className="text-muted-foreground font-medium block mb-1">Notes:</span>
                    <p className="text-xs text-slate-600 dark:text-slate-400 italic bg-muted/50 p-2 rounded-md">
                      {project.notes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Time & Progress */}
            <Card className="col-span-1 md:col-span-2 shadow-sm border-slate-200 dark:border-slate-800">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/50">
                <CardTitle className="text-lg">Progress & Hours</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-3xl font-bold tracking-tight">{totalTrackedHours} <span className="text-lg font-medium text-muted-foreground">hrs</span></p>
                    <p className="text-sm text-muted-foreground mt-1">Total Logged Time</p>
                  </div>
                  {project.totalAllocatedHours && (
                    <div className="text-right">
                      <p className="text-xl font-semibold">{project.totalAllocatedHours} <span className="text-sm font-medium text-muted-foreground">hrs</span></p>
                      <p className="text-sm text-muted-foreground mt-1">Allocated Budget</p>
                    </div>
                  )}
                </div>

                {project.totalAllocatedHours && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-medium">
                      <span>{progressPercent}% Complete</span>
                      {totalTrackedHours > project.totalAllocatedHours && (
                        <span className="text-destructive flex items-center"><ShieldAlert size={12} className="mr-1"/> Over Budget</span>
                      )}
                    </div>
                    <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ${progressPercent > 100 ? 'bg-destructive' : 'bg-primary'}`} 
                        style={{ width: `${Math.min(100, progressPercent)}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TASKS TAB */}
        <TabsContent value="tasks" className="space-y-4">
          {canManageTasks && (
            <div className="flex justify-end mb-4">
              <Dialog open={isNewTaskModalOpen} onOpenChange={setIsNewTaskModalOpen}>
                <DialogTrigger asChild>
                  <Button className="shadow-sm bg-primary text-primary-foreground hover:bg-primary/90">
                    <Plus className="mr-2 h-4 w-4" /> Create New Task
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Create New Task</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateTask} className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Task Title</label>
                      <Input placeholder="e.g. Design Landing Page" value={newTaskName} onChange={e => setNewTaskName(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Description</label>
                      <textarea 
                        placeholder="Add more details about this task..."
                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={newTaskDescription}
                        onChange={e => setNewTaskDescription(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Priority</label>
                        <select 
                          className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          value={newTaskPriority}
                          onChange={e => setNewTaskPriority(e.target.value)}
                        >
                          <option value="LOW">Low</option>
                          <option value="MEDIUM">Medium</option>
                          <option value="HIGH">High</option>
                          <option value="CRITICAL">Critical</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Allocated Hours</label>
                        <Input type="number" step="0.5" min="0" placeholder="e.g. 5.5" value={newTaskHours} onChange={e => setNewTaskHours(e.target.value)} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Assignees (Project Members)</label>
                      <div className="border rounded-md p-2 space-y-2 max-h-32 overflow-y-auto bg-slate-50 dark:bg-slate-900">
                        {project.assignees?.map((a: any) => (
                          <label key={a.userId} className="flex items-center gap-2 cursor-pointer p-1 hover:bg-white dark:hover:bg-slate-800 rounded transition-colors">
                            <input 
                              type="checkbox" 
                              checked={newTaskAssignees.includes(a.userId)}
                              onChange={(e) => {
                                if (e.target.checked) setNewTaskAssignees(prev => [...prev, a.userId]);
                                else setNewTaskAssignees(prev => prev.filter(id => id !== a.userId));
                              }}
                              className="rounded border-slate-300"
                            />
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{a.user.name.substring(0,2)}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium">{a.user.name}</span>
                          </label>
                        ))}
                        {(!project.assignees || project.assignees.length === 0) && (
                          <div className="text-xs text-muted-foreground text-center p-2">No members assigned to this project.</div>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => setIsNewTaskModalOpen(false)}>Cancel</Button>
                      <Button type="submit" disabled={isPending || !newTaskName.trim()}>Create Task</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {/* Simple Kanban Board Layout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {['TODO', 'IN_PROGRESS', 'DONE'].map(status => {
              const statusTasks = project.tasks.filter((t: any) => t.status === status);
              return (
                <div key={status} className="flex flex-col bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 border shadow-sm">
                  <div className="flex items-center justify-between mb-3 px-1">
                    <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      {status === 'TODO' && <div className="h-2 w-2 rounded-full bg-slate-400"></div>}
                      {status === 'IN_PROGRESS' && <div className="h-2 w-2 rounded-full bg-blue-500"></div>}
                      {status === 'DONE' && <div className="h-2 w-2 rounded-full bg-emerald-500"></div>}
                      {status.replace('_', ' ')}
                    </h3>
                    <Badge variant="secondary">{statusTasks.length}</Badge>
                  </div>
                  
                  <div className="flex-1 space-y-3">
                    {statusTasks.length === 0 ? (
                      <div className="h-24 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-center text-xs text-muted-foreground">
                        No tasks
                      </div>
                    ) : (
                      statusTasks.map((t: any) => (
                        <div key={t.id} className="bg-background border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow group">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2">
                              <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 cursor-grab shrink-0 mt-0.5" />
                              <div>
                                <p className="text-sm font-medium leading-snug">{t.title}</p>
                                {t.description && <p className="text-[10px] text-muted-foreground line-clamp-2 mt-1">{t.description}</p>}
                                {t.allocatedHours && <p className="text-[10px] text-primary/80 font-medium mt-1">{t.allocatedHours} hrs allocated</p>}
                              </div>
                            </div>
                            <Badge variant="outline" className={`text-[8px] px-1 py-0 h-4 border leading-none shrink-0 ${
                              t.priority === 'CRITICAL' ? 'bg-red-50 text-red-700 border-red-200' : 
                              t.priority === 'HIGH' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                              t.priority === 'MEDIUM' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                              'bg-slate-50 text-slate-600 border-slate-200'
                            }`}>{t.priority}</Badge>
                          </div>
                          
                          <div className="flex items-center justify-between mt-3 pl-6">
                            <select 
                              value={t.status}
                              onChange={(e) => handleTaskStatusChange(t.id, e.target.value)}
                              disabled={!canManageTasks || isPending}
                              className="text-[10px] font-medium bg-muted/50 border-0 rounded px-1.5 py-0.5"
                            >
                              <option value="TODO">To Do</option>
                              <option value="IN_PROGRESS">In Progress</option>
                              <option value="DONE">Done</option>
                            </select>

                            <div className="flex -space-x-1.5">
                              {t.assignees?.map((a: any) => (
                                <Avatar key={a.user.id} title={a.user.name} className="h-5 w-5 border-2 border-background">
                                  <AvatarFallback className="text-[8px] bg-primary/20 text-primary font-bold">{a.user.name.substring(0,2)}</AvatarFallback>
                                </Avatar>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </TabsContent>

        {/* TEAM TAB */}
        {!isClient && (
          <TabsContent value="team" className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {project.projectManager && (
                <Card className="shadow-sm border-purple-500/20 bg-purple-50/30 dark:bg-purple-950/10">
                  <CardContent className="p-4 flex items-center gap-4">
                    <Avatar className="h-12 w-12 border-2 border-background shadow-sm ring-2 ring-purple-500/30">
                      <AvatarFallback className="bg-purple-100 text-purple-700 font-bold">{project.projectManager.name.substring(0,2)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{project.projectManager.name}</p>
                      <p className="text-xs text-purple-600 dark:text-purple-400 font-medium flex items-center gap-1"><ShieldAlert size={10}/> Project Manager</p>
                    </div>
                  </CardContent>
                </Card>
              )}
              {project.assignees.map((a: any) => (
                <Card key={a.user.id} className="shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-4 flex items-center gap-4">
                    <Avatar className="h-12 w-12 border shadow-sm">
                      <AvatarFallback className="bg-primary/10 text-primary font-medium">{a.user.name.substring(0,2)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{a.user.name}</p>
                      <p className="text-xs text-muted-foreground">{a.user.role}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        )}

        {/* TIME TRACKING TAB */}
        {!isClient && (
          <TabsContent value="time" className="space-y-4">
            <Card className="shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>User</TableHead>
                    <TableHead>Task</TableHead>
                    <TableHead>Start Time</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {project.timeTrackings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center h-32 text-muted-foreground">No time logs recorded.</TableCell>
                    </TableRow>
                  ) : (
                    project.timeTrackings.map((log: any) => {
                      const durMs = log.endTime ? new Date(log.endTime).getTime() - new Date(log.startTime).getTime() : null;
                      const durHrs = durMs ? (durMs / (1000 * 60 * 60)).toFixed(2) : 'Active';
                      return (
                        <TableRow key={log.id}>
                          <TableCell className="font-medium">{log.user.name}</TableCell>
                          <TableCell>{log.task?.title || <span className="text-muted-foreground italic">General</span>}</TableCell>
                          <TableCell className="text-muted-foreground">{new Date(log.startTime).toLocaleString()}</TableCell>
                          <TableCell>
                            {log.endTime ? (
                              <Badge variant="secondary" className="font-mono">{durHrs}h</Badge>
                            ) : (
                              <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600 animate-pulse">Running</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground truncate max-w-[200px]">{log.description || '-'}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        )}

        {/* ACTIVITY TAB */}
        <TabsContent value="activity">
          <Card className="shadow-sm border-dashed">
            <CardContent className="h-64 flex flex-col items-center justify-center text-muted-foreground space-y-4">
              <Activity size={48} className="opacity-20" />
              <p>Activity feed is currently being tracked in the database and will be visualized in a future update.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
