'use client';

import React, { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, Plus, Building2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { getUserOrganizationsAction, switchOrganizationAction, createOrganizationAction } from '@/app/actions/auth';
import { toast } from 'sonner';

export function OrganizationSwitcher({ user }: { user: any }) {
  const [showNewOrgDialog, setShowNewOrgDialog] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function fetchOrgs() {
      const res = await getUserOrganizationsAction();
      if (res.success && res.memberships) {
        setOrganizations(res.memberships.map((m: any) => m.organization));
      }
    }
    fetchOrgs();
  }, []);

  const handleSwitch = async (orgId: string) => {
    if (orgId === user.organizationId) return;

    const res = await switchOrganizationAction(orgId);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success('Switched organization');
      router.refresh();
    }
  };

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;

    setLoading(true);
    const res = await createOrganizationAction(newOrgName);
    setLoading(false);

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success('Organization created successfully');
      setShowNewOrgDialog(false);
      setNewOrgName('');
      router.refresh();
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="w-[200px] justify-between h-9 truncate px-3 bg-white hover:bg-\[#fbfaf7\] dark:bg-slate-950 dark:hover:bg-slate-900 border-slate-200 dark:border-slate-800"
          >
            <div className="flex items-center gap-2 truncate">
              <Building2 size={14} className="text-muted-foreground shrink-0" />
              <span className="truncate">{user.organizationName}</span>
            </div>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[200px]" align="start">
          <DropdownMenuLabel className="text-xs text-muted-foreground">My Organizations</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {organizations.map((org) => (
            <DropdownMenuItem
              key={org.id}
              onClick={() => handleSwitch(org.id)}
              className="cursor-pointer text-sm font-medium"
            >
              <Check
                className={`mr-2 h-4 w-4 ${
                  user.organizationId === org.id ? 'opacity-100 text-primary' : 'opacity-0'
                }`}
              />
              <span className="truncate">{org.name}</span>
            </DropdownMenuItem>
          ))}
          
          {user.role === 'OWNER' && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setShowNewOrgDialog(true)}
                className="cursor-pointer text-sm text-primary font-medium focus:text-primary"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Organization
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showNewOrgDialog} onOpenChange={setShowNewOrgDialog}>
        <DialogContent>
          <form onSubmit={handleCreateOrganization}>
            <DialogHeader>
              <DialogTitle>Create Organization</DialogTitle>
              <DialogDescription>
                Add a new organization to separate projects, members, and data.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <label htmlFor="orgName" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Organization Name</label>
                <Input
                  id="orgName"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  placeholder="Acme Inc."
                  autoFocus
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowNewOrgDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !newOrgName.trim()}>
                {loading ? 'Creating...' : 'Create Organization'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
