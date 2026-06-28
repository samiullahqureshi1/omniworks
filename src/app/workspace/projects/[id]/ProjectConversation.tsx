'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRealtime } from '@/hooks/useRealtime';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Send, Eye, EyeOff, Hash, User as UserIcon, MessageSquare, MoreVertical, Pencil, Trash2, Check, X } from 'lucide-react';

interface ProjectConversationProps {
  projectId: string;
  currentUser: any;
  organizationId: string;
  isClient: boolean;
}

export default function ProjectConversation({ projectId, currentUser, organizationId, isClient }: ProjectConversationProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState('PUBLIC');
  const [loading, setLoading] = useState(true);
  
  // Mentions state
  const [suggestions, setSuggestions] = useState<{ users: any[], tasks: any[] }>({ users: [], tasks: [] });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionType, setSuggestionType] = useState<'user'|'task'|null>(null);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentions, setMentions] = useState<string[]>([]);
  const [taskMentions, setTaskMentions] = useState<string[]>([]);

  // Edit/Delete state
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { lastEvent } = useRealtime([{ projectId }]);

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchSuggestions = async () => {
    const res = await fetch(`/api/projects/${projectId}/mention-suggestions`);
    if (res.ok) {
      const data = await res.json();
      setSuggestions({ users: data.users || [], tasks: data.tasks || [] });
    }
  };

  useEffect(() => {
    fetchMessages();
    fetchSuggestions();
  }, [projectId]);

  useEffect(() => {
    if (['message_sent', 'message_edited', 'message_deleted'].includes(lastEvent?.event || '')) {
      fetchMessages();
    }
  }, [lastEvent]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setContent(value);

    // Simple mention detection
    const lastWord = value.split(' ').pop() || '';
    if (lastWord.startsWith('@')) {
      setSuggestionType('user');
      setMentionQuery(lastWord.substring(1).toLowerCase());
      setShowSuggestions(true);
    } else if (lastWord.startsWith('#')) {
      setSuggestionType('task');
      setMentionQuery(lastWord.substring(1).toLowerCase());
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const insertMention = (id: string, name: string, type: 'user' | 'task') => {
    const words = content.split(' ');
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
    if (!content.trim()) return;

    try {
      const payload = {
        content: content.trim(),
        visibility: isClient ? 'PUBLIC' : visibility,
        mentions,
        taskMentions
      };

      const res = await fetch(`/api/projects/${projectId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setContent('');
        setMentions([]);
        setTaskMentions([]);
        // The SSE will fetch messages, but we can optimistically do it
        fetchMessages();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleEditMessage = async (messageId: string) => {
    if (!editContent.trim()) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/messages/${messageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent.trim() })
      });
      if (res.ok) {
        setEditingMessageId(null);
        setEditContent('');
        fetchMessages();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/messages/${messageId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchMessages();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Render text with highlights for mentions
  const renderContent = (text: string) => {
    // Basic rendering for @name and #taskId (visual only here)
    const words = text.split(' ');
    return words.map((w, i) => {
      if (w.startsWith('@') && w.length > 1) {
        return <span key={i} className="text-blue-600 dark:text-blue-400 font-semibold bg-blue-50 dark:bg-blue-900/30 px-1 rounded mx-0.5">{w} </span>;
      }
      if (w.startsWith('#') && w.length > 1) {
        return <span key={i} className="text-purple-600 dark:text-purple-400 font-semibold bg-purple-50 dark:bg-purple-900/30 px-1 rounded mx-0.5">{w} </span>;
      }
      return w + ' ';
    });
  };

  const filteredUsers = suggestions.users.filter(u => u.name.toLowerCase().includes(mentionQuery));
  const filteredTasks = suggestions.tasks.filter(t => t.title.toLowerCase().includes(mentionQuery));

  return (
    <div className="flex flex-col h-[600px] bg-[#FAFAFA] dark:bg-background rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800">
        <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <MessageSquare size={18} className="text-primary" />
          Project Conversation
        </h3>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {loading ? (
          <div className="flex justify-center items-center h-full text-slate-400">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-3">
            <MessageSquare size={48} className="opacity-20" />
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === currentUser.userId;
            return (
              <div key={msg.id} className={`flex gap-3 max-w-[85%] group ${isMe ? 'ml-auto flex-row-reverse' : ''}`}>
                <Avatar className="h-8 w-8 mt-1 shrink-0 border border-slate-200">
                  <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
                    {msg.sender.name.substring(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{msg.sender.name}</span>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">{msg.sender.role}</span>
                    <span className="text-[10px] text-slate-400">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className={`px-4 py-2.5 rounded-2xl relative ${
                    isMe 
                      ? 'bg-primary text-primary-foreground rounded-tr-sm shadow-sm' 
                      : 'bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-sm shadow-sm'
                  }`}>
                    {msg.visibility === 'INTERNAL' && !isMe && (
                      <Badge variant="secondary" className="mb-2 text-[9px] h-4 py-0 flex items-center w-fit border-orange-200 bg-orange-50 text-orange-700">
                        <EyeOff size={10} className="mr-1" /> Internal
                      </Badge>
                    )}
                    
                    {msg.deletedAt ? (
                      <p className="text-sm italic opacity-70">This message was deleted.</p>
                    ) : editingMessageId === msg.id ? (
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
                        <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                          {renderContent(msg.content)}
                        </p>
                        {msg.isEdited && (
                          <span className="text-[9px] opacity-60 absolute bottom-1 right-3">(edited)</span>
                        )}
                        
                        {/* Edit/Delete Actions */}
                        {isMe && (
                          <div className={`absolute top-2 ${isMe ? '-left-8' : '-right-8'} opacity-0 group-hover:opacity-100 transition-opacity`}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                  <MoreVertical size={14} />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align={isMe ? "end" : "start"} className="w-32">
                                <DropdownMenuItem onClick={() => { setEditingMessageId(msg.id); setEditContent(msg.content); }}>
                                  <Pencil size={14} className="mr-2" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDeleteMessage(msg.id)}>
                                  <Trash2 size={14} className="mr-2" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Composer */}
      <div className="p-4 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 relative">
        {showSuggestions && (
          <div className="absolute bottom-full mb-2 left-4 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl overflow-hidden z-50">
            <div className="max-h-64 overflow-y-auto py-2">
              {suggestionType === 'user' && filteredUsers.map(u => (
                <div 
                  key={u.id} 
                  className="flex items-center gap-3 px-4 py-2 hover:bg-\[#fbfaf7\] dark:hover:bg-slate-800 cursor-pointer"
                  onClick={() => insertMention(u.id, u.name.replace(/\s+/g, ''), 'user')}
                >
                  <Avatar className="h-6 w-6"><AvatarFallback className="text-[10px]">{u.name.substring(0,2)}</AvatarFallback></Avatar>
                  <div>
                    <p className="text-sm font-medium">{u.name}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">{u.role}</p>
                  </div>
                </div>
              ))}
              {suggestionType === 'task' && filteredTasks.map(t => (
                <div 
                  key={t.id} 
                  className="flex items-center gap-3 px-4 py-2 hover:bg-\[#fbfaf7\] dark:hover:bg-slate-800 cursor-pointer"
                  onClick={() => insertMention(t.id, t.title.replace(/\s+/g, ''), 'task')}
                >
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{t.title}</p>
                    {t.status && <p className="text-[10px] text-muted-foreground">{t.status.name}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {!isClient && (
            <div className="flex items-center gap-2 px-1">
              <span className="text-xs font-medium text-slate-500">Visibility:</span>
              <div className="flex bg-slate-100 dark:bg-slate-800 rounded-full p-0.5">
                <button 
                  onClick={() => setVisibility('PUBLIC')}
                  className={`text-xs px-3 py-1 rounded-full flex items-center transition-all ${visibility === 'PUBLIC' ? 'bg-white dark:bg-slate-700 shadow-sm font-medium text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <Eye size={12} className="mr-1.5" /> Public
                </button>
                <button 
                  onClick={() => setVisibility('INTERNAL')}
                  className={`text-xs px-3 py-1 rounded-full flex items-center transition-all ${visibility === 'INTERNAL' ? 'bg-white dark:bg-slate-700 shadow-sm font-medium text-orange-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <EyeOff size={12} className="mr-1.5" /> Internal
                </button>
              </div>
            </div>
          )}

          <div className="flex items-end gap-3">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={content}
                onChange={handleInput}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Type a message... Use @ to mention someone or # to reference a task"
                className="w-full min-h-[60px] max-h-32 resize-none rounded-xl border border-slate-200 dark:border-slate-800 bg-\[#fbfaf7\] dark:bg-slate-900/50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all custom-scrollbar"
              />
            </div>
            <Button 
              onClick={sendMessage} 
              disabled={!content.trim()} 
              className="h-[60px] w-[60px] rounded-xl shrink-0 shadow-sm"
            >
              <Send size={20} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
