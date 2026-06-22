'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  FolderKanban, Search, Plus, Calendar, Clock, 
  MoreHorizontal, Users, ShieldAlert, ArrowRight, X
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { createProjectAction, deleteProjectAction, quickCreateClientAction } from '@/app/actions/projects';

export default function ProjectsClient({ initialProjects, users, currentUser }: { initialProjects: any[], users: any[], currentUser: any }) {
  const [projects, setProjects] = useState(initialProjects);
  const [isPending, startTransition] = useTransition();

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isQuickClientOpen, setIsQuickClientOpen] = useState(false);

  // Form States
  const [isOngoing, setIsOngoing] = useState(false);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  
  const clients = users.filter(u => u.role === 'CLIENT' && u.status === 'ACTIVE');
  const members = users.filter(u => u.role === 'MEMBER' && u.status === 'ACTIVE');

  // Filtered Projects
  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
      case 'LOW': return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
      case 'MEDIUM': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'HIGH': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
      case 'CRITICAL': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-bold';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const handleCreateProject = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const data = {
      name: formData.get('name') as string,
      clientId: formData.get('clientId') as string || undefined,
      projectManagerId: formData.get('projectManagerId') as string || undefined,
      description: formData.get('description') as string,
      status: formData.get('status') as any,
      priority: formData.get('priority') as any,
      startDate: formData.get('startDate') as string,
      endDate: formData.get('endDate') as string,
      isOngoing,
      totalAllocatedHours: formData.get('totalAllocatedHours') ? Number(formData.get('totalAllocatedHours')) : undefined,
      notes: formData.get('notes') as string,
      assigneeIds: selectedAssignees,
    };

    startTransition(async () => {
      const res = await createProjectAction(data);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success('Project created successfully');
        setIsCreateOpen(false);
        window.location.reload();
      }
    });
  };

  const handleQuickCreateClient = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    startTransition(async () => {
      const res = await quickCreateClientAction(
        formData.get('name') as string,
        formData.get('email') as string,
        password
      );
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success('Client created successfully');
        setIsQuickClientOpen(false);
        window.location.reload(); // Refresh to update client list
      }
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;
    startTransition(async () => {
      const res = await deleteProjectAction(id);
      if (res.error) toast.error(res.error);
      else {
        toast.success('Project deleted');
        setProjects(projects.filter(p => p.id !== id));
      }
    });
  };

  const toggleAssignee = (userId: string) => {
    setSelectedAssignees(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
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
        
        {currentUser.role === 'OWNER' && (
          <Button onClick={() => setIsCreateOpen(true)} className="w-full sm:w-auto shadow-md">
            <Plus className="mr-2 h-4 w-4" /> New Project
          </Button>
        )}
      </div>

      {/* Filters */}
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
        <div className="flex gap-2">
          <select 
            className="flex h-10 rounded-md border bg-background px-3 text-sm shadow-sm focus:ring-1 focus:ring-ring w-[160px]"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Statuses</option>
            <option value="PLANNING">Planning</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="ON_HOLD">On Hold</option>
            <option value="COMPLETE">Complete</option>
          </select>
        </div>
      </div>

      {/* Projects Table */}
      <div className="bg-background rounded-xl border shadow-sm overflow-hidden">
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
                <TableCell colSpan={6} className="h-48 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <FolderKanban size={40} className="opacity-20" />
                    <p>No projects found.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredProjects.map((p: any) => (
                <TableRow key={p.id} className="group hover:bg-muted/40 transition-colors">
                  <TableCell>
                    <div className="flex flex-col">
                      <Link href={`/workspace/projects/${p.id}`} className="font-semibold text-foreground hover:text-primary transition-colors flex items-center gap-2">
                        {p.name}
                      </Link>
                      {p.client && (
                        <span className="text-xs text-muted-foreground mt-1">Client: {p.client.name}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`${getStatusColor(p.status)} shadow-sm`}>
                      {p.status.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={`${getPriorityColor(p.priority)} border-transparent`}>
                      {p.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Calendar size={12}/> {new Date(p.startDate).toLocaleDateString()}</span>
                      {p.isOngoing ? (
                        <span className="flex items-center gap-1 text-emerald-600"><Clock size={12}/> Ongoing</span>
                      ) : p.endDate ? (
                        <span className="flex items-center gap-1"><ArrowRight size={12}/> {new Date(p.endDate).toLocaleDateString()}</span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex -space-x-2 overflow-hidden">
                      {p.projectManager && (
                        <div title={`PM: ${p.projectManager.name}`} className="relative z-10 border-2 border-background rounded-full ring-1 ring-purple-500">
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className="bg-purple-100 text-purple-700 text-[10px]">{p.projectManager.name.substring(0,2)}</AvatarFallback>
                          </Avatar>
                        </div>
                      )}
                      {p.assignees.map((a: any) => (
                        <div key={a.user.id} title={a.user.name} className="relative border-2 border-background rounded-full">
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className="bg-primary/10 text-primary text-[10px]">{a.user.name.substring(0,2)}</AvatarFallback>
                          </Avatar>
                        </div>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" asChild className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link href={`/workspace/projects/${p.id}`}><ArrowRight className="h-4 w-4" /></Link>
                    </Button>
                    {currentUser.role === 'OWNER' && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild><Link href={`/workspace/projects/${p.id}`}>View Project</Link></DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive focus:text-destructive cursor-pointer" onClick={() => handleDelete(p.id)}>
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

      {/* Create Project Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto custom-scrollbar">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>Setup a new project workspace, assign a PM, and configure timelines.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateProject} className="space-y-6 pt-4">
            
            {/* Basics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <label className="text-sm font-medium">Project Name <span className="text-destructive">*</span></label>
                <Input name="name" required placeholder="e.g. Website Redesign" />
              </div>
              <div className="space-y-2 col-span-2">
                <label className="text-sm font-medium">Description</label>
                <textarea name="description" className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" placeholder="Brief overview of the project..."></textarea>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-muted/30 p-4 rounded-lg border">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium">Client</label>
                  <button type="button" onClick={() => setIsQuickClientOpen(true)} className="text-[10px] font-semibold text-primary hover:underline flex items-center"><Plus size={10} className="mr-0.5"/> Quick Add</button>
                </div>
                <select name="clientId" className="flex h-9 w-full rounded-md border bg-background px-3 text-sm focus:ring-1 focus:ring-ring">
                  <option value="">No Client (Internal)</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name} ({c.email})</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Project Manager <span className="text-xs text-muted-foreground font-normal">(Members only)</span></label>
                <select name="projectManagerId" className="flex h-9 w-full rounded-md border bg-background px-3 text-sm focus:ring-1 focus:ring-ring">
                  <option value="">Unassigned</option>
                  {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
            </div>

            {/* Configuration */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <select name="status" className="flex h-9 w-full rounded-md border bg-background px-3 text-sm focus:ring-1 focus:ring-ring">
                  <option value="PLANNING">Planning</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="ON_HOLD">On Hold</option>
                  <option value="COMPLETE">Complete</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Priority</label>
                <select name="priority" defaultValue="MEDIUM" className="flex h-9 w-full rounded-md border bg-background px-3 text-sm focus:ring-1 focus:ring-ring">
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
                <label className="text-sm font-medium">Start Date <span className="text-destructive">*</span></label>
                <Input name="startDate" type="date" required />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium">End Date</label>
                  <div className="flex items-center gap-1.5">
                    <input type="checkbox" id="ongoing" checked={isOngoing} onChange={(e) => setIsOngoing(e.target.checked)} className="rounded border-gray-300 text-primary focus:ring-primary"/>
                    <label htmlFor="ongoing" className="text-xs text-muted-foreground cursor-pointer">Ongoing</label>
                  </div>
                </div>
                {!isOngoing ? (
                  <Input name="endDate" type="date" required={!isOngoing} />
                ) : (
                  <div className="flex h-9 w-full items-center justify-center rounded-md border bg-muted/50 text-xs text-muted-foreground italic">
                    Project has no end date
                  </div>
                )}
              </div>
            </div>

            {/* Resources */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Total Allocated Hours <span className="text-xs text-muted-foreground font-normal">(Optional)</span></label>
              <Input name="totalAllocatedHours" type="number" step="0.5" min="0" placeholder="e.g. 120" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Assign Team Members</label>
              <div className="border rounded-md p-3 max-h-[150px] overflow-y-auto space-y-1 bg-background shadow-inner">
                {members.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">No members available to assign.</p>
                ) : (
                  members.map(m => (
                    <label key={m.id} className="flex items-center gap-2 p-1.5 hover:bg-muted/50 rounded cursor-pointer transition-colors">
                      <input 
                        type="checkbox" 
                        checked={selectedAssignees.includes(m.id)}
                        onChange={() => toggleAssignee(m.id)}
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <span className="text-sm">{m.name}</span>
                    </label>
                  ))
                )}
              </div>
            </div>

            <DialogFooter className="pt-4 border-t mt-6">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isPending}>{isPending ? 'Creating...' : 'Create Project'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Quick Create Client Modal */}
      <Dialog open={isQuickClientOpen} onOpenChange={setIsQuickClientOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Quick Add Client</DialogTitle>
            <DialogDescription>Create a client record instantly to assign to this project.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleQuickCreateClient} className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Client Name</label>
              <Input name="name" required placeholder="Acme Corp" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Client Email</label>
              <Input name="email" type="email" required placeholder="contact@acme.com" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <Input name="password" type="password" required placeholder="••••••••" minLength={6} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Confirm Password</label>
              <Input name="confirmPassword" type="password" required placeholder="••••••••" minLength={6} />
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsQuickClientOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isPending}>{isPending ? 'Adding...' : 'Add Client'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
