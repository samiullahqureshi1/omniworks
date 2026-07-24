'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  FolderKanban,
  MessageSquare,
  Search,
  Users,
  UserPlus,
  Plus,
  Loader2,
  SquarePen,
  ArrowUpDown,
  Star,
  ChevronDown,
  X,
  Check
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
    clientId: string | null;
    projectManagerId: string | null;
    createdAt: Date;
  }>;
  onCreateGroup?: () => void;
  onStartDirect?: () => void;
}

export function ConversationsSidebarPanel({
  currentUserId,
  projects: initialProjects,
  onCreateGroup: externalCreateGroup,
  onStartDirect: externalStartDirect,
}: ConversationsSidebarPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Instant local state for zero-latency switching
  const [activeTab, setActiveTabState] = useState<'projects' | 'teams'>(
    (searchParams.get('chatTab') as 'projects' | 'teams') || 'projects'
  );
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    searchParams.get('project')
  );
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(
    searchParams.get('group')
  );

  const [projectSearch, setProjectSearch] = useState('');
  const [groupSearch, setGroupSearch] = useState('');
  const [groups, setGroups] = useState<any[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [projects, setProjects] = useState(initialProjects || []);
  const [projectsLoading, setProjectsLoading] = useState(!initialProjects);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  // Create Group Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [orgUsers, setOrgUsers] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);

  const handleOpenCreateModal = async () => {
    if (externalCreateGroup) {
      externalCreateGroup();
      return;
    }
    setIsCreateModalOpen(true);
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setOrgUsers(data.users || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleCreateGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim() || isCreatingGroup) return;

    setIsCreatingGroup(true);
    try {
      const res = await fetch('/api/conversations/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newGroupName.trim(),
          description: newGroupDesc.trim(),
          userIds: selectedUserIds
        })
      });

      if (res.ok) {
        const data = await res.json();
        setGroups((prev) => [data.group, ...prev]);
        selectGroup(data.group.id);
        setIsCreateModalOpen(false);
        setNewGroupName('');
        setNewGroupDesc('');
        setSelectedUserIds([]);
        setUserSearch('');
      }
    } catch (err) {
      console.error('Failed to create group:', err);
    } finally {
      setIsCreatingGroup(false);
    }
  };

  // Sync state with URL if URL changes externally
  useEffect(() => {
    const tabParam = (searchParams.get('chatTab') as 'projects' | 'teams') || 'projects';
    const projParam = searchParams.get('project');
    const groupParam = searchParams.get('group');

    if (tabParam !== activeTab) setActiveTabState(tabParam);
    if (projParam !== selectedProjectId) setSelectedProjectId(projParam);
    if (groupParam !== selectedGroupId) setSelectedGroupId(groupParam);
  }, [searchParams]);

  // Fetch projects if not provided or empty
  useEffect(() => {
    if (initialProjects && initialProjects.length > 0) {
      setProjects(initialProjects);
      setProjectsLoading(false);
      return;
    }
    setProjectsLoading(true);
    fetch('/api/projects')
      .then((r) => r.json())
      .then((d) => {
        const fetchedProjects = d.projects || d || [];
        setProjects(fetchedProjects);
        if (!selectedProjectId && fetchedProjects.length > 0) {
          setSelectedProjectId(fetchedProjects[0].id);
        }
      })
      .catch(() => setProjects([]))
      .finally(() => setProjectsLoading(false));
  }, [initialProjects]);

  // Auto-select first project if none selected
  useEffect(() => {
    if (activeTab === 'projects' && !selectedProjectId && !selectedGroupId && projects.length > 0) {
      const firstId = projects[0].id;
      setSelectedProjectId(firstId);
      const url = new URL(window.location.href);
      url.searchParams.set('chatTab', 'projects');
      url.searchParams.set('project', firstId);
      url.searchParams.delete('group');
      window.history.replaceState({}, '', url.toString());
    }
  }, [activeTab, projects, selectedProjectId, selectedGroupId]);

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

  // Auto-select first group in Teams tab if none selected
  useEffect(() => {
    if (activeTab === 'teams' && !selectedGroupId && !selectedProjectId && filteredGroups.length > 0) {
      const firstGroupId = filteredGroups[0].id;
      setSelectedGroupId(firstGroupId);
      const url = new URL(window.location.href);
      url.searchParams.set('chatTab', 'teams');
      url.searchParams.set('group', firstGroupId);
      url.searchParams.delete('project');
      window.history.replaceState({}, '', url.toString());
    }
  }, [activeTab, selectedGroupId, selectedProjectId, groups]);

  // Instant switching handlers (0ms delay)
  const setTab = (tab: 'projects' | 'teams') => {
    setActiveTabState(tab);
    const url = new URL(window.location.href);
    url.searchParams.set('chatTab', tab);
    if (tab === 'projects') {
      url.searchParams.delete('group');
      if (projects.length > 0 && !selectedProjectId) {
        setSelectedProjectId(projects[0].id);
        url.searchParams.set('project', projects[0].id);
      }
    } else {
      url.searchParams.delete('project');
      if (groups.length > 0 && !selectedGroupId) {
        setSelectedGroupId(groups[0].id);
        url.searchParams.set('group', groups[0].id);
      }
    }
    window.history.replaceState({}, '', url.toString());
  };

  const selectProject = (projectId: string) => {
    setSelectedProjectId(projectId);
    setActiveTabState('projects');
    const url = new URL(window.location.href);
    url.searchParams.set('chatTab', 'projects');
    url.searchParams.set('project', projectId);
    url.searchParams.delete('group');
    window.history.replaceState({}, '', url.toString());
  };

  const selectGroup = (groupId: string) => {
    setSelectedGroupId(groupId);
    setActiveTabState('teams');
    const url = new URL(window.location.href);
    url.searchParams.set('chatTab', 'teams');
    url.searchParams.set('group', groupId);
    url.searchParams.delete('project');
    window.history.replaceState({}, '', url.toString());
  };

  const [readFilter, setReadFilter] = useState<'all' | 'unread' | 'read'>('all');

  const stripHtml = (html: string) =>
    html ? html.replace(/<[^>]*>/g, '') : '';

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(projectSearch.toLowerCase())
  );

  // Unread messages groups sorted FIRST (Microsoft Teams style)
  const filteredGroups = groups
    .filter((g) => {
      const matchesSearch = g.name.toLowerCase().includes(groupSearch.toLowerCase());
      const unreadCount = g.messages?.filter(
        (m: any) => !m.readReceipts?.some((r: any) => r.userId === currentUserId)
      ).length || 0;

      if (readFilter === 'unread') return matchesSearch && unreadCount > 0;
      if (readFilter === 'read') return matchesSearch && unreadCount === 0;
      return matchesSearch;
    })
    .sort((a, b) => {
      const unreadA = a.messages?.filter((m: any) => !m.readReceipts?.some((r: any) => r.userId === currentUserId)).length || 0;
      const unreadB = b.messages?.filter((m: any) => !m.readReceipts?.some((r: any) => r.userId === currentUserId)).length || 0;
      if (unreadA > 0 && unreadB === 0) return -1;
      if (unreadA === 0 && unreadB > 0) return 1;
      return 0;
    });

  const totalUnread = groups.reduce((acc, g) => {
    const count = g.messages?.filter(
      (m: any) => !m.readReceipts?.some((r: any) => r.userId === currentUserId)
    ).length || 0;
    return acc + (count > 0 ? 1 : 0);
  }, 0);

  return (
    <div className="flex flex-col h-full w-full bg-[#fafafa] dark:bg-[#131316] border-r border-slate-200/60 dark:border-white/5 overflow-hidden select-none">
      {/* Messages Header */}
      <div className="px-4 py-3.5 border-b border-slate-200/60 dark:border-white/5 flex items-center justify-between min-h-[48px] shrink-0">
        <h2 className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Messages
        </h2>
        {activeTab === 'teams' && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="px-2 py-1 rounded-md text-[10px] font-bold bg-primary text-white hover:bg-primary/90 transition-colors flex items-center gap-1 shadow-2xs"
              title="Create Team Group"
            >
              <Plus size={12} />
              <span>Group</span>
            </button>
            {externalStartDirect && (
              <button
                type="button"
                onClick={externalStartDirect}
                className="px-2 py-1 rounded-md text-[10px] font-bold bg-slate-200/80 dark:bg-white/10 text-slate-800 dark:text-white hover:bg-slate-300 dark:hover:bg-white/20 transition-colors flex items-center gap-1"
                title="Direct Chat Invitation"
              >
                <UserPlus size={12} />
                <span>+ Chat</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Search & Filter Badges Bar */}
      <div className="px-3 py-2.5 shrink-0 space-y-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="Search"
            value={activeTab === 'projects' ? projectSearch : groupSearch}
            onChange={(e) =>
              activeTab === 'projects'
                ? setProjectSearch(e.target.value)
                : setGroupSearch(e.target.value)
            }
            className="pl-8 h-8 text-[11px] bg-white dark:bg-white/5 border-slate-200/60 dark:border-white/8 rounded-lg focus-visible:ring-1 focus-visible:ring-slate-300"
          />
        </div>

        {/* Tab Selector & Read/Unread Filter Badges */}
        <div className="flex items-center justify-between gap-1.5 px-0.5">
          {/* Tab Pill Toggle */}
          <div className="flex items-center gap-0.5 bg-slate-200/60 dark:bg-white/5 rounded-lg p-0.5 text-xs font-semibold">
            <button
              onClick={() => setTab('projects')}
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                activeTab === 'projects'
                  ? 'bg-white dark:bg-[#1e1e22] text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Projects
            </button>
            <button
              onClick={() => setTab('teams')}
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                activeTab === 'teams'
                  ? 'bg-white dark:bg-[#1e1e22] text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Teams
            </button>
          </div>

          {/* Filter Badges: All | Unread */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setReadFilter('all')}
              className={`px-2 py-0.5 rounded-full text-[9px] font-bold transition-all border ${
                readFilter === 'all'
                  ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900'
                  : 'bg-transparent text-slate-500 border-slate-200/60 dark:border-white/10 hover:text-slate-700'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setReadFilter('unread')}
              className={`px-2 py-0.5 rounded-full text-[9px] font-bold transition-all border flex items-center gap-1 ${
                readFilter === 'unread'
                  ? 'bg-primary text-white border-primary'
                  : 'bg-transparent text-slate-500 border-slate-200/60 dark:border-white/10 hover:text-slate-700'
              }`}
            >
              <span>Unread</span>
              {totalUnread > 0 && (
                <span className="w-3.5 h-3.5 rounded-full bg-white/20 text-current text-[8px] flex items-center justify-center font-extrabold">
                  {totalUnread}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-1 custom-scrollbar">
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
                  className={`group w-full text-left p-2.5 rounded-lg flex items-start gap-2.5 transition-all border ${
                    isSelected
                      ? 'bg-slate-200/80 dark:bg-white/10 text-slate-900 dark:text-white border-slate-300/50 dark:border-white/10 font-bold shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white border-transparent'
                  }`}
                >
                  {/* Icon */}
                  <div className="relative shrink-0 mt-0.5">
                    <div
                      className={`w-7 h-7 rounded-md flex items-center justify-center font-bold text-[11px] ${
                        isSelected
                          ? 'bg-slate-300/70 dark:bg-white/20 text-slate-900 dark:text-white'
                          : 'bg-slate-200/50 dark:bg-white/5 text-slate-400'
                      }`}
                    >
                      <FolderKanban size={14} />
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="font-semibold text-[12px] truncate leading-tight">
                        {project.name}
                      </span>
                      <Star size={12} className={`shrink-0 ${isSelected ? 'text-amber-500' : 'text-slate-300 dark:text-slate-600'}`} />
                    </div>

                    <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate font-medium">
                      {project.description ? stripHtml(project.description) : 'Project conversation'}
                    </div>
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
                className={`group w-full text-left p-2.5 rounded-lg flex items-start gap-2.5 transition-all border ${
                  isSelected
                    ? 'bg-slate-200/80 dark:bg-white/10 text-slate-900 dark:text-white border-slate-300/50 dark:border-white/10 font-bold shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white border-transparent'
                }`}
              >
                {/* Avatar with Status badge */}
                <div className="relative shrink-0 mt-0.5">
                  {group.isDirect && otherMember ? (
                    <Avatar className="w-7 h-7 rounded-lg border border-slate-200/60 dark:border-white/10">
                      <AvatarImage
                        src={`https://api.dicebear.com/7.x/notionists/svg?seed=${otherMember.name}`}
                      />
                      <AvatarFallback className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-bold rounded-lg">
                        {otherMember.name.substring(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="w-7 h-7 rounded-lg bg-slate-200/80 dark:bg-white/10 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold text-[10px]">
                      {group.name.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-1 ring-white dark:ring-[#131316]" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className="text-[12px] font-semibold truncate leading-tight">
                      {displayName}
                    </span>
                    <Star size={12} className={`shrink-0 ${isSelected ? 'text-amber-500' : 'text-slate-300 dark:text-slate-600'}`} />
                  </div>

                  <div className="flex items-center justify-between gap-1 text-[10px]">
                    {lastMsg ? (
                      <span className="text-slate-400 dark:text-slate-500 truncate">
                        {lastMsg.content || 'Shared a file'}
                      </span>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500 italic">
                        No messages yet
                      </span>
                    )}

                    {unreadCount > 0 && (
                      <span className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[9px] font-bold h-4 px-1.5 rounded-full flex items-center justify-center shrink-0 min-w-[16px]">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
            <Users size={32} className="text-slate-300 dark:text-slate-600 mb-2 stroke-[1.5]" />
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-3">No team groups or direct chats yet.</p>
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-primary text-white hover:bg-primary/90 transition-colors shadow-2xs flex items-center gap-1.5"
            >
              <Users size={13} />
              <span>Create Team Group</span>
            </button>
          </div>
        )}
      </div>

      {/* CREATE NEW TEAM GROUP MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in text-left">
          <div className="bg-white dark:bg-[#18181c] rounded-[8px] shadow-2xl border border-slate-200 dark:border-white/10 w-full max-w-md flex flex-col max-h-[85vh] relative">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Create Team Group</h3>
                <p className="text-[11px] text-slate-400">Start a group chat and add members.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-[8px] p-1 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form Scroll Body */}
            <form id="create-group-form" onSubmit={handleCreateGroupSubmit} className="p-4 space-y-3 flex-1 overflow-y-auto custom-scrollbar">
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Group Name</label>
                <Input
                  placeholder="e.g. Design & Copy sync"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  required
                  autoFocus
                  className="bg-slate-50 dark:bg-white/5 border-slate-200/80 dark:border-white/10 rounded-[8px] h-9 text-xs focus-visible:ring-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Description (Optional)</label>
                <Input
                  placeholder="e.g. Syncing design files and updates"
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  className="bg-slate-50 dark:bg-white/5 border-slate-200/80 dark:border-white/10 rounded-[8px] h-9 text-xs focus-visible:ring-primary"
                />
              </div>

              {/* Add Members Section */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Add Members</label>
                  <span className="text-[10px] font-semibold text-slate-400">
                    {selectedUserIds.length} selected
                  </span>
                </div>

                {/* Selected Member Chips */}
                {selectedUserIds.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto custom-scrollbar p-1 bg-slate-50 dark:bg-white/5 rounded-[8px] border border-slate-200/60 dark:border-white/10">
                    {selectedUserIds.map((id) => {
                      const u = orgUsers.find((user) => user.id === id);
                      if (!u) return null;
                      return (
                        <span
                          key={id}
                          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-[8px] bg-white dark:bg-[#202024] text-slate-900 dark:text-white text-xs font-semibold border border-slate-200 dark:border-white/10 shadow-2xs"
                        >
                          <div className="w-4 h-4 rounded-full bg-slate-600 text-white text-[9px] font-bold flex items-center justify-center">
                            {u.name ? u.name.substring(0, 2).toUpperCase() : 'U'}
                          </div>
                          <span>{u.name}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleUserSelection(id);
                            }}
                            className="text-slate-400 hover:text-red-500 transition-colors ml-0.5"
                          >
                            <X size={12} />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Search Bar with Floating Dropdown */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 z-10" />
                  <Input
                    placeholder="Search members..."
                    value={userSearch}
                    onFocus={() => setIsUserDropdownOpen(true)}
                    onChange={(e) => {
                      setUserSearch(e.target.value);
                      setIsUserDropdownOpen(true);
                    }}
                    className="pl-8 bg-slate-50 dark:bg-white/5 border-slate-200/80 dark:border-white/10 rounded-[8px] h-9 text-xs focus-visible:ring-primary"
                  />

                  {/* Floating Dropdown Menu */}
                  {isUserDropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-[140]"
                        onClick={() => setIsUserDropdownOpen(false)}
                      />
                      <div className="absolute left-0 right-0 top-full mt-1 z-[150] bg-white dark:bg-[#1f1f23] border border-slate-200 dark:border-white/10 rounded-[8px] shadow-2xl overflow-hidden max-h-48 overflow-y-auto custom-scrollbar p-1 space-y-1 text-left">
                        {orgUsers.filter((u) =>
                          u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
                          u.email?.toLowerCase().includes(userSearch.toLowerCase())
                        ).length > 0 ? (
                          orgUsers
                            .filter((u) =>
                              u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
                              u.email?.toLowerCase().includes(userSearch.toLowerCase())
                            )
                            .map((user) => {
                              const isSelected = selectedUserIds.includes(user.id);
                              return (
                                <div
                                  key={user.id}
                                  onClick={() => {
                                    toggleUserSelection(user.id);
                                  }}
                                  className={`flex items-center justify-between p-2 rounded-[8px] cursor-pointer transition-all border ${
                                    isSelected
                                      ? 'bg-slate-100 dark:bg-white/10 border-slate-300 dark:border-white/20 font-bold'
                                      : 'bg-white dark:bg-[#151518] border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5'
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-8 h-8 rounded-full bg-slate-500 text-white flex items-center justify-center font-bold text-xs shrink-0">
                                      {user.name ? user.name.substring(0, 2).toUpperCase() : 'U'}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate leading-tight">
                                        {user.name}
                                      </p>
                                      <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate leading-tight font-medium">
                                        {user.email}
                                      </p>
                                    </div>
                                  </div>
                                  <div className={`w-4 h-4 rounded-[4px] border flex items-center justify-center transition-colors shrink-0 ${
                                    isSelected ? 'bg-primary border-primary text-white' : 'border-slate-300 dark:border-slate-600'
                                  }`}>
                                    {isSelected && <Check size={11} />}
                                  </div>
                                </div>
                              );
                            })
                        ) : (
                          <p className="text-center py-4 text-[11px] text-slate-400">No members found.</p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </form>

            {/* FIXED MODAL FOOTER */}
            <div className="p-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-end gap-2 shrink-0 bg-white dark:bg-[#18181c] rounded-b-[8px]">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-3.5 py-1.5 rounded-[8px] text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="create-group-form"
                disabled={!newGroupName.trim() || isCreatingGroup}
                className="px-4 py-1.5 rounded-[8px] text-xs font-bold bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-1.5 shadow-2xs"
              >
                {isCreatingGroup ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                <span>Create Group</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
