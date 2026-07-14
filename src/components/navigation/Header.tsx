'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronDown, Search, Command, CheckSquare, Video, Mic, Sun, Moon, User, Shield, LogOut, Menu, Calendar, Smile, VolumeX, ChevronRight, Bell, Palette, Keyboard, Download, ExternalLink, Bug, HelpCircle, Settings, Plus, Users, FileText, Zap, Briefcase } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface HeaderProps {
  user: any;
  userOrganizations: any[];
  handleOrgSwitch: (orgId: string) => void;
  handleLogout: () => void;
  theme: any;
  setTheme: (theme: any) => void;
  setIsMobileMenuOpen: (open: boolean) => void;
  pageTitle: string;
  isSecondaryCollapsed: boolean;
  setIsSecondaryCollapsed: (collapsed: boolean) => void;
  setIsCreateChildModalOpen?: (open: boolean) => void;
}

export function Header({
  user,
  userOrganizations = [],
  handleOrgSwitch,
  handleLogout,
  theme,
  setTheme,
  setIsMobileMenuOpen,
  pageTitle,
  isSecondaryCollapsed,
  setIsSecondaryCollapsed,
  setIsCreateChildModalOpen
}: HeaderProps) {
  return (
    <header className="h-[52px] bg-transparent flex items-center justify-between pl-2 pr-4 shrink-0 select-none z-30 relative shadow-none border-b border-transparent">
      {/* Left Section: Workspace Swapper & Menu Trigger */}
      <div className="flex items-center gap-2.5">
        {/* Mobile menu toggle */}
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="md:hidden p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg border border-slate-200/50 dark:border-white/5 shadow-sm transition-colors"
        >
          <Menu size={16} />
        </button>

        {/* Gray Workspace Box */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 pl-2 pr-3 py-1.5 bg-[#f0f0f4] dark:bg-white/5 hover:bg-[#e4e4ec] dark:hover:bg-white/10 rounded-[8px] text-[12px] font-bold text-slate-850 dark:text-slate-200 transition-colors border-0 outline-none shadow-none">
              <div className="w-5 h-5 rounded-[4px] bg-[#00a884] text-white flex items-center justify-center font-black text-[10px] shrink-0">
                {user.organizationName ? user.organizationName.substring(0, 1).toUpperCase() : 'S'}
              </div>
              <span className="truncate max-w-[125px] font-extrabold">{user.organizationName || 'Select Org'}</span>
              <ChevronDown size={11} className="text-slate-450 shrink-0 ml-0.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-80 bg-white dark:bg-[#151518] rounded-[8px] shadow-2xl border border-slate-200/85 dark:border-white/10 p-1.5 z-50">
            {/* Header info */}
            <div className="px-3.5 py-3 flex items-center gap-3.5 border-b border-slate-100 dark:border-white/5">
              <div className="w-10 h-10 rounded-[4px] bg-[#00a884] text-white flex items-center justify-center font-black text-lg shrink-0">
                {user.organizationName ? user.organizationName.substring(0, 1).toUpperCase() : 'S'}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[13.5px] font-bold text-slate-850 dark:text-slate-200 truncate leading-none mb-1.5">
                  {user.organizationName || "Sami Ullah's Workspace"}
                </span>
                <div className="text-[11px] text-slate-400 font-semibold leading-none flex items-center gap-1.5">
                  <span>Free Forever</span>
                  <span className="text-slate-300">•</span>
                  <button className="text-violet-500 hover:text-violet-655 font-bold underline cursor-pointer outline-none">
                    Upgrade
                  </button>
                </div>
              </div>
            </div>

            {/* Organizations List for Swapping */}
            <div className="px-3 py-2 text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-wider">
              Your Workspaces
            </div>
            
            <div className="max-h-48 overflow-y-auto px-3 space-y-0.5 custom-scrollbar">
              {userOrganizations.map(org => {
                const isOwnOrg = org.role === 'OWNER';
                const labelSuffix = isOwnOrg ? ' (Full Access)' : ' (Limited Access)';
                const isCurrent = user.organizationId === org.id;

                return (
                  <DropdownMenuItem 
                    key={org.id}
                    onClick={() => handleOrgSwitch(org.id)}
                    className={`cursor-pointer rounded-[4px] px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-[#1e1e24] flex flex-col items-start outline-none transition-colors border border-transparent ${
                      isCurrent 
                        ? 'bg-[#f0f0f4] dark:bg-white/10 text-slate-800 dark:text-white font-bold border-slate-200/40 dark:border-white/5' 
                        : 'text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <span className="text-xs font-semibold">{org.name}</span>
                    <span className="text-[9px] text-slate-400 font-medium">{isOwnOrg ? 'Own Org' : 'Shared Org'}{labelSuffix}</span>
                  </DropdownMenuItem>
                );
              })}
            </div>

            {/* Create Workspace button */}
            <div className="px-3 py-1">
              <button 
                onClick={() => setIsCreateChildModalOpen && setIsCreateChildModalOpen(true)}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 rounded-[6px] text-slate-750 dark:text-slate-200 font-bold text-[12.5px] transition-all outline-none"
              >
                <Plus size={15} className="text-slate-400" />
                <span>Create Workspace</span>
              </button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Small calendar icon next to workspace selector */}
        <button className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-white/5 rounded-full transition-colors hidden sm:inline-flex" title="Calendar">
          <Calendar size={14} />
        </button>
      </div>

      {/* Center Section: unified ClickUp Search & AI Chats */}
      <div className="flex-grow max-w-sm mx-6 relative hidden md:block">
        <div className="w-full flex items-center justify-between border border-slate-200 dark:border-white/10 rounded-full pl-3 pr-1 py-0.5 bg-white/70 dark:bg-[#1e1e24]/40 backdrop-blur-sm shadow-sm h-8.5 select-none">
          <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 text-xs">
            <Search size={13} className="shrink-0" />
            <span className="text-[11px] font-medium">Search</span>
            <span className="text-[9px] font-semibold opacity-75">⌘K</span>
          </div>
          
          {/* Embedded AI Chats button */}
          <button 
            className="flex items-center gap-1.5 bg-[#f0f0f4] dark:bg-white/10 border border-slate-200/50 dark:border-white/5 px-2.5 py-1 rounded-full text-[10px] font-extrabold text-slate-600 dark:text-slate-300 hover:bg-[#e4e4ec] dark:hover:bg-white/15 transition-colors cursor-pointer mr-0.5"
          >
            <span>AI Chats</span>
            {/* ClickUp colored flower dot icon */}
            <span className="relative flex items-center justify-center w-2.5 h-2.5">
              <span className="absolute w-1 h-1 rounded-full bg-[#f43f5e] -translate-y-0.75" />
              <span className="absolute w-1 h-1 rounded-full bg-[#3b82f6] -translate-x-0.75" />
              <span className="absolute w-1 h-1 rounded-full bg-[#10b981] translate-x-0.75" />
              <span className="absolute w-1 h-1 rounded-full bg-[#fbbf24] translate-y-0.75" />
            </span>
          </button>
        </div>
      </div>

      {/* Right Section: Quick Tools & Avatar */}
      <div className="flex items-center gap-4">
        {/* Quick Tools Icons */}
        <div className="hidden sm:flex items-center gap-2.5 text-slate-400">
          <button className="hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
            <CheckSquare size={16} />
          </button>
          <button className="hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
            <Video size={16} />
          </button>
          <button className="hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
            <Mic size={16} />
          </button>
        </div>

        {/* Theme toggler */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors rounded-full flex items-center justify-center"
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        {/* User avatar profile dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1 hover:opacity-85 transition-opacity outline-none bg-transparent">
              <div className="relative">
                <Avatar className="h-7 w-7 border-0 shrink-0 bg-[#000000] text-white">
                  <AvatarFallback className="bg-[#000000] text-white text-[10px] font-black uppercase flex items-center justify-center">
                    {user.name ? user.name.substring(0, 2).toUpperCase() : 'SU'}
                  </AvatarFallback>
                </Avatar>
                {/* Active indicator dot */}
                <span className="absolute bottom-0 right-0 block h-2 w-2 rounded-full bg-[#10b981] ring-1.5 ring-white dark:ring-[#151518]" />
              </div>
              <ChevronDown size={11} className="text-slate-450 shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72 bg-white dark:bg-[#151518] rounded-xl shadow-2xl border border-slate-200/85 dark:border-white/10 p-1.5 mt-2 z-50">
            {/* User Profile Header */}
            <div className="px-3.5 py-3 flex items-center gap-3">
              <div className="relative">
                <Avatar className="h-10 w-10 border-0 shrink-0 bg-[#000000] text-white">
                  <AvatarFallback className="bg-[#000000] text-white text-[14px] font-black uppercase flex items-center justify-center">
                    {user.name ? user.name.substring(0, 2).toUpperCase() : 'SU'}
                  </AvatarFallback>
                </Avatar>
                {/* Active indicator dot */}
                <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-[#10b981] ring-2 ring-white dark:ring-[#151518]" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[14px] font-bold text-slate-800 dark:text-slate-200 truncate leading-none mb-1">
                  {user.name || 'Sami Ullah'}
                </span>
                <span className="text-[11px] text-slate-400 font-semibold leading-none">
                  Online
                </span>
              </div>
            </div>

            {/* Set Status Input Box */}
            <div className="px-2.5 mb-2">
              <button className="w-full flex items-center gap-2 px-3 py-1.5 border border-slate-250/70 dark:border-white/10 rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 text-slate-450 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-350 transition-all text-left outline-none">
                <Smile size={15} className="text-slate-400" />
                <span className="text-[12.5px]">Set status</span>
              </button>
            </div>

            {/* Mute Notifications Button */}
            <div className="px-1 mb-1">
              <button className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[13px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 transition-all text-left outline-none">
                <div className="flex items-center gap-2.5">
                  <VolumeX size={15} className="text-slate-450 dark:text-slate-400" />
                  <span>Mute notifications</span>
                </div>
                <ChevronRight size={13} className="text-slate-400" />
              </button>
            </div>

            <DropdownMenuSeparator className="bg-slate-100 dark:bg-white/5 my-1.5" />

            {/* Option List items */}
            <div className="px-1 space-y-0.5">
              <Link href="/workspace/settings">
                <DropdownMenuItem className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[13px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer transition-colors outline-none">
                  <Settings size={15} className="text-slate-450 dark:text-slate-400" />
                  <span>Settings</span>
                </DropdownMenuItem>
              </Link>
              
              <Link href="/workspace/notifications">
                <DropdownMenuItem className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[13px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer transition-colors outline-none">
                  <Bell size={15} className="text-slate-450 dark:text-slate-400" />
                  <span>Notifications</span>
                </DropdownMenuItem>
              </Link>

              <DropdownMenuItem className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[13px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer transition-colors outline-none">
                <Palette size={15} className="text-slate-450 dark:text-slate-400" />
                <span>Themes</span>
              </DropdownMenuItem>

              <DropdownMenuItem className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[13px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer transition-colors outline-none">
                <Keyboard size={15} className="text-slate-450 dark:text-slate-400" />
                <span>Keyboard shortcuts</span>
              </DropdownMenuItem>

              <DropdownMenuItem className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[13px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer transition-colors outline-none">
                <div className="flex items-center gap-2.5">
                  <Download size={15} className="text-slate-450 dark:text-slate-400" />
                  <span>Download ClickUp</span>
                </div>
                <ExternalLink size={13} className="text-slate-450 dark:text-slate-400" />
              </DropdownMenuItem>

              <DropdownMenuItem className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[13px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer transition-colors outline-none">
                <div className="flex items-center gap-2.5">
                  <HelpCircle size={15} className="text-slate-450 dark:text-slate-400" />
                  <span>Help</span>
                </div>
                <Bug size={13} className="text-slate-450 dark:text-slate-400" />
              </DropdownMenuItem>
            </div>

            <DropdownMenuSeparator className="bg-slate-100 dark:bg-white/5 my-1.5" />

            <div className="px-1">
              <DropdownMenuItem 
                onClick={handleLogout}
                className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[13px] font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer transition-colors outline-none"
              >
                <LogOut size={15} />
                <span>Logout</span>
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
