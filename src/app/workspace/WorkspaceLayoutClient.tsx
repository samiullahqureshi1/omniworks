'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bot } from 'lucide-react';
import { logoutAction, switchOrganizationAction, deleteOrganizationAction } from '@/app/actions/auth';
import { addUserAction } from '@/app/actions/users';
import { useTheme } from '@/components/ThemeProvider';
import { TooltipProvider } from '@/components/ui/tooltip';
import { usePresence } from '@/hooks/usePresence';
import { useRealtime } from '@/hooks/useRealtime';
import { toast } from 'sonner';
import { MainSidebar } from '@/components/navigation/MainSidebar';
import { SecondarySidebar } from '@/components/navigation/SecondarySidebar';
import { ConversationsSidebarPanel } from '@/components/navigation/ConversationsSidebarPanel';
import { Header } from '@/components/navigation/Header';
import { Input } from '@/components/ui/input';
import {
  FormDialog,
  FormDialogCancelButton,
  FormDialogSubmitButton,
  FormRoleSelect,
  formFieldLabel,
  formInputClass,
} from '@/components/ui/FormDialog';
import GlobalCreateProjectModal from '@/components/modals/GlobalCreateProjectModal';

export default function WorkspaceLayoutClient({
  children,
  user,
  userOrganizations = [],
}: {
  children: React.ReactNode;
  user: any;
  userOrganizations?: Array<{id: string, name: string, role: string, isChild: boolean}>;
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCreateChildModalOpen, setIsCreateChildModalOpen] = useState(false);
  const [newChildOrgName, setNewChildOrgName] = useState('');
  const [isCreatingChildOrg, setIsCreatingChildOrg] = useState(false);
  const [deleteOrg, setDeleteOrg] = useState<any>(null);
  const [isDeletingOrg, setIsDeletingOrg] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMainMenuOpen, setIsMainMenuOpen] = useState(true);
  const [isOtherMenuOpen, setIsOtherMenuOpen] = useState(true);
  
  // Invite User Modal state
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'OWNER' | 'MEMBER' | 'CLIENT'>('MEMBER');
  const [isInvitingUser, setIsInvitingUser] = useState(false);

  // Global Create Project Modal from Pinned Templates
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [browseTemplatesSignal, setBrowseTemplatesSignal] = useState(0);

  useEffect(() => {
    // Fired when user clicks a pinned template — pre-fill modal with that template
    const handleOpenProjectModal = (e: Event) => {
      const customEvent = e as CustomEvent;
      setSelectedTemplate(customEvent.detail || null);
      setIsCreateProjectOpen(true);
    };
    // Fired when user clicks "Browse / Create templates" — the modal checks whether
    // any templates exist and opens the template picker, or falls back to the
    // project creation modal when there are none.
    const handleBrowseTemplates = () => {
      setSelectedTemplate(null);
      setBrowseTemplatesSignal((n) => n + 1);
    };
    window.addEventListener('omniwork_open_create_project', handleOpenProjectModal);
    window.addEventListener('omniwork_browse_templates', handleBrowseTemplates);
    return () => {
      window.removeEventListener('omniwork_open_create_project', handleOpenProjectModal);
      window.removeEventListener('omniwork_browse_templates', handleBrowseTemplates);
    };
  }, []);

  const getActiveMainTab = (path: string) => {
    if (path.startsWith('/workspace/rules')) return 'rules';
    if (path.startsWith('/workspace/teamops')) return 'teams';
    if (path.startsWith('/workspace/conversations')) return 'conversations';
    if (path.startsWith('/workspace/planner')) return 'calendar';
    return 'home';
  };

  const [activeMainTab, setActiveMainTab] = useState<string>('home');
  const [activePlaceholder, setActivePlaceholder] = useState<null | { name: string, icon: any }>(null);
  const [isSecondaryCollapsed, setIsSecondaryCollapsed] = useState(false);

  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    setActiveMainTab(getActiveMainTab(pathname));
    setActivePlaceholder(null);
  }, [pathname]);

  // Prefetch all main navigation routes for instant navigation
  useEffect(() => {
    const routes = [
      '/workspace',
      '/workspace/projects',
      '/workspace/tasks',
      '/workspace/conversations',
      '/workspace/time',
      '/workspace/users',
      '/workspace/clients',
      '/workspace/teamops?tab=dashboard',
      '/workspace/teamops?tab=projects',
      '/workspace/teamops?tab=templates',
      '/workspace/settings',
      '/workspace/rules',
    ];
    routes.forEach(route => router.prefetch(route));
  }, []);
  const { theme, setTheme } = useTheme();

  const getPageTitle = (path: string) => {
    if (path === '/workspace') return 'Dashboard';
    if (path.startsWith('/workspace/projects')) return 'Projects';
    if (path.startsWith('/workspace/teamops')) return 'TeamOps Hub';
    if (path.startsWith('/workspace/tasks')) return 'Tasks';
    if (path.startsWith('/workspace/conversations')) return 'Conversations';
    if (path.startsWith('/workspace/time')) return 'Time';
    if (path.startsWith('/workspace/timesheet')) return 'Timesheet';
    if (path.startsWith('/workspace/users')) return 'Users';
    if (path.startsWith('/workspace/clients')) return 'Clients';
    if (path.startsWith('/workspace/rules')) return 'Rules';
    if (path.startsWith('/workspace/analytics')) return 'Analytics';
    if (path.startsWith('/workspace/integrations')) return 'Integration';
    if (path.startsWith('/workspace/reports')) return 'Reports';
    if (path.startsWith('/workspace/settings')) return 'Settings';
    if (path.startsWith('/workspace/profile')) return 'My Profile';
    return 'Workspace';
  };

  usePresence();
  const { lastEvent } = useRealtime([]);

  useEffect(() => {
    if (lastEvent) {
      if (lastEvent.event === 'message_sent' && lastEvent.payload.message) {
        const msg = lastEvent.payload.message;
        if (msg.senderId !== user.userId) {
          const senderName = msg.sender?.name || 'someone';
          const title = `New message from ${senderName}`;
          const body = msg.content
            ? msg.content.substring(0, 80) + (msg.content.length > 80 ? '...' : '')
            : (msg.fileName ? `Sent a file: ${msg.fileName}` : 'Sent a new message');

          const targetUrl = msg.groupId
            ? '/workspace/conversations'
            : msg.taskId
              ? `/workspace/tasks?taskId=${msg.taskId}`
              : `/workspace/projects/${msg.projectId}?tab=conversation`;

          // In-app toast
          toast.info(title, {
            description: body,
            action: {
              label: 'View',
              onClick: () => router.push(targetUrl)
            }
          });

          // Native desktop / OS notification (like Slack, Teams, etc.)
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            try {
              const desktopNotification = new Notification(title, {
                body,
                icon: '/favicon.ico',
                tag: msg.id || `${msg.groupId || msg.projectId}-${Date.now()}`,
              });
              desktopNotification.onclick = () => {
                window.focus();
                router.push(targetUrl);
                desktopNotification.close();
              };
            } catch (err) {
              console.error('Failed to show desktop notification', err);
            }
          }
        }
      }
    }
  }, [lastEvent, router, user.userId]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Ask for permission to show native desktop notifications once, on load
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  const handleLogout = async () => {
    await logoutAction();
    router.push('/login');
  };

  const handleOrgSwitch = async (orgId: string) => {
    if (orgId === user.organizationId) return;
    const res = await fetch('/api/organizations/switch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ organizationId: orgId })
    });
    const data = await res.json();
    if (data.success) {
      router.refresh();
    } else {
      alert(data.error || 'Failed to switch organization');
    }
  };

  const handleCreateChildOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChildOrgName.trim()) return;
    setIsCreatingChildOrg(true);
    try {
      const res = await fetch('/api/organizations/child', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newChildOrgName })
      });
      const data = await res.json();
      if (data.success) {
        setIsCreateChildModalOpen(false);
        setNewChildOrgName("");
        await handleOrgSwitch(data.organization.id);
      } else {
        alert(data.error || 'Failed to create child organization');
      }
    } catch (error) {
      alert('An error occurred while creating the organization.');
    } finally {
      setIsCreatingChildOrg(false);
    }
  };

  const handleDeleteOrg = async () => {
    if (!deleteOrg) return;
    setIsDeletingOrg(true);
    try {
      const res = await deleteOrganizationAction(deleteOrg.id);
      if (res.error) {
        alert(res.error);
      } else {
        setDeleteOrg(null);
        router.refresh();
      }
    } catch (error) {
      alert('An error occurred while deleting the organization.');
    } finally {
      setIsDeletingOrg(false);
    }
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim() || !inviteRole) return;
    setIsInvitingUser(true);
    try {
      const formData = new FormData();
      formData.append('name', inviteName.trim());
      formData.append('email', inviteEmail.trim());
      formData.append('role', inviteRole);

      const res = await addUserAction(formData);
      if (res?.success) {
        toast.success(res.message || 'User invited successfully.');
        setIsInviteModalOpen(false);
        setInviteName('');
        setInviteEmail('');
        setInviteRole('MEMBER');
      } else {
        toast.error(res?.error || 'Failed to invite user.');
      }
    } catch (err: any) {
      toast.error(err.message || 'An error occurred while inviting the user.');
    } finally {
      setIsInvitingUser(false);
    }
  };

  if (!mounted) return null;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-col h-screen w-full bg-slate-50 dark:bg-[#0c0c0e] overflow-hidden text-slate-700 dark:text-slate-200">
        
        {/* Top Header spans full width at the very top */}
        <Header
          user={user}
          userOrganizations={userOrganizations}
          handleOrgSwitch={handleOrgSwitch}
          handleLogout={handleLogout}
          theme={theme}
          setTheme={setTheme}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
          pageTitle={getPageTitle(pathname)}
          isSecondaryCollapsed={isSecondaryCollapsed}
          setIsSecondaryCollapsed={setIsSecondaryCollapsed}
          setIsCreateChildModalOpen={setIsCreateChildModalOpen}
        />

        {/* Main Body below the Header */}
        <div className="flex flex-1 w-full overflow-hidden bg-slate-50 dark:bg-[#0c0c0e]">
          
          {/* Desktop Left Black Main Sidebar */}
          <div className="hidden md:block">
            <MainSidebar 
              activeTab={activeMainTab}
              setActiveTab={(tabId) => {
                setActiveMainTab(tabId);
                setActivePlaceholder(null); // Reset when switching tabs
                if (tabId === 'home') {
                  router.push('/workspace');
                } else if (tabId === 'conversations') {
                  router.push('/workspace/conversations');
                } else if (tabId === 'teams') {
                  router.push('/workspace/teamops?tab=dashboard');
                }
              }}
              onUpgradeClick={() => toast.info("Premium Upgrade modal is coming soon!")}
              onInviteClick={() => setIsInviteModalOpen(true)}
              isSecondaryCollapsed={isSecondaryCollapsed}
              setIsSecondaryCollapsed={setIsSecondaryCollapsed}
            />
          </div>

          {/* Unified Floating Card for Secondary Sidebar & Content Viewport */}
          <div className="flex-1 flex mt-0.5 mb-2 mr-2 ml-1 bg-white dark:bg-[#151518] border border-slate-200/60 dark:border-white/5 rounded-[8px] overflow-hidden shadow-sm h-[calc(100vh-62px)] relative">
            
            {/* Desktop Secondary Sidebar (joined inside the card) */}
            <motion.div
              initial={false}
              animate={{ 
                width: isSecondaryCollapsed ? 0 : 245,
                opacity: isSecondaryCollapsed ? 0 : 1
              }}
              transition={{ type: 'spring', bounce: 0, duration: 0.25 }}
              className="hidden md:flex flex-col h-full shrink-0 overflow-hidden border-r border-slate-100 dark:border-white/5 bg-[#fafafa] dark:bg-[#131316]"
            >
              <div className="w-[245px] h-full flex flex-col">
                {activeMainTab === 'conversations' ? (
                  <ConversationsSidebarPanel
                    currentUserId={user.userId}
                  />
                ) : (
                  <SecondarySidebar
                    activeTab={activeMainTab}
                    user={user}
                    userOrganizations={userOrganizations}
                    onSelectPlaceholder={(name, icon) => setActivePlaceholder({ name, icon })}
                    onSelectRealLink={() => setActivePlaceholder(null)}
                    handleOrgSwitch={handleOrgSwitch}
                    setIsCreateChildModalOpen={setIsCreateChildModalOpen}
                    setDeleteOrg={setDeleteOrg}
                  />
                )}
              </div>
            </motion.div>

            {/* Main Content Layout Viewport (joined inside the card) */}
            <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-white dark:bg-[#151518]">
              <main className={`flex-1 overflow-y-auto custom-scrollbar relative z-10 ${
                  activeMainTab === 'conversations' ? 'p-0' : 'px-4 md:px-8 py-6'
                }`}>
                {activePlaceholder ? (
                  <PlaceholderView name={activePlaceholder.name} icon={activePlaceholder.icon} />
                ) : (
                  children
                )}
              </main>
            </div>
          </div>

        </div>

        {/* Mobile Navigation Drawer (Both Sidebars Combined) */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMobileMenuOpen(false)}
                className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
              />
              {/* Drawer Content */}
              <motion.aside
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
                className="fixed inset-y-0 left-0 z-50 flex shadow-2xl md:hidden overflow-hidden bg-white dark:bg-[#151518]"
              >
                <MainSidebar 
                  activeTab={activeMainTab}
                  setActiveTab={(tabId) => {
                    setActiveMainTab(tabId);
                    setActivePlaceholder(null);
                  }}
                  onUpgradeClick={() => {
                    toast.info("Premium Upgrade coming soon!");
                    setIsMobileMenuOpen(false);
                  }}
                  onInviteClick={() => {
                    setIsInviteModalOpen(true);
                    setIsMobileMenuOpen(false);
                  }}
                />
                <SecondarySidebar
                  activeTab={activeMainTab}
                  user={user}
                  userOrganizations={userOrganizations}
                  onSelectPlaceholder={(name, icon) => {
                    setActivePlaceholder({ name, icon });
                    setIsMobileMenuOpen(false);
                  }}
                  onSelectRealLink={() => {
                    setActivePlaceholder(null);
                    setIsMobileMenuOpen(false);
                  }}
                  handleOrgSwitch={handleOrgSwitch}
                  setIsCreateChildModalOpen={setIsCreateChildModalOpen}
                  setDeleteOrg={setDeleteOrg}
                />
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 bg-slate-50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-full p-1.5 transition-colors"
                >
                  <X size={16} />
                </button>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

      </div>

      {/* Invite User Modal opened from the main sidebar */}
      <FormDialog
        open={isInviteModalOpen}
        onOpenChange={setIsInviteModalOpen}
        title="Invite User"
        description="Send an invitation to join your workspace organization."
        footer={
          <>
            <FormDialogCancelButton
              onClick={() => setIsInviteModalOpen(false)}
              disabled={isInvitingUser}
            >
              Cancel
            </FormDialogCancelButton>
            <FormDialogSubmitButton
              type="submit"
              form="sidebar-invite-user-form"
              disabled={isInvitingUser || !inviteName.trim() || !inviteEmail.trim()}
            >
              {isInvitingUser ? 'Inviting...' : 'Invite'}
            </FormDialogSubmitButton>
          </>
        }
      >
        <form
          id="sidebar-invite-user-form"
          onSubmit={handleInviteUser}
          className="px-6 pt-7 pb-6 space-y-5"
        >
          <div className="space-y-1.5">
            <label htmlFor="sidebar-invite-name" className={formFieldLabel}>Name</label>
            <Input
              id="sidebar-invite-name"
              placeholder="e.g. John Doe"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              required
              autoFocus
              className={formInputClass}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="sidebar-invite-email" className={formFieldLabel}>Email Address</label>
            <Input
              id="sidebar-invite-email"
              type="email"
              placeholder="e.g. john@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
              className={formInputClass}
            />
          </div>

          <FormRoleSelect
            id="sidebar-invite-role"
            value={inviteRole}
            onValueChange={setInviteRole}
          />
        </form>
      </FormDialog>

      {/* Create Child Organization Modal */}
      {isCreateChildModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#151518] rounded-[8px] shadow-2xl border border-slate-200/80 dark:border-white/10 w-full max-w-md overflow-hidden relative">
            
            {/* Modal title & desc */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 relative">
              <h2 className="text-[16.5px] font-bold text-slate-900 dark:text-white leading-tight">Create Child Organization</h2>
              <p className="text-xs text-slate-450 dark:text-slate-400 mt-1">Create a separate workspace for a team, client, or department.</p>
              
              {/* Close icon button */}
              <button 
                type="button"
                onClick={() => setIsCreateChildModalOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-250 transition-all p-1 hover:bg-slate-50 dark:hover:bg-white/5 rounded-md cursor-pointer outline-none"
              >
                <X size={15} />
              </button>
            </div>

            {/* Input Form */}
            <form onSubmit={handleCreateChildOrg} className="flex flex-col">
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-[12.5px] font-bold text-slate-600 dark:text-slate-350">Organization Name</label>
                  <Input 
                    placeholder="e.g. Design Team" 
                    value={newChildOrgName}
                    onChange={(e) => setNewChildOrgName(e.target.value)}
                    required
                    autoFocus
                    className="h-10 rounded-lg border-slate-200 focus-visible:ring-1 focus-visible:ring-slate-450 dark:border-white/10 dark:bg-transparent"
                  />
                </div>
              </div>

              {/* Action buttons footer */}
              <div className="px-6 py-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#19191c] flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCreateChildModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors outline-none cursor-pointer"
                  disabled={isCreatingChildOrg}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingChildOrg || !newChildOrgName.trim()}
                  className="px-5 py-2 text-sm font-bold rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors shadow-sm disabled:opacity-50 outline-none cursor-pointer"
                >
                  {isCreatingChildOrg ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Organization Modal */}
      {deleteOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#1f1f1f] rounded-2xl shadow-xl border border-black/5 dark:border-white/10 w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-black/5 dark:border-white/10">
              <h2 className="text-xl font-bold text-red-600">Delete Organization</h2>
              <p className="text-sm text-slate-500 mt-1">
                Are you sure you want to completely delete <strong>{deleteOrg.name}</strong>? 
                This will also permanently delete all its projects, tasks, and members.
              </p>
            </div>
            <div className="p-6 flex justify-end gap-3 bg-slate-50 dark:bg-black/20">
              <button
                type="button"
                onClick={() => setDeleteOrg(null)}
                className="px-4 py-2 text-sm font-semibold rounded-full hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                disabled={isDeletingOrg}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteOrg}
                className="px-4 py-2 text-sm font-semibold rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors"
                disabled={isDeletingOrg}
              >
                {isDeletingOrg ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Create Project Modal */}
      <GlobalCreateProjectModal
        isOpen={isCreateProjectOpen}
        setIsOpen={(open) => {
          setIsCreateProjectOpen(open);
          if (!open) {
            setSelectedTemplate(null);
          }
        }}
        initialTemplate={selectedTemplate}
        browseTemplatesSignal={browseTemplatesSignal}
      />
    </TooltipProvider>
  );
}

function PlaceholderView({ name, icon: Icon }: { name: string, icon: any }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 bg-white dark:bg-[#151518] border border-slate-100 dark:border-white/5 rounded-3xl shadow-sm text-center max-w-2xl mx-auto my-10 animate-in fade-in slide-in-from-bottom duration-300">
      <div className="w-16 h-16 rounded-2xl bg-violet-600/10 text-violet-600 flex items-center justify-center mb-6 shadow-sm">
        {Icon && <Icon size={32} />}
      </div>
      <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">{name}</h2>
      <span className="bg-violet-600/10 text-violet-600 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full mb-6">
        Coming Soon
      </span>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-8 leading-relaxed">
        We are building a highly integrated ClickUp-style {name.toLowerCase()} module to supercharge your team's workflow and productivity.
      </p>
      <div className="flex items-center gap-4 text-xs font-semibold text-slate-400">
        <span>ClickUp Layout Redesign</span>
        <span>•</span>
        <span>OmniWork AI</span>
      </div>
    </div>
  );
}
