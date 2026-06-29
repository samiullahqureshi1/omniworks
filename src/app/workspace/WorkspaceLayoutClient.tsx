'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  FolderKanban,
  Timer,
  Users as UsersIcon,
  BarChart3,
  Settings,
  Search,
  Menu,
  X,
  LogOut,
  Command,
  CheckSquare,
  FileText,
  Moon,
  Sun,
  ChevronDown,
  User,
  Shield,
  Trash2,
  Plus
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { logoutAction, switchOrganizationAction, deleteOrganizationAction } from '@/app/actions/auth';
import { NotificationBell } from '@/components/dashboard/NotificationBell';
import { useTheme } from '@/components/ThemeProvider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
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
      window.location.reload();
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
        // Automatically switch to the newly created org
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
        window.location.reload();
      }
    } catch (error) {
      alert('An error occurred while deleting the organization.');
    } finally {
      setIsDeletingOrg(false);
    }
  };

  const effectiveRole = user.role === 'MEMBER' && user.isPM ? 'PM' : user.role;

  const allNavItems = [
    { name: 'Overview', href: '/workspace', icon: LayoutDashboard, exact: true, roles: ['OWNER', 'PM', 'MEMBER', 'CLIENT'] },
    { name: 'Projects', href: '/workspace/projects', icon: FolderKanban, exact: false, roles: ['OWNER', 'PM', 'MEMBER', 'CLIENT'] },
    { name: 'Tasks', href: '/workspace/tasks', icon: CheckSquare, exact: false, roles: ['OWNER', 'PM', 'MEMBER', 'CLIENT'] },
    { name: 'Time', href: '/workspace/time', icon: Timer, exact: false, roles: ['OWNER', 'PM', 'MEMBER'] },
    { name: 'Timesheet', href: '/workspace/timesheet', icon: FileText, exact: false, roles: ['OWNER', 'PM', 'MEMBER', 'CLIENT'] },
    { name: 'Users', href: '/workspace/users', icon: UsersIcon, exact: false, roles: ['OWNER'] },
    { name: 'Reports', href: '/workspace/reports', icon: BarChart3, exact: false, roles: ['OWNER', 'PM'] },
    { name: 'Settings', href: '/workspace/settings', icon: Settings, exact: false, roles: ['OWNER', 'PM', 'MEMBER', 'CLIENT'] },
  ];

  const navItems = allNavItems.filter(item => item.roles.includes(effectiveRole));

  const SidebarContent = () => (
    <div className="flex h-full w-[80px] flex-col items-center py-2 bg-white dark:bg-transparent md:bg-transparent shadow-xl md:shadow-none transition-colors">
      {/* Theme Toggle */}
      <div className="flex flex-col items-center gap-2 p-1.5 bg-white dark:bg-[#1f1f1f] rounded-full shadow-sm mb-4 md:mb-6 transition-colors border border-black/5 dark:border-white/10">
        <button 
          onClick={() => setTheme('light')}
          className={`p-2 rounded-full transition-colors ${theme === 'light' ? 'bg-slate-100 text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
        >
          <Sun size={18} />
        </button>
        <button 
          onClick={() => setTheme('dark')}
          className={`p-2 rounded-full transition-colors ${theme === 'dark' ? 'bg-black text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white'}`}
        >
          <Moon size={18} />
        </button>
      </div>

      {/* Grouped Nav & Settings Pills */}
      <div className="flex flex-col items-center gap-4">
        {/* Navigation */}
        <nav className="flex flex-col items-center gap-2 bg-white dark:bg-[#1f1f1f] px-1.5 py-3 rounded-[32px] shadow-sm w-max transition-colors border border-black/5 dark:border-white/10">
          {navItems.map((item) => {
            const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Tooltip key={item.name} delayDuration={0}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`group relative flex h-10 w-10 items-center justify-center rounded-full transition-all ${
                      isActive 
                        ? (theme === 'dark' ? 'bg-white text-black shadow-md' : 'bg-black text-white shadow-md')
                        : 'text-slate-400 hover:text-black dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10'
                    }`}
                  >
                    <item.icon size={18} className="relative z-10 shrink-0" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" className="dark:bg-black dark:text-white dark:border-white/20">{item.name}</TooltipContent>
              </Tooltip>
            );
          })}
        </nav>

        {/* Settings / Logout */}
        <div className="flex flex-col items-center gap-2 bg-white dark:bg-[#1f1f1f] px-1.5 py-3 rounded-[28px] shadow-sm transition-colors border border-black/5 dark:border-white/10">
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Link 
                href="/workspace/profile"
                className="flex h-10 w-10 items-center justify-center rounded-full text-slate-400 hover:text-black dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
              >
                <User size={18} />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right" className="dark:bg-black dark:text-white dark:border-white/20">My Profile</TooltipContent>
          </Tooltip>
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button 
                onClick={handleLogout}
                className="flex h-10 w-10 items-center justify-center rounded-full text-slate-400 hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut size={18} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="dark:bg-black dark:text-white dark:border-white/20">Logout</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-col h-screen w-full bg-[#f4f4f2] dark:bg-[#0f0f0f] overflow-hidden p-2 md:p-4 gap-2 md:gap-4 transition-colors">
        
        {/* Full-width Top Navbar */}
        <header className="flex h-16 shrink-0 items-center justify-between w-full">
          <div className="flex items-center gap-3 flex-1">
            <button
              className="md:hidden text-slate-500 hover:text-black dark:hover:text-white p-2 bg-white dark:bg-[#1f1f1f] rounded-full shadow-sm border border-black/5 dark:border-white/10"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu size={20} />
            </button>

            <div className="hidden lg:flex items-center gap-2.5 bg-white dark:bg-[#1f1f1f] pr-5 pl-1.5 py-1.5 rounded-full shadow-sm shrink-0 transition-colors border border-black/5 dark:border-white/10">
              <div className="flex items-center justify-center h-9 w-9 bg-[#ff4d29] rounded-full text-white font-extrabold shadow-sm">
                <span className="text-lg leading-none">C</span>
              </div>
              <span className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Collabix</span>
            </div>

            <div className="hidden lg:flex items-center gap-2 bg-white dark:bg-[#1f1f1f] px-2 py-1.5 rounded-full shadow-sm transition-colors border border-black/5 dark:border-white/10">
              {navItems.filter(item => item.name !== 'Reports' && item.name !== 'Settings').map((item) => {
                const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`relative px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${
                      isActive 
                        ? 'text-black dark:text-white bg-slate-100 dark:bg-white/10' 
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="active-top-nav"
                        className="absolute inset-0 rounded-full bg-slate-100 dark:bg-white/10"
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10">{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-4">
            <div className="hidden sm:flex items-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 h-12 px-5 bg-white dark:bg-[#1f1f1f] border border-black/5 dark:border-white/10 shadow-sm hover:bg-slate-50 dark:hover:bg-white/5 transition-all rounded-full text-sm font-bold text-slate-700 dark:text-slate-200">
                    <div className="w-5 h-5 rounded bg-purple-100 dark:bg-purple-900/30 text-[#8b5cf6] flex items-center justify-center mr-1 shrink-0">
                      <span className="text-[10px] font-black leading-none">{user.organizationName ? user.organizationName.substring(0, 1).toUpperCase() : 'O'}</span>
                    </div>
                    <span className="truncate max-w-[120px]">{user.organizationName || 'Select Org'}</span>
                    <ChevronDown size={14} className="text-slate-400 ml-1 shrink-0" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-[#1f1f1f] rounded-xl shadow-lg border border-black/5 dark:border-white/10 p-2">
                  <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Your Organizations</div>
                  {userOrganizations.map(org => (
                    <div key={org.id} className="relative group flex items-center mb-1 last:mb-0">
                      <DropdownMenuItem 
                        onClick={() => handleOrgSwitch(org.id)}
                        className={`flex-1 cursor-pointer rounded-lg px-3 py-2 hover:bg-slate-50 dark:hover:bg-white/5 ${user.organizationId === org.id ? 'bg-purple-50 dark:bg-purple-900/20' : ''}`}
                      >
                        <div className="flex flex-col pr-8">
                          <span className={`font-semibold ${user.organizationId === org.id ? 'text-[#8b5cf6]' : 'text-slate-700 dark:text-slate-200'}`}>{org.name}</span>
                          <span className="text-[10px] text-slate-400 font-medium">{org.role}{org.isChild ? ' (Child)' : ' (Base)'}</span>
                        </div>
                      </DropdownMenuItem>
                      {org.role === 'OWNER' && (
                        <button 
                          className="absolute right-2 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setDeleteOrg(org);
                          }}
                          title="Delete Organization"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                  {user.role === 'OWNER' && (
                    <>
                      <DropdownMenuSeparator className="bg-black/5 dark:bg-white/10 my-1" />
                      <DropdownMenuItem 
                        className="cursor-pointer rounded-lg px-3 py-2 text-[#8b5cf6] font-semibold hover:bg-purple-50 dark:hover:bg-purple-900/20 flex items-center gap-2"
                        onClick={() => setIsCreateChildModalOpen(true)}
                      >
                        <Plus size={16} /> Create
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex items-center justify-center h-12 w-12 bg-white dark:bg-[#1f1f1f] rounded-full shadow-sm border border-black/5 dark:border-white/10 transition-colors">
              <NotificationBell userId={user.id} />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 bg-white dark:bg-[#1f1f1f] pl-2 pr-4 py-1.5 rounded-full shadow-sm border border-black/5 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer outline-none">
                  <Avatar className="h-9 w-9 shrink-0 border border-black/5 dark:border-white/10">
                    <AvatarFallback className="bg-[#f0bd5e]/20 text-[#ffad0d] text-xs font-bold">
                      {user.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:flex flex-col text-left">
                    <span className="text-sm font-bold text-slate-900 dark:text-white leading-none">{user.name.split(' ')[0]}</span>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-[#1f1f1f] rounded-xl shadow-lg border border-black/5 dark:border-white/10 p-2">
                <DropdownMenuItem asChild className="cursor-pointer rounded-lg px-3 py-2 hover:bg-slate-50 dark:hover:bg-white/5 mb-1">
                  <Link href="/workspace/profile" className="flex items-center text-slate-700 dark:text-slate-200 font-semibold">
                    <User size={16} className="mr-2 text-slate-400" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer rounded-lg px-3 py-2 hover:bg-slate-50 dark:hover:bg-white/5 mb-1">
                  <Link href="/workspace/settings" className="flex items-center text-slate-700 dark:text-slate-200 font-semibold">
                    <Shield size={16} className="mr-2 text-slate-400" />
                    Security
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-black/5 dark:bg-white/10 my-1" />
                <DropdownMenuItem 
                  onClick={handleLogout}
                  className="cursor-pointer rounded-lg px-3 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 font-semibold"
                >
                  <div className="flex items-center">
                    <LogOut size={16} className="mr-2" />
                    Logout
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Lower Row: Sidebar + Main Content */}
        <div className="flex flex-1 min-h-0 gap-2 md:gap-4">
          <aside className="hidden md:flex flex-col z-20 shrink-0">
            <SidebarContent />
          </aside>

          <AnimatePresence>
            {isMobileMenuOpen && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
                />
                <motion.aside
                  initial={{ x: '-100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '-100%' }}
                  transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
                  className="fixed inset-y-0 left-0 z-50 w-24 md:hidden"
                >
                  <SidebarContent />
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="absolute right-[-40px] top-4 text-white bg-black/50 rounded-full p-2"
                  >
                    <X size={20} />
                  </button>
                </motion.aside>
              </>
            )}
          </AnimatePresence>

          <div className="flex flex-1 flex-col min-w-0 bg-[#fbfaf7] dark:bg-[#181818] rounded-[32px] shadow-sm overflow-hidden border border-black/5 dark:border-white/10 transition-colors">
            <main className="flex-1 overflow-y-auto px-6 md:px-10 py-8 custom-scrollbar">
              {children}
            </main>
          </div>
        </div>
      </div>
      {/* Create Child Organization Modal */}
      {isCreateChildModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#1f1f1f] rounded-2xl shadow-xl border border-black/5 dark:border-white/10 w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-black/5 dark:border-white/10">
              <h2 className="text-xl font-bold">Create Child Organization</h2>
              <p className="text-sm text-slate-500 mt-1">Create a separate workspace for a team, client, or department.</p>
            </div>
            <form onSubmit={handleCreateChildOrg} className="p-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Organization Name</label>
                  <Input 
                    placeholder="e.g. Design Team" 
                    value={newChildOrgName}
                    onChange={(e) => setNewChildOrgName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              </div>
              <div className="mt-8 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateChildModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold rounded-full hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                  disabled={isCreatingChildOrg}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingChildOrg || !newChildOrgName.trim()}
                  className="px-6 py-2 text-sm font-semibold rounded-full bg-[#8b5cf6] text-white hover:bg-[#7c3aed] transition-colors shadow-sm disabled:opacity-50"
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
    </TooltipProvider>
  );
}
