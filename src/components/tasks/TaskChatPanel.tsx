'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Send, User, Loader2, MessageSquare } from 'lucide-react';
import { MentionsInput, Mention } from 'react-mentions';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

export default function TaskChatPanel({ task, currentUser, onClose }: any) {
  const [messages, setMessages] = useState<any[]>([]);
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [mentionSuggestions, setMentionSuggestions] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (task?.id) {
      fetchMessages();
      fetchMentionSuggestions();
    }
  }, [task?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/tasks/${task.id}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages);
      }
    } catch (error) {
      console.error('Failed to fetch messages', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMentionSuggestions = async () => {
    try {
      const res = await fetch(`/api/tasks/${task.id}/mention-suggestions`);
      if (res.ok) {
        const data = await res.json();
        setMentionSuggestions(data.suggestions);
      }
    } catch (error) {
      console.error('Failed to fetch suggestions', error);
    }
  };

  const handleSendMessage = async () => {
    if (!content.trim()) return;

    try {
      setIsSending(true);
      
      const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
      const mentionsList: string[] = [];
      let match;
      while ((match = mentionRegex.exec(content)) !== null) {
        mentionsList.push(match[2]);
      }

      const res = await fetch(`/api/tasks/${task.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          mentions: mentionsList,
          visibility: 'PUBLIC'
        })
      });

      if (res.ok) {
        const data = await res.json();
        setMessages([...messages, data.message]);
        setContent('');
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to send message');
      }
    } catch (error) {
      toast.error('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const parseMessageContent = (text: string) => {
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      parts.push(
        <span key={match.index} className="px-1 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 rounded font-semibold text-[13px]">
          @{match[1]}
        </span>
      );
      lastIndex = mentionRegex.lastIndex;
    }
    
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  // Custom styles for react-mentions
  const mentionInputStyle = {
    control: {
      backgroundColor: 'transparent',
      fontSize: 14,
      fontWeight: 'normal',
    },
    input: {
      margin: 0,
      padding: '12px 16px',
      border: 'none',
      outline: 'none',
      width: '100%',
      height: '100%',
      overflow: 'auto',
    },
    suggestions: {
      list: {
        backgroundColor: 'var(--tw-colors-white)',
        border: '1px solid var(--tw-colors-slate-200)',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        fontSize: 14,
        maxHeight: '200px',
        overflowY: 'auto' as 'auto',
        zIndex: 50
      },
      item: {
        padding: '8px 12px',
        borderBottom: '1px solid var(--tw-colors-slate-100)',
        '&focused': {
          backgroundColor: 'var(--tw-colors-slate-50)',
        },
      },
    },
  };

  return (
    <Card className="flex flex-col h-full border-0 rounded-none shadow-none bg-slate-50 dark:bg-[#181818]">
      <CardHeader className="flex flex-row items-center justify-between p-4 border-b bg-white dark:bg-[#1f1f1f]">
        <div className="flex items-center gap-3 overflow-hidden">
          <MessageSquare className="w-5 h-5 text-blue-500 shrink-0" />
          <div className="flex flex-col truncate">
            <CardTitle className="text-base font-bold truncate">{task.title}</CardTitle>
            <span className="text-xs text-slate-500 font-medium">Conversation Thread</span>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0 h-8 w-8 rounded-full">
          <X className="w-4 h-4" />
        </Button>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden relative">
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
              <MessageSquare className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-sm font-medium">No messages yet.</p>
              <p className="text-xs">Start the conversation!</p>
            </div>
          ) : (
            messages.map((msg: any) => {
              const isMe = msg.senderId === currentUser?.userId;
              return (
                <div key={msg.id} className={`flex gap-3 max-w-[85%] ${isMe ? 'self-end flex-row-reverse' : 'self-start'}`}>
                  <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-slate-500" />
                  </div>
                  <div className={`flex flex-col gap-1 ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{msg.sender?.name}</span>
                      <span className="text-[10px] text-slate-500">{formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}</span>
                    </div>
                    <div className={`px-4 py-2.5 rounded-2xl text-sm ${isMe ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-white dark:bg-[#252525] border shadow-sm rounded-tl-sm'}`}>
                      <p className="whitespace-pre-wrap break-words">
                        {parseMessageContent(msg.content)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-white dark:bg-[#1f1f1f] border-t">
          <div className="relative border rounded-xl overflow-hidden bg-slate-50 dark:bg-[#181818] focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all">
            <div className="min-h-[80px]">
              <MentionsInput
                value={content || ''}
                onChange={(e, newValue) => setContent(newValue || '')}
                placeholder="Type a message... use @ to mention someone"
                style={mentionInputStyle}
                className="mentions-input-container w-full h-full text-sm outline-none"
              >
                <Mention
                  trigger="@"
                  data={mentionSuggestions}
                  displayTransform={(id, display) => `@${display}`}
                  renderSuggestion={(suggestion: any, search, highlightedDisplay) => (
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold">{suggestion.display}</span>
                      <span className="text-[10px] text-slate-500 uppercase">{suggestion.type || suggestion.role}</span>
                    </div>
                  )}
                  style={{ backgroundColor: 'transparent' }}
                />
              </MentionsInput>
            </div>
            <div className="absolute bottom-2 right-2 flex items-center">
              <Button size="icon" className="h-8 w-8 rounded-lg bg-blue-600 hover:bg-blue-700 text-white" disabled={!content.trim() || isSending} onClick={handleSendMessage}>
                {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
