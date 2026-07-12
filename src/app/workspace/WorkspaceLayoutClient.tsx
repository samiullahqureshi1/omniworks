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
  ChevronUp,
  ChevronsLeft,
  ChevronsRight,
  User,
  Shield,
  Briefcase,
  Trash2,
  Plus,
  Cpu,
  Workflow,
  Info,
  Mail
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { usePresence } from '@/hooks/usePresence';
import { useRealtime } from '@/hooks/useRealtime';
import { toast } from 'sonner';

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

  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const getPageTitle = (path: string) => {
    if (path === '/workspace') return 'Dashboard';
    if (path.startsWith('/workspace/projects')) return 'Projects';
    if (path.startsWith('/workspace/teamops')) return 'TeamOps Hub';
    if (path.startsWith('/workspace/tasks')) return 'Tasks';
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
          toast.info(`New message from ${msg.sender?.name || 'someone'}`, {
            description: msg.content.substring(0, 50) + (msg.content.length > 50 ? '...' : ''),
            action: {
              label: 'View',
              onClick: () => router.push(`/workspace/projects/${msg.projectId}?tab=conversation`)
            }
          });
        }
      }
    }
  }, [lastEvent, router, user.userId]);

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

  const effectiveRole = user.role === 'MEMBER' && user.isPM ? 'PM' : user.role;

  const allNavItems = [
    { name: 'Dashboard', href: '/workspace', icon: LayoutDashboard, exact: true, roles: ['OWNER', 'PM', 'MEMBER', 'CLIENT'] },
    { name: 'Projects', href: '/workspace/projects', icon: FolderKanban, exact: false, roles: ['OWNER', 'PM', 'MEMBER', 'CLIENT'] },
    { name: 'TeamOps Hub', href: '/workspace/teamops', icon: Workflow, exact: false, roles: ['OWNER', 'PM', 'MEMBER'] },
    { name: 'Tasks', href: '/workspace/tasks', icon: CheckSquare, exact: false, roles: ['OWNER', 'PM', 'MEMBER', 'CLIENT'] },
    { name: 'Time', href: '/workspace/time', icon: Timer, exact: false, roles: ['OWNER', 'PM', 'MEMBER'] },
    { name: 'Timesheet', href: '/workspace/timesheet', icon: FileText, exact: false, roles: ['OWNER', 'PM', 'MEMBER', 'CLIENT'] },
    { name: 'Users', href: '/workspace/users', icon: UsersIcon, exact: false, roles: ['OWNER'] },
    { name: 'Clients', href: '/workspace/clients', icon: Briefcase, exact: false, roles: ['OWNER'] },
    { name: 'Rules', href: '/workspace/rules', icon: Cpu, exact: false, roles: ['OWNER'] },
    { name: 'Reports', href: '/workspace/reports', icon: BarChart3, exact: false, roles: ['OWNER', 'PM'] },
    { name: 'Settings', href: '/workspace/settings', icon: Settings, exact: false, roles: ['OWNER', 'PM', 'MEMBER', 'CLIENT'] },
  ];

  const activeNavItems = allNavItems.filter(item => item.roles.includes(effectiveRole));

  const mainMenuNavNames = ['Dashboard', 'Projects', 'TeamOps Hub', 'Tasks', 'Time', 'Timesheet', 'Users', 'Clients'];
  const otherNavNames = ['Rules', 'Reports', 'Settings'];

  const mainMenuNavItems = activeNavItems.filter(item => mainMenuNavNames.includes(item.name));
  const otherNavItems = activeNavItems.filter(item => otherNavNames.includes(item.name));

  const NavItemRender = ({ item }: { item: any }) => {
    const isActive = item.exact ? pathname === item.href : (pathname === item.href || pathname.startsWith(item.href + '/'));
    
    return (
      <Link
        href={item.href}
        onClick={() => setIsMobileMenuOpen(false)}
        className={`flex items-center px-3 py-2.5 rounded-xl transition-colors group ${
          isSidebarCollapsed ? 'justify-center' : 'justify-between'
        } ${
          isActive 
            ? 'bg-[#f97316] text-white shadow-sm' 
            : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'
        }`}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <item.icon size={18} className={`shrink-0 transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`} />
          <AnimatePresence initial={false}>
            {!isSidebarCollapsed && (
              <motion.span 
                initial={{ opacity: 0, width: 0, marginLeft: -12 }}
                animate={{ opacity: 1, width: 'auto', marginLeft: 0 }}
                exit={{ opacity: 0, width: 0, marginLeft: -12 }}
                transition={{ duration: 0.2 }}
                className="font-medium text-sm whitespace-nowrap"
              >
                {item.name}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </Link>
    );
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white dark:bg-[#181818] relative w-full overflow-hidden">
      
      {/* Company Header */}
      <div className="p-4 shrink-0">
        <div className={`flex items-center bg-white dark:bg-[#1f1f1f] border border-black/5 dark:border-white/10 rounded-2xl p-2 shadow-sm transition-colors hover:shadow-md ${isSidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 flex-1 min-w-0 outline-none text-left overflow-hidden">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <span className="text-lg font-black leading-none">{user.organizationName ? user.organizationName.substring(0, 1).toUpperCase() : 'O'}</span>
                </div>
                <AnimatePresence initial={false}>
                  {!isSidebarCollapsed && (
                    <motion.div 
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.2 }}
                      className="flex flex-col min-w-0 pr-2 overflow-hidden whitespace-nowrap"
                    >
                      <span className="text-sm font-bold text-slate-900 dark:text-white truncate">{user.organizationName || 'Select Org'}</span>
                      <span className="text-[10px] text-slate-500 truncate">Workspace</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 bg-white dark:bg-[#1f1f1f] rounded-xl shadow-lg border border-black/5 dark:border-white/10 p-2 ml-4">
              <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Your Organizations</div>
              {userOrganizations.map(org => (
                <div key={org.id} className="relative group flex items-center mb-1 last:mb-0">
                  <DropdownMenuItem 
                    onClick={() => handleOrgSwitch(org.id)}
                    className={`flex-1 cursor-pointer rounded-lg px-3 py-2 hover:bg-slate-50 dark:hover:bg-white/5 ${user.organizationId === org.id ? 'bg-orange-50 dark:bg-orange-900/20' : ''}`}
                  >
                    <div className="flex flex-col pr-8">
                      <span className={`font-semibold ${user.organizationId === org.id ? 'text-[#f97316]' : 'text-slate-700 dark:text-slate-200'}`}>{org.name}</span>
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
                    className="cursor-pointer rounded-lg px-3 py-2 text-[#f97316] font-semibold hover:bg-orange-50 dark:hover:bg-orange-900/20 flex items-center gap-2"
                    onClick={() => setIsCreateChildModalOpen(true)}
                  >
                    <Plus size={16} /> Create
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-4 py-2 custom-scrollbar space-y-6">
        
        {/* Main Menu */}
        <div>
          <AnimatePresence initial={false}>
            {!isSidebarCollapsed && (
              <motion.div 
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: 8 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-center justify-between text-sm font-bold text-slate-800 dark:text-slate-200 px-1 cursor-pointer select-none overflow-hidden whitespace-nowrap"
                onClick={() => setIsMainMenuOpen(!isMainMenuOpen)}
              >
                <span>Main Menu</span>
                <button className="p-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                  <ChevronUp size={12} className={`transition-transform duration-200 ${!isMainMenuOpen ? 'rotate-180' : ''}`} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence initial={false}>
            {(isMainMenuOpen || isSidebarCollapsed) && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="flex flex-col gap-1 overflow-hidden"
              >
                {mainMenuNavItems.map(item => <NavItemRender key={item.name} item={item} />)}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Other */}
        <div>
          <AnimatePresence initial={false}>
            {!isSidebarCollapsed && (
              <motion.div 
                initial={{ opacity: 0, height: 0, marginBottom: 0, paddingTop: 0, borderTopWidth: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: 8, paddingTop: 24, borderTopWidth: 1 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0, paddingTop: 0, borderTopWidth: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-center justify-between text-sm font-bold text-slate-800 dark:text-slate-200 px-1 cursor-pointer select-none border-slate-100 dark:border-slate-800 overflow-hidden whitespace-nowrap"
                onClick={() => setIsOtherMenuOpen(!isOtherMenuOpen)}
              >
                <span>Other</span>
                <button className="p-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                  <ChevronUp size={12} className={`transition-transform duration-200 ${!isOtherMenuOpen ? 'rotate-180' : ''}`} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence initial={false}>
            {(isOtherMenuOpen || isSidebarCollapsed) && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className={`flex flex-col gap-1 overflow-hidden ${isSidebarCollapsed ? 'mt-6 pt-6 border-t border-slate-100 dark:border-slate-800' : ''}`}
              >
                {otherNavItems.map(item => <NavItemRender key={item.name} item={item} />)}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>

      {/* Footer Profile */}
      <div className="p-4 shrink-0 border-t border-slate-100 dark:border-slate-800/50">
        <div className={`flex items-center bg-white dark:bg-[#1f1f1f] border border-black/5 dark:border-white/10 rounded-2xl p-2 shadow-sm transition-colors hover:shadow-md ${isSidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
          <div className="flex items-center gap-3 min-w-0 overflow-hidden">
            <Avatar className="h-10 w-10 shrink-0 border border-black/5">
              <AvatarImage src={`https://api.dicebear.com/7.x/notionists/svg?seed=${user.name}`} />
              <AvatarFallback className="bg-[#f0bd5e]/20 text-[#ffad0d] text-xs font-bold">
                {user.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <AnimatePresence initial={false}>
              {!isSidebarCollapsed && (
                <motion.div 
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col min-w-0 pr-2 overflow-hidden whitespace-nowrap"
                >
                  <span className="text-sm font-bold text-slate-900 dark:text-white truncate leading-tight">{user.name}</span>
                  <span className="text-[10px] text-slate-500 truncate leading-tight">{user.email || 'No email'}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <AnimatePresence initial={false}>
            {!isSidebarCollapsed && (
              <motion.div 
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-1 shrink-0 overflow-hidden"
              >
                <button 
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="p-1.5 rounded-lg transition-colors text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 w-full flex justify-center"
                  title="Toggle Theme"
                >
                  {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                </button>
                <button 
                  onClick={handleLogout}
                  className="p-1.5 rounded-lg transition-colors text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 w-full flex justify-center"
                  title="Logout"
                >
                  <LogOut size={16} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-screen w-full bg-slate-50 dark:bg-[#0f0f0f] overflow-hidden">
        
        {/* Desktop Sidebar */}
        <motion.aside 
          initial={false}
          animate={{ width: isSidebarCollapsed ? 80 : 280 }}
          transition={{ type: "spring", bounce: 0, duration: 0.3 }}
          className="hidden md:flex flex-col z-20 shrink-0 h-full border-r border-black/5 dark:border-white/10 relative bg-white dark:bg-[#181818]"
        >
          <SidebarContent />
          
          {/* Collapse Button */}
          <button 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
            className="absolute top-1/2 -translate-y-1/2 -right-3.5 z-50 flex items-center justify-center h-7 w-7 bg-white dark:bg-[#1f1f1f] border border-black/10 dark:border-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-full shadow-sm hidden md:flex transition-transform hover:scale-110"
          >
            {isSidebarCollapsed ? <ChevronsRight size={14} /> : <ChevronsLeft size={14} />}
          </button>
        </motion.aside>

        {/* Mobile Sidebar */}
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
                className="fixed inset-y-0 left-0 z-50 w-[280px] md:hidden shadow-2xl"
              >
                <SidebarContent />
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="absolute right-[-40px] top-4 text-white bg-black/50 hover:bg-black/80 rounded-full p-2 transition-colors"
                >
                  <X size={20} />
                </button>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Main Content Column */}
        <div className="flex flex-1 flex-col min-w-0">
          
          {/* Global Header */}
          <header className="flex items-center justify-between px-6 md:px-10 py-4 shrink-0 relative z-20 bg-white dark:bg-[#181818] border-b border-black/5 dark:border-white/10">
             {/* Left Section */}
             <div className="flex flex-col">
                <div className="flex items-center gap-3">
                   <button
                     className="md:hidden flex items-center justify-center h-8 w-8 text-slate-500 hover:text-black dark:hover:text-white bg-white dark:bg-[#1f1f1f] rounded-full shadow-sm border border-black/5"
                     onClick={() => setIsMobileMenuOpen(true)}
                   >
                     <Menu size={16} />
                   </button>
                   <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white leading-tight">{getPageTitle(pathname)}</h1>
                </div>
                <span className="text-xs font-medium text-slate-500 mt-0.5 md:ml-0 ml-11">{user.organizationName || 'OmniWork'} Project - {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}</span>
             </div>
             
             {/* Middle Section: Search */}
             <div className="hidden lg:flex flex-1 max-w-md mx-8 relative">
               <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                 <Search size={16} className="text-slate-400" />
               </div>
               <Input 
                 placeholder="Search" 
                 className="w-full pl-10 pr-12 h-10 bg-white dark:bg-[#1f1f1f] border-black/5 dark:border-white/10 rounded-full shadow-sm focus-visible:ring-[#f97316] relative z-0"
               />
               <div className="absolute inset-y-0 right-1.5 flex items-center z-10">
                 <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-bold px-1.5 py-1 rounded-md">
                   <Command size={10} /> <span>F</span>
                 </div>
               </div>
             </div>

             {/* Right Section */}
             <div className="flex items-center gap-2 md:gap-3 shrink-0">
                {/* Avatars */}
                <div className="hidden sm:flex -space-x-2 mr-2">
                   <Avatar className="h-10 w-10 border-2 border-slate-50 dark:border-[#0f0f0f] shadow-sm">
                     <AvatarImage src="https://api.dicebear.com/7.x/notionists/svg?seed=Mithun" />
                   </Avatar>
                   <Avatar className="h-10 w-10 border-2 border-slate-50 dark:border-[#0f0f0f] shadow-sm">
                     <AvatarImage src="https://api.dicebear.com/7.x/notionists/svg?seed=Sarah" />
                   </Avatar>
                   <Avatar className="h-10 w-10 border-2 border-slate-50 dark:border-[#0f0f0f] shadow-sm">
                     <AvatarImage src="https://api.dicebear.com/7.x/notionists/svg?seed=John" />
                   </Avatar>
                </div>
                
                {/* Add Button */}
                <button className="flex items-center justify-center h-10 w-10 bg-white dark:bg-[#1f1f1f] rounded-full shadow-sm border border-black/5 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-500 transition-colors">
                  <Plus size={18} />
                </button>
                
                {/* Message Button */}
                <button className="flex items-center justify-center h-10 w-10 bg-white dark:bg-[#1f1f1f] rounded-full shadow-sm border border-black/5 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-500 transition-colors">
                  <Mail size={18} />
                </button>

                {/* Notification Bell */}
                <div className="flex items-center justify-center h-10 w-10 bg-white dark:bg-[#1f1f1f] rounded-full shadow-sm border border-black/5 dark:border-white/10 transition-colors">
                  <NotificationBell userId={user.id} />
                </div>
             </div>
          </header>

          {/* Main Content Area */}
          <main className="flex-1 overflow-y-auto px-4 md:px-8 py-6 custom-scrollbar relative z-10">
            {children}
          </main>
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
                  className="px-6 py-2 text-sm font-semibold rounded-full bg-[#f97316] text-white hover:bg-[#ea580c] transition-colors shadow-sm disabled:opacity-50"
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
