'use client';

import React, { useState, useTransition, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, UserPlus, Briefcase, Mail, ShieldAlert, MoreHorizontal, Key, UserX, UserCheck, Pencil, Trash2, ChevronDown } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FormDialog, FormDialogCancelButton, FormDialogSubmitButton, FormRoleSelect, formFieldLabel, formInputClass } from '@/components/ui/FormDialog';
import { toast } from 'sonner';
import { addUserAction, editUserAction, deactivateUserAction, activateUserAction, resetUserPasswordAction, deleteUserAction } from '@/app/actions/users';

export default function ClientsClient({ initialUsers, currentUser }: { initialUsers: any[], currentUser: any }) {
  const [users, setUsers] = useState(initialUsers);
  const [isPending, startTransition] = useTransition();

  // Filters
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddFormValid, setIsAddFormValid] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [resetUser, setResetUser] = useState<any>(null);
  const [deactivateUser, setDeactivateUser] = useState<any>(null);
  const [deleteUser, setDeleteUser] = useState<any>(null);

  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    setUsers(initialUsers);
  }, [initialUsers]);

  useEffect(() => {
    if (searchParams.get('invite') === 'true') {
      setIsAddModalOpen(true);
      // Clean up the URL
      router.replace('/workspace/clients');
    }
  }, [searchParams, router]);

  // Filtered Users (Clients only)
  const filteredUsers = users.filter(u => {
    if (u.role !== 'CLIENT') return false;

    // Filter by status
    if (statusFilter !== 'All Statuses') {
      const isStatusMatch = (statusFilter === 'Active' && u.status === 'ACTIVE') || 
                            (statusFilter === 'Inactive' && u.status === 'INACTIVE');
      if (!isStatusMatch) return false;
    }

    // Filter by date range
    if (startDateFilter || endDateFilter) {
      const userDate = new Date(u.createdAt).getTime();
      const start = startDateFilter ? new Date(startDateFilter).getTime() : 0;
      const end = endDateFilter ? new Date(endDateFilter).getTime() : Infinity;

      // Make sure end date includes the whole day
      const endOfDay = end !== Infinity ? end + 86400000 - 1 : Infinity;

      if (userDate < start || userDate > endOfDay) {
        return false;
      }
    }

    return true;
  });

  // Handle Add Client (Instant Optimistic Update)
  const handleAddSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = (formData.get('name') as string) || '';
    const email = (formData.get('email') as string) || '';

    // Optimistic instant add
    const tempId = `temp-${Date.now()}`;
    const newClient = {
      id: tempId,
      name,
      email,
      role: 'CLIENT',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    };

    setUsers(prev => [newClient, ...prev]);
    setIsAddFormValid(false);
    setIsAddModalOpen(false);
    toast.success('Client created successfully');

    startTransition(async () => {
      const res = await addUserAction(formData);
      if (res.error) {
        // Rollback on failure
        setUsers(prev => prev.filter(u => u.id !== tempId));
        toast.error(res.error);
      } else {
        router.refresh(); 
      }
    });
  };

  // Handle Edit Client (Instant Optimistic Update)
  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editUser) return;
    const formData = new FormData(e.currentTarget);
    formData.append('role', 'CLIENT');

    const newName = (formData.get('name') as string) || editUser.name;
    const newEmail = (formData.get('email') as string) || editUser.email;
    const targetId = editUser.id;
    const originalUser = editUser;

    // Optimistic instant update
    setUsers(prev =>
      prev.map(u => (u.id === targetId ? { ...u, name: newName, email: newEmail } : u))
    );
    setEditUser(null);
    toast.success('Client updated successfully');

    startTransition(async () => {
      const res = await editUserAction(targetId, formData);
      if (res.error) {
        // Rollback on failure
        setUsers(prev => prev.map(u => (u.id === targetId ? originalUser : u)));
        toast.error(res.error);
      } else {
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

  // Handle Deactivate/Activate (Instant Optimistic Update)
  const handleToggleStatus = async (userToToggle: any) => {
    const targetId = userToToggle.id;
    const newStatus = userToToggle.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const oldStatus = userToToggle.status;

    // Optimistic instant toggle
    setUsers(prev =>
      prev.map(u => (u.id === targetId ? { ...u, status: newStatus } : u))
    );
    setDeactivateUser(null);
    toast.success(`Client status set to ${newStatus}`);

    startTransition(async () => {
      let res;
      if (oldStatus === 'ACTIVE') {
        res = await deactivateUserAction(targetId);
      } else {
        res = await activateUserAction(targetId);
      }

      if (res.error) {
        // Rollback on error
        setUsers(prev =>
          prev.map(u => (u.id === targetId ? { ...u, status: oldStatus } : u))
        );
        toast.error(res.error);
      } else {
        router.refresh();
      }
    });
  };

  // Handle Delete (Instant Optimistic Update)
  const handleDeleteSubmit = async (userToDelete: any) => {
    const targetId = userToDelete.id;
    const deletedUser = userToDelete;

    // Optimistic instant delete
    setUsers(prev => prev.filter(u => u.id !== targetId));
    setDeleteUser(null);
    toast.success('Client deleted successfully');

    startTransition(async () => {
      const res = await deleteUserAction(targetId);
      if (res.error) {
        // Rollback on error
        setUsers(prev => [...prev, deletedUser]);
        toast.error(res.error);
      } else {
        router.refresh();
      }
    });
  };

  const hasActiveFilters = statusFilter !== 'All Statuses' || startDateFilter !== '' || endDateFilter !== '';

  const handleClearFilters = () => {
    setStatusFilter('All Statuses');
    setStartDateFilter('');
    setEndDateFilter('');
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result;
      if (typeof text !== 'string') return;

      const rows = text.split('\n');
      const headers = rows[0].split(',').map(h => h.trim().toLowerCase());
      
      const nameIdx = headers.indexOf('name');
      const emailIdx = headers.indexOf('email');

      if (nameIdx === -1 || emailIdx === -1) {
        toast.error('CSV must have "name" and "email" columns');
        return;
      }

      let successCount = 0;
      let errorCount = 0;

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row.trim()) continue;
        
        const values = row.split(',').map(v => v.trim());
        const name = values[nameIdx];
        const email = values[emailIdx];

        if (!name || !email) continue;

        const formData = new FormData();
        formData.append('name', name);
        formData.append('email', email);
        formData.append('role', 'CLIENT');
        formData.append('password', 'Temp123!'); // Default temporary password

        startTransition(async () => {
          const res = await addUserAction(formData);
          if (res.error) {
            errorCount++;
          } else {
            successCount++;
          }
        });
      }

      // Small delay to allow transitions to queue up, then refresh
      setTimeout(() => {
        toast.success(`Import complete: ${successCount} added, ${errorCount} failed.`);
        router.refresh();
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }, 1000);
    };
    reader.readAsText(file);
  };

  const handleExportCSV = () => {
    const headers = ['Name', 'Email', 'Role', 'Status', 'Joined Date'];
    const rows = filteredUsers.map((u: any) => [
      u.name,
      u.email,
      u.role,
      u.status,
      new Date(u.createdAt).toLocaleDateString()
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'clients_export.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Container */}
      <div className="-mx-4 md:-mx-8 -mt-6 border-b border-slate-200 dark:border-white/10 bg-white dark:bg-[#151518] z-20 mb-8 pb-3">
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-4 pb-3 px-4 md:px-8">
          {/* Breadcrumb Left */}
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
            <span className="flex items-center justify-center w-5 h-5 rounded bg-slate-900 dark:bg-white text-white dark:text-slate-900">
              <Briefcase size={12} />
            </span>
            <span className="text-slate-900 dark:text-white font-semibold text-lg">
              Client Management
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
                <UserPlus size={14} /> New Client
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center justify-center h-9 w-8 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-r-[8px] hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors">
                    <ChevronDown size={14} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>Import Clients</DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportCSV}>Export CSV</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      {/* Clients Table */}
      <div className="bg-background rounded-xl border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="w-1/4">Client</TableHead>
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
                    <Briefcase size={40} className="opacity-20" />
                    <p>No clients found matching your criteria.</p>
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
                      <span className="text-sm font-medium">
                        Client
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
                          <DropdownMenuItem onClick={() => setEditUser(u)} className="cursor-pointer">
                            <Pencil className="mr-2 h-4 w-4 text-muted-foreground" /> Edit Client
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setResetUser(u)} className="cursor-pointer">
                            <Key className="mr-2 h-4 w-4 text-muted-foreground" /> Reset Password
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {u.status === 'ACTIVE' ? (
                            <DropdownMenuItem onClick={() => setDeactivateUser(u)} className="text-destructive focus:text-destructive cursor-pointer">
                              <UserX className="mr-2 h-4 w-4" /> Deactivate Client
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => handleToggleStatus(u)} className="text-emerald-600 dark:text-emerald-400 focus:text-emerald-600 dark:focus:text-emerald-400 cursor-pointer">
                              <UserCheck className="mr-2 h-4 w-4" /> Reactivate Client
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setDeleteUser(u)} className="text-destructive focus:text-destructive cursor-pointer">
                            <Trash2 className="mr-2 h-4 w-4" /> Delete Client
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

      {/* Add Client Modal */}
      <FormDialog
        open={isAddModalOpen}
        onOpenChange={(open) => {
          if (!open) setIsAddFormValid(false);
          setIsAddModalOpen(open);
        }}
        title="Add New Client"
        description="Invite a client to join your workspace organization."
        footer={
          <>
            <FormDialogCancelButton onClick={() => {
              setIsAddFormValid(false);
              setIsAddModalOpen(false);
            }} disabled={isPending}>Cancel</FormDialogCancelButton>
            <FormDialogSubmitButton type="submit" form="add-client-form" disabled={isPending || !isAddFormValid}>{isPending ? 'Adding...' : 'Add Client'}</FormDialogSubmitButton>
          </>
        }
      >
        <form
          id="add-client-form"
          onSubmit={handleAddSubmit}
          onInput={(event) => setIsAddFormValid(event.currentTarget.checkValidity())}
          className="px-6 pt-7 pb-6 space-y-5"
        >
          <div className="space-y-1.5">
            <label htmlFor="add-client-name" className={formFieldLabel}>Name</label>
            <Input id="add-client-name" name="name" required placeholder="e.g. Acme Corp" className={formInputClass} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="add-client-email" className={formFieldLabel}>Email Address</label>
            <Input id="add-client-email" name="email" type="email" required placeholder="e.g. contact@acme.com" className={formInputClass} />
          </div>
          <FormRoleSelect id="add-client-role" defaultValue="CLIENT" />
        </form>
      </FormDialog>

      {/* Edit Client Modal */}
      <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
            <DialogDescription>Update client details.</DialogDescription>
          </DialogHeader>
          {editUser && (
            <form onSubmit={handleEditSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input name="name" defaultValue={editUser.name} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input name="email" type="email" defaultValue={editUser.email} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <select name="status" defaultValue={editUser.status} required className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setEditUser(null)}>Cancel</Button>
                <Button type="submit" disabled={isPending}>{isPending ? 'Saving...' : 'Save Changes'}</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

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
            <DialogTitle className="text-destructive">Deactivate Client</DialogTitle>
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
            <DialogTitle className="text-destructive">Delete Client</DialogTitle>
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
