'use client';

import React, { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, UserPlus, Users as UsersIcon, Mail, ShieldAlert, MoreHorizontal, Key, UserX, UserCheck, Pencil } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { addUserAction, editUserAction, deactivateUserAction, activateUserAction, resetUserPasswordAction } from '@/app/actions/users';

export default function UsersClient({ initialUsers, currentUser }: { initialUsers: any[], currentUser: any }) {
  const [users, setUsers] = useState(initialUsers);
  const [isPending, startTransition] = useTransition();

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [resetUser, setResetUser] = useState<any>(null);
  const [deactivateUser, setDeactivateUser] = useState<any>(null);

  // Filtered Users
  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // Handle Add User
  const handleAddSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const pwd = formData.get('password') as string;
    const confirmPwd = formData.get('confirmPassword') as string;

    if (pwd !== confirmPwd) {
      toast.error('Passwords do not match');
      return;
    }

    startTransition(async () => {
      const res = await addUserAction(formData);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(res.message);
        setIsAddModalOpen(false);
        // Soft refresh the page data
        window.location.reload(); 
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
        window.location.reload();
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
        window.location.reload();
      }
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <UsersIcon className="text-primary" size={28} />
            User Management
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Add and manage members within your organization.
          </p>
        </div>
        
        <Button onClick={() => setIsAddModalOpen(true)} className="w-full sm:w-auto shadow-md group">
          <UserPlus className="mr-2 h-4 w-4 transition-transform group-hover:scale-110" /> Add User
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
        <div className="flex gap-2">
          <select 
            className="flex h-10 items-center justify-between rounded-md border bg-background px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 w-[140px]"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="ALL">All Roles</option>
            <option value="OWNER">Owner</option>
            <option value="MEMBER">Member</option>
            <option value="CLIENT">Client</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-background rounded-xl border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="w-[300px]">Member</TableHead>
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
                      {u.role === 'OWNER' && <ShieldAlert size={14} className="text-purple-500" />}
                      <span className={`text-sm font-medium ${u.role === 'OWNER' ? 'text-purple-600 dark:text-purple-400' : ''}`}>
                        {u.role.charAt(0) + u.role.slice(1).toLowerCase()}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {u.status === 'ACTIVE' ? (
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20 shadow-sm">Active</Badge>
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
                            <DropdownMenuItem onClick={() => handleToggleStatus(u)} className="text-emerald-600 focus:text-emerald-600 cursor-pointer">
                              <UserCheck className="mr-2 h-4 w-4" /> Reactivate User
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

      {/* Add User Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Create a new user account manually. They will be able to log in immediately.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input name="name" required placeholder="John Doe" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input name="email" type="email" required placeholder="john@example.com" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Password</label>
                <Input name="password" type="password" required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Confirm Password</label>
                <Input name="confirmPassword" type="password" required />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              <select name="role" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <option value="MEMBER">Member</option>
                <option value="OWNER">Owner</option>
                <option value="CLIENT">Client</option>
              </select>
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isPending}>{isPending ? 'Adding...' : 'Add User'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Modal */}
      <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user details and roles.</DialogDescription>
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Role</label>
                  <select name="role" defaultValue={editUser.role} required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <option value="MEMBER">Member</option>
                    <option value="OWNER">Owner</option>
                    <option value="CLIENT">Client</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <select name="status" defaultValue={editUser.status} required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
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
    </div>
  );
}
