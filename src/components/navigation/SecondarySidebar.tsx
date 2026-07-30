'use client';

import React, { useState, useEffect } from 'react';
import { secondaryNavigation, SecondarySection, SecondaryNavItem } from './NavigationConfig';
import { usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronDown, Plus, Trash2, ArrowRight, FileText, Pin, CheckSquare, MessageSquare, FolderKanban, Users } from 'lucide-react';
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
  const [pinnedTasks, setPinnedTasks] = useState<any[]>([]);
  const [pinnedChats, setPinnedChats] = useState<any[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  useEffect(() => {
    if (activeTab !== 'home') return;

    const fetchAll = async () => {
      setLoadingTemplates(true);
      try {
        // Pinned Templates (owner only, still localStorage-based)
        const { getProjectTemplatesAction } = await import('@/app/actions/projects');
        const res = await getProjectTemplatesAction();
        if (res.success && res.templates) {
          const savedPinned = localStorage.getItem("omniwork_pinned_templates");
          const pinnedIds: string[] = savedPinned ? JSON.parse(savedPinned) : [];
          const filtered = res.templates.filter((t: any) => pinnedIds.includes(t.id)).slice(0, 5);
          setPinnedTemplates(filtered);
        }
      } catch (err) {
        console.error("Failed to load pinned templates in sidebar:", err);
      }

      try {
        // Pinned Tasks — DB backed
        const { getPinnedTasksAction } = await import('@/app/actions/pinning');
        const taskRes = await getPinnedTasksAction();
        if (taskRes.success && taskRes.tasks) {
          setPinnedTasks(taskRes.tasks);
        }
      } catch (err) {
        console.error("Failed to load pinned tasks in sidebar:", err);
      }

      try {
        // Pinned Chats — DB backed
        const { getPinnedChatsAction } = await import('@/app/actions/pinning');
        const chatRes = await getPinnedChatsAction();
        if (chatRes.success && chatRes.chats) {
          setPinnedChats(chatRes.chats);
        }
      } catch (err) {
        console.error("Failed to load pinned chats in sidebar:", err);
      } finally {
        setLoadingTemplates(false);
      }
    };

    fetchAll();

    const handleSync = (e?: Event) => {
      const customEv = e as CustomEvent;
      if (customEv?.detail) {
        const { type, item, pinned } = customEv.detail;

        if (type === 'chat' && item) {
          setPinnedChats((prev) => {
            const matches = (c: any) =>
              (item.projectId && c.projectId === item.projectId) ||
              (item.chatGroupId && c.chatGroupId === item.chatGroupId) ||
              c.id === item.id;

            if (pinned === false) {
              return prev.filter((c) => !matches(c));
            } else if (pinned === true) {
              if (prev.some(matches)) return prev;
              return [item, ...prev];
            } else {
              // Toggle fallback
              const exists = prev.some(matches);
              return exists ? prev.filter((c) => !matches(c)) : [item, ...prev];
            }
          });
          return;
        }

        if (type === 'task' && item) {
          setPinnedTasks((prev) => {
            const exists = prev.some((t) => t.id === item.id);
            if (pinned === false) {
              return prev.filter((t) => t.id !== item.id);
            } else if (pinned === true) {
              if (exists) return prev;
              return [item, ...prev];
            } else {
              return exists ? prev.filter((t) => t.id !== item.id) : [item, ...prev];
            }
          });
          return;
        }
      }

      // Fallback full sync
      fetchAll();
    };

    window.addEventListener('storage', handleSync);
    window.addEventListener('omniwork_templates_pinned_changed', handleSync);
    window.addEventListener('omniwork_browse_templates', handleSync);
    window.addEventListener('omniwork_pins_changed', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('omniwork_templates_pinned_changed', handleSync);
      window.removeEventListener('omniwork_browse_templates', handleSync);
      window.removeEventListener('omniwork_pins_changed', handleSync);
    };
  }, [activeTab]);

  const handleUnpinTask = (taskId: string) => {
    // 0ms Optimistic unpin
    setPinnedTasks((prev) => prev.filter((t) => t.id !== taskId));
    window.dispatchEvent(
      new CustomEvent('omniwork_pins_changed', {
        detail: { type: 'task', item: { id: taskId }, pinned: false },
      })
    );

    // Background DB operation
    import('@/app/actions/pinning').then(({ togglePinTaskAction }) => {
      togglePinTaskAction(taskId).catch((err) => {
        console.error('Failed to unpin task:', err);
      });
    });
  };

  const handleUnpinChat = (chat: any) => {
    // 0ms Optimistic unpin
    setPinnedChats((prev) => prev.filter((c) => c.id !== chat.id));
    window.dispatchEvent(
      new CustomEvent('omniwork_pins_changed', {
        detail: { type: 'chat', item: chat, pinned: false },
      })
    );

    // Background DB operation
    import('@/app/actions/pinning').then(({ togglePinChatAction }) => {
      togglePinChatAction({
        chatType: chat.chatType,
        chatGroupId: chat.chatGroupId || undefined,
        projectId: chat.projectId || undefined,
        displayName: chat.displayName,
      }).catch((err) => {
        console.error('Failed to unpin chat:', err);
      });
    });
  };

  const getChatIcon = (chatType: string) => {
    if (chatType === 'project') return FolderKanban;
    if (chatType === 'direct') return MessageSquare;
    return Users;
  };

  const getChatHref = (chat: any) => {
    if (chat.projectId) {
      return `/workspace/conversations?chatTab=projects&project=${chat.projectId}`;
    }
    if (chat.chatGroupId) {
      return `/workspace/conversations?chatTab=teams&group=${chat.chatGroupId}`;
    }
    return '/workspace/conversations';
  };

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
                        className="group w-full flex items-center px-2.5 py-2 hover:bg-slate-200/60 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-[8px] transition-all text-left outline-none border border-transparent"
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
                      className={`group flex items-center px-2.5 py-2 rounded-[8px] transition-all border ${
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

        {/* Pinned Templates section — OWNER only */}
        {activeTab === 'home' && user?.role === 'OWNER' && (
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
                    className="group relative w-full flex items-center rounded-[8px] transition-all text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
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

        {/* Pinned Chats section — all users, DB-backed */}
        {activeTab === 'home' && (
          <div className="animate-in fade-in duration-300">
            <hr className="my-4 border-slate-200 dark:border-white/5" />
            <div className="px-2.5 mb-2.5 flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                Pinned Chats
              </span>
            </div>
            {pinnedChats.length > 0 ? (
              <div className="flex flex-col gap-1">
                {pinnedChats.map((chat) => {
                  const ChatIcon = getChatIcon(chat.chatType);
                  const href = getChatHref(chat);
                  return (
                    <div
                      key={chat.id}
                      className="group relative w-full flex items-center rounded-[8px] transition-all text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
                    >
                      <Link
                        href={href}
                        className="w-full flex items-center px-2.5 py-2 min-w-0 text-left outline-none"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 w-full pr-6">
                          <ChatIcon size={16} className="shrink-0 text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-350" />
                          <div className="min-w-0">
                            <span className="text-[13px] font-semibold truncate block">{chat.displayName}</span>
                            <span className="text-[10px] text-slate-400 capitalize block">
                              {chat.chatType === 'direct' ? 'Direct Message' : chat.chatType === 'project' ? 'Project Chat' : 'Group Chat'}
                            </span>
                          </div>
                        </div>
                      </Link>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          handleUnpinChat(chat);
                        }}
                        className="absolute right-2 opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-slate-300 dark:hover:bg-white/10 text-amber-500 hover:text-red-500 transition-all cursor-pointer z-10"
                        title="Unpin Chat"
                      >
                        <Pin size={13} className="fill-amber-500 stroke-amber-500" />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-3.5 rounded-xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 text-center">
                <MessageSquare size={20} className="mx-auto mb-2 text-slate-400 dark:text-slate-500" />
                <h4 className="text-[11px] font-bold text-slate-700 dark:text-slate-300">No pinned chats</h4>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 leading-normal">
                  Go to Messages, hover a chat and click the pin icon to pin it here.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Pinned Tasks section — all users, DB-backed */}
        {activeTab === 'home' && (
          <div className="animate-in fade-in duration-300">
            <hr className="my-4 border-slate-200 dark:border-white/5" />
            <div className="px-2.5 mb-2.5 flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                Pinned Tasks
              </span>
            </div>
            {pinnedTasks.length > 0 ? (
              <div className="flex flex-col gap-1">
                {pinnedTasks.map((task) => (
                  <div
                    key={task.id}
                    className="group relative w-full flex items-center rounded-[8px] transition-all text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
                  >
                    <Link
                      href={`/workspace/tasks?taskId=${task.id}`}
                      className="w-full flex items-center px-2.5 py-2 min-w-0 text-left outline-none"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 w-full pr-6">
                        <CheckSquare size={16} className="shrink-0 text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-350" />
                        <div className="min-w-0">
                          <span className="text-[13px] font-semibold truncate block">{task.title}</span>
                          {task.project?.name && (
                            <span className="text-[10px] text-slate-400 truncate block">{task.project.name}</span>
                          )}
                        </div>
                      </div>
                    </Link>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleUnpinTask(task.id);
                      }}
                      className="absolute right-2 opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-slate-300 dark:hover:bg-white/10 text-amber-500 hover:text-red-500 transition-all cursor-pointer z-10"
                      title="Unpin Task"
                    >
                      <Pin size={13} className="fill-amber-500 stroke-amber-500" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3.5 rounded-xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 text-center">
                <CheckSquare size={20} className="mx-auto mb-2 text-slate-400 dark:text-slate-500" />
                <h4 className="text-[11px] font-bold text-slate-700 dark:text-slate-300">No pinned tasks</h4>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 leading-normal">
                  Go to Tasks, click pin on any task item to access it quickly here.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
