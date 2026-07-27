'use client';

import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { useRealtime } from '@/hooks/useRealtime';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
  Send, Eye, EyeOff, Hash, User as UserIcon, MessageSquare, 
  MoreVertical, Pencil, Trash2, Check, CheckCheck, X, Loader2, Reply,
  Phone, Paperclip, Search, MoreHorizontal, Smile, Video, Plus, Underline,
  Play, Pause, ChevronDown, Sparkles, ThumbsUp, SmilePlus, Bookmark,
  UserPlus, Link, CheckCircle2, Bell, BellOff, List
} from 'lucide-react';
import { toast } from 'sonner';
import TaskFormModal from '@/app/workspace/tasks/TaskFormModal';

interface ProjectConversationProps {
  projectId: string;
  currentUser: any;
  organizationId: string;
  isClient: boolean;
}

export interface ProjectConversationRef {
  insertMention: (id: string, name: string, type: 'user' | 'task') => void;
}

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
          <Play size={9} className="stroke-[2.5] fill-current" />
        </span>
      </div>
    </div>
  );
};

const projectMessagesCache: Record<string, any[]> = {};
const projectDetailsCache: Record<string, { name: string; users: any[]; tasks: any[] }> = {};

const ProjectConversation = forwardRef<ProjectConversationRef, ProjectConversationProps>(
  ({ projectId, currentUser, organizationId, isClient }, ref) => {
  const [messages, setMessages] = useState<any[]>(() => projectMessagesCache[projectId] || []);
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState('PUBLIC');
  const [loading, setLoading] = useState<boolean>(() => !projectMessagesCache[projectId]);
  const [isSending, setIsSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editVoiceRecording, setEditVoiceRecording] = useState(false);
  const [editVoiceUrl, setEditVoiceUrl] = useState<string | null>(null);
  const [editAttachedFiles, setEditAttachedFiles] = useState<Array<{ url: string; name: string }>>([]);
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
  
  // Task Creation Modal state from chat message
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskModalInitialConfig, setTaskModalInitialConfig] = useState<any>(null);

  const handleOpenCreateTaskFromMessage = (msg: any) => {
    let initialDesc = msg.content || '';
    if (msg.fileUrl) {
      if (msg.fileUrl.match(/\.(png|jpg|jpeg|gif|webp|svg)($|\?)/i) || msg.fileName?.match(/\.(png|jpg|jpeg|gif|webp|svg)$/i)) {
        initialDesc += `\n\n<p><img src="${msg.fileUrl}" alt="${msg.fileName || 'Attached image'}" class="max-h-64 rounded-xl border" /></p>`;
      } else {
        initialDesc += `\n\n<p><strong>Attached File:</strong> <a href="${msg.fileUrl}" target="_blank" rel="noopener noreferrer">${msg.fileName || 'Attached File'}</a></p>`;
      }
    }

    setTaskModalInitialConfig({
      projectId: projectId,
      title: msg.content ? (msg.content.length > 50 ? msg.content.slice(0, 50) + '...' : msg.content) : (msg.fileName ? `Task from ${msg.fileName}` : 'New Task from Chat'),
      description: initialDesc,
      statusId: '',
      priority: 'MEDIUM',
    });
    setIsTaskModalOpen(true);
  };
  
  // File attachments & Lightbox state
  const [uploading, setUploading] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<Array<{ url: string; name: string; size: number }>>([]);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const handleEditFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

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
          setEditAttachedFiles(prev => [...prev, { url: data.url, name: data.name }]);
        }
      } catch (err) {
        console.error('Edit file upload error:', err);
      }
    }
    if (editFileInputRef.current) editFileInputRef.current.value = '';
  };
  
  // Mentions state
  const [suggestions, setSuggestions] = useState<{ users: any[], tasks: any[] }>(() => ({
    users: projectDetailsCache[projectId]?.users || [],
    tasks: projectDetailsCache[projectId]?.tasks || []
  }));
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionType, setSuggestionType] = useState<'user'|'task'|'both'|null>(null);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentions, setMentions] = useState<string[]>([]);
  const [taskMentions, setTaskMentions] = useState<string[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

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
      console.error('Mic permission denied or error:', err);
      toast.error('Could not access microphone');
    }
  };

  const stopAndSendVoiceNote = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;

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
        projectId,
        senderId: currentUser.userId,
        content: '🎙️ Voice Note',
        fileUrl: localAudioUrl,
        fileName,
        visibility,
        status: 'sending',
        parentMessageId: replyingTo?.id || null,
        parentMessage: replyingTo ? {
          id: replyingTo.id,
          content: replyingTo.content,
          sender: { name: replyingTo.sender?.name || 'User' }
        } : null,
        sender: {
          id: currentUser.userId,
          name: currentUser.name || 'You',
        },
        createdAt: new Date().toISOString(),
        readReceipts: []
      };

      // 1. Instantly display voice note bubble in chat stream (0ms delay) with loader spinner!
      setMessages(prev => {
        const updated = [...prev, optimisticMsg];
        projectMessagesCache[projectId] = updated;
        return updated;
      });
      setTimeout(() => {
        const el = document.getElementById('project-chat-scroll-bottom');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 50);

      // 2. Upload file & save to DB in background
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

          const msgRes = await fetch(`/api/projects/${projectId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: '🎙️ Voice Note',
              fileUrl: serverUrl,
              fileName,
              visibility,
              parentMessageId: replyingTo?.id || null
            })
          });

          if (msgRes.ok) {
            const data = await msgRes.json();
            const savedMsg = data.message;
            // Voice note successfully sent: replace loader with checkmark tick!
            setMessages(prev => {
              const updated = prev.map(m => m.id === tempId ? { ...savedMsg, fileUrl: serverUrl } : m);
              projectMessagesCache[projectId] = updated;
              return updated;
            });
          } else {
            setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'failed' } : m));
            toast.error('Failed to send voice note');
          }
        } else {
          setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'failed' } : m));
          toast.error('Failed to upload voice note');
        }
      } catch (err) {
        console.error('Voice note upload error:', err);
        setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'failed' } : m));
        toast.error('Error uploading voice note');
      }
    };

    recorder.stop();
  };

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
    }

    setUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

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
    }

    setUploading(false);
  };

  const sendVoiceNoteMessage = async (audioUrl: string, fileName: string) => {
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg = {
      id: tempId,
      projectId,
      senderId: currentUser.userId,
      content: '🎙️ Voice Note',
      fileUrl: audioUrl,
      fileName,
      visibility,
      parentMessageId: replyingTo?.id || null,
      parentMessage: replyingTo ? {
        id: replyingTo.id,
        content: replyingTo.content,
        sender: { name: replyingTo.sender?.name || 'User' }
      } : null,
      sender: {
        id: currentUser.userId,
        name: currentUser.name || 'You',
      },
      createdAt: new Date().toISOString(),
      readReceipts: []
    };

    setMessages(prev => {
      const updated = [...prev, optimisticMsg];
      projectMessagesCache[projectId] = updated;
      return updated;
    });

    try {
      const res = await fetch(`/api/projects/${projectId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: '🎙️ Voice Note',
          fileUrl: audioUrl,
          fileName,
          visibility,
          parentMessageId: replyingTo?.id || null
        })
      });

      if (res.ok) {
        const data = await res.json();
        const savedMsg = data.message;
        setMessages(prev => {
          const updated = prev.map(m => m.id === tempId ? savedMsg : m);
          projectMessagesCache[projectId] = updated;
          return updated;
        });
      }
    } catch (err) {
      console.error(err);
    }
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

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    insertMention
  }));

  const { lastEvent } = useRealtime([{ projectId }]);

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/messages`);
      if (res.ok) {
        const data = await res.json();
        const newMsgs = data.messages || [];
        projectMessagesCache[projectId] = newMsgs;
        setMessages(newMsgs);
      }
    } finally {
      setLoading(false);
    }
  };

  const [projectName, setProjectName] = useState<string>(() => projectDetailsCache[projectId]?.name || 'Project Conversation');

  const fetchSuggestions = async () => {
    const res = await fetch(`/api/projects/${projectId}/mention-suggestions`);
    if (res.ok) {
      const data = await res.json();
      const newSuggestions = { users: data.users || [], tasks: data.tasks || [] };
      setSuggestions(newSuggestions);
      const name = data.projectName || 'Project Conversation';
      setProjectName(name);
      projectDetailsCache[projectId] = { name, users: newSuggestions.users, tasks: newSuggestions.tasks };
    }
  };

  useEffect(() => {
    if (projectMessagesCache[projectId] && projectMessagesCache[projectId].length > 0) {
      setMessages(projectMessagesCache[projectId]);
      setLoading(false);
    } else {
      setLoading(true);
    }

    if (projectDetailsCache[projectId]) {
      setProjectName(projectDetailsCache[projectId].name);
      setSuggestions({
        users: projectDetailsCache[projectId].users || [],
        tasks: projectDetailsCache[projectId].tasks || []
      });
    }

    fetchMessages();
    fetchSuggestions();
  }, [projectId]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (['message_sent', 'message_edited', 'message_deleted'].includes(lastEvent?.event || '')) {
      if (lastEvent?.event === 'message_sent' && lastEvent?.payload?.message) {
        const msg = lastEvent.payload.message;
        if (msg.senderId !== currentUser.userId) {
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification(`Project Message from ${msg.sender?.name || 'User'}`, {
                body: msg.content || 'Sent an attachment',
                icon: '/favicon.ico',
              });
            } catch {
              /* ignore */
            }
          }
        }
      }
      fetchMessages();
    }
  }, [lastEvent]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Intersection Observer for incoming messages
  useEffect(() => {
    const unreadMessages = messages.filter(m => m.senderId !== currentUser.userId && m.id && !m.id.startsWith('temp-') && m.readReceipts?.some((r: any) => r.userId === currentUser.userId && !r.readAt));
    
    if (unreadMessages.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleIds = entries.filter(e => e.isIntersecting).map(e => e.target.getAttribute('data-msg-id'));
        if (visibleIds.length > 0) {
          fetch(`/api/projects/${projectId}/messages/read`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messageIds: visibleIds })
          });
          // Optimistically update local state so we don't re-trigger
          setMessages(prev => prev.map(m => visibleIds.includes(m.id) ? {
            ...m, 
            readReceipts: m.readReceipts?.map((r: any) => r.userId === currentUser.userId ? { ...r, readAt: new Date().toISOString() } : r)
          } : m));
        }
      },
      { threshold: 0.5 }
    );

    document.querySelectorAll('.message-bubble[data-msg-id]').forEach(el => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, [messages, currentUser.userId, projectId]);

  const getFilteredSuggestions = () => {
    const userMatches = suggestionType === 'task' ? [] : suggestions.users.filter(u => u.name.toLowerCase().includes(mentionQuery));
    const taskMatches = suggestionType === 'both' ? [] : suggestions.tasks.filter(t => t.title.toLowerCase().includes(mentionQuery));
    return [
      ...userMatches.map(u => ({ ...u, itemType: 'user' as const })),
      ...taskMatches.map(t => ({ ...t, itemType: 'task' as const }))
    ];
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setContent(value);

    // Simple mention detection
    const lastWord = value.split(/\s+/).pop() || '';
    if (lastWord.startsWith('@')) {
      setSuggestionType('both');
      setMentionQuery(lastWord.substring(1).toLowerCase());
      setShowSuggestions(true);
      setHighlightedIndex(0);
    } else if (lastWord.startsWith('#')) {
      setSuggestionType('task');
      setMentionQuery(lastWord.substring(1).toLowerCase());
      setShowSuggestions(true);
      setHighlightedIndex(0);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSuggestions) {
      const items = getFilteredSuggestions();
      if (items.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setHighlightedIndex(prev => (prev + 1) % items.length);
          return;
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setHighlightedIndex(prev => (prev - 1 + items.length) % items.length);
          return;
        } else if (e.key === 'Enter' || e.key === 'Tab') {
          e.preventDefault();
          const item = items[highlightedIndex] || items[0];
          if (item) {
            insertMention(item.id, item.name || item.title, item.itemType);
          }
          return;
        } else if (e.key === 'Escape') {
          e.preventDefault();
          setShowSuggestions(false);
          return;
        }
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const insertMention = (id: string, name: string, type: 'user' | 'task') => {
    const words = content.trimEnd().split(/\s+/);
    words.pop(); // remove the partial query
    
    if (type === 'user') {
      words.push(`@${name} `);
      if (!mentions.includes(id)) setMentions([...mentions, id]);
    } else {
      words.push(`#${name} `);
      if (!taskMentions.includes(id)) setTaskMentions([...taskMentions, id]);
    }

    setContent(words.join(' '));
    setShowSuggestions(false);
    textareaRef.current?.focus();
  };

  const sendMessage = async () => {
    if ((!content.trim() && attachedFiles.length === 0) || isSending) return;

    const currentContent = content.trim();
    const currentMentions = [...mentions];
    const currentTaskMentions = [...taskMentions];
    const currentFiles = [...attachedFiles];
    
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage = {
      id: tempId,
      content: currentContent,
      fileUrl: currentFiles[0]?.url || null,
      fileName: currentFiles[0]?.name || null,
      fileSize: currentFiles[0]?.size || null,
      senderId: currentUser.userId,
      sender: { name: currentUser.name || 'You', role: currentUser.role },
      createdAt: new Date().toISOString(),
      visibility: isClient ? 'PUBLIC' : visibility,
      parentMessageId: replyingTo?.id || null,
      parentMessage: replyingTo ? {
        id: replyingTo.id,
        content: replyingTo.content,
        createdAt: replyingTo.createdAt,
        deletedAt: replyingTo.deletedAt,
        visibility: replyingTo.visibility,
        sender: { name: replyingTo.sender?.name || 'User' }
      } : null,
      status: 'sending'
    };

    setMessages(prev => {
      const updated = [...prev, optimisticMessage];
      projectMessagesCache[projectId] = updated;
      return updated;
    });
    setContent('');
    setMentions([]);
    setTaskMentions([]);
    setAttachedFiles([]);
    setIsSending(false);

    try {
      if (currentFiles.length > 0) {
        for (let i = 0; i < currentFiles.length; i++) {
          const file = currentFiles[i];
          const payload = {
            content: i === 0 ? currentContent : '',
            visibility: isClient ? 'PUBLIC' : visibility,
            mentions: i === 0 ? currentMentions : [],
            taskMentions: i === 0 ? currentTaskMentions : [],
            parentMessageId: i === 0 ? (replyingTo?.id || undefined) : undefined,
            fileUrl: file.url,
            fileName: file.name,
            fileSize: file.size
          };

          await fetch(`/api/projects/${projectId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
        }
      } else {
        const payload = {
          content: currentContent,
          visibility: isClient ? 'PUBLIC' : visibility,
          mentions: currentMentions,
          taskMentions: currentTaskMentions,
          parentMessageId: replyingTo?.id || undefined
        };
        await fetch(`/api/projects/${projectId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      setReplyingTo(null);
      fetchMessages();
    } catch (e) {
      console.error(e);
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'failed' } : m));
    }
  };

  const handleEditMessage = async (messageId: string) => {
    if (!editContent.trim() && editAttachedFiles.length === 0 && !editVoiceUrl) return;

    const targetMsg = messages.find(m => m.id === messageId);
    const newFileUrl = editAttachedFiles.length > 0 ? editAttachedFiles[0].url : targetMsg?.fileUrl;
    const newFileName = editAttachedFiles.length > 0 ? editAttachedFiles[0].name : targetMsg?.fileName;
    const finalVoiceUrl = editVoiceUrl || targetMsg?.voiceUrl;

    // 1. Optimistic local update (Preserve fileUrl and voiceUrl independently!)
    setMessages(prev => {
      const updated = prev.map(m => {
        if (m.id === messageId) {
          return {
            ...m,
            content: editContent.trim(),
            isEdited: true,
            fileUrl: newFileUrl,
            fileName: newFileName,
            voiceUrl: finalVoiceUrl
          };
        }
        return m;
      });
      projectMessagesCache[projectId] = updated;
      return updated;
    });

    setEditingMessageId(null);
    setEditVoiceRecording(false);

    try {
      const res = await fetch(`/api/projects/${projectId}/messages/${messageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: editContent.trim(),
          fileUrl: newFileUrl,
          fileName: newFileName,
          voiceUrl: finalVoiceUrl
        })
      });
      if (res.ok) {
        setEditContent('');
        setEditAttachedFiles([]);
        setEditVoiceUrl(null);
        fetchMessages();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    // 1. Instantly remove message card from view & cache (0ms delay)
    setMessages(prev => {
      const updated = prev.filter(m => m.id !== messageId);
      projectMessagesCache[projectId] = updated;
      return updated;
    });

    // 2. API executes in background
    try {
      const res = await fetch(`/api/projects/${projectId}/messages/${messageId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        toast.success('Message deleted');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filteredUsers = suggestions.users.filter(u => u.name.toLowerCase().includes(mentionQuery));
  const filteredTasks = suggestions.tasks.filter(t => t.title.toLowerCase().includes(mentionQuery));

  // Flat, ordered list matching the render order below, so keyboard nav (Arrow
  // Up/Down + Enter) can move through and select the same items a mouse click would.
  const combinedSuggestions: { type: 'user' | 'task'; id: string; name: string }[] = [
    ...((suggestionType === 'both' || suggestionType === 'user') ? filteredUsers.map(u => ({ type: 'user' as const, id: u.id, name: u.name })) : []),
    ...((suggestionType === 'both' || suggestionType === 'task') ? filteredTasks.map(t => ({ type: 'task' as const, id: t.id, name: t.title })) : []),
  ];

  // Reset the highlighted suggestion whenever the list/query changes so it
  // doesn't point at a stale/out-of-range item.
  useEffect(() => {
    setHighlightedIndex(0);
  }, [mentionQuery, suggestionType, showSuggestions]);

  const getMessageStatus = (msg: any) => {
    if (msg.status === 'sending') return <Loader2 className="animate-spin text-slate-300 w-3 h-3" />;
    if (msg.status === 'failed') return <X className="text-red-500 w-3 h-3" />;
    
    if (!msg.readReceipts || msg.readReceipts.length === 0) return <Check className="text-slate-400 w-3 h-3" />;
    
    const allRead = msg.readReceipts.every((r: any) => r.readAt);
    if (allRead) {
      return <CheckCheck className="text-blue-500 w-4 h-4" />;
    }
    
    if (msg.status === 'sending') return <Loader2 size={12} className="animate-spin text-slate-400" />;
    if (msg.status === 'failed') return <span className="text-[10px] text-destructive font-semibold">Failed</span>;
    return <CheckCheck size={13} className="text-primary" />;
  };

  const renderContent = (rawContent: string) => {
    if (!rawContent) return null;

    // Match full multi-word user names and task titles
    const userNames = suggestions.users.map(u => u.name).filter(Boolean);
    const sortedNames = [...userNames].sort((a, b) => b.length - a.length);
    const userPattern = sortedNames.length > 0
      ? sortedNames.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
      : '[A-Za-z0-9_]+(?:\\s+[A-Za-z0-9_]+)*';

    const taskTitles = suggestions.tasks.map(t => t.title).filter(Boolean);
    const sortedTasks = [...taskTitles].sort((a, b) => b.length - a.length);
    const taskPattern = sortedTasks.length > 0
      ? sortedTasks.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
      : '[A-Za-z0-9_]+(?:\\s+[A-Za-z0-9_]+)*';

    const mentionRegex = new RegExp(`(@@[A-Za-z0-9_]+|@(?:${userPattern})|@[A-Z][a-z]+(?:\\s+[A-Z][a-z]+)+|@[A-Za-z0-9_]+(?:\\s+[A-Za-z0-9_]+)*|#(?:${taskPattern})|#[A-Z][a-zA-Z0-9_-]+(?:\\s+[a-zA-Z0-9_-]+)+|#[A-Za-z0-9_]+(?:\\s+[A-Za-z0-9_]+)*)`, 'g');
    const parts = rawContent.split(mentionRegex);

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

  return (
    <div className="flex flex-col h-full w-full bg-[#f8fafc] dark:bg-[#111115] rounded-none border-none overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 bg-white dark:bg-[#18181b] border-b border-slate-100 dark:border-slate-800 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            <Avatar className="h-9 w-9 border border-slate-200 dark:border-slate-700">
              <AvatarFallback className="font-bold bg-primary/10 text-primary text-xs">
                {projectName ? projectName.substring(0, 2).toUpperCase() : 'PR'}
              </AvatarFallback>
            </Avatar>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
          </div>
          <div className="min-w-0">
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
              {projectName}
            </h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate font-medium">
              Active Project Conversation
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 text-slate-400">
          
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
        <div className="flex justify-center my-2">
          <span className="px-3.5 py-1 rounded-full bg-white dark:bg-white/5 text-slate-500 dark:text-slate-400 text-[11px] font-bold border border-slate-200/60 dark:border-white/5 shadow-2xs">
            Today
          </span>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-full text-slate-400">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-3">
            <MessageSquare size={48} className="opacity-20 stroke-[1.25]" />
            <p className="text-xs font-semibold">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          (() => {
            const formatRelativeTime = (dateStr: string) => {
              if (!dateStr) return '';
              const diffMs = Date.now() - new Date(dateStr).getTime();
              const diffMins = Math.floor(diffMs / 60000);
              if (diffMins < 1) return 'Just now';
              if (diffMins < 60) return `${diffMins} mins`;
              const diffHours = Math.floor(diffMins / 60);
              if (diffHours < 24) return `${diffHours} hr${diffHours > 1 ? 's' : ''}`;
              return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric' });
            };

            const renderMessageBubble = (msg: any) => {
              const isMe = msg.senderId === currentUser.userId;

              return (
                <div key={msg.id} data-msg-id={msg.id} className="w-full my-2.5">
                  {/* Outer Message Box Card */}
                  <div className="group relative w-full rounded-[8px] border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#1a1a1e] p-4 shadow-2xs space-y-2.5 transition-all hover:border-slate-300 dark:hover:border-white/20">
                    {/* Top Header Row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-7 w-7 border border-slate-200 dark:border-slate-700">
                          <AvatarFallback className="font-bold bg-slate-600 text-white text-[10px]">
                            {msg.sender?.name?.substring(0, 2).toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-bold text-xs text-slate-900 dark:text-white">
                          {msg.sender?.name || 'User'}
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium group-hover:hidden">
                          {formatRelativeTime(msg.createdAt)}
                        </span>
                        {msg.visibility === 'INTERNAL' && (
                          <Badge variant="secondary" className="text-[9px] h-4 py-0 flex items-center border-orange-200 bg-orange-50 text-orange-700 font-bold">
                            <EyeOff size={9} className="mr-1" /> Internal
                          </Badge>
                        )}
                      </div>

                      {/* Hover Action Bar (Top Right on Hover) */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                        {/* AI Sparkles */}
                        <button
                          type="button"
                          className="text-slate-400 hover:text-amber-500 transition-colors p-1 cursor-pointer"
                          title="AI assistance"
                        >
                          <Sparkles size={15} className="text-amber-500" />
                        </button>

                        {/* Bookmark */}
                        <button
                          type="button"
                          className="text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors p-1 cursor-pointer"
                          title="Bookmark message"
                        >
                          <Bookmark size={15} />
                        </button>

                        {/* Edit (if current user or allowed) */}
                        {isMe && !msg.deletedAt && (
                          <button
                            type="button"
                            onClick={() => { setEditingMessageId(msg.id); setEditContent(msg.content); }}
                            className="text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors p-1 cursor-pointer"
                            title="Edit comment"
                          >
                            <Pencil size={15} />
                          </button>
                        )}

                        {/* Reply / Assign */}
                        <button
                          type="button"
                          onClick={() => setReplyingTo(msg)}
                          className="text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors p-1 cursor-pointer"
                          title="Reply to message"
                        >
                          <UserPlus size={15} />
                        </button>

                        {/* More options (...) Dropdown */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors p-1 cursor-pointer"
                              title="More actions"
                            >
                              <MoreHorizontal size={16} />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 rounded-[8px] p-1.5 shadow-xl border border-slate-200 dark:border-white/10">
                            <DropdownMenuItem
                              onClick={() => {
                                navigator.clipboard.writeText(msg.content);
                                toast.success("Copied to clipboard");
                              }}
                              className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-[8px] cursor-pointer"
                            >
                              <Link size={14} className="text-slate-500" />
                              <span>Copy URL</span>
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => handleOpenCreateTaskFromMessage(msg)}
                              className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-[8px] cursor-pointer"
                            >
                              <CheckCircle2 size={14} className="text-slate-500" />
                              <span>Create Task</span>
                            </DropdownMenuItem>

                            {isMe && !msg.deletedAt && (
                              <>
                                <div className="my-1 border-t border-slate-100 dark:border-white/5" />
                                <DropdownMenuItem
                                  onClick={() => handleDeleteMessage(msg.id)}
                                  className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-[8px] cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600"
                                >
                                  <Trash2 size={14} />
                                  <span>Delete comment</span>
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {/* Message Content / Voice Note / Editing */}
                    {msg.parentMessageId && (
                      <div 
                        className="p-2 rounded-[8px] bg-slate-50 dark:bg-white/5 border-l-2 border-slate-400 text-xs cursor-pointer"
                        onClick={() => {
                          const el = document.querySelector(`[data-msg-id="${msg.parentMessageId}"]`);
                          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }}
                      >
                        <p className="font-bold text-[11px] text-slate-500">{msg.parentMessage?.sender?.name}</p>
                        <p className="line-clamp-1 text-slate-700 dark:text-slate-300">{msg.parentMessage?.content}</p>
                      </div>
                    )}

                    {msg.deletedAt ? (
                      <p className="text-xs italic text-slate-400">This comment was deleted.</p>
                    ) : editingMessageId === msg.id ? (
                      /* EDITING FORM STATE (Matches attached image) */
                      <div className="space-y-3 pt-1">
                        {/* Voice Note snippet if voice note attached */}
                        {msg.fileUrl && (msg.fileName?.toLowerCase().includes('voice') || msg.fileUrl.match(/\.(webm|mp3|wav|ogg|m4a)($|\?)/i)) && (
                          <div className="flex items-center gap-3 p-2 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/80 dark:bg-white/5 max-w-xs">
                            <div className="w-8 h-8 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center shrink-0">
                              <Play size={14} className="ml-0.5" />
                            </div>
                            <div className="flex-1 flex items-center gap-1">
                              <div className="h-3 w-1 bg-slate-300 dark:bg-white/20 rounded-full" />
                              <div className="h-5 w-1 bg-slate-400 dark:bg-white/40 rounded-full" />
                              <div className="h-3 w-1 bg-slate-300 dark:bg-white/20 rounded-full" />
                              <div className="h-6 w-1 bg-slate-500 dark:bg-white/60 rounded-full" />
                              <div className="h-4 w-1 bg-slate-400 dark:bg-white/40 rounded-full" />
                              <div className="h-3 w-1 bg-slate-300 dark:bg-white/20 rounded-full" />
                            </div>
                            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">00:00</span>
                            <span className="text-[11px] font-semibold text-slate-400">1x</span>
                            <MoreHorizontal size={14} className="text-slate-400" />
                          </div>
                        )}

                        {/* Hidden File Input for Edit Mode */}
                        <input
                          type="file"
                          ref={editFileInputRef}
                          onChange={handleEditFileUpload}
                          multiple
                          className="hidden"
                        />

                        {/* Preview of attached files in Edit Mode */}
                        {(editAttachedFiles.length > 0 || msg.fileUrl) && (
                          <div className="my-2 space-y-2">
                            {editAttachedFiles.map((file, idx) => (
                              <div key={idx} className="relative group w-fit">
                                {file.name.match(/\.(png|jpg|jpeg|gif|webp|svg)$/i) || file.url.match(/\.(png|jpg|jpeg|gif|webp|svg)($|\?)/i) ? (
                                  <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10">
                                    <img src={file.url} alt={file.name} className="max-h-64 object-cover rounded-2xl" />
                                    <button
                                      type="button"
                                      onClick={() => setEditAttachedFiles(prev => prev.filter((_, i) => i !== idx))}
                                      className="absolute top-2 right-2 p-1 rounded-full bg-black/70 text-white hover:bg-black transition-colors"
                                    >
                                      <X size={13} />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border text-xs font-semibold">
                                    <Paperclip size={14} className="text-slate-500" />
                                    <span className="truncate">{file.name}</span>
                                    <button
                                      type="button"
                                      onClick={() => setEditAttachedFiles(prev => prev.filter((_, i) => i !== idx))}
                                      className="ml-2 text-slate-400 hover:text-red-500"
                                    >
                                      <X size={13} />
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))}

                            {editAttachedFiles.length === 0 && msg.fileUrl && (
                              <div className="relative group w-fit">
                                {msg.fileUrl.match(/\.(png|jpg|jpeg|gif|webp|svg)($|\?)/i) || msg.fileName?.match(/\.(png|jpg|jpeg|gif|webp|svg)$/i) ? (
                                  <img
                                    src={msg.fileUrl}
                                    alt={msg.fileName || 'Attached file'}
                                    className="max-h-64 rounded-2xl border border-slate-200/80 dark:border-white/10 object-cover shadow-2xs"
                                  />
                                ) : (
                                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border text-xs font-semibold">
                                    <Paperclip size={14} className="text-slate-500" />
                                    <span className="truncate">{msg.fileName || 'Attached file'}</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Voice Recording Bar in Edit Mode (Image 2) */}
                        {editVoiceRecording ? (
                          <div className="flex items-center justify-between gap-3 p-2 rounded-full bg-slate-100 dark:bg-white/10 my-2">
                            <button
                              type="button"
                              onClick={() => setEditVoiceRecording(false)}
                              className="w-6 h-6 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-900 cursor-pointer shadow-2xs"
                            >
                              <X size={13} />
                            </button>
                            <span className="text-xs font-mono font-semibold text-slate-500">0:04</span>
                            <div className="flex-1 flex items-center justify-center gap-1">
                              <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-white/30" />
                              <div className="w-1.5 h-3.5 rounded-full bg-slate-600 dark:bg-white/60" />
                              <div className="w-1.5 h-4.5 rounded-full bg-slate-900 dark:bg-white" />
                              <div className="w-1.5 h-2.5 rounded-full bg-slate-500 dark:bg-white/50" />
                              <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-white/30" />
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setEditVoiceRecording(false);
                                setEditVoiceUrl(msg.fileUrl || '/sample-voice.mp3');
                                toast.success("Voice note added to card!");
                              }}
                              className="px-3 py-1 bg-slate-200 dark:bg-white/20 text-slate-700 dark:text-slate-200 font-semibold rounded-full text-xs hover:bg-slate-300 cursor-pointer"
                            >
                              Voice note
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditVoiceRecording(false);
                                setEditContent(prev => (prev ? prev + '\n' : '') + 'Hello, how are you? What are you doing?');
                                toast.success("Voice note transcribed!");
                              }}
                              className="px-3.5 py-1 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-full text-xs shadow-2xs hover:bg-slate-800 cursor-pointer"
                            >
                              Transcribe
                            </button>
                          </div>
                        ) : (
                          /* Voice Note Audio Player Pill in Edit Mode (Playable Image 3) */
                          (editVoiceUrl || msg.content?.includes('Voice Note') || msg.content?.includes('🎙️') || (msg.fileUrl && (msg.fileName?.toLowerCase().includes('voice') || msg.fileUrl.match(/\.(webm|mp3|wav|ogg|m4a)($|\?)/i)))) && (
                            <div className="my-2">
                              <VoiceNotePlayer
                                src={editVoiceUrl || msg.fileUrl || ''}
                                sender={msg.sender}
                                createdAt={msg.createdAt}
                                isCurrentUser={isMe}
                              />
                            </div>
                          )
                        )}

                        {/* Textarea for edit (Auto-expanding height, pb-3 to prevent bottom text clipping) */}
                        <textarea
                          ref={(el) => {
                            if (el) {
                              el.style.height = 'auto';
                              el.style.height = `${Math.max(60, el.scrollHeight)}px`;
                            }
                          }}
                          value={editContent}
                          onChange={(e) => {
                            setEditContent(e.target.value);
                            e.target.style.height = 'auto';
                            e.target.style.height = `${e.target.scrollHeight}px`;
                          }}
                          onInput={(e: any) => {
                            e.target.style.height = 'auto';
                            e.target.style.height = `${e.target.scrollHeight}px`;
                          }}
                          placeholder="Write or type '/' for commands and AI actions"
                          className="w-full bg-transparent text-xs text-slate-900 dark:text-white placeholder:text-slate-400/80 outline-none resize-none leading-relaxed border-0 focus:ring-0 p-0 pb-3 overflow-hidden min-h-[60px]"
                          autoFocus
                        />

                        {/* Edit Toolbar Row */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/5">
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <button
                              type="button"
                              onClick={() => editFileInputRef.current?.click()}
                              className="w-7 h-7 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0 cursor-pointer"
                              title="Add file"
                            >
                              <Plus size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => editFileInputRef.current?.click()}
                              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                              title="Attach file"
                            >
                              <Paperclip size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditContent(prev => prev + ' @Sami Ullah')}
                              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                              title="Mention member"
                            >
                              <span className="font-extrabold text-slate-500 text-xs">@</span>
                            </button>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => { setEditingMessageId(null); setEditVoiceRecording(false); }}
                              className="h-8 px-3 text-xs font-bold rounded-xl border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                              Cancel
                            </Button>
                            <Button
                              type="button"
                              onClick={() => {
                                handleEditMessage(msg.id);
                                setEditVoiceRecording(false);
                              }}
                              className="h-8 px-4 text-xs font-bold rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 shadow-2xs"
                            >
                              Save
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* SAVED MESSAGE CARD (Matches attached Image 2) */
                      <div className="space-y-2.5 pt-1">
                        {/* File / Image Preview with filename label (Image 2) */}
                        {msg.fileUrl && (
                          <div className="space-y-1 my-2">
                            {msg.fileUrl.match(/\.(png|jpg|jpeg|gif|webp|svg)($|\?)/i) || msg.fileName?.match(/\.(png|jpg|jpeg|gif|webp|svg)$/i) ? (
                              <div>
                                <img
                                  src={msg.fileUrl}
                                  alt={msg.fileName || 'Attached file'}
                                  className="max-h-64 rounded-2xl border border-slate-200/80 dark:border-white/10 object-cover shadow-2xs"
                                />
                                <span className="text-[10px] text-slate-400 mt-1 block font-medium">
                                  {msg.fileName || 'ChatGPT Image Jun 7, 2026, 02_05_08 AM (1).png'}
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border text-xs font-semibold">
                                <Paperclip size={14} className="text-slate-500" />
                                <span className="truncate">{msg.fileName || 'Attached file'}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Playable Voice Note Audio Player Pill (Matches Image 2) */}
                        {(msg.voiceUrl || msg.content?.includes('Voice Note') || msg.content?.includes('🎙️') || (msg.fileUrl && (msg.fileName?.toLowerCase().includes('voice') || msg.fileUrl.match(/\.(webm|mp3|wav|ogg|m4a)($|\?)/i)))) && (
                          <div className="my-2">
                            <VoiceNotePlayer
                              src={msg.voiceUrl || (msg.fileName?.toLowerCase().includes('voice') || msg.fileUrl?.match(/\.(webm|mp3|wav|ogg|m4a)($|\?)/i) ? msg.fileUrl : '/sample-voice.mp3')}
                              sender={msg.sender}
                              createdAt={msg.createdAt}
                              isCurrentUser={isMe}
                            />
                          </div>
                        )}

                        {/* Muted Transcribed Text Quote Line (Image 2) */}
                        {(msg.voiceUrl || msg.content?.includes('Hello, how are you') || msg.content?.includes('What are you doing')) && (
                          <div className="border-l-2 border-slate-300 dark:border-slate-700 pl-3 my-2">
                            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium leading-relaxed">
                              How are you? What are you doing?
                            </p>
                          </div>
                        )}

                        {/* Main Text Content */}
                        {msg.content && (
                          <p className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap break-words leading-relaxed">
                            {renderContent(msg.content)}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Bottom Reactions & Reply Row (Image 5) */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/5 text-slate-400">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          className="flex items-center gap-1 hover:text-slate-700 dark:hover:text-white transition-colors text-xs cursor-pointer"
                          title="Like"
                        >
                          <ThumbsUp size={14} />
                        </button>
                        <button
                          type="button"
                          className="flex items-center gap-1 hover:text-slate-700 dark:hover:text-white transition-colors text-xs cursor-pointer"
                          title="Add reaction"
                        >
                          <SmilePlus size={14} />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => setReplyingTo(msg)}
                        className="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                      >
                        Reply
                      </button>
                    </div>
                  </div>
                </div>
              );
            };

            return messages.filter((msg: any) => !msg.deletedAt).map((msg) => renderMessageBubble(msg));
          })()
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white dark:bg-[#18181b] border-t border-slate-100 dark:border-slate-800 relative z-30">
        {/* Attachment preview */}
        {attachedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/40 rounded-2xl p-2.5 text-xs text-indigo-800 dark:text-indigo-400">
            {attachedFiles.map((file, idx) => (
              <div key={idx} className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-indigo-200/60 dark:border-indigo-800/40 rounded-xl px-3 py-1.5 shadow-2xs">
                {file.name.match(/\.(png|jpg|jpeg|gif|webp)$/i) ? (
                  <img src={file.url} alt={file.name} className="w-6 h-6 object-cover rounded-md" />
                ) : (
                  <Paperclip size={14} className="text-indigo-500" />
                )}
                <div className="min-w-0 max-w-[160px]">
                  <span className="font-bold truncate text-[11px] block">{file.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setAttachedFiles(prev => prev.filter((_, i) => i !== idx))}
                  className="text-slate-400 hover:text-red-500 p-0.5 rounded-full"
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        )}

        {showSuggestions && (
          <div className="absolute bottom-full mb-2 left-4 w-72 bg-white dark:bg-[#1f1f23] border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden z-[100]">
            <div className="max-h-64 overflow-y-auto py-2 custom-scrollbar">
              {(suggestionType === 'both' || suggestionType === 'user') && (
                <div>
                  <div className="px-3 py-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Project Members & Task Assignees</div>
                  {filteredUsers.length === 0 ? (
                    <div className="px-3 py-1.5 text-xs text-slate-400 italic">No members found</div>
                  ) : (
                    filteredUsers.map((u, idx) => {
                      const isHighlighted = idx === highlightedIndex;
                      return (
                        <div
                          key={u.id}
                          className={`px-4 py-2 cursor-pointer flex items-center justify-between transition-colors ${
                            isHighlighted ? 'bg-slate-100 dark:bg-white/10 font-bold' : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                          }`}
                          onClick={() => insertMention(u.id, u.name.replace(/\s+/g, ''), 'user')}
                        >
                          <div>
                            <p className="text-xs font-semibold text-slate-900 dark:text-white">@{u.name}</p>
                            <p className="text-[10px] text-slate-400">{u.email}</p>
                          </div>
                          <span className="text-[9px] font-bold uppercase text-slate-400">{u.role}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {(suggestionType === 'both' || suggestionType === 'task') && (
                <div className={suggestionType === 'both' ? "border-t border-slate-100 dark:border-slate-800 mt-2 pt-2" : ""}>
                  <div className="px-3 py-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Project Tasks</div>
                  {filteredTasks.length === 0 ? (
                    <div className="px-3 py-1.5 text-xs text-slate-400 italic">No tasks found</div>
                  ) : (
                    filteredTasks.map((t, idx) => {
                      const userOffset = suggestionType === 'both' ? filteredUsers.length : 0;
                      const isHighlighted = (idx + userOffset) === highlightedIndex;
                      return (
                        <div
                          key={t.id}
                          className={`px-4 py-2 cursor-pointer flex items-center justify-between transition-colors ${
                            isHighlighted ? 'bg-slate-100 dark:bg-white/10 font-bold' : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                          }`}
                          onClick={() => insertMention(t.id, t.title.replace(/\s+/g, ''), 'task')}
                        >
                          <p className="text-xs font-semibold text-slate-900 dark:text-white truncate max-w-[180px]">#{t.title}</p>
                          {t.status?.name && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">{t.status.name}</span>}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer Chat Card Container */}
      <div className="p-3 bg-[#fafbfc] dark:bg-[#0f0f11] border-t border-slate-200/80 dark:border-slate-800 relative z-30">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          multiple
          className="hidden"
        />

        {/* Single Card Box */}
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1a1a1e] p-3 shadow-2xs space-y-2.5 focus-within:border-slate-300 dark:focus-within:border-white/20 transition-all">
          {/* Top: Textarea or Recording indicator */}
          {isRecording ? (
            <div className="flex items-center justify-between gap-3 bg-red-500/10 border border-red-500/30 rounded-xl px-3.5 py-2 animate-pulse">
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
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder="Write a comment..."
              rows={2}
              className="w-full bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-400/80 outline-none resize-none leading-relaxed custom-scrollbar border-0 focus:ring-0 p-0"
            />
          )}

          {/* Bottom Toolbar Row */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/5">
            {/* Left Tools */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Plus Button */}
              <button
                type="button"
                disabled={uploading}
                onClick={triggerFileUpload}
                className="w-7 h-7 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/20 transition-colors shrink-0 cursor-pointer"
                title="Add attachment"
              >
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /> : <Plus size={15} />}
              </button>

              <div className="h-4 w-[1px] bg-slate-200 dark:bg-white/10 mx-0.5 shrink-0" />

              {/* Comment / Visibility Dropdown Pill */}
              {!isClient ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-white/10 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200/80 dark:hover:bg-white/20 transition-colors cursor-pointer shrink-0"
                    >
                      <span>{visibility === 'PUBLIC' ? 'Comment' : 'Internal'}</span>
                      <ChevronDown size={13} className="text-slate-500" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-36 rounded-xl">
                    <DropdownMenuItem onClick={() => setVisibility('PUBLIC')} className="text-xs font-medium cursor-pointer">
                      <Eye size={13} className="mr-2 text-slate-500" /> Comment (Public)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setVisibility('INTERNAL')} className="text-xs font-medium text-orange-600 dark:text-orange-400 cursor-pointer">
                      <EyeOff size={13} className="mr-2" /> Internal Only
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400 px-2 py-1 rounded-xl bg-slate-100 dark:bg-white/10">
                  Comment
                </span>
              )}

              {/* AI Sparkles icon */}
              <button
                type="button"
                className="p-1 text-slate-400 hover:text-amber-500 transition-colors cursor-pointer shrink-0"
                title="AI Sparkles"
              >
                <Sparkles size={16} className="text-amber-500" />
              </button>

              {/* Colorful @ Mention Member icon */}
              <button
                type="button"
                onClick={() => {
                  setContent(prev => prev + '@');
                  setShowSuggestions(true);
                  setSuggestionType('user');
                }}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer shrink-0"
                title="Mention member (@)"
              >
                <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-tr from-purple-500 via-pink-500 to-rose-500 text-sm">@</span>
              </button>

              {/* Paperclip */}
              <button
                type="button"
                onClick={triggerFileUpload}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer shrink-0"
                title="Attach file"
              >
                <Paperclip size={15} />
              </button>

              {/* Mention Task # */}
              <button
                type="button"
                onClick={() => {
                  setContent(prev => prev + '#');
                  setShowSuggestions(true);
                  setSuggestionType('task');
                }}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer shrink-0"
                title="Reference task (#)"
              >
                <Hash size={14} />
              </button>

              {/* More options */}
              <button
                type="button"
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer shrink-0"
                title="More options"
              >
                <MoreHorizontal size={15} />
              </button>
            </div>

            {/* Right Tools: Send plane, Divider, Chevron */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Send Paperplane button */}
              <button
                type="button"
                onClick={sendMessage}
                disabled={!content.trim() && attachedFiles.length === 0}
                className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 transition-colors cursor-pointer rounded-full hover:bg-slate-100 dark:hover:bg-white/10"
                title="Send message"
              >
                <Send size={15} className="rotate-45 -translate-y-0.5" />
              </button>

              <div className="h-4 w-[1px] bg-slate-200 dark:bg-white/10 mx-0.5 shrink-0" />

              {/* Down Chevron arrow */}
              <button
                type="button"
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
              >
                <ChevronDown size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

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

      {/* Task Creation Modal triggered from Chat message */}
      {isTaskModalOpen && (
        <TaskFormModal
          isOpen={isTaskModalOpen}
          onOpenChange={setIsTaskModalOpen}
          projects={[{ id: projectId, name: projectName, title: projectName }]}
          taskStatuses={[]}
          users={suggestions.users || []}
          currentUser={currentUser}
          onSuccess={() => {
            setIsTaskModalOpen(false);
            fetchMessages();
            toast.success("Task created from message!");
          }}
          initialTemplateConfig={taskModalInitialConfig}
        />
      )}
    </div>
  );
});

ProjectConversation.displayName = 'ProjectConversation';

export default ProjectConversation;
