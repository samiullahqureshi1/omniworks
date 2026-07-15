'use client';

import React, { useState, useEffect } from 'react';
import { secondaryNavigation, SecondarySection, SecondaryNavItem } from './NavigationConfig';
import { usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronDown, Plus, Trash2, ArrowRight, FileText, Pin } from 'lucide-react';
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

  const [pinnedTemplates, setPinnedTemplates] = useState<any[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  useEffect(() => {
    if (activeTab !== 'home') return;
    
    const fetchTemplates = async () => {
      setLoadingTemplates(true);
      try {
        const { getProjectTemplatesAction } = await import('@/app/actions/projects');
        const res = await getProjectTemplatesAction();
        if (res.success && res.templates) {
          // Use the project templates pin key (not teamops internal templates)
          const savedPinned = localStorage.getItem("omniwork_pinned_templates");
          const pinnedIds: string[] = savedPinned ? JSON.parse(savedPinned) : [];
          const filtered = res.templates.filter((t: any) => pinnedIds.includes(t.id)).slice(0, 5);
          setPinnedTemplates(filtered);
        }
      } catch (err) {
        console.error("Failed to load pinned templates in sidebar:", err);
      } finally {
        setLoadingTemplates(false);
      }
    };

    fetchTemplates();
    
    const handleSync = () => {
      fetchTemplates();
    };
    window.addEventListener('storage', handleSync);
    window.addEventListener('omniwork_templates_pinned_changed', handleSync);
    window.addEventListener('omniwork_browse_templates', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('omniwork_templates_pinned_changed', handleSync);
      window.removeEventListener('omniwork_browse_templates', handleSync);
    };
  }, [activeTab]);

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

        {/* Pinned templates section */}
        {activeTab === 'home' && (
          <div className="animate-in fade-in duration-300">
            <hr className="my-4 border-slate-200 dark:border-white/5" />
            <div className="px-2.5 mb-2.5 flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                Pinned Templates
              </span>
            </div>
            {pinnedTemplates.length > 0 ? (
              <div className="flex flex-col gap-1">
                {pinnedTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="group relative w-full flex items-center rounded-lg transition-all text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
                  >
                    <button
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent('omniwork_open_create_project', { detail: template }));
                      }}
                      className="w-full flex items-center px-2.5 py-2 min-w-0 text-left outline-none"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 w-full pr-6">
                        <FileText size={16} className="shrink-0 text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-350" />
                        <span className="text-[13px] font-semibold truncate">{template.name}</span>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        const savedPinned = localStorage.getItem("omniwork_pinned_templates");
                        const pinnedIds: string[] = savedPinned ? JSON.parse(savedPinned) : [];
                        const next = pinnedIds.filter((id) => id !== template.id);
                        localStorage.setItem("omniwork_pinned_templates", JSON.stringify(next));
                        window.dispatchEvent(new Event('omniwork_templates_pinned_changed'));
                      }}
                      className="absolute right-2 opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-slate-300 dark:hover:bg-white/10 text-amber-500 hover:text-red-500 transition-all cursor-pointer z-10"
                      title="Unpin Template"
                    >
                      <Pin size={13} className="fill-amber-500 stroke-amber-500" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3.5 rounded-xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 text-center">
                <FileText size={20} className="mx-auto mb-2 text-slate-400 dark:text-slate-500" />
                <h4 className="text-[11px] font-bold text-slate-700 dark:text-slate-300">No pinned templates</h4>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 leading-normal">
                  Create a project, save it as template, then pin it to access quickly here.
                </p>
                <button
                  onClick={() => window.dispatchEvent(new Event('omniwork_browse_templates'))}
                  className="inline-block mt-2.5 text-[10px] font-bold text-violet-600 dark:text-violet-400 hover:underline outline-none cursor-pointer"
                >
                  Browse / Create templates
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
