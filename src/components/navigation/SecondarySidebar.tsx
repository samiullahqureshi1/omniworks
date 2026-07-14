'use client';

import React from 'react';
import { secondaryNavigation, SecondarySection, SecondaryNavItem } from './NavigationConfig';
import { usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronDown, Plus, Trash2, ArrowRight } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SecondarySidebarProps {
  activeTab: string;
  user: any;
  userOrganizations: any[];
  onSelectPlaceholder: (name: string, icon: any) => void;
  onSelectRealLink: () => void;
  handleOrgSwitch: (orgId: string) => void;
  setIsCreateChildModalOpen: (open: boolean) => void;
  setDeleteOrg: (org: any) => void;
}

export function SecondarySidebar({
  activeTab,
  user,
  userOrganizations = [],
  onSelectPlaceholder,
  onSelectRealLink,
  handleOrgSwitch,
  setIsCreateChildModalOpen,
  setDeleteOrg,
}: SecondarySidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isSettingsPage = pathname.startsWith('/workspace/settings');
  const sections = isSettingsPage
    ? (secondaryNavigation['settings'] || [])
    : (secondaryNavigation[activeTab] || []);

  const handleItemClick = (item: SecondaryNavItem) => {
    if (item.comingSoon) {
      onSelectPlaceholder(item.name, item.icon);
    } else {
      onSelectRealLink();
    }
  };

  const getHeaderTitle = () => {
    if (isSettingsPage) {
      return 'All Settings';
    }
    switch (activeTab) {
      case 'rules':
        return 'Automation Space';
      case 'teams':
        return 'Team Hub';
      case 'calendar':
        return 'Calendar Space';
      case 'meeting':
        return 'Collaboration Space';
      case 'agents':
        return 'Agent Workspace';
      default:
        return 'Home';
    }
  };

  return (
    <div className="w-full flex flex-col h-full select-none bg-transparent">
      {/* Sidebar Header */}
      <div className="px-4 py-3.5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between min-h-[48px]">
        <h2 className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
          {getHeaderTitle()}
        </h2>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
        {sections.map((section, idx) => {
          const visibleItems = section.items.filter(
            item => !item.roles || item.roles.includes(user.role === 'MEMBER' && user.isPM ? 'PM' : user.role)
          );

          if (visibleItems.length === 0) return null;

          return (
            <div key={idx} className="space-y-2.5 animate-in fade-in duration-300">
              <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-2.5">
                {section.title}
              </h3>
              <div className="flex flex-col gap-1">
                {visibleItems.map((item) => {
                  let isActive = false;
                  if (item.href) {
                    if (item.href.includes('tab=')) {
                      const [baseHref, tabPart] = item.href.split('?');
                      const itemTab = tabPart?.split('tab=')[1];
                      const isBaseActive = item.exact ? pathname === baseHref : pathname.startsWith(baseHref);
                      if (isBaseActive) {
                        let activeTab = searchParams.get('tab');
                        if (!activeTab) {
                          if (pathname.startsWith('/workspace/settings')) {
                            activeTab = user.role === 'OWNER' ? 'project' : 'security';
                          } else if (pathname.startsWith('/workspace/teamops')) {
                            activeTab = 'dashboard';
                          }
                        }
                        isActive = itemTab === activeTab;
                      }
                    } else {
                      isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
                    }
                  }

                  const content = (
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {item.icon && (
                          <item.icon size={16} className={`shrink-0 ${
                            isActive ? 'text-slate-800 dark:text-white' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                          }`} />
                        )}
                        <span className="text-[13px] font-semibold truncate">{item.name}</span>
                      </div>
                      {item.comingSoon && (
                        <span className="text-[8px] font-bold text-slate-500 bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                          Soon
                        </span>
                      )}
                    </div>
                  );

                  if (item.comingSoon) {
                    return (
                      <button
                        key={item.name}
                        onClick={() => handleItemClick(item)}
                        className="group w-full flex items-center px-2.5 py-2 hover:bg-slate-200/60 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg transition-all text-left outline-none border border-transparent"
                      >
                        {content}
                      </button>
                    );
                  }

                  return (
                    <Link
                      key={item.name}
                      href={item.href || '#'}
                      prefetch={true}
                      onClick={() => handleItemClick(item)}
                      className={`group flex items-center px-2.5 py-2 rounded-lg transition-all border ${
                        isActive 
                          ? 'bg-slate-200/70 dark:bg-white/10 text-slate-900 dark:text-white border-slate-300/50 dark:border-white/10 font-bold shadow-sm' 
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white border-transparent'
                      }`}
                    >
                      {content}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
