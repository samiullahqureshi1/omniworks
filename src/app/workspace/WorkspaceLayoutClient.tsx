'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  FolderKanban,
  Timer,
  CalendarDays,
  Users as UsersIcon,
  BarChart3,
  Settings,
  Search,
  Bell,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Command,
  CheckSquare,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { logoutAction } from '@/app/actions/auth';

export default function WorkspaceLayoutClient({
  children,
  user,
}: {
  children: React.ReactNode;
  user: any;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    const savedState = localStorage.getItem('omnitrack_sidebar_expanded');
    if (savedState !== null) {
      setIsSidebarOpen(savedState === 'true');
    }
  }, []);

  const toggleSidebar = () => {
    const newState = !isSidebarOpen;
    setIsSidebarOpen(newState);
    localStorage.setItem('omnitrack_sidebar_expanded', String(newState));
  };

  const handleLogout = async () => {
    await logoutAction();
    router.push('/login');
  };

  // Determine effective role for sidebar visibility
  const effectiveRole = user.role === 'MEMBER' && user.isPM ? 'PM' : user.role;

  // Strict role-based navigation filtering as per requirements
  const allNavItems = [
    { name: 'Dashboard', href: '/workspace', icon: LayoutDashboard, exact: true, roles: ['OWNER', 'PM', 'MEMBER', 'CLIENT'] },
    { name: 'Projects', href: '/workspace/projects', icon: FolderKanban, exact: false, roles: ['OWNER', 'PM', 'MEMBER', 'CLIENT'] },
    { name: 'Tasks', href: '/workspace/tasks', icon: CheckSquare, exact: false, roles: ['OWNER', 'PM', 'MEMBER', 'CLIENT'] },
    { name: 'Time Tracking', href: '/workspace/tracking', icon: Timer, exact: false, roles: ['OWNER', 'PM', 'MEMBER'] },
    { name: 'Timesheets', href: '/workspace/timesheets', icon: CalendarDays, exact: false, roles: ['OWNER', 'PM', 'MEMBER'] },
    { name: 'Users', href: '/workspace/users', icon: UsersIcon, exact: false, roles: ['OWNER'] },
    { name: 'Reports', href: '/workspace/reports', icon: BarChart3, exact: false, roles: ['OWNER', 'PM'] },
    { name: 'Settings', href: '/workspace/settings', icon: Settings, exact: false, roles: ['OWNER', 'PM', 'MEMBER', 'CLIENT'] },
  ];

  const navItems = allNavItems.filter(item => item.roles.includes(effectiveRole));

  const SidebarContent = () => (
    <div className="flex h-full flex-col bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 transition-all duration-300 border-r border-slate-200 dark:border-slate-800 shadow-[2px_0_8px_-4px_rgba(0,0,0,0.05)]">
      
      {/* Top Section: App Logo & Org Name */}
      <div className={`flex h-16 shrink-0 items-center px-4 border-b border-slate-200 dark:border-slate-800/50 ${!isSidebarOpen && 'justify-center'}`}>
        <div className="flex items-center gap-3 w-full">
          {/* Logo Icon */}
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-blue-600 text-white shadow-sm font-bold">
            <LayoutDashboard size={18} className="text-white" />
          </div>
          {isSidebarOpen && (
            <div className="flex flex-col flex-1 overflow-hidden">
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">OmniTrack</span>
              <span className="text-[11px] font-medium text-slate-500 truncate leading-tight">{user.organizationName}</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto custom-scrollbar py-6 px-3">
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Tooltip key={item.name} delayDuration={0}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      isActive 
                        ? 'text-primary' 
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-900'
                    } ${!isSidebarOpen && 'justify-center px-0'}`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="active-nav"
                        className="absolute inset-0 rounded-lg bg-primary/10 dark:bg-primary/20"
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      />
                    )}
                    <item.icon size={18} className={`relative z-10 shrink-0 ${isActive ? 'text-primary' : 'text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300'}`} />
                    {isSidebarOpen && (
                      <span className="relative z-10 truncate">{item.name}</span>
                    )}
                  </Link>
                </TooltipTrigger>
                {!isSidebarOpen && <TooltipContent side="right">{item.name}</TooltipContent>}
              </Tooltip>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section: User Profile & Logout */}
      <div className="shrink-0 p-4 border-t border-slate-200 dark:border-slate-800/50 mt-auto bg-slate-100/50 dark:bg-slate-900/20">
        <div className={`flex w-full items-center ${!isSidebarOpen && 'justify-center flex-col gap-4'}`}>
          <Avatar className={`shrink-0 border border-slate-200 dark:border-slate-700 shadow-sm ${isSidebarOpen ? 'h-9 w-9' : 'h-8 w-8'}`}>
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
              {user.name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          {isSidebarOpen && (
            <div className="flex flex-1 flex-col items-start overflow-hidden ml-3">
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-200 truncate w-full">{user.name}</span>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">{effectiveRole.replace('_', ' ')}</span>
            </div>
          )}

          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button 
                onClick={handleLogout}
                className={`flex shrink-0 items-center justify-center rounded-md text-slate-400 hover:text-destructive hover:bg-destructive/10 transition-colors ${isSidebarOpen ? 'h-8 w-8 ml-2' : 'h-8 w-8'}`}
              >
                <LogOut size={16} />
              </button>
            </TooltipTrigger>
            <TooltipContent side={isSidebarOpen ? 'top' : 'right'}>Logout</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-screen w-full bg-background overflow-hidden">
        
        {/* Desktop Sidebar */}
        <motion.aside
          initial={false}
          animate={{ width: mounted && isSidebarOpen ? 260 : 72 }}
          className="hidden md:flex flex-col z-20 relative bg-slate-50 dark:bg-slate-950"
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <SidebarContent />
          {mounted && (
            <button
              onClick={toggleSidebar}
              className="absolute -right-3 top-7 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-400 hover:text-slate-900 dark:hover:text-white shadow-sm z-50 transition-all hover:scale-110"
            >
              {isSidebarOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
            </button>
          )}
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
                className="fixed inset-y-0 left-0 z-50 w-72 md:hidden shadow-2xl bg-white dark:bg-slate-950"
              >
                <SidebarContent />
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="absolute right-4 top-4 text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 rounded-full p-1"
                >
                  <X size={18} />
                </button>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Main Content Area */}
        <div className="flex flex-1 flex-col min-w-0 bg-background">
          
          {/* Top Header */}
          <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between border-b border-slate-100 dark:border-slate-800/60 bg-white/80 dark:bg-background/80 px-4 md:px-6 backdrop-blur-md">
            <div className="flex items-center gap-4 flex-1">
              <button
                className="md:hidden text-muted-foreground hover:text-foreground p-1"
                onClick={() => setIsMobileMenuOpen(true)}
              >
                <Menu size={20} />
              </button>

              {/* Global Search */}
              <div className="hidden sm:flex max-w-md flex-1 relative group items-center">
                <Search className="absolute left-3 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  type="text"
                  placeholder="Search across your workspace..."
                  className="w-full h-9 pl-9 pr-12 bg-slate-100/50 dark:bg-muted/50 border-transparent hover:border-slate-200 dark:hover:border-border focus-visible:bg-white dark:focus-visible:bg-background focus-visible:ring-1 transition-all rounded-md text-sm shadow-inner"
                />
                <div className="absolute right-2 flex items-center gap-1 pointer-events-none text-muted-foreground opacity-60">
                  <Command size={12} />
                  <span className="text-[10px] font-medium leading-none">K</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Notifications */}
              <button className="relative p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                <Bell size={18} />
                <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-destructive ring-2 ring-white dark:ring-background"></span>
              </button>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto bg-[#FAFAFA] dark:bg-background custom-scrollbar">
            <div className="container mx-auto p-4 md:p-8 max-w-[1400px]">
              {children}
            </div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
