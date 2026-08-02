'use client';

import React, { useState, useTransition, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, UserPlus, Users as UsersIcon, Mail, ShieldAlert, MoreHorizontal, Key, UserX, UserCheck, Pencil, Trash2, Table as TableIcon, LayoutGrid, List as ListIcon, ChevronDown, Shield, Check as CheckIcon } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FormDialog, FormDialogCancelButton, FormDialogSubmitButton, FormRoleSelect, formFieldLabel, formInputClass } from '@/components/ui/FormDialog';
import { toast } from 'sonner';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { addUserAction, editUserAction, deactivateUserAction, activateUserAction, resetUserPasswordAction, deleteUserAction } from '@/app/actions/users';
import { HiBriefcase, HiClipboardList, HiCalendar, HiUser, HiUserGroup } from 'react-icons/hi';

export default function UsersClient({ initialUsers, currentUser }: { initialUsers: any[], currentUser: any }) {
  const [users, setUsers] = useState(initialUsers);
  const [isPending, startTransition] = useTransition();

  // Filter States
  const [roleFilter, setRoleFilter] = useState('All Roles');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddFormValid, setIsAddFormValid] = useState(false);
  const [addTab, setAddTab] = useState<'details' | 'permissions'>('details');
  const [editUser, setEditUser] = useState<any>(null);
  const [editTab, setEditTab] = useState<'details' | 'permissions'>('details');
  const [resetUser, setResetUser] = useState<any>(null);
  const [deactivateUser, setDeactivateUser] = useState<any>(null);
  const [deleteUser, setDeleteUser] = useState<any>(null);

  // Permissions state for edit modal
  type PermAction = 'view' | 'edit' | 'create' | 'delete';
  type PermResource = 'project' | 'task' | 'planner' | 'user' | 'client';
  const PERM_RESOURCES: { key: PermResource; label: string; Icon: React.ElementType; color: string }[] = [
    { key: 'project', label: 'Project', Icon: HiBriefcase,   color: 'text-violet-500' },
    { key: 'task',    label: 'Task',    Icon: HiClipboardList, color: 'text-blue-500'   },
    { key: 'planner', label: 'Planner', Icon: HiCalendar,    color: 'text-emerald-500' },
    { key: 'user',    label: 'User',    Icon: HiUser,         color: 'text-amber-500'  },
    { key: 'client',  label: 'Client',  Icon: HiUserGroup,   color: 'text-rose-500'   },
  ];
  const PERM_ACTIONS: PermAction[] = ['view', 'edit', 'create', 'delete'];
  const defaultPerms = (): Record<PermResource, Record<PermAction, boolean>> => ({
    project: { view: false, edit: false, create: false, delete: false },
    task:    { view: false, edit: false, create: false, delete: false },
    planner: { view: false, edit: false, create: false, delete: false },
    user:    { view: false, edit: false, create: false, delete: false },
    client:  { view: false, edit: false, create: false, delete: false },
  });
  // Edit modal permissions
  const [permissions, setPermissions] = useState<Record<PermResource, Record<PermAction, boolean>>>(defaultPerms());

  const togglePerm = (resource: PermResource, action: PermAction) => {
    setPermissions(prev => ({
      ...prev,
      [resource]: { ...prev[resource], [action]: !prev[resource][action] },
    }));
  };

  const toggleAllForResource = (resource: PermResource) => {
    const allOn = PERM_ACTIONS.every(a => permissions[resource][a]);
    setPermissions(prev => ({
      ...prev,
      [resource]: Object.fromEntries(PERM_ACTIONS.map(a => [a, !allOn])) as Record<PermAction, boolean>,
    }));
  };

  // Add modal permissions (separate state)
  const [addPermissions, setAddPermissions] = useState<Record<PermResource, Record<PermAction, boolean>>>(defaultPerms());

  const toggleAddPerm = (resource: PermResource, action: PermAction) => {
    setAddPermissions(prev => ({
      ...prev,
      [resource]: { ...prev[resource], [action]: !prev[resource][action] },
    }));
  };

  const toggleAllForAddResource = (resource: PermResource) => {
    const allOn = PERM_ACTIONS.every(a => addPermissions[resource][a]);
    setAddPermissions(prev => ({
      ...prev,
      [resource]: Object.fromEntries(PERM_ACTIONS.map(a => [a, !allOn])) as Record<PermAction, boolean>,
    }));
  };

  const openEditUser = (u: any) => {
    setEditUser(u);
    setEditTab('details');
    setPermissions(defaultPerms());
  };

  const searchParams = useSearchParams();
  const router = useRouter();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchParams.get('invite') === 'true') {
      setIsAddModalOpen(true);
      // Clean up the URL
      router.replace('/workspace/users');
    }
  }, [searchParams, router]);

  // Filtered Users
  const filteredUsers = users.filter(u => {
    const isMember = u.role === 'OWNER' || u.role === 'MEMBER';
    
    // Role filter
    const matchesRole = roleFilter === 'All Roles' || 
                        (roleFilter === 'Owner' && u.role === 'OWNER') || 
                        (roleFilter === 'Member' && u.role === 'MEMBER');
                        
    // Status filter
    const matchesStatus = statusFilter === 'All Statuses' || 
                          (statusFilter === 'Active' && u.status === 'ACTIVE') || 
                          (statusFilter === 'Inactive' && u.status !== 'ACTIVE');

    // Date filters (using u.createdAt)
    const userDate = new Date(u.createdAt);
    const matchesStartDate = startDateFilter ? userDate >= new Date(startDateFilter) : true;
    
    // For end date, add 1 day to include the entire end date day
    let matchesEndDate = true;
    if (endDateFilter) {
      const endD = new Date(endDateFilter);
      endD.setDate(endD.getDate() + 1);
      matchesEndDate = userDate < endD;
    }

    return isMember && matchesRole && matchesStatus && matchesStartDate && matchesEndDate;
  });

  const handleExportCSV = () => {
    if (filteredUsers.length === 0) {
      toast.error('No users to export.');
      return;
    }
    const headers = ['Name', 'Email', 'Role', 'Status', 'Joined Date'];
    const csvContent = [
      headers.join(','),
      ...filteredUsers.map(u => `"${u.name}","${u.email}","${u.role}","${u.status}","${new Date(u.createdAt).toLocaleDateString()}"`)
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'users_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Exported users to CSV');
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;
      const lines = text.split('\n');
      const data = lines.slice(1).filter(l => l.trim().length > 0);
      let successCount = 0;
      let errorCount = 0;

      toast.info('Starting import...');
      
      startTransition(async () => {
        for (const line of data) {
           const parts = line.split(',');
           if (parts.length >= 3) {
             const name = parts[0].replace(/"/g, '').trim();
             const email = parts[1].replace(/"/g, '').trim();
             const role = parts[2].replace(/"/g, '').trim();
             if (name && email && role) {
               const formData = new FormData();
               formData.append('name', name);
               formData.append('email', email);
               formData.append('role', role.toUpperCase() === 'OWNER' ? 'OWNER' : 'MEMBER');
               const res = await addUserAction(formData);
               if (res.success) successCount++;
               else errorCount++;
             }
           }
        }
        toast.success(`Import completed: ${successCount} added. ${errorCount > 0 ? `Failed: ${errorCount}` : ''}`);
        router.refresh();
      });
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Handle Add User
  const handleAddSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await addUserAction(formData);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(res.message);
        setIsAddFormValid(false);
        setIsAddModalOpen(false);
        // Soft refresh the page data
        router.refresh(); 
      }
    });
  };

  // Handle Edit User
  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editUser) return;
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await editUserAction(editUser.id, formData);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(res.message);
        setEditUser(null);
        router.refresh();
      }
    });
  };

  // Handle Reset Password
  const handleResetSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!resetUser) return;
    const formData = new FormData(e.currentTarget);
    const pwd = formData.get('password') as string;
    const confirmPwd = formData.get('confirmPassword') as string;

    if (pwd !== confirmPwd) {
      toast.error('Passwords do not match');
      return;
    }

    startTransition(async () => {
      const res = await resetUserPasswordAction(resetUser.id, formData);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(res.message);
        setResetUser(null);
      }
    });
  };

  // Handle Deactivate/Activate
  const handleToggleStatus = async (userToToggle: any) => {
    startTransition(async () => {
      let res;
      if (userToToggle.status === 'ACTIVE') {
        res = await deactivateUserAction(userToToggle.id);
      } else {
        res = await activateUserAction(userToToggle.id);
      }

      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(res.message);
        setDeactivateUser(null);
        router.refresh();
      }
    });
  };

  // Handle Delete
  const handleDeleteSubmit = async (userToDelete: any) => {
    startTransition(async () => {
      const res = await deleteUserAction(userToDelete.id);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(res.message);
        setDeleteUser(null);
        router.refresh();
      }
    });
  };

  const hasActiveFilters = roleFilter !== 'All Roles' || statusFilter !== 'All Statuses' || startDateFilter !== '' || endDateFilter !== '';

  const handleClearFilters = () => {
    setRoleFilter('All Roles');
    setStatusFilter('All Statuses');
    setStartDateFilter('');
    setEndDateFilter('');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Area */}
      {/* Header Container */}
      <div className="-mx-4 md:-mx-8 -mt-6 border-b border-slate-200 dark:border-white/10 bg-white dark:bg-[#151518] z-20 mb-8 pb-3">
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-4 pb-3 px-4 md:px-8">
          {/* Breadcrumb Left */}
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
            <span className="flex items-center justify-center w-5 h-5 rounded bg-slate-900 dark:bg-white text-white dark:text-slate-900">
              <UsersIcon size={12} />
            </span>
            <span className="text-slate-900 dark:text-white font-semibold text-lg">
              User Management
            </span>
          </div>
        </div>

        {/* Sub-toolbar / Filter bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-4 md:px-8 py-1">
          {/* Left Sub-Toolbar actions */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <input 
                type="date" 
                value={startDateFilter}
                onChange={(e) => setStartDateFilter(e.target.value)}
                className="h-9 px-3 bg-white dark:bg-transparent border border-slate-200 dark:border-white/10 rounded-[8px] text-sm font-medium text-slate-700 dark:text-slate-300 hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-white transition-all w-[140px]" 
              />
              <span className="text-sm font-medium text-slate-400">to</span>
              <input 
                type="date" 
                value={endDateFilter}
                onChange={(e) => setEndDateFilter(e.target.value)}
                className="h-9 px-3 bg-white dark:bg-transparent border border-slate-200 dark:border-white/10 rounded-[8px] text-sm font-medium text-slate-700 dark:text-slate-300 hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-white transition-all w-[140px]" 
              />
            </div>
          </div>

          {/* Right Sub-Toolbar actions */}
          <div className="flex items-center flex-wrap gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 h-9 px-3 bg-white dark:bg-transparent border border-slate-200 dark:border-white/10 rounded-[8px] text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5">
                  {roleFilter} <ChevronDown size={14} className="text-slate-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setRoleFilter('All Roles')}>All Roles</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setRoleFilter('Owner')}>Owner</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setRoleFilter('Member')}>Member</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 h-9 px-3 bg-white dark:bg-transparent border border-slate-200 dark:border-white/10 rounded-[8px] text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5">
                  {statusFilter} <ChevronDown size={14} className="text-slate-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setStatusFilter('All Statuses')}>All Statuses</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('Active')}>Active</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('Inactive')}>Inactive</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {hasActiveFilters && (
              <button 
                onClick={handleClearFilters}
                className="flex items-center justify-center gap-1.5 h-9 px-3 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 rounded-[8px] text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors mr-2"
              >
                Clear
              </button>
            )}

            <div className="flex items-center">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImportCSV} 
                className="hidden" 
                accept=".csv" 
              />
              <button 
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 h-9 px-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-l-[8px] text-sm font-medium hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors border-r border-white/20 dark:border-black/20"
              >
                <UserPlus size={14} /> New User
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center justify-center h-9 w-8 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-r-[8px] hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors">
                    <ChevronDown size={14} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>Import Users</DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportCSV}>Export CSV</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-background rounded-xl border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="w-1/4">Member</TableHead>
              <TableHead className="w-1/4">Role</TableHead>
              <TableHead className="w-1/4">Status</TableHead>
              <TableHead className="w-1/4">Joined</TableHead>
              <TableHead className="text-right w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-48 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <UsersIcon size={40} className="opacity-20" />
                    <p>No users found matching your criteria.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((u: any) => (
                <TableRow key={u.id} className="group hover:bg-muted/40 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border shadow-sm">
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {u.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-medium flex items-center gap-2">
                          {u.name} 
                          {u.id === currentUser.id && <Badge variant="secondary" className="text-[10px]">You</Badge>}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Mail size={10} /> {u.email}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {u.role === 'OWNER' && <ShieldAlert size={14} className="text-purple-500 dark:text-purple-400" />}
                      <span className={`text-sm font-medium ${u.role === 'OWNER' ? 'text-purple-600 dark:text-purple-400' : ''}`}>
                        {u.role.charAt(0) + u.role.slice(1).toLowerCase()}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {u.status === 'ACTIVE' ? (
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/20 shadow-sm">Active</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/20 shadow-sm">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {u.id !== currentUser.id && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => openEditUser(u)} className="cursor-pointer">
                            <Pencil className="mr-2 h-4 w-4 text-muted-foreground" /> Edit User
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setResetUser(u)} className="cursor-pointer">
                            <Key className="mr-2 h-4 w-4 text-muted-foreground" /> Reset Password
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {u.status === 'ACTIVE' ? (
                            <DropdownMenuItem onClick={() => setDeactivateUser(u)} className="text-destructive focus:text-destructive cursor-pointer">
                              <UserX className="mr-2 h-4 w-4" /> Deactivate User
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => handleToggleStatus(u)} className="text-emerald-600 dark:text-emerald-400 focus:text-emerald-600 dark:focus:text-emerald-400 cursor-pointer">
                              <UserCheck className="mr-2 h-4 w-4" /> Reactivate User
                            </DropdownMenuItem>
                          )}
                          {u.role !== 'OWNER' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => setDeleteUser(u)} className="text-destructive focus:text-destructive cursor-pointer">
                                <Trash2 className="mr-2 h-4 w-4" /> Delete User
                              </DropdownMenuItem>
                            </>
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

      {/* Add User Modal */}
      <FormDialog
        open={isAddModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddFormValid(false);
            setAddTab('details');
            setAddPermissions(defaultPerms());
          }
          setIsAddModalOpen(open);
        }}
        title="Add New User"
        description="Send an invitation to join your workspace organization."
        className="max-w-[520px]"
        footer={
          <>
            <FormDialogCancelButton onClick={() => {
              setIsAddFormValid(false);
              setAddTab('details');
              setAddPermissions(defaultPerms());
              setIsAddModalOpen(false);
            }} disabled={isPending}>Cancel</FormDialogCancelButton>
            <FormDialogSubmitButton type="submit" form="add-user-form" disabled={isPending || !isAddFormValid}>{isPending ? 'Adding...' : 'Add User'}</FormDialogSubmitButton>
          </>
        }
      >
        {/* Tab switcher */}
        <div className="flex gap-0 px-6 border-b border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#1f1f1f]">
          <button
            type="button"
            onClick={() => setAddTab('details')}
            className={`relative py-3 px-1 mr-6 text-[13px] font-semibold transition-colors outline-none ${
              addTab === 'details'
                ? 'text-slate-900 dark:text-white'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Details
            {addTab === 'details' && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-slate-900 dark:bg-white" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setAddTab('permissions')}
            className={`relative py-3 px-1 text-[13px] font-semibold transition-colors outline-none flex items-center gap-1.5 ${
              addTab === 'permissions'
                ? 'text-slate-900 dark:text-white'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Shield size={12} />
            Permissions
            {addTab === 'permissions' && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-slate-900 dark:bg-white" />
            )}
          </button>
        </div>

        <form
          id="add-user-form"
          onSubmit={handleAddSubmit}
          onInput={(event) => setIsAddFormValid(event.currentTarget.checkValidity())}
        >
          {/* ── Details Tab ── */}
          <div className={`px-6 pt-7 pb-6 space-y-5 ${addTab === 'details' ? '' : 'hidden'}`}>
            <div className="space-y-1.5">
              <label htmlFor="add-user-name" className={formFieldLabel}>Name</label>
              <Input id="add-user-name" name="name" required placeholder="e.g. John Doe" className={formInputClass} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="add-user-email" className={formFieldLabel}>Email Address</label>
              <Input id="add-user-email" name="email" type="email" required placeholder="e.g. john@example.com" className={formInputClass} />
            </div>
            <FormRoleSelect id="add-user-role" />
          </div>

          {/* ── Permissions Tab ── */}
          <div className={`px-6 pt-5 pb-6 ${addTab === 'permissions' ? '' : 'hidden'}`}>
            <p className="text-[12px] text-slate-400 dark:text-slate-500 mb-4">
              Control what this user can do across each module.
            </p>

            {/* Column headers */}
            <div className="grid grid-cols-[1fr_repeat(4,48px)] gap-x-1 mb-2 pr-1">
              <div />
              {PERM_ACTIONS.map(action => (
                <div key={action} className="text-center text-[10.5px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {action.charAt(0).toUpperCase() + action.slice(1)}
                </div>
              ))}
            </div>

            {/* Permission rows */}
            <div className="space-y-1">
              {PERM_RESOURCES.map(({ key, label, Icon, color }) => {
                const allOn = PERM_ACTIONS.every(a => addPermissions[key][a]);
                const someOn = PERM_ACTIONS.some(a => addPermissions[key][a]);
                return (
                  <div
                    key={key}
                    className={`grid grid-cols-[1fr_repeat(4,48px)] gap-x-1 items-center rounded-[8px] px-3 py-2.5 transition-colors ${
                      someOn
                        ? 'bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10'
                        : 'border border-transparent hover:bg-slate-50/60 dark:hover:bg-white/[0.02]'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleAllForAddResource(key)}
                      className="flex items-center gap-2.5 text-left group"
                    >
                      <span
                        className={`flex items-center justify-center w-5 h-5 rounded-[4px] border-2 transition-all flex-shrink-0 ${
                          allOn
                            ? 'bg-slate-900 dark:bg-white border-slate-900 dark:border-white'
                            : someOn
                            ? 'bg-slate-300 dark:bg-slate-600 border-slate-300 dark:border-slate-600'
                            : 'border-slate-300 dark:border-white/20 group-hover:border-slate-400'
                        }`}
                      >
                        {(allOn || someOn) && <CheckIcon size={11} className={allOn ? 'text-white dark:text-slate-900' : 'text-white'} strokeWidth={3} />}
                      </span>
                      <span className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-700 dark:text-slate-200">
                        <Icon className={`text-[15px] ${color}`} />
                        {label}
                      </span>
                    </button>

                    {PERM_ACTIONS.map(action => (
                      <div key={action} className="flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => toggleAddPerm(key, action)}
                          className={`w-5 h-5 rounded-[4px] border-2 flex items-center justify-center transition-all ${
                            addPermissions[key][action]
                              ? 'bg-slate-900 dark:bg-white border-slate-900 dark:border-white'
                              : 'border-slate-300 dark:border-white/20 hover:border-slate-500 dark:hover:border-white/40'
                          }`}
                        >
                          {addPermissions[key][action] && (
                            <CheckIcon size={11} className="text-white dark:text-slate-900" strokeWidth={3} />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>

            {/* Quick preset buttons */}
            <div className="flex items-center gap-2 mt-5 pt-4 border-t border-slate-100 dark:border-white/5">
              <span className="text-[11.5px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Presets:</span>
              <button
                type="button"
                onClick={() => setAddPermissions(defaultPerms())}
                className="text-[11.5px] px-2.5 py-1 rounded-[6px] border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors font-medium"
              >
                None
              </button>
              <button
                type="button"
                onClick={() => setAddPermissions({
                  project: { view: true, edit: false, create: false, delete: false },
                  task:    { view: true, edit: false, create: false, delete: false },
                  planner: { view: true, edit: false, create: false, delete: false },
                  user:    { view: true, edit: false, create: false, delete: false },
                  client:  { view: true, edit: false, create: false, delete: false },
                })}
                className="text-[11.5px] px-2.5 py-1 rounded-[6px] border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors font-medium"
              >
                View Only
              </button>
              <button
                type="button"
                onClick={() => setAddPermissions({
                  project: { view: true, edit: true, create: true, delete: true },
                  task:    { view: true, edit: true, create: true, delete: true },
                  planner: { view: true, edit: true, create: true, delete: true },
                  user:    { view: true, edit: true, create: true, delete: true },
                  client:  { view: true, edit: true, create: true, delete: true },
                })}
                className="text-[11.5px] px-2.5 py-1 rounded-[6px] border border-slate-900 dark:border-white bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors font-bold"
              >
                Full Access
              </button>
            </div>
          </div>
        </form>
      </FormDialog>

      {/* Edit User Modal — tabbed, matches Add User style */}
      <FormDialog
        open={!!editUser}
        onOpenChange={(open) => { if (!open) { setEditUser(null); setEditTab('details'); setPermissions(defaultPerms()); } }}
        title={editUser?.name ?? 'Edit User'}
        description="Manage user details and workspace permissions."
        className="max-w-[520px]"
        footer={
          <>
            <FormDialogCancelButton onClick={() => { setEditUser(null); setEditTab('details'); setPermissions(defaultPerms()); }} disabled={isPending}>
              Cancel
            </FormDialogCancelButton>
            <FormDialogSubmitButton type="submit" form="edit-user-form" disabled={isPending}>
              {isPending ? 'Saving…' : 'Save Changes'}
            </FormDialogSubmitButton>
          </>
        }
      >
        {/* Tab switcher */}
        <div className="flex gap-0 px-6 border-b border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#1f1f1f]">
          <button
            type="button"
            onClick={() => setEditTab('details')}
            className={`relative py-3 px-1 mr-6 text-[13px] font-semibold transition-colors outline-none ${
              editTab === 'details'
                ? 'text-slate-900 dark:text-white'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Details
            {editTab === 'details' && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-slate-900 dark:bg-white" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setEditTab('permissions')}
            className={`relative py-3 px-1 text-[13px] font-semibold transition-colors outline-none flex items-center gap-1.5 ${
              editTab === 'permissions'
                ? 'text-slate-900 dark:text-white'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Shield size={12} />
            Permissions
            {editTab === 'permissions' && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-slate-900 dark:bg-white" />
            )}
          </button>
        </div>

        {editUser && (
          <form id="edit-user-form" onSubmit={handleEditSubmit}>
            {/* ── Details Tab ── */}
            <div className={`px-6 pt-7 pb-6 space-y-5 ${editTab === 'details' ? '' : 'hidden'}`}>
              <div className="space-y-1.5">
                <label htmlFor="edit-user-name" className={formFieldLabel}>Name</label>
                <Input
                  id="edit-user-name"
                  name="name"
                  required
                  defaultValue={editUser.name}
                  placeholder="e.g. John Doe"
                  className={formInputClass}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="edit-user-email" className={formFieldLabel}>Email Address</label>
                <Input
                  id="edit-user-email"
                  name="email"
                  type="email"
                  required
                  defaultValue={editUser.email}
                  placeholder="e.g. john@example.com"
                  className={formInputClass}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="edit-user-role" className={formFieldLabel}>Role</label>
                  <select
                    id="edit-user-role"
                    name="role"
                    defaultValue={editUser.role}
                    required
                    className="flex h-[42px] w-full rounded-[8px] border border-slate-200 dark:border-white/10 bg-transparent px-3 text-[15px] text-slate-900 dark:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-700 dark:focus-visible:ring-slate-300"
                  >
                    <option value="MEMBER">Member</option>
                    <option value="OWNER">Owner</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="edit-user-status" className={formFieldLabel}>Status</label>
                  <select
                    id="edit-user-status"
                    name="status"
                    defaultValue={editUser.status}
                    required
                    className="flex h-[42px] w-full rounded-[8px] border border-slate-200 dark:border-white/10 bg-transparent px-3 text-[15px] text-slate-900 dark:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-700 dark:focus-visible:ring-slate-300"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              </div>
            </div>

            {/* ── Permissions Tab ── */}
            <div className={`px-6 pt-5 pb-6 ${editTab === 'permissions' ? '' : 'hidden'}`}>
              <p className="text-[12px] text-slate-400 dark:text-slate-500 mb-4">
                Control what this user can do across each module.
              </p>

              {/* Column headers */}
              <div className="grid grid-cols-[1fr_repeat(4,48px)] gap-x-1 mb-2 pr-1">
                <div />
                {PERM_ACTIONS.map(action => (
                  <div key={action} className="text-center text-[10.5px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    {action.charAt(0).toUpperCase() + action.slice(1)}
                  </div>
                ))}
              </div>

              {/* Permission rows */}
              <div className="space-y-1">
                {PERM_RESOURCES.map(({ key, label, Icon, color }) => {
                  const allOn = PERM_ACTIONS.every(a => permissions[key][a]);
                  const someOn = PERM_ACTIONS.some(a => permissions[key][a]);
                  return (
                    <div
                      key={key}
                      className={`grid grid-cols-[1fr_repeat(4,48px)] gap-x-1 items-center rounded-[8px] px-3 py-2.5 transition-colors ${
                        someOn
                          ? 'bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10'
                          : 'border border-transparent hover:bg-slate-50/60 dark:hover:bg-white/[0.02]'
                      }`}
                    >
                      {/* Resource label with select-all toggle */}
                      <button
                        type="button"
                        onClick={() => toggleAllForResource(key)}
                        className="flex items-center gap-2.5 text-left group"
                      >
                        <span
                          className={`flex items-center justify-center w-5 h-5 rounded-[4px] border-2 transition-all flex-shrink-0 ${
                            allOn
                              ? 'bg-slate-900 dark:bg-white border-slate-900 dark:border-white'
                              : someOn
                              ? 'bg-slate-300 dark:bg-slate-600 border-slate-300 dark:border-slate-600'
                              : 'border-slate-300 dark:border-white/20 group-hover:border-slate-400'
                          }`}
                        >
                          {(allOn || someOn) && <CheckIcon size={11} className={allOn ? 'text-white dark:text-slate-900' : 'text-white'} strokeWidth={3} />}
                        </span>
                        <span className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-700 dark:text-slate-200">
                          <Icon className={`text-[15px] ${color}`} />
                          {label}
                        </span>
                      </button>

                      {/* Individual action checkboxes */}
                      {PERM_ACTIONS.map(action => (
                        <div key={action} className="flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => togglePerm(key, action)}
                            className={`w-5 h-5 rounded-[4px] border-2 flex items-center justify-center transition-all ${
                              permissions[key][action]
                                ? 'bg-slate-900 dark:bg-white border-slate-900 dark:border-white'
                                : 'border-slate-300 dark:border-white/20 hover:border-slate-500 dark:hover:border-white/40'
                            }`}
                          >
                            {permissions[key][action] && (
                              <CheckIcon size={11} className="text-white dark:text-slate-900" strokeWidth={3} />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>

              {/* Quick preset buttons */}
              <div className="flex items-center gap-2 mt-5 pt-4 border-t border-slate-100 dark:border-white/5">
                <span className="text-[11.5px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Presets:</span>
                <button
                  type="button"
                  onClick={() => setPermissions(defaultPerms())}
                  className="text-[11.5px] px-2.5 py-1 rounded-[6px] border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors font-medium"
                >
                  None
                </button>
                <button
                  type="button"
                  onClick={() => setPermissions({
                    project: { view: true, edit: false, create: false, delete: false },
                    task:    { view: true, edit: false, create: false, delete: false },
                    planner: { view: true, edit: false, create: false, delete: false },
                    user:    { view: true, edit: false, create: false, delete: false },
                    client:  { view: true, edit: false, create: false, delete: false },
                  })}
                  className="text-[11.5px] px-2.5 py-1 rounded-[6px] border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors font-medium"
                >
                  View Only
                </button>
                <button
                  type="button"
                  onClick={() => setPermissions({
                    project: { view: true, edit: true, create: true, delete: true },
                    task:    { view: true, edit: true, create: true, delete: true },
                    planner: { view: true, edit: true, create: true, delete: true },
                    user:    { view: true, edit: true, create: true, delete: true },
                    client:  { view: true, edit: true, create: true, delete: true },
                  })}
                  className="text-[11.5px] px-2.5 py-1 rounded-[6px] border border-slate-900 dark:border-white bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors font-bold"
                >
                  Full Access
                </button>
              </div>
            </div>
          </form>
        )}
      </FormDialog>

      {/* Reset Password Modal */}
      <Dialog open={!!resetUser} onOpenChange={(open) => !open && setResetUser(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>Create a new password for {resetUser?.name}.</DialogDescription>
          </DialogHeader>
          {resetUser && (
            <form onSubmit={handleResetSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">New Password</label>
                <Input name="password" type="password" required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Confirm New Password</label>
                <Input name="confirmPassword" type="password" required />
              </div>
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setResetUser(null)}>Cancel</Button>
                <Button type="submit" disabled={isPending}>{isPending ? 'Resetting...' : 'Reset Password'}</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Deactivate Confirmation Modal */}
      <Dialog open={!!deactivateUser} onOpenChange={(open) => !open && setDeactivateUser(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-destructive">Deactivate User</DialogTitle>
            <DialogDescription>
              Are you sure you want to deactivate <strong>{deactivateUser?.name}</strong>? They will no longer be able to log into the workspace. Their historical data will remain intact.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => setDeactivateUser(null)}>Cancel</Button>
            <Button type="button" variant="destructive" disabled={isPending} onClick={() => handleToggleStatus(deactivateUser)}>
              {isPending ? 'Deactivating...' : 'Yes, Deactivate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deleteUser} onOpenChange={(open) => !open && setDeleteUser(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to completely delete <strong>{deleteUser?.name}</strong>? This action cannot be undone and will remove them from the organization entirely.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => setDeleteUser(null)}>Cancel</Button>
            <Button type="button" variant="destructive" disabled={isPending} onClick={() => handleDeleteSubmit(deleteUser)}>
              {isPending ? 'Deleting...' : 'Yes, Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
