'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  FolderKanban,
  MessageSquare,
  Search,
  Users as UsersIcon,
  Plus,
  Loader2,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface ConversationsSidebarPanelProps {
  currentUserId: string;
  // passed from conversations page via props drilling (projects already fetched server-side)
  projects?: Array<{
    id: string;
    name: string;
    description: string | null;
    priority: string;
  }>;
  onCreateGroup?: () => void;
  onStartDirect?: () => void;
}

export function ConversationsSidebarPanel({
  currentUserId,
  projects: initialProjects,
  onCreateGroup,
  onStartDirect,
}: ConversationsSidebarPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const activeTab = (searchParams.get('chatTab') as 'projects' | 'teams') || 'projects';
  const selectedProjectId = searchParams.get('project');
  const selectedGroupId = searchParams.get('group');

  const [projectSearch, setProjectSearch] = useState('');
  const [groupSearch, setGroupSearch] = useState('');
  const [groups, setGroups] = useState<any[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [projects, setProjects] = useState(initialProjects || []);
  const [projectsLoading, setProjectsLoading] = useState(!initialProjects);

  // Fetch projects if not provided
  useEffect(() => {
    if (initialProjects) {
      setProjects(initialProjects);
      return;
    }
    setProjectsLoading(true);
    fetch('/api/projects')
      .then((r) => r.json())
      .then((d) => setProjects(d.projects || d || []))
      .catch(() => setProjects([]))
      .finally(() => setProjectsLoading(false));
  }, []);

  const fetchGroups = useCallback(async () => {
    setGroupsLoading(true);
    try {
      const res = await fetch('/api/conversations/groups');
      if (res.ok) {
        const data = await res.json();
        setGroups(data.groups || []);
      }
    } catch {
      /* ignore */
    } finally {
      setGroupsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const setTab = (tab: 'projects' | 'teams') => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('chatTab', tab);
    if (tab === 'projects') params.delete('group');
    else params.delete('project');
    router.push(`/workspace/conversations?${params.toString()}`);
  };

  const selectProject = (projectId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('chatTab', 'projects');
    params.set('project', projectId);
    params.delete('group');
    router.push(`/workspace/conversations?${params.toString()}`);
  };

  const selectGroup = (groupId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('chatTab', 'teams');
    params.set('group', groupId);
    params.delete('project');
    router.push(`/workspace/conversations?${params.toString()}`);
  };

  const getPriorityColor = (priority: string) => {
    if (priority === 'HIGH' || priority === 'CRITICAL')
      return 'bg-rose-50 border-rose-100 text-rose-600 dark:bg-rose-950/10 dark:border-rose-900/30 dark:text-rose-400';
    if (priority === 'MEDIUM')
      return 'bg-amber-50 border-amber-100 text-amber-600 dark:bg-amber-950/10 dark:border-amber-900/30 dark:text-amber-400';
    return 'bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-950/10 dark:border-emerald-900/30 dark:text-emerald-400';
  };

  const stripHtml = (html: string | null | undefined) =>
    html ? html.replace(/<[^>]*>/g, '') : '';

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(projectSearch.toLowerCase())
  );

  const filteredGroups = groups.filter((g) =>
    g.name.toLowerCase().includes(groupSearch.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full w-full bg-[#fafafa] dark:bg-[#131316] overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-slate-100 dark:border-white/5 shrink-0">
        <h2 className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Conversations
        </h2>
      </div>

      {/* Tab Toggle */}
      <div className="px-3 pt-2.5 pb-2 shrink-0">
        <div className="grid grid-cols-2 gap-1 bg-slate-100/80 dark:bg-white/5 rounded-xl p-1">
          <button
            onClick={() => setTab('projects')}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-bold transition-all duration-200 ${
              activeTab === 'projects'
                ? 'bg-white dark:bg-[#1e1e22] text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <FolderKanban size={12} />
            Projects
          </button>
          <button
            onClick={() => setTab('teams')}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-bold transition-all duration-200 ${
              activeTab === 'teams'
                ? 'bg-white dark:bg-[#1e1e22] text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <MessageSquare size={12} />
            Teams
          </button>
        </div>
      </div>

      {/* Search + Actions */}
      <div className="px-3 pb-2 shrink-0">
        {activeTab === 'projects' ? (
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Search projects..."
              value={projectSearch}
              onChange={(e) => setProjectSearch(e.target.value)}
              className="pl-8 h-7 text-[11px] bg-white dark:bg-white/5 border-slate-200/60 dark:border-white/8 rounded-lg focus-visible:ring-1 focus-visible:ring-slate-300"
            />
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Search chats..."
                value={groupSearch}
                onChange={(e) => setGroupSearch(e.target.value)}
                className="pl-8 h-7 text-[11px] bg-white dark:bg-white/5 border-slate-200/60 dark:border-white/8 rounded-lg focus-visible:ring-1 focus-visible:ring-slate-300"
              />
            </div>
            <button
              onClick={onCreateGroup}
              title="Create Group"
              className="h-7 w-7 shrink-0 flex items-center justify-center rounded-lg bg-slate-900 dark:bg-white/10 text-white hover:bg-slate-700 dark:hover:bg-white/20 transition-all"
            >
              <UsersIcon size={12} />
            </button>
            <button
              onClick={onStartDirect}
              title="Direct Chat"
              className="h-7 w-7 shrink-0 flex items-center justify-center rounded-lg bg-slate-900 dark:bg-white/10 text-white hover:bg-slate-700 dark:hover:bg-white/20 transition-all"
            >
              <Plus size={13} />
            </button>
          </div>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-0.5 custom-scrollbar">
        {activeTab === 'projects' ? (
          projectsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
            </div>
          ) : filteredProjects.length > 0 ? (
            filteredProjects.map((project) => {
              const isSelected = selectedProjectId === project.id;
              return (
                <button
                  key={project.id}
                  onClick={() => selectProject(project.id)}
                  className={`w-full text-left px-2.5 py-2 rounded-lg flex items-start gap-2 transition-all duration-150 ${
                    isSelected
                      ? 'bg-[#f0f0f4] dark:bg-white/8 text-slate-900 dark:text-white font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-[#f0f0f4] dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <div
                    className={`p-1 rounded-md shrink-0 mt-0.5 ${
                      isSelected
                        ? 'bg-slate-200/80 dark:bg-white/10 text-slate-700 dark:text-slate-200'
                        : 'bg-slate-100 dark:bg-white/5 text-slate-400'
                    }`}
                  >
                    <FolderKanban size={12} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-[12px] truncate leading-tight">
                      {project.name}
                    </div>
                    {project.description && (
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                        {stripHtml(project.description)}
                      </p>
                    )}
                    <span
                      className={`inline-block mt-1 text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${getPriorityColor(
                        project.priority
                      )}`}
                    >
                      {project.priority}
                    </span>
                  </div>
                </button>
              );
            })
          ) : (
            <div className="text-center py-10 text-[11px] text-slate-400">No projects found.</div>
          )
        ) : groupsLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
          </div>
        ) : filteredGroups.length > 0 ? (
          filteredGroups.map((group) => {
            const isSelected = selectedGroupId === group.id;
            const otherMember = group.isDirect
              ? group.members?.find((m: any) => m.userId !== currentUserId)?.user
              : null;
            const displayName = otherMember ? otherMember.name : group.name;
            const lastMsg = group.messages?.[0];
            const unreadCount =
              group.messages?.filter(
                (m: any) => !m.readReceipts?.some((r: any) => r.userId === currentUserId)
              ).length || 0;

            return (
              <button
                key={group.id}
                onClick={() => selectGroup(group.id)}
                className={`w-full text-left px-2 py-2 rounded-lg flex items-center gap-2.5 transition-all duration-150 ${
                  isSelected
                    ? 'bg-[#f0f0f4] dark:bg-white/8 text-slate-900 dark:text-white font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-[#f0f0f4] dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {group.isDirect && otherMember ? (
                  <Avatar className="w-8 h-8 shrink-0 rounded-lg border border-slate-100 dark:border-white/10">
                    <AvatarImage
                      src={`https://api.dicebear.com/7.x/notionists/svg?seed=${otherMember.name}`}
                    />
                    <AvatarFallback className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-bold rounded-lg">
                      {otherMember.name.substring(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shrink-0 font-black text-[11px]">
                    {group.name.substring(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-semibold truncate leading-tight">{displayName}</div>
                  {lastMsg ? (
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                      <span className="font-medium">{lastMsg.sender?.name || 'Someone'}:</span>{' '}
                      {lastMsg.content || (lastMsg.fileUrl ? 'Shared a file' : '')}
                    </div>
                  ) : (
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 italic">
                      No messages yet
                    </div>
                  )}
                </div>
                {unreadCount > 0 && (
                  <span className="ml-auto bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[9px] font-bold h-4 px-1.5 rounded-full flex items-center justify-center shrink-0 min-w-[18px]">
                    {unreadCount}
                  </span>
                )}
              </button>
            );
          })
        ) : (
          <div className="text-center py-10 text-[11px] text-slate-400">No chat groups found.</div>
        )}
      </div>
    </div>
  );
}
