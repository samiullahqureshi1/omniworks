'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRealtime } from '@/hooks/useRealtime';
import { useSearchParams, useRouter } from 'next/navigation';
import ProjectConversation from '../projects/[id]/ProjectConversation';
import {
  MessageSquare,
  FolderKanban,
  Users as UsersIcon,
  Plus,
  Search,
  Send,
  Paperclip,
  Trash2,
  Settings,
  X,
  FileText,
  Image as ImageIcon,
  File as FileIcon,
  Download,
  Check,
  CheckCheck,
  Loader2,
  Reply,
  Info,
  Calendar,
  AlertCircle,
  Pencil,
  ArrowRight,
  Mic,
  Play,
  Pause,
  Square
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const VoiceNotePlayer = ({
  src,
  sender,
  createdAt,
  isCurrentUser
}: {
  src: string;
  sender?: { name: string; avatar?: string };
  createdAt?: string;
  isCurrentUser: boolean;
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const formatAudioTime = (time: number) => {
    if (isNaN(time) || time === 0) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formattedTime = createdAt
    ? new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
    : '11:59';

  const waveformHeights = [
    30, 50, 75, 40, 90, 60, 35, 80, 100, 45, 65, 85, 30, 95, 70,
    40, 60, 90, 50, 80, 65, 35, 75, 100, 45, 85, 60, 40, 90, 50
  ];

  const progressPercent = duration > 0 ? (currentTime / duration) : 0;
  const activeBarIndex = Math.floor(progressPercent * waveformHeights.length);

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-[20px] max-w-sm relative shadow-2xs ${
      isCurrentUser 
        ? 'bg-[#16181a] text-white' 
        : 'bg-[#e5e5ea] dark:bg-[#26262a] text-slate-900 dark:text-white'
    }`}>
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onEnded={() => { setIsPlaying(false); setCurrentTime(0); }}
        className="hidden"
      />

      {/* Play/Pause Button */}
      <button
        type="button"
        onClick={togglePlay}
        className="text-current hover:opacity-80 transition-transform active:scale-95 shrink-0"
      >
        {isPlaying ? (
          <Pause size={20} className="fill-current text-current" />
        ) : (
          <Play size={20} className="fill-current text-current ml-0.5" />
        )}
      </button>

      {/* Waveform & Timestamps Container */}
      <div className="flex-1 flex flex-col justify-center min-w-0">
        {/* Waveform bars with progress blue dot */}
        <div
          className="relative flex items-center gap-[2.5px] h-7 w-full cursor-pointer py-1"
          onClick={(e) => {
            if (!audioRef.current || !duration) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const pct = Math.max(0, Math.min(1, clickX / rect.width));
            audioRef.current.currentTime = pct * duration;
            setCurrentTime(pct * duration);
          }}
        >
          {/* Blue progress dot */}
          <span
            className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-[#007aff] z-10 shadow-xs transition-all duration-75"
            style={{ left: `calc(${progressPercent * 100}% - 4px)` }}
          />

          {waveformHeights.map((h, idx) => {
            const isPassed = idx <= activeBarIndex;
            return (
              <span
                key={idx}
                className={`flex-1 rounded-full transition-colors duration-150 ${
                  isPassed
                    ? (isCurrentUser ? 'bg-white' : 'bg-slate-900 dark:bg-white')
                    : (isCurrentUser ? 'bg-white/30' : 'bg-slate-400/50 dark:bg-white/30')
                }`}
                style={{ height: `${h}%` }}
              />
            );
          })}
        </div>

        {/* Timestamps */}
        <div className="flex justify-between items-center text-[10px] text-slate-400 font-medium px-0.5 mt-0.5">
          <span>{formatAudioTime(currentTime || duration)}</span>
          <span>{formattedTime}</span>
        </div>
      </div>

      {/* Sender Avatar with Blue Mic Overlay */}
      <div className="relative shrink-0 ml-1">
        <Avatar className="h-9 w-9 border border-black/10 dark:border-white/10">
          <AvatarImage src={sender?.avatar || `https://api.dicebear.com/7.x/notionists/svg?seed=${sender?.name || 'user'}`} />
          <AvatarFallback className="text-[10px] font-extrabold uppercase bg-primary/20 text-primary">
            {(sender?.name || 'U').substring(0, 2)}
          </AvatarFallback>
        </Avatar>
        <span className="absolute -bottom-0.5 -left-1 bg-[#007aff] text-white p-0.5 rounded-full ring-2 ring-white dark:ring-[#181818] shadow-xs">
          <Mic size={9} className="stroke-[2.5]" />
        </span>
      </div>
    </div>
  );
};

interface ConversationsClientProps {
  currentUser: {
    id: string;
    name: string;
    email: string;
    role: string;
    organizationId: string;
  };
  projects: Array<{
    id: string;
    name: string;
    description: string | null;
    priority: string;
    clientId: string | null;
    projectManagerId: string | null;
    createdAt: Date;
  }>;
  users: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
  }>;
  organizations: Array<{
    id: string;
    name: string;
    parentOrganizationId: string | null;
  }>;
}
const stripHtml = (htmlString: string | null | undefined) => {
  if (!htmlString) return '';
  return htmlString.replace(/<[^>]*>/g, '');
};


export default function ConversationsClient({
  currentUser,
  projects,
  users,
  organizations
}: ConversationsClientProps) {
  // Read tab and selection with instant local state
  const searchParams = useSearchParams();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'projects' | 'teams'>(
    (searchParams.get('chatTab') as 'projects' | 'teams') || 'projects'
  );
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    searchParams.get('project') || (projects.length > 0 ? projects[0].id : null)
  );
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(
    searchParams.get('group')
  );

  useEffect(() => {
    const syncFromLocation = () => {
      const sp = new URLSearchParams(window.location.search);
      const tab = (sp.get('chatTab') as 'projects' | 'teams') || 'projects';
      const proj = sp.get('project') || (projects.length > 0 ? projects[0].id : null);
      const group = sp.get('group');

      setActiveTab(prev => prev !== tab ? tab : prev);
      setSelectedProjectId(prev => prev !== proj ? proj : prev);
      setSelectedGroupId(prev => prev !== group ? group : prev);
    };

    window.addEventListener('popstate', syncFromLocation);
    const interval = setInterval(syncFromLocation, 50);
    return () => {
      window.removeEventListener('popstate', syncFromLocation);
      clearInterval(interval);
    };
  }, [projects]);

  // Teams tab state
  const [groups, setGroups] = useState<any[]>([]);
  const [groupSearch, setGroupSearch] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messageContent, setMessageContent] = useState('');
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [isSending, setIsSending] = useState(false);

  // Edit/Delete/Forward message state
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [isForwardDialogOpen, setIsForwardDialogOpen] = useState(false);
  const [messageToForward, setMessageToForward] = useState<any>(null);
  const [forwardSearchQuery, setForwardSearchQuery] = useState('');
  const [isDeleteMsgOpen, setIsDeleteMsgOpen] = useState(false);
  const [msgIdToDelete, setMsgIdToDelete] = useState<string | null>(null);
  const [isDeclineInviteOpen, setIsDeclineInviteOpen] = useState(false);

  // Direct chat Modal State
  const [isDirectModalOpen, setIsDirectModalOpen] = useState(false);
  const [directUserSearchQuery, setDirectUserSearchQuery] = useState('');
  const [isCreatingDirect, setIsCreatingDirect] = useState(false);
  const [isNewDirectModalOpen, setIsNewDirectModalOpen] = useState(false);
  const [selectedUserForDirect, setSelectedUserForDirect] = useState<string>('');
  const [isStartingDirect, setIsStartingDirect] = useState(false);

  // Mention Suggestions State for Teams Tab Chat
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionMode, setMentionMode] = useState<'members' | 'projects' | 'tasks'>('members');
  const [mentionQuery, setMentionQuery] = useState('');
  const [allTasks, setAllTasks] = useState<any[]>([]);

  useEffect(() => {
    const loadTasks = async () => {
      try {
        const { getTasksAction } = await import('@/app/actions/tasks');
        const res = await getTasksAction();
        if (res.success && res.tasks) {
          setAllTasks(res.tasks);
        }
      } catch (err) {
        console.error('Failed to load tasks for mentions:', err);
      }
    };
    loadTasks();
  }, []);

  // Context-aware projects & tasks filter helpers for mentions
  const getContextualProjects = () => {
    const memberMatches = messageContent.match(/@([A-Za-z0-9_]+)/g);
    if (memberMatches && memberMatches.length > 0) {
      const lastMemberMention = memberMatches[memberMatches.length - 1].replace('@', '').toLowerCase();
      const matchedUser = users.find(u => 
        u.name.replace(/\s+/g, '').toLowerCase() === lastMemberMention || 
        u.name.toLowerCase().includes(lastMemberMention)
      );
      if (matchedUser) {
        const userProjects = projects.filter(p => 
          p.projectManagerId === matchedUser.id ||
          p.clientId === matchedUser.id ||
          (p as any).assignees?.some((a: any) => a.userId === matchedUser.id || a.user?.id === matchedUser.id)
        );
        if (userProjects.length > 0) return userProjects;
      }
    }
    return projects;
  };

  const getContextualTasks = () => {
    const projectMatches = messageContent.match(/@@([A-Za-z0-9_]+)/g);
    if (projectMatches && projectMatches.length > 0) {
      const lastProjMention = projectMatches[projectMatches.length - 1].replace('@@', '').toLowerCase();
      const matchedProject = projects.find(p => 
        p.name.replace(/\s+/g, '').toLowerCase() === lastProjMention || 
        p.name.toLowerCase().includes(lastProjMention)
      );
      if (matchedProject) {
        const projTasks = allTasks.filter(t => t.projectId === matchedProject.id);
        if (projTasks.length > 0) return projTasks;
      }
    }
    return allTasks;
  };

  const [mentionHighlightedIndex, setMentionHighlightedIndex] = useState(0);

  const getFilteredMentionItems = () => {
    if (mentionMode === 'members') {
      return users.filter(u => u.name.toLowerCase().includes(mentionQuery) || u.email.toLowerCase().includes(mentionQuery));
    } else if (mentionMode === 'projects') {
      return getContextualProjects().filter(p => p.name.toLowerCase().includes(mentionQuery));
    } else {
      return getContextualTasks().filter(t => t.title.toLowerCase().includes(mentionQuery));
    }
  };

  const handleMessageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMessageContent(value);

    const words = value.split(/\s+/);
    const lastWord = words[words.length - 1] || '';
    if (lastWord.startsWith('@@')) {
      setMentionMode('projects');
      setMentionQuery(lastWord.substring(2).toLowerCase());
      setShowMentionSuggestions(true);
      setMentionHighlightedIndex(0);
    } else if (lastWord.startsWith('@')) {
      setMentionMode('members');
      setMentionQuery(lastWord.substring(1).toLowerCase());
      setShowMentionSuggestions(true);
      setMentionHighlightedIndex(0);
    } else if (lastWord.startsWith('#')) {
      setMentionMode('tasks');
      setMentionQuery(lastWord.substring(1).toLowerCase());
      setShowMentionSuggestions(true);
      setMentionHighlightedIndex(0);
    } else {
      setShowMentionSuggestions(false);
    }
  };

  const handleComposerKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showMentionSuggestions) return;

    const items = getFilteredMentionItems();
    if (items.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setMentionHighlightedIndex((prev) => (prev + 1) % items.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setMentionHighlightedIndex((prev) => (prev - 1 + items.length) % items.length);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      const selectedItem = items[mentionHighlightedIndex] || items[0];
      if (selectedItem) {
        if (mentionMode === 'members') {
          insertGroupMention(selectedItem.name, '@');
        } else if (mentionMode === 'projects') {
          insertGroupMention(selectedItem.name, '@@');
        } else {
          insertGroupMention(selectedItem.title, '#');
        }
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setShowMentionSuggestions(false);
    }
  };

  const renderFormattedMessageContent = (rawContent: string) => {
    if (!rawContent) return null;
    const parts = rawContent.split(/(@@[A-Za-z0-9_]+|@[A-Za-z0-9_]+|#[A-Za-z0-9_]+)/g);
    return parts.map((part, index) => {
      if (part.startsWith('@@')) {
        return (
          <span
            key={index}
            className="inline-flex items-center px-2 py-0.5 mx-0.5 rounded-[6px] text-xs font-black bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-200 border border-blue-300 dark:border-blue-500/40 shadow-2xs"
          >
            {part}
          </span>
        );
      } else if (part.startsWith('@')) {
        return (
          <span
            key={index}
            className="inline-flex items-center px-2 py-0.5 mx-0.5 rounded-[6px] text-xs font-black bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-200 border border-indigo-300 dark:border-indigo-500/40 shadow-2xs"
          >
            {part}
          </span>
        );
      } else if (part.startsWith('#')) {
        return (
          <span
            key={index}
            className="inline-flex items-center px-2 py-0.5 mx-0.5 rounded-[6px] text-xs font-black bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-200 border border-amber-300 dark:border-amber-500/40 shadow-2xs"
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const insertGroupMention = (name: string, prefix: string) => {
    const words = messageContent.trimEnd().split(/\s+/);
    words.pop();
    words.push(`${prefix}${name.replace(/\s+/g, '')} `);
    setMessageContent(words.join(' '));
    setShowMentionSuggestions(false);
  };

  // File Upload State
  const [uploading, setUploading] = useState(false);
  const [attachedFile, setAttachedFile] = useState<{ url: string; name: string; size: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Voice Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
    } catch (err) {
      toast.error('Microphone permission denied or not available');
    }
  };

  const stopAndSendVoiceNote = () => {
    if (!mediaRecorderRef.current) return;

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }

    mediaRecorderRef.current.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const file = new File([audioBlob], `Voice_Note_${Date.now()}.webm`, { type: 'audio/webm' });

      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await fetch('/api/conversations/upload', {
          method: 'POST',
          body: formData
        });

        if (res.ok) {
          const data = await res.json();
          setAttachedFile({
            url: data.url,
            name: data.name,
            size: data.size
          });
          toast.success('Voice note recorded');
        }
      } catch (err) {
        toast.error('Failed to upload voice note');
      } finally {
        setUploading(false);
      }

      mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      setRecordingSeconds(0);
    };

    mediaRecorderRef.current.stop();
  };

  const cancelVoiceRecording = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    setIsRecording(false);
    setRecordingSeconds(0);
    audioChunksRef.current = [];
  };

  const formatRecordingTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  // Create Group Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');

  // Settings Modal State
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [settingsMembers, setSettingsMembers] = useState<string[]>([]);
  const [isUpdatingMembers, setIsUpdatingMembers] = useState(false);
  const [isDeletingGroup, setIsDeletingGroup] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // filteredProjects and filteredGroups are now handled by ConversationsSidebarPanel

  const filteredUsers = users.filter(u =>
    u.id !== currentUser.id &&
    (u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
     u.email.toLowerCase().includes(userSearchQuery.toLowerCase()))
  );

  const filteredDirectUsers = users.filter(u =>
    u.id !== currentUser.id &&
    (u.name.toLowerCase().includes(directUserSearchQuery.toLowerCase()) ||
     u.email.toLowerCase().includes(directUserSearchQuery.toLowerCase()))
  );

  // Fetch groups on mount or tab change
  const fetchGroups = async () => {
    try {
      const res = await fetch('/api/conversations/groups');
      if (res.ok) {
        const data = await res.json();
        setGroups(data.groups || []);
        if (data.groups?.length > 0 && !selectedGroupId) {
          // Don't auto select unless none selected
        }
      }
    } catch (err) {
      console.error('Error fetching groups:', err);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

const groupMessagesCache: Record<string, any[]> = {};

  // Fetch messages when a group is selected
  const fetchGroupMessages = async (groupId: string) => {
    try {
      const res = await fetch(`/api/conversations/groups/${groupId}/messages`);
      if (res.ok) {
        const data = await res.json();
        const newMsgs = data.messages || [];
        groupMessagesCache[groupId] = newMsgs;
        setMessages(newMsgs);
        // Refresh groups list to update unread badges
        fetchGroups();
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setMessagesLoading(false);
      scrollToBottom();
    }
  };

  useEffect(() => {
    if (selectedGroupId) {
      if (groupMessagesCache[selectedGroupId]) {
        setMessages(groupMessagesCache[selectedGroupId]);
        setMessagesLoading(false);
      } else {
        setMessagesLoading(true);
        setMessages([]);
      }
      fetchGroupMessages(selectedGroupId);
    } else {
      setMessages([]);
    }
  }, [selectedGroupId]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  // Realtime hook for the selected group
  const { lastEvent } = useRealtime(
    selectedGroupId ? [{ groupId: selectedGroupId }] : []
  );

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (lastEvent && selectedGroupId) {
      if (lastEvent.event === 'message_sent' && lastEvent.payload.message) {
        const msg = lastEvent.payload.message;
        if (msg.senderId !== currentUser.id) {
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification(`New Message from ${msg.sender?.name || 'User'}`, {
                body: msg.content || 'Sent an attachment',
                icon: '/favicon.ico',
              });
            } catch {
              /* ignore */
            }
          }
        }
        if (msg.groupId === selectedGroupId) {
          setMessages(prev => {
            if (prev.some(m => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          scrollToBottom();
          // Update last message in local groups list
          setGroups(prev => prev.map(g => {
            if (g.id === selectedGroupId) {
              return {
                ...g,
                updatedAt: new Date().toISOString(),
                messages: [msg]
              };
            }
            return g;
          }));
        }
      } else if (['message_edited', 'message_deleted'].includes(lastEvent.event)) {
        fetchGroupMessages(selectedGroupId);
      } else if (lastEvent.event === 'message_read' && lastEvent.payload.groupId === selectedGroupId) {
        const { userId, messageIds } = lastEvent.payload;
        setMessages(prev => prev.map(m => {
          if (messageIds.includes(m.id)) {
            const alreadyRead = m.readReceipts?.some((r: any) => r.userId === userId);
            if (alreadyRead) return m;
            const userObj = users.find(u => u.id === userId) || { id: userId, name: 'Someone' };
            return {
              ...m,
              readReceipts: [...(m.readReceipts || []), { userId, user: userObj }]
            };
          }
          return m;
        }));
      }
    }
  }, [lastEvent, selectedGroupId, users]);

  // Create Group Handler
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    setIsCreatingGroup(true);
    try {
      const res = await fetch('/api/conversations/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newGroupName,
          description: newGroupDesc,
          userIds: selectedMembers
        })
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(`Group "${data.group.name}" created successfully`);
        setNewGroupName('');
        setNewGroupDesc('');
        setSelectedMembers([]);
        setIsCreateModalOpen(false);
        setGroups(prev => [data.group, ...prev]);
        const createParams = new URLSearchParams(window.location.search);
        createParams.set('chatTab', 'teams');
        createParams.set('group', data.group.id);
        createParams.delete('project');
        router.push(`/workspace/conversations?${createParams.toString()}`);
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to create group');
      }
    } catch (err) {
      toast.error('An error occurred');
      console.error(err);
    } finally {
      setIsCreatingGroup(false);
    }
  };

  // Toggle member selection in create modal
  const toggleMemberSelection = (userId: string) => {
    setSelectedMembers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  // Upload File Handler
  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/conversations/upload', {
        method: 'POST',
        body: formData
      });
      
      if (res.ok) {
        const data = await res.json();
        setAttachedFile({
          url: data.url,
          name: data.name,
          size: data.size
        });
        toast.success(`File "${file.name}" uploaded successfully`);
      } else {
        toast.error('Failed to upload file');
      }
    } catch (err) {
      toast.error('File upload error');
      console.error(err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Send Message Handler
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageContent.trim() && !attachedFile) return;
    if (!selectedGroupId) return;

    setIsSending(true);
    try {
      const res = await fetch(`/api/conversations/groups/${selectedGroupId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: messageContent,
          parentMessageId: replyingTo?.id || null,
          fileUrl: attachedFile?.url || null,
          fileName: attachedFile?.name || null,
          fileSize: attachedFile?.size || null
        })
      });

      if (res.ok) {
        setMessageContent('');
        setReplyingTo(null);
        setAttachedFile(null);
        scrollToBottom();
      } else {
        toast.error('Failed to send message');
      }
    } catch (err) {
      toast.error('An error occurred while sending');
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  // Edit Message Handler
  const handleEditMessage = async (messageId: string) => {
    if (!editContent.trim() || !selectedGroupId) return;
    try {
      const res = await fetch(`/api/conversations/groups/${selectedGroupId}/messages/${messageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent.trim() })
      });
      if (res.ok) {
        setEditingMessageId(null);
        setEditContent('');
        fetchGroupMessages(selectedGroupId);
      } else {
        toast.error('Failed to edit message');
      }
    } catch (err) {
      toast.error('An error occurred');
      console.error(err);
    }
  };

  // Delete Message Trigger
  const handleDeleteMessage = (messageId: string) => {
    setMsgIdToDelete(messageId);
    setIsDeleteMsgOpen(true);
  };

  // Confirmed Delete Message execution
  const confirmDeleteMessage = async () => {
    if (!selectedGroupId || !msgIdToDelete) return;
    try {
      const res = await fetch(`/api/conversations/groups/${selectedGroupId}/messages/${msgIdToDelete}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchGroupMessages(selectedGroupId);
        toast.success('Message deleted');
      } else {
        toast.error('Failed to delete message');
      }
    } catch (err) {
      toast.error('An error occurred');
      console.error(err);
    } finally {
      setIsDeleteMsgOpen(false);
      setMsgIdToDelete(null);
    }
  };

  // Forward Message Handler
  const handleForwardMessage = async (targetId: string, targetType: 'group' | 'project') => {
    if (!messageToForward) return;

    try {
      let res;
      if (targetType === 'group') {
        res = await fetch(`/api/conversations/groups/${targetId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: messageToForward.content,
            fileUrl: messageToForward.fileUrl || null,
            fileName: messageToForward.fileName || null,
            fileSize: messageToForward.fileSize || null
          })
        });
      } else {
        res = await fetch(`/api/projects/${targetId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: messageToForward.content,
            visibility: 'PUBLIC'
          })
        });
      }

      if (res.ok) {
        toast.success('Message forwarded successfully');
        setIsForwardDialogOpen(false);
        setMessageToForward(null);
        if (targetType === 'group' && targetId === selectedGroupId) {
          fetchGroupMessages(selectedGroupId);
        }
      } else {
        toast.error('Failed to forward message');
      }
    } catch (err) {
      toast.error('An error occurred');
      console.error(err);
    }
  };

  // Accept Connection Request
  const handleAcceptInvitation = async () => {
    if (!selectedGroupId) return;
    try {
      const res = await fetch(`/api/conversations/groups/${selectedGroupId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ACTIVE' })
      });

      if (res.ok) {
        toast.success('Connection request accepted');
        setGroups(prev => prev.map(g => g.id === selectedGroupId ? { ...g, status: 'ACTIVE' } : g));
      } else {
        toast.error('Failed to accept connection request');
      }
    } catch (err) {
      toast.error('An error occurred');
      console.error(err);
    }
  };

  // Decline Connection Request Trigger
  const handleDeclineInvitation = () => {
    setIsDeclineInviteOpen(true);
  };

  // Confirmed Decline Connection execution
  const confirmDeclineInvitation = async () => {
    if (!selectedGroupId) return;
    try {
      const res = await fetch(`/api/conversations/groups/${selectedGroupId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        toast.success('Invitation declined');
        setGroups(prev => prev.filter(g => g.id !== selectedGroupId));
        const declineParams = new URLSearchParams(window.location.search);
        declineParams.delete('group');
        router.push(`/workspace/conversations?${declineParams.toString()}`);
      } else {
        toast.error('Failed to decline invitation');
      }
    } catch (err) {
      toast.error('An error occurred');
      console.error(err);
    } finally {
      setIsDeclineInviteOpen(false);
    }
  };

  // Start Direct Chat Request
  const handleStartDirectChat = async (targetUser: any) => {
    setIsCreatingDirect(true);
    try {
      const res = await fetch('/api/conversations/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isDirect: true,
          status: 'PENDING',
          userIds: [targetUser.id]
        })
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(`Connection request sent to ${targetUser.name}`);
        setIsDirectModalOpen(false);
        setGroups(prev => [data.group, ...prev]);
        const directParams = new URLSearchParams(window.location.search);
        directParams.set('chatTab', 'teams');
        directParams.set('group', data.group.id);
        directParams.delete('project');
        router.push(`/workspace/conversations?${directParams.toString()}`);
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to start direct chat');
      }
    } catch (err) {
      toast.error('An error occurred');
      console.error(err);
    } finally {
      setIsCreatingDirect(false);
    }
  };

  // Open Settings Modal
  const openSettingsModal = () => {
    const group = groups.find(g => g.id === selectedGroupId);
    if (!group) return;
    setSettingsMembers(group.members.map((m: any) => m.userId));
    setIsSettingsModalOpen(true);
  };

  // Save Settings (Group members update)
  const handleUpdateMembers = async () => {
    if (!selectedGroupId) return;
    setIsUpdatingMembers(true);
    try {
      const res = await fetch(`/api/conversations/groups/${selectedGroupId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: settingsMembers })
      });

      if (res.ok) {
        const data = await res.json();
        toast.success('Group members updated successfully');
        // Update local groups list
        setGroups(prev => prev.map(g => g.id === selectedGroupId ? data.group : g));
        setIsSettingsModalOpen(false);
      } else {
        toast.error('Failed to update group members');
      }
    } catch (err) {
      toast.error('An error occurred');
      console.error(err);
    } finally {
      setIsUpdatingMembers(false);
    }
  };

  // Delete Group
  const handleDeleteGroup = async () => {
    if (!selectedGroupId) return;
    const confirmDelete = window.confirm('Are you sure you want to delete this group? All messages and attachments will be permanently removed.');
    if (!confirmDelete) return;

    setIsDeletingGroup(true);
    try {
      const res = await fetch(`/api/conversations/groups/${selectedGroupId}/members`, {
        method: 'DELETE'
      });

      if (res.ok) {
        toast.success('Group deleted successfully');
        setGroups(prev => prev.filter(g => g.id !== selectedGroupId));
        const deleteParams = new URLSearchParams(window.location.search);
        deleteParams.delete('group');
        router.push(`/workspace/conversations?${deleteParams.toString()}`);
        setIsSettingsModalOpen(false);
      } else {
        toast.error('Failed to delete group');
      }
    } catch (err) {
      toast.error('An error occurred');
      console.error(err);
    } finally {
      setIsDeletingGroup(false);
    }
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext || '')) {
      return <ImageIcon className="text-pink-500 h-8 w-8" />;
    }
    if (['pdf'].includes(ext || '')) {
      return <FileText className="text-red-500 h-8 w-8" />;
    }
    return <FileIcon className="text-indigo-500 h-8 w-8" />;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Get active group
  const activeGroup = groups.find(g => g.id === selectedGroupId);
  const isOwner = activeGroup?.ownerId === currentUser.id;

  // Format Time Helper
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatMsgDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return `Today at ${formatTime(dateString)}`;
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday at ${formatTime(dateString)}`;
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ` at ${formatTime(dateString)}`;
  };

  const otherMember = activeGroup?.isDirect
    ? activeGroup.members?.find((m: any) => m.userId !== currentUser.id)?.user
    : null;
  const activeChatName = otherMember ? otherMember.name : activeGroup?.name;
  const isPendingInvitation = activeGroup?.isDirect && activeGroup?.status === 'PENDING';

  return (
    <div className="flex h-full overflow-hidden bg-white dark:bg-[#181818]">
      

      {/* RIGHT CHAT AREA */}
      <div className="flex-1 flex bg-white dark:bg-[#181818] h-full overflow-hidden">
        {activeTab === 'projects' ? (
          selectedProjectId ? (
            <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50/10 dark:bg-transparent">
              {/* Reuse ProjectConversation */}
              <ProjectConversation
                projectId={selectedProjectId}
                currentUser={{
                  ...currentUser,
                  userId: currentUser.id // ProjectConversation expects userId
                }}
                organizationId={currentUser.organizationId}
                isClient={currentUser.role === 'CLIENT'}
              />
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
              <FolderKanban className="h-16 w-16 mb-4 text-slate-300 stroke-[1.25]" />
              <p className="text-sm font-medium">Select a project from the list to start a conversation</p>
            </div>
          )
        ) : (
          selectedGroupId && activeGroup ? (
            <div className="flex-1 flex h-full overflow-hidden relative">
              {/* Main Group Chat Stream */}
              <div className="flex-1 flex flex-col h-full justify-between overflow-hidden bg-slate-50/20 dark:bg-[#131313]">
                {/* Group Header */}
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-[#181818] flex items-center justify-between shrink-0 shadow-sm z-10">
                  <div className="min-w-0">
                    <h2 className="font-extrabold text-slate-900 dark:text-white truncate text-base">{activeChatName}</h2>
                    {!activeGroup.isDirect && activeGroup.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-lg mt-0.5">{activeGroup.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {isOwner && !activeGroup.isDirect && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={openSettingsModal}
                        className="rounded-full h-8 w-8 p-0 text-slate-400 hover:text-slate-900 dark:hover:text-white"
                        title="Manage Group"
                      >
                        <Settings size={18} />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Direct Connection Request Prominent Banner */}
                {activeGroup.isDirect && activeGroup.status === 'PENDING' && activeGroup.ownerId !== currentUser.id && (
                  <div className="bg-amber-500/10 dark:bg-amber-500/5 border-b border-amber-500/20 px-6 py-3 flex items-center justify-between shrink-0 z-10 animate-fade-in">
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-400">
                      {activeGroup.owner?.name || 'Someone'} has invited you to connect.
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={handleAcceptInvitation}
                        className="bg-primary hover:bg-primary/95 text-white font-semibold text-xs px-4 h-8 rounded-lg"
                      >
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={handleDeclineInvitation}
                        className="font-semibold text-xs px-4 h-8 rounded-lg"
                      >
                        Decline
                      </Button>
                    </div>
                  </div>
                )}

                {/* Messages Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                  {isPendingInvitation && activeGroup.ownerId === currentUser.id ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                      <Loader2 className="h-10 w-10 text-primary animate-spin mb-3" />
                      <p className="text-sm font-semibold">Waiting for acceptance request to be approved...</p>
                    </div>
                  ) : messagesLoading ? (
                    <div className="h-full flex items-center justify-center">
                      <Loader2 className="h-8 w-8 text-primary animate-spin" />
                    </div>
                  ) : messages.length > 0 ? (
                    messages.map((msg) => {
                      const isCurrentUser = msg.senderId === currentUser.id;
                      
                      // Calculate read receipt text
                      const otherReads = msg.readReceipts?.filter((r: any) => r.userId !== currentUser.id) || [];
                      const readNames = otherReads.map((r: any) => r.user?.name || 'Someone').join(', ');
                      const readCount = otherReads.length;
                      
                      return (
                        <div key={msg.id} className={`flex items-start gap-3.5 group max-w-4xl ${isCurrentUser ? 'ml-auto flex-row-reverse' : ''}`}>
                          {/* Avatar */}
                          <Avatar className="h-9 w-9 shrink-0 border border-slate-100 dark:border-white/10 shadow-sm">
                            <AvatarImage src={`https://api.dicebear.com/7.x/notionists/svg?seed=${msg.sender?.name || 'user'}`} />
                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold uppercase">
                              {(msg.sender?.name || '??').substring(0, 2)}
                            </AvatarFallback>
                          </Avatar>

                          {/* Message bubble */}
                          <div className={`flex flex-col gap-1 min-w-0 max-w-xl ${isCurrentUser ? 'items-end' : ''}`}>
                            <div className="flex items-baseline gap-2">
                              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{msg.sender?.name || 'User'}</span>
                              <span className="text-[10px] text-slate-400 font-medium">{formatMsgDate(msg.createdAt)}</span>
                            </div>

                            {/* Reply Quote context */}
                            {msg.parentMessage && (
                              <div className="bg-slate-50 dark:bg-[#202020] border-l-4 border-slate-300 dark:border-slate-600 rounded-r-xl px-3 py-1.5 text-xs text-slate-500 max-w-md mb-1 italic truncate">
                                <span className="font-semibold text-slate-600 dark:text-slate-400 not-italic">@{msg.parentMessage.sender?.name || 'User'}: </span>
                                {msg.parentMessage.content || 'Shared a file'}
                              </div>
                            )}

                            {/* Content Bubble */}
                            <div className={`rounded-2xl px-4.5 py-3 text-sm shadow-sm relative ${
                              isCurrentUser
                                ? 'bg-[#16181a] text-white rounded-tr-none'
                                : 'bg-[#e5e5ea] dark:bg-[#26262a] text-slate-900 dark:text-white rounded-tl-none border border-slate-300/30 dark:border-white/5'
                            }`}>
                              {/* Content text / Edit box */}
                              {editingMessageId === msg.id ? (
                                <div className="flex flex-col gap-2 min-w-[200px]">
                                  <textarea 
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    className="w-full text-sm bg-transparent border-b border-primary-foreground/30 focus:border-primary-foreground focus:outline-none resize-none p-1 placeholder:text-primary-foreground/50 text-white custom-scrollbar"
                                    rows={2}
                                    autoFocus
                                  />
                                  <div className="flex justify-end gap-1">
                                    <Button size="icon" variant="ghost" className="h-6 w-6 hover:bg-primary-foreground/20 text-white" onClick={() => setEditingMessageId(null)}>
                                      <X size={12} />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-6 w-6 hover:bg-primary-foreground/20 text-white" onClick={() => handleEditMessage(msg.id)}>
                                      <Check size={12} />
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  {msg.content && <p className="whitespace-pre-wrap break-words leading-relaxed">{renderFormattedMessageContent(msg.content)}</p>}
                                  {msg.isEdited && (
                                    <span className="text-[9px] opacity-60 absolute bottom-1 right-3">(edited)</span>
                                  )}
                                </>
                              )}

                              {/* Attachment File / Voice Note Card */}
                              {msg.fileUrl && (
                                (msg.fileName?.includes('Voice_Note') || msg.fileUrl.match(/\.(webm|mp3|wav|ogg|m4a)$/i)) ? (
                                  <VoiceNotePlayer
                                    src={msg.fileUrl}
                                    sender={msg.sender}
                                    createdAt={msg.createdAt}
                                    isCurrentUser={isCurrentUser}
                                  />
                                ) : (
                                  <div className={`flex items-center gap-3 p-3 mt-2 rounded-xl border max-w-sm ${
                                    isCurrentUser
                                      ? 'bg-primary-foreground/10 border-primary-foreground/20 text-white'
                                      : 'bg-slate-50 dark:bg-[#1a1a1a] border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-200'
                                  }`}>
                                    {getFileIcon(msg.fileName || 'file')}
                                    <div className="min-w-0 flex-1">
                                      <div className="font-bold text-xs truncate">{msg.fileName || 'Attached File'}</div>
                                      <div className={`text-[10px] mt-0.5 ${isCurrentUser ? 'text-primary-foreground/70' : 'text-slate-400'}`}>
                                        {formatFileSize(msg.fileSize || 0)}
                                      </div>
                                    </div>
                                    <a
                                      href={msg.fileUrl}
                                      download={msg.fileName || 'file'}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className={`p-1.5 rounded-lg transition-colors hover:bg-black/10 dark:hover:bg-white/10 ${
                                        isCurrentUser ? 'text-white' : 'text-slate-500'
                                      }`}
                                    >
                                      <Download size={15} />
                                    </a>
                                  </div>
                                )
                              )}
                              </div>

                              {/* Hover actions menu below the bubble card */}
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 mt-1.5 z-10">
                                <button
                                  onClick={() => setReplyingTo(msg)}
                                  className="p-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-400 hover:text-primary shadow-sm transition-all hover:scale-105"
                                  title="Reply"
                                >
                                  <Reply size={12} />
                                </button>
                                <button
                                  onClick={() => { setMessageToForward(msg); setIsForwardDialogOpen(true); }}
                                  className="p-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-400 hover:text-primary shadow-sm transition-all hover:scale-105"
                                  title="Forward"
                                >
                                  <ArrowRight size={12} />
                                </button>
                                {isCurrentUser && (
                                  <>
                                    <button
                                      onClick={() => { setEditingMessageId(msg.id); setEditContent(msg.content); }}
                                      className="p-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-400 hover:text-primary shadow-sm transition-all hover:scale-105"
                                      title="Edit"
                                    >
                                      <Pencil size={12} />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteMessage(msg.id)}
                                      className="p-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-400 hover:text-red-500 shadow-sm transition-all hover:scale-105"
                                      title="Delete"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </>
                                )}
                              </div>


                            {/* Read receipt text details */}
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {isCurrentUser && (
                                <div className="text-[10px] text-slate-400 flex items-center gap-1" title={readCount > 0 ? `Read by: ${readNames}` : 'Sent'}>
                                  {readCount > 0 ? (
                                    <>
                                      <CheckCheck className="text-primary" size={13} />
                                      <span>Read by {readCount} {readCount === 1 ? 'member' : 'members'}</span>
                                    </>
                                  ) : (
                                    <>
                                      <Check size={13} />
                                      <span>Delivered</span>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>

                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                      <MessageSquare className="h-12 w-12 text-slate-300 stroke-[1.25] mb-2" />
                      <p className="text-xs">No messages yet. Send a message to start the conversation!</p>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input Bottom Bar */}
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-[#181818] shrink-0 relative z-30">
                  <form onSubmit={handleSendMessage} className="space-y-3 relative">
                    {/* Replying quote preview */}
                    {replyingTo && (
                      <div className="flex items-center justify-between bg-slate-50 dark:bg-[#1f1f1f] rounded-2xl px-4 py-2 text-xs border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2 min-w-0">
                          <Reply size={14} className="text-primary shrink-0" />
                          <span className="text-slate-400 font-medium">Replying to</span>
                          <span className="font-bold text-slate-700 dark:text-slate-300">@{replyingTo.sender?.name || 'User'}:</span>
                          <span className="text-slate-500 dark:text-slate-400 truncate max-w-md italic">"{replyingTo.content || replyingTo.fileName}"</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setReplyingTo(null)}
                          className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
                        >
                          <X size={15} />
                        </button>
                      </div>
                    )}

                    {/* Attachment preview */}
                    {attachedFile && (
                      <div className="flex items-center justify-between bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/40 rounded-2xl px-4 py-2.5 text-xs text-indigo-800 dark:text-indigo-400">
                        <div className="flex items-center gap-2 min-w-0">
                          {getFileIcon(attachedFile.name)}
                          <div className="min-w-0">
                            <span className="font-bold truncate max-w-sm block">{attachedFile.name}</span>
                            <span className="text-[10px] text-indigo-600/80 dark:text-indigo-400/80 mt-0.5 block">{formatFileSize(attachedFile.size)}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAttachedFile(null)}
                          className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-200 p-1 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-900/30"
                        >
                          <X size={15} />
                        </button>
                      </div>
                    )}

                    {/* Mention Suggestions Overlay */}
                    {showMentionSuggestions && (
                      <div className="absolute bottom-full mb-3 left-0 w-80 bg-white dark:bg-[#1f1f23] border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden z-[100] animate-fade-in text-left">
                        <div className="max-h-64 overflow-y-auto py-2 custom-scrollbar">
                          {mentionMode === 'members' && (
                            <div>
                              <div className="px-3 py-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Group & Org Members (@)</div>
                              {users
                                .filter(u => u.name.toLowerCase().includes(mentionQuery) || u.email.toLowerCase().includes(mentionQuery))
                                .map((u, idx) => {
                                  const isHighlighted = idx === mentionHighlightedIndex;
                                  return (
                                    <div
                                      key={u.id}
                                      className={`px-4 py-2 cursor-pointer flex items-center justify-between transition-colors ${
                                        isHighlighted ? 'bg-slate-100 dark:bg-white/10 font-bold' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                      }`}
                                      onClick={() => insertGroupMention(u.name, '@')}
                                    >
                                      <div>
                                        <p className="text-xs font-semibold text-slate-900 dark:text-white">@{u.name}</p>
                                        <p className="text-[10px] text-slate-400">{u.email}</p>
                                      </div>
                                      <span className="text-[9px] font-bold uppercase text-slate-400">{u.role}</span>
                                    </div>
                                  );
                                })}
                            </div>
                          )}

                          {mentionMode === 'projects' && (
                            <div>
                              <div className="px-3 py-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                {getContextualProjects().length < projects.length ? 'User Projects (@@)' : 'All Projects (@@)'}
                              </div>
                              {getContextualProjects()
                                .filter(p => p.name.toLowerCase().includes(mentionQuery))
                                .map((p, idx) => {
                                  const isHighlighted = idx === mentionHighlightedIndex;
                                  return (
                                    <div
                                      key={p.id}
                                      className={`px-4 py-2 cursor-pointer flex items-center justify-between transition-colors ${
                                        isHighlighted ? 'bg-slate-100 dark:bg-white/10 font-bold' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                      }`}
                                      onClick={() => insertGroupMention(p.name, '@@')}
                                    >
                                      <p className="text-xs font-semibold text-slate-900 dark:text-white">@@{p.name}</p>
                                      <span className="text-[9px] font-bold uppercase text-primary">{p.priority}</span>
                                    </div>
                                  );
                                })}
                            </div>
                          )}

                          {mentionMode === 'tasks' && (
                            <div>
                              <div className="px-3 py-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                {getContextualTasks().length < allTasks.length ? 'Project Tasks (#)' : 'All Tasks (#)'}
                              </div>
                              {getContextualTasks()
                                .filter(t => t.title.toLowerCase().includes(mentionQuery))
                                .map((t, idx) => {
                                  const isHighlighted = idx === mentionHighlightedIndex;
                                  return (
                                    <div
                                      key={t.id}
                                      className={`px-4 py-2 cursor-pointer flex items-center justify-between transition-colors ${
                                        isHighlighted ? 'bg-slate-100 dark:bg-white/10 font-bold' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                      }`}
                                      onClick={() => insertGroupMention(t.title, '#')}
                                    >
                                      <p className="text-xs font-semibold text-slate-900 dark:text-white truncate max-w-[180px]">#{t.title}</p>
                                      {t.status?.name && (
                                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">{t.status.name}</span>
                                      )}
                                    </div>
                                  );
                                })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Chat field, attachments, send (Exact Mockup Layout) */}
                    <div className="flex items-center gap-2.5">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        disabled={uploading || isPendingInvitation}
                        onClick={triggerFileUpload}
                        className="w-9 h-9 rounded-full border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
                        title="Add attachment"
                      >
                        {uploading ? (
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        ) : (
                          <Plus size={18} />
                        )}
                      </button>

                      {isRecording ? (
                        <div className="flex-1 flex items-center justify-between gap-3 bg-red-500/10 border border-red-500/30 rounded-full px-4 py-1.5 animate-pulse">
                          <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-bold text-xs">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping shrink-0" />
                            <span>Recording Voice Note ({formatRecordingTime(recordingSeconds)})</span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={cancelVoiceRecording}
                              className="h-7 px-2 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white"
                            >
                              <X size={14} className="mr-1" /> Cancel
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              onClick={stopAndSendVoiceNote}
                              className="h-7 px-3 text-xs bg-red-600 hover:bg-red-700 text-white font-bold rounded-full shadow-2xs"
                            >
                              <Check size={14} className="mr-1" /> Send Voice
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-800 bg-[#fbfaf7] dark:bg-slate-900/50 px-4 py-1.5 focus-within:ring-2 focus-within:ring-primary/40 transition-all">
                          <Input
                            placeholder={isPendingInvitation ? "Waiting for acceptance request to be approved..." : "Write a message... @ (members), @@ (projects), # (tasks)"}
                            value={messageContent}
                            onChange={handleMessageInputChange}
                            onKeyDown={handleComposerKeyDown}
                            disabled={isPendingInvitation}
                            className="w-full bg-transparent border-none shadow-none focus-visible:ring-0 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 p-0 h-7"
                          />

                          {/* Inline Action Icons Inside Composer Input */}
                          <div className="flex items-center gap-1 text-slate-400 shrink-0">
                            <button
                              type="button"
                              onClick={startVoiceRecording}
                              disabled={isPendingInvitation}
                              className="hover:text-primary transition-colors p-1"
                              title="Record Voice Note"
                            >
                              <Mic size={17} />
                            </button>
                            <button
                              type="button"
                              onClick={triggerFileUpload}
                              disabled={isPendingInvitation}
                              className="hover:text-slate-700 dark:hover:text-white transition-colors p-1"
                              title="Attach File"
                            >
                              <Paperclip size={16} />
                            </button>
                          </div>
                        </div>
                      )}

                      <Button
                        type="submit"
                        disabled={isSending || isPendingInvitation || (!messageContent.trim() && !attachedFile)}
                        className="h-9 w-9 rounded-full shrink-0 shadow-sm flex items-center justify-center p-0 bg-primary hover:bg-primary/90 text-white"
                      >
                        {isSending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send size={15} />
                        )}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Right panel: Member List */}
              <div className="w-64 border-l border-slate-100 dark:border-slate-800 bg-white dark:bg-[#181818] shrink-0 h-full overflow-y-auto p-5 space-y-5 hidden xl:block custom-scrollbar">
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white uppercase tracking-wider mb-3">Group Members</h3>
                  <div className="space-y-3">
                    {/* Owner first */}
                    {activeGroup.members.map((member: any) => {
                      const isUserOwner = member.userId === activeGroup.ownerId;
                      return (
                        <div key={member.id} className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 shrink-0">
                            <AvatarImage src={`https://api.dicebear.com/7.x/notionists/svg?seed=${member.user?.name || 'member'}`} />
                            <AvatarFallback className="bg-slate-100 text-slate-700 text-xs font-bold">
                              {(member.user?.name || '??').substring(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="font-bold text-xs truncate text-slate-900 dark:text-white flex items-center gap-1">
                              {member.user?.name || 'User'}
                              {member.userId === currentUser.id && <span className="text-[9px] text-primary font-medium">(you)</span>}
                            </div>
                            <div className="text-[10px] text-slate-400 capitalize flex items-center gap-1 mt-0.5">
                              {isUserOwner ? (
                                <span className="bg-primary/10 text-primary px-1 rounded font-bold">Owner</span>
                              ) : (
                                <span>Member</span>
                              )}
                              <span>•</span>
                              <span>{member.user?.role || 'MEMBER'}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                  <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                    <Calendar size={13} />
                    <span>Created: {new Date(activeGroup.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 bg-slate-50/20 dark:bg-[#131313]">
              <MessageSquare className="h-16 w-16 mb-4 text-slate-300 stroke-[1.25]" />
              <p className="text-sm font-medium">Select a chat group from the list, or create a new one to start messaging</p>
            </div>
          )
        )}
      </div>

      {/* CREATE GROUP MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#1f1f1f] rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 shrink-0 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">Create New Chat Group</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Collaborate in real-time with team members and clients.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg p-1"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreateGroup} className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 custom-scrollbar">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Group Name</label>
                <Input
                  placeholder="e.g. Design & Copy sync"
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                  required
                  autoFocus
                  className="bg-slate-50/50 dark:bg-[#1a1a1a] border-slate-100 dark:border-slate-800 rounded-2xl h-10 text-sm focus-visible:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 font-sans">Description (Optional)</label>
                <Input
                  placeholder="e.g. Syncing assets and designs for the project"
                  value={newGroupDesc}
                  onChange={e => setNewGroupDesc(e.target.value)}
                  className="bg-slate-50/50 dark:bg-[#1a1a1a] border-slate-100 dark:border-slate-800 rounded-2xl h-10 text-sm focus-visible:ring-primary"
                />
              </div>

              <div className="space-y-2 flex flex-col flex-1 min-h-[220px]">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Select Members</label>
                <div className="relative shrink-0 mb-2">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    placeholder="Search users to add..."
                    value={userSearchQuery}
                    onChange={e => setUserSearchQuery(e.target.value)}
                    className="pl-9 bg-slate-50/50 dark:bg-[#1a1a1a] border-slate-100 dark:border-slate-800 h-9 text-xs rounded-xl focus-visible:ring-primary"
                  />
                </div>

                <div className="flex-1 overflow-y-auto border border-slate-100 dark:border-slate-800 rounded-2xl p-2 bg-slate-50/30 dark:bg-[#151515] space-y-1.5 max-h-[200px] custom-scrollbar">
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map(user => {
                      const isSelected = selectedMembers.includes(user.id);
                      return (
                        <button
                          type="button"
                          key={user.id}
                          onClick={() => toggleMemberSelection(user.id)}
                          className={`w-full flex items-center justify-between p-2 rounded-xl transition-all ${
                            isSelected
                              ? 'bg-primary/10 border-primary/20 text-primary'
                              : 'hover:bg-slate-100/50 dark:hover:bg-slate-800/30 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 text-left min-w-0">
                            <Avatar className="h-7 w-7">
                              <AvatarImage src={`https://api.dicebear.com/7.x/notionists/svg?seed=${user.name}`} />
                              <AvatarFallback className="bg-slate-200 text-slate-700 text-[10px] font-bold">
                                {user.name.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="font-bold text-xs truncate">{user.name}</div>
                              <div className="text-[9px] text-slate-400 truncate">{user.email}</div>
                            </div>
                          </div>
                          <div className={`h-4.5 w-4.5 rounded-md border flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'bg-primary border-primary text-white'
                              : 'border-slate-300 dark:border-slate-700'
                          }`}>
                            {isSelected && <Check size={12} strokeWidth={3} />}
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="text-center py-8 text-xs text-slate-400">No users found.</div>
                  )}
                </div>
              </div>

              <div className="mt-4 flex justify-end gap-2.5 shrink-0">
                <Button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-5 py-2 h-10 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 bg-transparent"
                  disabled={isCreatingGroup}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isCreatingGroup || !newGroupName.trim()}
                  className="px-6 py-2 h-10 rounded-2xl bg-primary hover:bg-primary/95 text-white font-bold transition-all shadow-sm disabled:opacity-50"
                >
                  {isCreatingGroup ? 'Creating...' : 'Create Group'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANAGE GROUP / SETTINGS MODAL */}
      {isSettingsModalOpen && activeGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#1f1f1f] rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 shrink-0 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">Manage Group members</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Add or remove users from "{activeGroup.name}".</p>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg p-1"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 custom-scrollbar">
              <div className="space-y-2 flex flex-col flex-1 min-h-[250px]">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Group Members</label>
                <div className="relative shrink-0 mb-2">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    placeholder="Filter users..."
                    value={userSearchQuery}
                    onChange={e => setUserSearchQuery(e.target.value)}
                    className="pl-9 bg-slate-50/50 dark:bg-[#1a1a1a] border-slate-100 dark:border-slate-800 h-9 text-xs rounded-xl focus-visible:ring-primary"
                  />
                </div>

                <div className="flex-1 overflow-y-auto border border-slate-100 dark:border-slate-800 rounded-2xl p-2 bg-slate-50/30 dark:bg-[#151515] space-y-1.5 max-h-[220px] custom-scrollbar">
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map(user => {
                      const isSelected = settingsMembers.includes(user.id);
                      return (
                        <button
                          type="button"
                          key={user.id}
                          onClick={() => {
                            setSettingsMembers(prev =>
                              prev.includes(user.id) ? prev.filter(id => id !== user.id) : [...prev, user.id]
                            );
                          }}
                          className={`w-full flex items-center justify-between p-2 rounded-xl transition-all ${
                            isSelected
                              ? 'bg-primary/10 border-primary/20 text-primary'
                              : 'hover:bg-slate-100/50 dark:hover:bg-slate-800/30 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 text-left min-w-0">
                            <Avatar className="h-7 w-7">
                              <AvatarImage src={`https://api.dicebear.com/7.x/notionists/svg?seed=${user.name}`} />
                              <AvatarFallback className="bg-slate-200 text-slate-700 text-[10px] font-bold">
                                {user.name.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="font-bold text-xs truncate">{user.name}</div>
                              <div className="text-[9px] text-slate-400 truncate">{user.email}</div>
                            </div>
                          </div>
                          <div className={`h-4.5 w-4.5 rounded-md border flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'bg-primary border-primary text-white'
                              : 'border-slate-300 dark:border-slate-700'
                          }`}>
                            {isSelected && <Check size={12} strokeWidth={3} />}
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="text-center py-8 text-xs text-slate-400">No users found.</div>
                  )}
                </div>
              </div>

              {/* Owner Action: Delete */}
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-red-50/50 dark:bg-red-950/5 p-4 rounded-2xl border border-red-100/50 dark:border-red-900/10">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <AlertCircle className="text-red-500 h-5 w-5 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-xs text-red-700 dark:text-red-400">Danger Zone</h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Delete this chat group, deleting all message history and files for everyone.</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDeleteGroup}
                  disabled={isDeletingGroup || isUpdatingMembers}
                  className="bg-red-600 hover:bg-red-700 text-white rounded-xl h-9 text-xs font-bold transition-all px-4"
                >
                  {isDeletingGroup ? 'Deleting...' : 'Delete Group'}
                </Button>
              </div>

              <div className="mt-4 flex justify-end gap-2.5 shrink-0">
                <Button
                  type="button"
                  onClick={() => setIsSettingsModalOpen(false)}
                  className="px-5 py-2 h-10 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 bg-transparent"
                  disabled={isUpdatingMembers || isDeletingGroup}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleUpdateMembers}
                  disabled={isUpdatingMembers || isDeletingGroup}
                  className="px-6 py-2 h-10 rounded-2xl bg-primary hover:bg-primary/95 text-white font-bold transition-all shadow-sm"
                >
                  {isUpdatingMembers ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DIRECT CHAT MODAL */}
      {isDirectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#1f1f1f] rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 shrink-0 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">Start Direct Chat</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Send a connection invitation to start a 1-on-1 private chat.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsDirectModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg p-1"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 custom-scrollbar">
              <div className="space-y-2 flex flex-col flex-1 min-h-[220px]">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Select User</label>
                <div className="relative shrink-0 mb-2">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    placeholder="Search users by name or email..."
                    value={directUserSearchQuery}
                    onChange={e => setDirectUserSearchQuery(e.target.value)}
                    className="pl-9 bg-slate-50/50 dark:bg-[#1a1a1a] border-slate-100 dark:border-slate-800 h-9 text-xs rounded-xl focus-visible:ring-primary"
                  />
                </div>

                <div className="flex-1 overflow-y-auto border border-slate-100 dark:border-slate-800 rounded-2xl p-2 bg-slate-50/30 dark:bg-[#151515] space-y-1.5 max-h-[250px] custom-scrollbar">
                  {filteredDirectUsers.length > 0 ? (
                    filteredDirectUsers.map(user => {
                      return (
                        <div
                          key={user.id}
                          className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-100/50 dark:hover:bg-slate-800/30 text-slate-700 dark:text-slate-300 border border-transparent"
                        >
                          <div className="flex items-center gap-2.5 text-left min-w-0">
                            <Avatar className="h-7 w-7">
                              <AvatarImage src={`https://api.dicebear.com/7.x/notionists/svg?seed=${user.name}`} />
                              <AvatarFallback className="bg-slate-200 text-slate-700 text-[10px] font-bold">
                                {user.name.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="font-bold text-xs truncate">{user.name}</div>
                              <div className="text-[9px] text-slate-400 truncate">{user.email}</div>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            disabled={isCreatingDirect}
                            onClick={() => handleStartDirectChat(user)}
                            className="bg-primary hover:bg-primary/95 text-white h-7 text-[11px] px-3 rounded-lg"
                          >
                            Invite
                          </Button>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8 text-xs text-slate-400">No users found.</div>
                  )}
                </div>
              </div>

              <div className="mt-4 flex justify-end gap-2.5 shrink-0">
                <Button
                  type="button"
                  onClick={() => setIsDirectModalOpen(false)}
                  className="px-5 py-2 h-10 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 bg-transparent"
                  disabled={isCreatingDirect}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FORWARD MESSAGE DIALOG */}
      {isForwardDialogOpen && messageToForward && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#1f1f1f] rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 shrink-0 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">Forward Message</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Select a project or team chat to forward this message.</p>
              </div>
              <button
                type="button"
                onClick={() => { setIsForwardDialogOpen(false); setMessageToForward(null); }}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg p-1"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search projects or chat groups..."
                  value={forwardSearchQuery}
                  onChange={e => setForwardSearchQuery(e.target.value)}
                  className="pl-9 bg-slate-50/50 dark:bg-[#1a1a1a] border-slate-100 dark:border-slate-800 h-9 rounded-xl text-xs focus-visible:ring-primary"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {/* Groups Section */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">Teams Chat Groups</h3>
                <div className="space-y-1">
                  {groups
                    .filter(g => g.name.toLowerCase().includes(forwardSearchQuery.toLowerCase()))
                    .map(group => (
                      <div key={group.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                            {group.name.substring(0, 2).toUpperCase()}
                          </div>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{group.name}</span>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleForwardMessage(group.id, 'group')}
                          className="bg-primary hover:bg-primary/95 text-white h-7 text-[11px] px-3 rounded-lg"
                        >
                          Forward
                        </Button>
                      </div>
                    ))}
                  {groups.filter(g => g.name.toLowerCase().includes(forwardSearchQuery.toLowerCase())).length === 0 && (
                    <p className="text-xs text-slate-400 italic p-2">No matching chat groups</p>
                  )}
                </div>
              </div>

              {/* Projects Section */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">Projects</h3>
                <div className="space-y-1">
                  {projects
                    .filter(p => p.name.toLowerCase().includes(forwardSearchQuery.toLowerCase()))
                    .map(project => (
                      <div key={project.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center font-bold text-xs shrink-0">
                            <FolderKanban size={14} />
                          </div>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{project.name}</span>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleForwardMessage(project.id, 'project')}
                          className="bg-primary hover:bg-primary/95 text-white h-7 text-[11px] px-3 rounded-lg"
                        >
                          Forward
                        </Button>
                      </div>
                    ))}
                  {projects.filter(p => p.name.toLowerCase().includes(forwardSearchQuery.toLowerCase())).length === 0 && (
                    <p className="text-xs text-slate-400 italic p-2">No matching projects</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE MESSAGE CONFIRMATION MODAL */}
      {isDeleteMsgOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#1f1f1f] rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 w-full max-w-sm overflow-hidden p-6 flex flex-col items-center text-center gap-4">
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-full">
              <AlertCircle size={32} />
            </div>
            
            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Delete Message</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Are you sure you want to delete this message? This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center gap-2.5 w-full mt-2">
              <Button
                type="button"
                onClick={() => { setIsDeleteMsgOpen(false); setMsgIdToDelete(null); }}
                className="flex-1 py-2 h-10 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 bg-transparent font-semibold text-xs border border-slate-100 dark:border-slate-800"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={confirmDeleteMessage}
                className="flex-1 py-2 h-10 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-all shadow-sm"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* DECLINE INVITATION CONFIRMATION MODAL */}
      {isDeclineInviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#1f1f1f] rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 w-full max-w-sm overflow-hidden p-6 flex flex-col items-center text-center gap-4">
            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 rounded-full">
              <AlertCircle size={32} />
            </div>
            
            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Decline Invitation</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Are you sure you want to decline this invitation? The connection chat request will be deleted.
              </p>
            </div>

            <div className="flex items-center gap-2.5 w-full mt-2">
              <Button
                type="button"
                onClick={() => setIsDeclineInviteOpen(false)}
                className="flex-1 py-2 h-10 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 bg-transparent font-semibold text-xs border border-slate-100 dark:border-slate-800"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={confirmDeclineInvitation}
                className="flex-1 py-2 h-10 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition-all shadow-sm"
              >
                Decline
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
