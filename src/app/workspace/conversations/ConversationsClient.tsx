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
  Square,
  CheckCircle
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

  const togglePlay = async () => {
    if (!audioRef.current) return;
    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        setIsPlaying(true);
        await audioRef.current.play();
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.error('Audio playback error:', err);
      }
      setIsPlaying(false);
    }
  };

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    const dur = audioRef.current.duration;
    if (dur && isFinite(dur)) {
      setDuration(dur);
    } else if (audioRef.current) {
      audioRef.current.currentTime = 1e101;
      audioRef.current.ontimeupdate = () => {
        if (!audioRef.current) return;
        audioRef.current.ontimeupdate = null;
        if (isFinite(audioRef.current.duration)) {
          setDuration(audioRef.current.duration);
        }
        audioRef.current.currentTime = 0;
      };
    }
  };

  const formatAudioTime = (time: number) => {
    if (!time || isNaN(time) || !isFinite(time) || time <= 0) return '0:00';
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

  const validDuration = (duration && isFinite(duration)) ? duration : 0;
  const progressPercent = validDuration > 0 ? (currentTime / validDuration) : 0;
  const activeBarIndex = Math.floor(progressPercent * waveformHeights.length);

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-[20px] max-w-sm relative shadow-2xs ${
      isCurrentUser 
        ? 'bg-[#16181a] text-white' 
        : 'bg-[#e5e5ea] dark:bg-[#26262a] text-slate-900 dark:text-white'
    }`}>
      <audio
        ref={audioRef}
        src={src || undefined}
        preload="metadata"
        onTimeUpdate={() => {
          if (!audioRef.current) return;
          setCurrentTime(audioRef.current.currentTime || 0);
          if ((!duration || !isFinite(duration)) && isFinite(audioRef.current.duration)) {
            setDuration(audioRef.current.duration);
          }
        }}
        onLoadedMetadata={handleLoadedMetadata}
        onDurationChange={() => {
          if (audioRef.current && isFinite(audioRef.current.duration)) {
            setDuration(audioRef.current.duration);
          }
        }}
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
            const barHeightPx = Math.max(4, Math.round((h / 100) * 24));
            return (
              <span
                key={idx}
                className={`inline-block w-[3px] rounded-full shrink-0 transition-colors duration-150 ${
                  isPassed
                    ? (isCurrentUser ? 'bg-white' : 'bg-slate-900 dark:bg-white')
                    : (isCurrentUser ? 'bg-white/40' : 'bg-slate-400 dark:bg-white/40')
                }`}
                style={{ height: `${barHeightPx}px` }}
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

const groupMessagesCache: Record<string, any[]> = {};

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

      // Render links inside text segments
      const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
      const subParts = part.split(urlRegex);

      return (
        <React.Fragment key={index}>
          {subParts.map((sub, i) => {
            if (sub.match(/^(https?:\/\/[^\s]+|www\.[^\s]+)$/)) {
              const href = sub.startsWith('www.') ? `https://${sub}` : sub;
              return (
                <a
                  key={i}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-blue-600 dark:text-blue-400 font-semibold underline hover:text-blue-800 dark:hover:text-blue-300 break-all transition-colors cursor-pointer"
                >
                  {sub}
                </a>
              );
            }
            return sub;
          })}
        </React.Fragment>
      );
    });
  };

  const insertGroupMention = (name: string, prefix: string) => {
    const words = messageContent.trimEnd().split(/\s+/);
    words.pop();
    words.push(`${prefix}${name.replace(/\s+/g, '')} `);
    setMessageContent(words.join(' '));
    setShowMentionSuggestions(false);
  };

  // File Upload & Lightbox State
  const [uploading, setUploading] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<Array<{ url: string; name: string; size: number }>>([]);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
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
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : '';

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.start(100);
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
    const recorder = mediaRecorderRef.current;
    if (!recorder || !selectedGroupId) return;

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }

    try {
      if (recorder.state === 'recording') {
        recorder.requestData();
      }
    } catch (e) {
      console.warn('requestData error:', e);
    }

    recorder.onstop = async () => {
      recorder.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      setRecordingSeconds(0);

      if (audioChunksRef.current.length === 0) {
        toast.error('No audio recorded');
        return;
      }

      const mimeType = recorder.mimeType || 'audio/webm';
      const ext = mimeType.includes('mp4') ? 'm4a' : 'webm';
      const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
      const localAudioUrl = URL.createObjectURL(audioBlob);
      const fileName = `Voice_Note_${Date.now()}.${ext}`;

      const tempId = `temp-${Date.now()}`;
      const optimisticMsg = {
        id: tempId,
        groupId: selectedGroupId,
        content: '🎙️ Voice Note',
        fileUrl: localAudioUrl,
        fileName,
        senderId: currentUser.id,
        sender: { name: currentUser.name || 'You', role: currentUser.role },
        createdAt: new Date().toISOString(),
        parentMessageId: replyingTo?.id || null,
        status: 'sending'
      };

      // 1. Instantly display voice note bubble in chat (0ms delay) with loader spinner!
      setMessages(prev => {
        const updated = [...prev, optimisticMsg];
        if (selectedGroupId) groupMessagesCache[selectedGroupId] = updated;
        return updated;
      });
      scrollToBottom();

      // 2. Upload file & send message in background
      try {
        const file = new File([audioBlob], fileName, { type: mimeType });
        const formData = new FormData();
        formData.append('file', file);

        const uploadRes = await fetch('/api/conversations/upload', {
          method: 'POST',
          body: formData
        });

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          const serverUrl = uploadData.url;

          const msgRes = await fetch(`/api/conversations/groups/${selectedGroupId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: '🎙️ Voice Note',
              parentMessageId: replyingTo?.id || null,
              fileUrl: serverUrl,
              fileName,
              fileSize: uploadData.size
            })
          });

          if (msgRes.ok) {
            fetchGroupMessages(selectedGroupId);
          } else {
            setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'failed' } : m));
          }
        } else {
          setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'failed' } : m));
          toast.error('Failed to upload voice note');
        }
      } catch (err) {
        console.error('Voice note error:', err);
        setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'failed' } : m));
        toast.error('Error sending voice note');
      }
    };

    recorder.stop();
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
  const [isMemberDropdownOpen, setIsMemberDropdownOpen] = useState(false);

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
      if (groupMessagesCache[selectedGroupId] && groupMessagesCache[selectedGroupId].length > 0) {
        setMessages(groupMessagesCache[selectedGroupId]);
        setMessagesLoading(false);
      } else {
        setMessagesLoading(true);
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

  // Multiple File Upload Handler
  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    const newAttachedFiles: Array<{ url: string; name: string; size: number }> = [];

    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);
      try {
        const res = await fetch('/api/conversations/upload', {
          method: 'POST',
          body: formData
        });
        if (res.ok) {
          const data = await res.json();
          newAttachedFiles.push({ url: data.url, name: data.name, size: data.size });
        }
      } catch (err) {
        console.error('File upload error:', err);
      }
    }

    if (newAttachedFiles.length > 0) {
      setAttachedFiles(prev => [...prev, ...newAttachedFiles]);
      toast.success(`${newAttachedFiles.length} file(s) attached`);
    } else {
      toast.error('Failed to upload files');
    }

    setUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Clipboard Paste Handler (Ctrl+V / Cmd+V Screenshot & Image Paste)
  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData?.items || []);
    const imageItems = items.filter(item => item.type.startsWith('image/'));

    if (imageItems.length === 0) return;

    setUploading(true);
    const pastedFiles: Array<{ url: string; name: string; size: number }> = [];

    for (const item of imageItems) {
      const file = item.getAsFile();
      if (!file) continue;

      const fileName = `Screenshot_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.png`;
      const screenshotFile = new File([file], fileName, { type: file.type || 'image/png' });

      const formData = new FormData();
      formData.append('file', screenshotFile);

      try {
        const res = await fetch('/api/conversations/upload', {
          method: 'POST',
          body: formData
        });
        if (res.ok) {
          const data = await res.json();
          pastedFiles.push({ url: data.url, name: data.name, size: data.size });
        }
      } catch (err) {
        console.error('Pasted image upload error:', err);
      }
    }

    if (pastedFiles.length > 0) {
      setAttachedFiles(prev => [...prev, ...pastedFiles]);
      toast.success(`Pasted screenshot attached (${pastedFiles.length})`);
    }

    setUploading(false);
  };

  // Send Message Handler
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageContent.trim() && attachedFiles.length === 0) return;
    if (!selectedGroupId) return;

    const currentContent = messageContent;
    const currentFiles = [...attachedFiles];
    const currentReply = replyingTo;

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg = {
      id: tempId,
      groupId: selectedGroupId,
      content: currentContent,
      fileUrl: currentFiles[0]?.url || null,
      fileName: currentFiles[0]?.name || null,
      fileSize: currentFiles[0]?.size || null,
      senderId: currentUser.id,
      sender: { name: currentUser.name || 'You', role: currentUser.role },
      createdAt: new Date().toISOString(),
      parentMessageId: currentReply?.id || null,
      parentMessage: currentReply ? {
        id: currentReply.id,
        content: currentReply.content,
        sender: { name: currentReply.sender?.name || 'User' }
      } : null,
      status: 'sending'
    };

    setIsSending(true);
    setMessages(prev => {
      const updated = [...prev, optimisticMsg];
      if (selectedGroupId) groupMessagesCache[selectedGroupId] = updated;
      return updated;
    });
    setMessageContent('');
    setReplyingTo(null);
    setAttachedFiles([]);
    scrollToBottom();

    try {
      if (currentFiles.length > 0) {
        for (let i = 0; i < currentFiles.length; i++) {
          const file = currentFiles[i];
          await fetch(`/api/conversations/groups/${selectedGroupId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: i === 0 ? currentContent : '',
              parentMessageId: i === 0 ? (currentReply?.id || null) : null,
              fileUrl: file.url,
              fileName: file.name,
              fileSize: file.size
            })
          });
        }
      } else {
        await fetch(`/api/conversations/groups/${selectedGroupId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: currentContent,
            parentMessageId: currentReply?.id || null,
            fileUrl: null,
            fileName: null,
            fileSize: null
          })
        });
      }
      fetchGroupMessages(selectedGroupId);
    } catch (err) {
      toast.error('An error occurred while sending');
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'failed' } : m));
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
    const targetId = msgIdToDelete;

    // 1. Instantly close modal and mark message as deleted in view & cache (0ms delay)
    setIsDeleteMsgOpen(false);
    setMsgIdToDelete(null);

    setMessages(prev => {
      const updated = prev.map(m => m.id === targetId ? { ...m, deletedAt: new Date().toISOString() } : m);
      if (selectedGroupId) groupMessagesCache[selectedGroupId] = updated;
      return updated;
    });

    // 2. API executes in background
    try {
      const res = await fetch(`/api/conversations/groups/${selectedGroupId}/messages/${targetId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        toast.success('Message deleted');
      } else {
        toast.error('Failed to delete message');
      }
    } catch (err) {
      toast.error('An error occurred');
      console.error(err);
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
      const res = await fetch(`/api/conversations/groups/${selectedGroupId}`, {
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
            <div className="flex-1 flex h-full overflow-hidden bg-slate-50/10 dark:bg-transparent">
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                <ProjectConversation
                  groupId={selectedGroupId}
                  groupName={activeChatName}
                  groupDesc={activeGroup?.description}
                  isDirect={activeGroup?.isDirect}
                  currentUser={{
                    ...currentUser,
                    userId: currentUser.id
                  }}
                  organizationId={currentUser.organizationId}
                  isClient={currentUser.role === 'CLIENT'}
                />
              </div>

              {/* Group Members Right Sidebar */}
              {!activeGroup?.isDirect && (
                <div className="w-[280px] shrink-0 h-full border-l border-slate-200/60 dark:border-white/10 bg-[#fafafa] dark:bg-[#131316] flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
                  {/* Header */}
                  <div className="px-4 py-3.5 border-b border-slate-200/60 dark:border-white/10 flex items-center justify-between shrink-0 min-h-[48px] bg-white/60 dark:bg-white/5">
                    <div className="flex items-center gap-2">
                      <UsersIcon size={16} className="text-slate-500" />
                      <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Group Members
                      </h3>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-200">
                        {activeGroup.members?.length || 0}
                      </span>
                    </div>
                  </div>

                  {/* Group Info Box */}
                  <div className="p-4 border-b border-slate-200/60 dark:border-white/10 bg-white dark:bg-[#18181c]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-200 flex items-center justify-center font-extrabold text-sm shrink-0">
                        {activeGroup.name?.substring(0, 2).toUpperCase() || 'GR'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {activeGroup.name}
                        </h4>
                        <p className="text-[11px] text-slate-400 font-medium">
                          Team Group Chat
                        </p>
                      </div>
                    </div>
                    {activeGroup.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-2.5 pt-2 border-t border-slate-100 dark:border-white/5 line-clamp-3">
                        {activeGroup.description}
                      </p>
                    )}
                  </div>

                  {/* Members List */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
                    <div className="px-2 pb-2 text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Members List
                    </div>

                    {activeGroup.members?.map((m: any) => {
                      const isGroupOwner = m.userId === activeGroup.ownerId;
                      const isMe = m.userId === currentUser.id;
                      return (
                        <div
                          key={m.id || m.userId}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-200/60 dark:hover:bg-white/5 transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="relative shrink-0">
                              <Avatar className="w-7 h-7 rounded-lg border border-slate-200/60 dark:border-white/10">
                                <AvatarFallback className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-bold rounded-lg">
                                  {m.user?.name ? m.user.name.substring(0, 2).toUpperCase() : 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-1 ring-white dark:ring-[#131316]" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1">
                                <span className="text-[12px] font-semibold text-slate-900 dark:text-white truncate">
                                  {m.user?.name || 'User'}
                                </span>
                                {isMe && (
                                  <span className="text-[9px] font-bold text-slate-400">
                                    (You)
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400 block truncate">
                                {m.user?.email}
                              </span>
                            </div>
                          </div>

                          {isGroupOwner ? (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 shrink-0">
                              Owner
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-medium shrink-0">
                              Member
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Actions Footer */}
                  {isOwner && (
                    <div className="p-3 border-t border-slate-200/60 dark:border-white/10 bg-white/50 dark:bg-white/5 flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setSettingsMembers(activeGroup.members?.map((m: any) => m.userId) || []);
                          setIsSettingsModalOpen(true);
                        }}
                        className="flex-1 px-3 py-2 rounded-[8px] text-xs font-bold bg-slate-200/80 dark:bg-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-white/20 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Pencil size={13} />
                        <span>Edit Group</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleDeleteGroup}
                        className="px-3 py-2 rounded-[8px] text-xs font-bold bg-red-500/10 text-red-600 hover:bg-red-500/20 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        title="Delete Group"
                      >
                        <Trash2 size={13} />
                        <span>Delete</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 bg-slate-50/20 dark:bg-[#131313]">
              <UsersIcon className="h-16 w-16 mb-4 text-slate-300 stroke-[1.25]" />
              <p className="text-sm font-medium">Select a team group or direct chat from the list to start messaging</p>
            </div>
          )
        )}
      </div>

      {/* CREATE GROUP MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#1f1f23] rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] relative z-50">
            {/* Fixed Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 shrink-0 flex items-center justify-between z-20 bg-white dark:bg-[#1f1f23]">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">Create Team Group</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-normal">Start a group chat and add members.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg p-1 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Scrollable Form Body */}
            <form onSubmit={handleCreateGroup} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 custom-scrollbar relative z-10">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">GROUP NAME</label>
                  <Input
                    placeholder="e.g. Design & Copy sync"
                    value={newGroupName}
                    onChange={e => setNewGroupName(e.target.value)}
                    required
                    autoFocus
                    className="bg-slate-50/60 dark:bg-[#1a1a1a] border-slate-200/80 dark:border-slate-800 rounded-2xl h-10 text-sm focus-visible:ring-primary font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">DESCRIPTION (OPTIONAL)</label>
                  <Input
                    placeholder="e.g. Syncing design files and updates"
                    value={newGroupDesc}
                    onChange={e => setNewGroupDesc(e.target.value)}
                    className="bg-slate-50/60 dark:bg-[#1a1a1a] border-slate-200/80 dark:border-slate-800 rounded-2xl h-10 text-sm focus-visible:ring-primary font-medium"
                  />
                </div>

                <div className="space-y-2 flex flex-col relative z-30">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">ADD MEMBERS</label>
                    <span className="text-xs text-slate-400 font-semibold">{selectedMembers.length} selected</span>
                  </div>
                  
                  <div className="relative">
                    <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 z-10" />
                    <Input
                      placeholder="Search members..."
                      value={userSearchQuery}
                      onFocus={() => setIsMemberDropdownOpen(true)}
                      onChange={e => {
                        setUserSearchQuery(e.target.value);
                        setIsMemberDropdownOpen(true);
                      }}
                      className="pl-10 bg-slate-50/60 dark:bg-[#1a1a1a] border-slate-200/80 dark:border-slate-800 h-10 text-xs rounded-xl focus-visible:ring-primary font-medium"
                    />

                    {/* Floating Overlay Dropdown */}
                    {isMemberDropdownOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setIsMemberDropdownOpen(false)}
                        />
                        
                        <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-white dark:bg-[#1f1f25] border border-slate-200 dark:border-slate-700 rounded-2xl p-2.5 shadow-2xl max-h-52 overflow-y-auto custom-scrollbar space-y-1.5 backdrop-blur-md">
                          {filteredUsers.length > 0 ? (
                            filteredUsers.map(user => {
                              const isSelected = selectedMembers.includes(user.id);
                              return (
                                <div
                                  key={user.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleMemberSelection(user.id);
                                  }}
                                  className={`w-full flex items-center justify-between p-2.5 rounded-[8px] transition-all cursor-pointer ${
                                    isSelected
                                      ? 'bg-slate-200/70 dark:bg-slate-800/80 text-slate-900 dark:text-white font-semibold'
                                      : 'bg-slate-50/50 dark:bg-slate-800/30 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                                  }`}
                                >
                                  <div className="flex items-center gap-3 text-left min-w-0">
                                    <Avatar className="h-7 w-7 shrink-0">
                                      <AvatarImage src={`https://api.dicebear.com/7.x/notionists/svg?seed=${user.name}`} />
                                      <AvatarFallback className="bg-slate-300 text-slate-800 text-xs font-bold">
                                        {user.name.substring(0, 2).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0">
                                      <div className="font-bold text-xs text-slate-900 dark:text-white truncate">{user.name}</div>
                                      <div className="text-[10px] text-slate-400 truncate">{user.email}</div>
                                    </div>
                                  </div>
                                  <div className="shrink-0 ml-2">
                                    {isSelected ? (
                                      <CheckCircle size={18} className="text-slate-900 dark:text-white fill-slate-900 dark:fill-white stroke-white dark:stroke-slate-900" />
                                    ) : (
                                      <div className="w-4.5 h-4.5 rounded-full border-2 border-slate-300 dark:border-slate-600" />
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="text-center py-6 text-xs text-slate-400 italic">No members found.</div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Fixed Footer */}
              <div className="p-6 border-t border-slate-100 dark:border-slate-800 shrink-0 flex items-center justify-end gap-3 bg-white dark:bg-[#1f1f23] z-30 relative shadow-sm">
                <Button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-6 py-2.5 h-10 rounded-full border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 bg-transparent font-semibold text-xs transition-all"
                  disabled={isCreatingGroup}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isCreatingGroup || !newGroupName.trim()}
                  className="px-6 py-2.5 h-10 rounded-full bg-[#16181a] dark:bg-white text-white dark:text-slate-900 font-bold text-xs hover:opacity-90 transition-all shadow-sm disabled:opacity-50"
                >
                  {isCreatingGroup ? 'Creating...' : '+ Create Group'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANAGE GROUP MEMBERS MODAL */}
      {isSettingsModalOpen && activeGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#1f1f23] rounded-[8px] shadow-xl border border-slate-100 dark:border-slate-800 w-full max-w-md overflow-hidden flex flex-col max-h-[85vh] relative z-50">
            {/* Fixed Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 shrink-0 flex items-center justify-between z-20 bg-white dark:bg-[#1f1f23]">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">Manage Group members</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-normal">
                  Add or remove users from "{activeGroup.name}".
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-[8px] p-1 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4 custom-scrollbar">
              <div className="space-y-2 flex flex-col flex-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">GROUP MEMBERS</label>
                
                {/* Search Bar */}
                <div className="relative shrink-0 mb-1">
                  <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Filter users..."
                    value={userSearchQuery}
                    onChange={e => setUserSearchQuery(e.target.value)}
                    className="pl-10 bg-slate-50/60 dark:bg-[#1a1a1a] border-slate-200/80 dark:border-slate-800 h-10 text-xs rounded-xl focus-visible:ring-primary font-medium"
                  />
                </div>

                {/* Scrollable Member List Container */}
                <div className="border border-slate-200/60 dark:border-slate-800 rounded-2xl p-2 bg-slate-50/30 dark:bg-[#151515] space-y-2 max-h-[220px] overflow-y-auto custom-scrollbar">
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map(user => {
                      const isSelected = settingsMembers.includes(user.id);
                      return (
                        <div
                          key={user.id}
                          onClick={() => {
                            setSettingsMembers(prev =>
                              prev.includes(user.id) ? prev.filter(id => id !== user.id) : [...prev, user.id]
                            );
                          }}
                          className={`w-full flex items-center justify-between p-3 rounded-[8px] transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-slate-200/70 dark:bg-slate-800/80 text-slate-900 dark:text-white'
                              : 'bg-slate-100/50 dark:bg-slate-800/30 hover:bg-slate-200/50 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-3 text-left min-w-0">
                            <Avatar className="h-8 w-8 shrink-0">
                              <AvatarImage src={`https://api.dicebear.com/7.x/notionists/svg?seed=${user.name}`} />
                              <AvatarFallback className="bg-slate-300 text-slate-800 text-xs font-bold">
                                {user.name.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="font-bold text-sm text-slate-900 dark:text-white truncate">{user.name}</div>
                              <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</div>
                            </div>
                          </div>
                          <div className="shrink-0 ml-2">
                            {isSelected ? (
                              <CheckCircle size={20} className="text-slate-900 dark:text-white fill-slate-900 dark:fill-white stroke-white dark:stroke-slate-900" />
                            ) : (
                              <div className="w-5 h-5 rounded-full border-2 border-slate-300 dark:border-slate-600" />
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8 text-xs text-slate-400 italic">No users found.</div>
                  )}
                </div>
              </div>

              {/* Danger Zone Box */}
              <div className="mt-1 p-4 bg-red-50/70 dark:bg-red-950/20 rounded-2xl border border-red-200/60 dark:border-red-900/30 flex items-center justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <AlertCircle className="text-red-600 dark:text-red-400 h-5 w-5 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-xs text-red-700 dark:text-red-400">Danger Zone</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-normal">
                      Delete this chat group, deleting all message history and files for everyone.
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDeleteGroup}
                  disabled={isDeletingGroup || isUpdatingMembers}
                  className="bg-red-600 hover:bg-red-700 text-white rounded-[8px] h-8 text-xs font-bold transition-all px-4 shrink-0 shadow-xs"
                >
                  {isDeletingGroup ? 'Deleting...' : 'Delete Group'}
                </Button>
              </div>
            </div>

            {/* Fixed Footer */}
            <div className="p-5 border-t border-slate-100 dark:border-slate-800 shrink-0 flex items-center justify-end gap-3 bg-white dark:bg-[#1f1f23] z-30 relative shadow-sm">
              <Button
                type="button"
                onClick={() => setIsSettingsModalOpen(false)}
                className="px-5 py-2 h-9 rounded-[8px] border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 bg-transparent font-semibold text-xs transition-all"
                disabled={isUpdatingMembers || isDeletingGroup}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleUpdateMembers}
                disabled={isUpdatingMembers || isDeletingGroup}
                className="px-5 py-2 h-9 rounded-[8px] bg-[#16181a] dark:bg-white text-white dark:text-slate-900 font-bold text-xs hover:opacity-90 transition-all shadow-sm"
              >
                {isUpdatingMembers ? 'Saving...' : 'Save Changes'}
              </Button>
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

      {/* MICROSOFT TEAMS LIGHTBOX MODAL */}
      {previewImageUrl && (
        <div
          className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setPreviewImageUrl(null)}
        >
          <div
            className="relative max-w-5xl max-h-[90vh] bg-white dark:bg-[#1f1f23] rounded-2xl overflow-hidden shadow-2xl border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewImageUrl(null)}
              className="absolute top-3 right-3 z-10 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors"
            >
              <X size={18} />
            </button>
            <img
              src={previewImageUrl}
              alt="Image preview"
              className="w-full h-full max-h-[85vh] object-contain rounded-2xl"
            />
          </div>
        </div>
      )}

    </div>
  );
}
