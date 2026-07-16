'use client';

import React, { useState, useTransition, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, UserPlus, Briefcase, Mail, ShieldAlert, MoreHorizontal, Key, UserX, UserCheck, Pencil, Trash2 } from 'lucide-react';
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

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');

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
    if (searchParams.get('invite') === 'true') {
      setIsAddModalOpen(true);
      // Clean up the URL
      router.replace('/workspace/clients');
    }
  }, [searchParams, router]);

  // Filtered Users (Clients only)
  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch && u.role === 'CLIENT';
  });

  // Handle Add Client
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

  // Handle Edit Client
  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editUser) return;
    const formData = new FormData(e.currentTarget);
    formData.append('role', 'CLIENT');

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

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Briefcase className="text-primary" size={28} />
            Client Management
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Add and manage clients within your organization.
          </p>
        </div>
        
        <Button onClick={() => setIsAddModalOpen(true)} className="w-full sm:w-auto shadow-md group">
          <UserPlus className="mr-2 h-4 w-4 transition-transform group-hover:scale-110" /> Add Client
        </Button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 p-1">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by name or email..." 
            className="pl-9 bg-background shadow-sm border-transparent focus-visible:border-primary transition-all" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Clients Table */}
      <div className="bg-background rounded-xl border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="w-[300px]">Client</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
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
