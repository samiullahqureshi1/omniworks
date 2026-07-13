'use client';

import React, { useState, useEffect } from 'react';
import { Building2, CheckCircle2, Shield, Eye, ArrowRight, Loader2 } from 'lucide-react';
import { getUserOrganizationsAction, switchOrganizationAction } from '@/app/actions/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export function DelegateAccessTab({ currentOrgId }: { currentOrgId: string }) {
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function loadOrgs() {
      try {
        const res = await getUserOrganizationsAction();
        if (res.success && res.memberships) {
          // Format memberships with org and role
          const formatted = res.memberships.map((m: any) => ({
            id: m.organization.id,
            name: m.organization.name,
            role: m.role, // OWNER, MEMBER, CLIENT
          }));
          setOrganizations(formatted);
        } else {
          toast.error(res.error || 'Failed to fetch organizations.');
        }
      } catch (err: any) {
        toast.error(err.message || 'An error occurred.');
      } finally {
        setLoading(false);
      }
    }
    loadOrgs();
  }, []);

  const handleSwitch = async (orgId: string) => {
    if (orgId === currentOrgId) return;

    setSwitchingId(orgId);
    try {
      const res = await switchOrganizationAction(orgId);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success('Successfully switched workspace');
        router.refresh();
        window.location.reload(); // Refresh the page to reload correct workspace context
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to switch workspace.');
    } finally {
      setSwitchingId(null);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3 } }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-xs font-semibold">Loading delegated workspaces...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full animate-in fade-in duration-300">
      <div className="flex flex-col gap-1.5 bg-white dark:bg-[#1f1f1f] border border-black/5 dark:border-white/10 rounded-[24px] p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Workspace Delegation</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Switch between your full access personal workspaces and limited access shared organizations.
        </p>
      </div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 gap-5"
      >
        {organizations.map((org) => {
          const isActive = org.id === currentOrgId;
          const isOwner = org.role === 'OWNER';
          
          let roleTitle = '';
          let roleDesc = '';
          let RoleIcon = Building2;
          let badgeStyles = '';

          if (isOwner) {
            roleTitle = 'Full Access (Owner)';
            roleDesc = 'Manage your own team, workspace settings, project pipelines, and custom fields.';
            RoleIcon = Shield;
            badgeStyles = 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50';
          } else if (org.role === 'CLIENT') {
            roleTitle = 'Limited Access (Client)';
            roleDesc = 'Client view of assigned projects. Monitor status, view timelines, and check total logged hours.';
            RoleIcon = Eye;
            badgeStyles = 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/50';
          } else {
            roleTitle = 'Limited Access (Member)';
            roleDesc = 'Collaborator view of tasks and assignments. Log worked hours and update task completion status.';
            RoleIcon = CheckCircle2;
            badgeStyles = 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50';
          }

          return (
            <motion.div key={org.id} variants={itemVariants}>
              <Card className={`h-full border-[1.5px] rounded-[24px] shadow-sm flex flex-col justify-between overflow-hidden transition-all duration-300 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-[#1f1f1f] ${
                isActive ? 'border-primary dark:border-primary/70' : 'border-slate-100 dark:border-slate-800'
              }`}>
                <CardHeader className="p-6 pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                        isActive ? 'bg-primary/10 text-primary' : 'bg-slate-50 dark:bg-white/5 text-slate-400'
                      }`}>
                        <Building2 size={20} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <CardTitle className="text-sm font-bold text-slate-900 dark:text-white truncate">{org.name}</CardTitle>
                        <span className="text-[10px] text-slate-400 font-medium">Workspace</span>
                      </div>
                    </div>
                    {isActive && (
                      <span className="text-[9px] font-extrabold uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-1 rounded-full shrink-0">
                        Active
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="px-6 pb-6 pt-2 flex-1 flex flex-col justify-between gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-1.5">
                      <RoleIcon size={14} className={isOwner ? 'text-emerald-500' : org.role === 'CLIENT' ? 'text-blue-500' : 'text-amber-500'} />
                      <span className={`text-[11px] font-bold px-2 py-0.5 border rounded-full ${badgeStyles}`}>
                        {roleTitle}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      {roleDesc}
                    </p>
                  </div>

                  <div className="mt-auto">
                    {isActive ? (
                      <Button 
                        disabled 
                        variant="outline" 
                        className="w-full h-10 rounded-xl text-xs font-bold border-slate-200 dark:border-slate-800 cursor-not-allowed bg-slate-50 dark:bg-white/5"
                      >
                        Currently Active
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleSwitch(org.id)}
                        disabled={switchingId !== null}
                        className="w-full h-10 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
                      >
                        {switchingId === org.id ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Switching...
                          </>
                        ) : (
                          <>
                            Switch Workspace <ArrowRight size={13} />
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
