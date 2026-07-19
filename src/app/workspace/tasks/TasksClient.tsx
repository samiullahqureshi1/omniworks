'use client';

import React, { useState, useTransition, useEffect } from 'react';
import { createPortal } from 'react-dom';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumberStepper } from '@/components/ui/NumberStepper';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatHours } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Search, Plus, Settings, Calendar, Clock, LayoutGrid, List, Columns,
  X, Type, Hash, Tags, Sparkles, PlusSquare, CheckSquare, Globe, Mail, Phone,
  AlignLeft, ChevronDown, Check, CircleDashed, CircleDot, CheckCircle2, Circle,
  User, Flag
} from 'lucide-react';
import { List as ListIcon2 } from 'lucide-react';
import { Calendar as CalendarIcon } from 'lucide-react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Trash2, Repeat, TrendingUp, Hourglass, ChevronRight, Star, Filter, Layers, Pin } from 'lucide-react';
import { deleteTaskAction, updateTaskAction, getTaskTemplatesAction, deleteTaskTemplateAction, createTaskStatusAction, updateTaskStatusAction, deleteTaskStatusAction } from '@/app/actions/tasks';
import { getTaskHiddenColumnsAction, setTaskHiddenColumnsAction } from '@/app/actions/settings';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import TaskFormModal from './TaskFormModal';
import StatusManagementModal from './StatusManagementModal';
import { DndContext, DragOverlay, useDraggable, useDroppable, closestCorners, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { addDays, addWeeks, format } from 'date-fns';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';

// ─── Table Cell Components ────────────────────────────────────────────────────

function TableCustomFieldCell({ task, col, setTasks, tasks, currentUser }: any) {
  const customFields = Array.isArray(task.customFields) ? task.customFields : [];
  const field = customFields.find((f: any) => f.name === col.name);
  const value = field ? field.value : undefined;
  
  let options = field?.options;
  if (!options && Array.isArray(tasks)) {
    const otherTask = tasks.find((t: any) => {
      const tFields = Array.isArray(t.customFields) ? t.customFields : [];
      return tFields.some((f: any) => f.name === col.name && Array.isArray(f.options) && f.options.length > 0);
    });
    if (otherTask) {
      const f = otherTask.customFields.find((f: any) => f.name === col.name);
      options = f?.options;
    }
  }

  const isEditable = currentUser?.role === 'OWNER' || (currentUser?.role === 'MEMBER' && task.project?.projectManagerId === currentUser?.userId);

  const updateValue = (val: any) => {
    if (!isEditable) return;
    setTasks((prev: any) => prev.map((t: any) => {
      if (t.id === task.id) {
        const tFields = Array.isArray(t.customFields) ? [...t.customFields] : [];
        const fIndex = tFields.findIndex((f: any) => f.name === col.name);
        if (fIndex >= 0) {
          tFields[fIndex] = { ...tFields[fIndex], value: val };
        } else {
          tFields.push({ name: col.name, type: col.type, value: val, options });
        }
        import('@/app/actions/tasks').then(m => {
          m.updateTaskCustomFieldsAction(t.id, tFields).catch(console.error);
        });
        return { ...t, customFields: tFields };
      }
      return t;
    }));
  };

  const commonClasses = "w-full h-full border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-3 bg-transparent text-[13px] text-slate-700 dark:text-slate-300 rounded-none shadow-none outline-none appearance-none min-h-[40px]";
  const typeStr = (col.type || 'text').toLowerCase();

  switch (typeStr) {
    case 'text area':
      return <textarea disabled={!isEditable} value={value || ''} onChange={e => updateValue(e.target.value)} placeholder="—" className={`${commonClasses} py-2 resize-none custom-scrollbar min-h-[40px]`} />;
    case 'checkbox':
      return (
        <div className="flex items-center justify-center h-full min-h-[40px]">
          <input type="checkbox" disabled={!isEditable} checked={!!value} onChange={e => updateValue(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
        </div>
      );
    case 'dropdown':
      return (
        <select disabled={!isEditable} value={value || ''} onChange={e => updateValue(e.target.value)} className={`${commonClasses} cursor-pointer min-h-[40px]`}>
          <option value="" disabled>—</option>
          {(options || []).map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      );
    case 'labels': {
      const currentValues = Array.isArray(value) ? value : [];
      return (
        <div className="flex items-center flex-wrap gap-1.5 h-full px-3 py-1 overflow-y-auto custom-scrollbar min-h-[40px]">
          {currentValues.map((v: string) => (
            <span key={v} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300">
              {v}
              {isEditable && (
                <button type="button" onClick={() => updateValue(currentValues.filter((val: string) => val !== v))} className="text-slate-400 hover:text-red-500"><X size={10} /></button>
              )}
            </span>
          ))}
          {isEditable && (
            <select
              value=""
              onChange={e => {
                if (e.target.value && !currentValues.includes(e.target.value)) {
                  updateValue([...currentValues, e.target.value]);
                }
              }}
              className="bg-transparent text-[11px] text-slate-500 outline-none cursor-pointer"
            >
              <option value="">+ Add</option>
              {(options || []).map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          )}
        </div>
      );
    }
    case 'date':
      return <input type="date" disabled={!isEditable} value={value || ''} onChange={e => updateValue(e.target.value)} className={`${commonClasses} cursor-pointer min-h-[40px]`} />;
    case 'number':
      return <NumberStepper disabled={!isEditable} value={value || ''} onChange={e => updateValue(e.target.value)} placeholder="—" min={0} step={1} className={`${commonClasses} min-h-[40px]`} inputClassName="text-[13px] text-slate-700 dark:text-slate-300" />;
    case 'email':
      return <input type="email" disabled={!isEditable} value={value || ''} onChange={e => updateValue(e.target.value)} placeholder="—" className={`${commonClasses} min-h-[40px]`} />;
    case 'phone':
      return <input type="tel" disabled={!isEditable} value={value || ''} onChange={e => updateValue(e.target.value)} placeholder="—" className={`${commonClasses} min-h-[40px]`} />;
    case 'website':
    case 'url':
      return <input type="url" disabled={!isEditable} value={value || ''} onChange={e => updateValue(e.target.value)} placeholder="—" className={`${commonClasses} min-h-[40px]`} />;
    default:
      return <input type="text" disabled={!isEditable} value={value || ''} onChange={e => updateValue(e.target.value)} placeholder="—" className={`${commonClasses} min-h-[40px]`} />;
  }
}

function TableTaskNameCell({ task, setTasks, currentUser, openEdit }: any) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [isPending, startTransition] = React.useTransition();
  const router = useRouter();

  const isEditable = currentUser?.role === 'OWNER' || (currentUser?.role === 'MEMBER' && task.project?.projectManagerId === currentUser?.userId);

  const handleSave = () => {
    if (!title.trim() || title === task.title) {
      setIsEditing(false);
      return;
    }
    
    const prevTitle = task.title;
    setTasks((prev: any) => prev.map((t: any) => t.id === task.id ? { ...t, title } : t));
    setIsEditing(false);

    updateTaskAction(task.id, { title })
      .then((res) => {
        if (res.error) {
          toast.error(res.error);
          setTasks((prev: any) => prev.map((t: any) => t.id === task.id ? { ...t, title: prevTitle } : t));
        } else {
          router.refresh();
        }
      })
      .catch((err) => {
        toast.error(err.message || "Failed to update title");
        setTasks((prev: any) => prev.map((t: any) => t.id === task.id ? { ...t, title: prevTitle } : t));
      });
  };

  if (isEditing && isEditable) {
    return (
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave();
          if (e.key === 'Escape') {
            setTitle(task.title);
            setIsEditing(false);
          }
        }}
        autoFocus
        className="w-full h-full border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-3 bg-transparent text-[13px] font-medium text-slate-800 dark:text-slate-200 outline-none min-h-[40px]"
      />
    );
  }

  return (
    <div 
      className={`flex items-center h-full min-h-[40px] px-3 text-[13px] font-medium text-slate-800 dark:text-slate-200 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-white/5`}
      onClick={() => {
        if (!isEditable && openEdit) {
          openEdit(task);
        }
      }}
      onDoubleClick={() => {
        if (isEditable) setIsEditing(true);
      }}
    >
      <div className="flex items-center gap-1.5 flex-wrap">
        {task.title}
        {task.isRepeated && (
          <Badge variant="outline" className="text-[9px] bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/50 py-0 px-1 font-semibold flex items-center gap-0.5 align-middle">
            <Repeat size={8} /> Recurring
          </Badge>
        )}
      </div>
    </div>
  );
}

function TableTaskStatusCell({ task, taskStatuses, setTasks, currentUser }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = React.useTransition();
  const router = useRouter();

  const isAssigned = task.assignees?.some((a: any) => a.userId === currentUser?.userId);
  const isEditable = currentUser?.role === 'OWNER' || 
                     (currentUser?.role === 'MEMBER' && (task.project?.projectManagerId === currentUser?.userId || isAssigned));

  const handleUpdateStatus = (newStatusId: string) => {
    if (task.statusId === newStatusId) return;

    const previousStatus = task.status;
    const previousStatusId = task.statusId;
    const targetStatus = taskStatuses.find((s: any) => s.id === newStatusId);
    
    setTasks((prev: any) => prev.map((t: any) => 
      t.id === task.id ? { ...t, statusId: newStatusId, status: targetStatus } : t
    ));

    updateTaskAction(task.id, { statusId: newStatusId })
      .then((res) => {
        if (res.error) {
          toast.error(res.error);
          setTasks((prev: any) => prev.map((t: any) => 
            t.id === task.id ? { ...t, statusId: previousStatusId, status: previousStatus } : t
          ));
        } else {
          router.refresh();
        }
      })
      .catch((err) => {
        toast.error(err.message || "Failed to update status");
        setTasks((prev: any) => prev.map((t: any) => 
          t.id === task.id ? { ...t, statusId: previousStatusId, status: previousStatus } : t
        ));
      });
  };

  if (!isEditable) {
    return (
      <div className="flex items-center px-3 h-full min-h-[40px]">
        {task.status ? (
          <Badge variant="outline" style={{ borderColor: task.status.color, color: task.status.color, backgroundColor: `${task.status.color}10` }}>
            {task.status.name}
          </Badge>
        ) : (
          <Badge variant="outline">No Status</Badge>
        )}
      </div>
    );
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center justify-between w-full h-full min-h-[40px] px-3 hover:bg-slate-50 dark:hover:bg-white/5 outline-none text-left">
          {task.status ? (
            <Badge variant="outline" style={{ borderColor: task.status.color, color: task.status.color, backgroundColor: `${task.status.color}10` }}>
              {task.status.name}
            </Badge>
          ) : (
            <Badge variant="outline">No Status</Badge>
          )}
          <ChevronDown className="h-3 w-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48 bg-white dark:bg-[#1f1f1f] rounded-xl shadow-lg border border-black/5 dark:border-white/10 p-1 z-50">
        {taskStatuses.map((s: any) => (
          <DropdownMenuItem
            key={s.id}
            onClick={() => handleUpdateStatus(s.id)}
            className="cursor-pointer rounded-lg px-2.5 py-1.5 text-xs font-semibold hover:bg-muted focus:bg-muted flex items-center gap-2"
          >
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
            {s.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function TableTaskPriorityCell({ task, setTasks, currentUser }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = React.useTransition();
  const router = useRouter();

  const isEditable = currentUser?.role === 'OWNER' || (currentUser?.role === 'MEMBER' && task.project?.projectManagerId === currentUser?.userId);

  const priorities = [
    { value: "CRITICAL", label: "Urgent", color: "text-red-500", bg: "bg-red-50 dark:bg-red-950/20" },
    { value: "HIGH", label: "High", color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-950/20" },
    { value: "MEDIUM", label: "Normal", color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950/20" },
    { value: "LOW", label: "Low", color: "text-slate-400", bg: "bg-slate-50 dark:bg-slate-900/20" },
  ];

  const handlePrioritySelect = (newPriority: string) => {
    if (task.priority === newPriority) return;
    
    const previousPriority = task.priority;
    setTasks((prev: any) => prev.map((t: any) => 
      t.id === task.id ? { ...t, priority: newPriority } : t
    ));

    updateTaskAction(task.id, { priority: newPriority as any })
      .then((res) => {
        if (res.error) {
          toast.error(res.error);
          setTasks((prev: any) => prev.map((t: any) => 
            t.id === task.id ? { ...t, priority: previousPriority } : t
          ));
        } else {
          router.refresh();
        }
      })
      .catch((err) => {
        toast.error(err.message || "Failed to update priority");
        setTasks((prev: any) => prev.map((t: any) => 
          t.id === task.id ? { ...t, priority: previousPriority } : t
        ));
      });
  };

  const getPriorityInfo = (val: string) => {
    return priorities.find(p => p.value === val) || { label: val, color: "text-slate-500", bg: "bg-slate-100" };
  };

  const activeP = getPriorityInfo(task.priority);

  if (!isEditable) {
    return (
      <div className="flex items-center px-3 h-full min-h-[40px]">
        <Badge variant="outline" className={`${activeP.color} ${activeP.bg} border-transparent font-semibold`}>
          {activeP.label}
        </Badge>
      </div>
    );
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center justify-between w-full h-full min-h-[40px] px-3 hover:bg-slate-50 dark:hover:bg-white/5 outline-none text-left">
          <Badge variant="outline" className={`${activeP.color} ${activeP.bg} border-transparent font-semibold`}>
            {activeP.label}
          </Badge>
          <ChevronDown className="h-3 w-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-36 bg-white dark:bg-[#1f1f1f] rounded-xl shadow-lg border border-black/5 dark:border-white/10 p-1 z-50">
        {priorities.map((p) => (
          <DropdownMenuItem
            key={p.value}
            onClick={() => handlePrioritySelect(p.value)}
            className="cursor-pointer rounded-lg px-2.5 py-1.5 text-xs font-semibold hover:bg-muted focus:bg-muted flex items-center gap-2"
          >
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${p.color} ${p.bg}`}>
              {p.label}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function TableTaskDueDateCell({ task, setTasks, currentUser }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = React.useTransition();
  const router = useRouter();

  const isEditable = currentUser?.role === 'OWNER' || (currentUser?.role === 'MEMBER' && task.project?.projectManagerId === currentUser?.userId);

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    
    const previousDate = task.dueDate;
    const newDateStr = date.toISOString();
    
    setTasks((prev: any) => prev.map((t: any) => 
      t.id === task.id ? { ...t, dueDate: newDateStr } : t
    ));
    setIsOpen(false);
    
    updateTaskAction(task.id, { dueDate: newDateStr })
      .then((res) => {
        if (res.error) {
          toast.error(res.error);
          setTasks((prev: any) => prev.map((t: any) => 
            t.id === task.id ? { ...t, dueDate: previousDate } : t
          ));
        } else {
          toast.success("Due date updated");
          router.refresh();
        }
      })
      .catch((err) => {
        toast.error(err.message || "Failed to update due date");
        setTasks((prev: any) => prev.map((t: any) => 
          t.id === task.id ? { ...t, dueDate: previousDate } : t
        ));
      });
  };

  const quickDates = [
    { label: "Today", date: new Date() },
    { label: "Tomorrow", date: addDays(new Date(), 1) },
    { label: "Next week", date: addWeeks(new Date(), 1) },
    { label: "Next weekend", date: addDays(new Date(), 6 - new Date().getDay() + 7) },
    { label: "2 weeks", date: addWeeks(new Date(), 2) },
    { label: "4 weeks", date: addWeeks(new Date(), 4) },
    { label: "8 weeks", date: addWeeks(new Date(), 8) },
  ];

  if (!isEditable) {
    return (
      <div className="flex items-center gap-1.5 w-full h-full bg-transparent text-slate-700 dark:text-slate-300 font-medium px-4 py-3 text-[13px] tracking-wide text-left select-none">
        {task.dueDate ? (
          <span className={new Date(task.dueDate) < new Date() ? 'text-red-500 font-semibold' : ''}>
            {format(new Date(task.dueDate), 'MMM d, yyyy')}
          </span>
        ) : (
          <span className="text-slate-400 font-normal">—</span>
        )}
      </div>
    );
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-1.5 w-full h-full bg-transparent hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300 font-medium px-4 py-3 text-[13px] tracking-wide transition-colors outline-none text-left">
          {task.dueDate ? (
            <span className={new Date(task.dueDate) < new Date() ? 'text-red-500 font-semibold' : ''}>
              {format(new Date(task.dueDate), 'MMM d, yyyy')}
            </span>
          ) : (
            <span className="text-slate-400 font-normal">Set date</span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-auto p-0 flex flex-row bg-white dark:bg-[#1C1C1C] rounded-xl shadow-lg border border-slate-200 dark:border-white/10" onInteractOutside={() => setIsOpen(false)}>
        <div className="flex flex-col border-r border-slate-100 dark:border-white/5 w-[140px] py-2">
          {quickDates.map((qd, i) => (
            <button
              key={i}
              onClick={(e) => { e.preventDefault(); handleDateSelect(qd.date); }}
              className="flex justify-between items-center px-4 py-2 hover:bg-slate-50 dark:hover:bg-white/5 text-[13px] font-medium transition-colors text-left group"
            >
              <span className="text-slate-700 dark:text-slate-300">{qd.label}</span>
              <span className="text-[10px] text-slate-400 group-hover:text-slate-500">{format(qd.date, 'EEE')}</span>
            </button>
          ))}
          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-white/5">
             <button 
               onClick={(e) => {
                 e.preventDefault();
                 const previousDate = task.dueDate;
                 setTasks((prev: any) => prev.map((t: any) => t.id === task.id ? { ...t, dueDate: null } : t));
                 setIsOpen(false);

                 updateTaskAction(task.id, { dueDate: "" })
                   .then((res) => {
                     if (res.error) {
                       toast.error(res.error);
                       setTasks((prev: any) => prev.map((t: any) => t.id === task.id ? { ...t, dueDate: previousDate } : t));
                     } else {
                       toast.success("Due date cleared");
                       router.refresh();
                     }
                   })
                   .catch((err) => {
                     toast.error(err.message || "Failed to clear due date");
                     setTasks((prev: any) => prev.map((t: any) => t.id === task.id ? { ...t, dueDate: previousDate } : t));
                   });
               }}
               className="w-full flex justify-between items-center px-4 py-2 hover:bg-slate-50 dark:hover:bg-white/5 text-[13px] font-medium transition-colors text-red-500"
             >
               Clear date
             </button>
          </div>
        </div>
        <div className="p-3">
          <CalendarPicker
            mode="single"
            selected={task.dueDate ? new Date(task.dueDate) : undefined}
            onSelect={handleDateSelect}
          />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function TableTaskAssigneeCell({ task, users, setTasks, currentUser }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = React.useTransition();
  const router = useRouter();

  const isEditable = currentUser?.role === 'OWNER' || (currentUser?.role === 'MEMBER' && task.project?.projectManagerId === currentUser?.userId);
  const assignedUserIds = task.assignees?.map((a: any) => a.userId) || [];

  // Filter out users who have CLIENT role
  const assignableUsers = users.filter((u: any) => u.role !== 'CLIENT');

  const handleToggleAssignee = (userId: string) => {
    let newAssigneeIds = [...assignedUserIds];
    if (newAssigneeIds.includes(userId)) {
      newAssigneeIds = newAssigneeIds.filter(id => id !== userId);
    } else {
      newAssigneeIds.push(userId);
    }

    const previousAssignees = task.assignees;
    
    // Optimistically construct the new task.assignees array
    const newAssignees = newAssigneeIds.map(id => {
      const foundUser = users.find((u: any) => u.id === id);
      return {
        userId: id,
        taskId: task.id,
        user: { id, name: foundUser ? foundUser.name : '' }
      };
    });

    setTasks((prev: any) => prev.map((t: any) => 
      t.id === task.id ? { ...t, assignees: newAssignees } : t
    ));

    updateTaskAction(task.id, { assigneeIds: newAssigneeIds })
      .then((res) => {
        if (res.error) {
          toast.error(res.error);
          setTasks((prev: any) => prev.map((t: any) => 
            t.id === task.id ? { ...t, assignees: previousAssignees } : t
          ));
        } else {
          router.refresh();
        }
      })
      .catch((err) => {
        toast.error(err.message || "Failed to update assignees");
        setTasks((prev: any) => prev.map((t: any) => 
          t.id === task.id ? { ...t, assignees: previousAssignees } : t
        ));
      });
  };

  if (!isEditable) {
    return (
      <div className="flex items-center gap-1 px-3 h-full min-h-[40px] select-none">
        <div className="flex -space-x-2 overflow-hidden">
          {task.assignees?.map((a: any) => (
            <div key={a.userId} className="w-7 h-7 rounded-full bg-primary/10 border-2 border-background flex items-center justify-center text-[10px] font-bold text-primary shrink-0" title={a.user.name}>
              {a.user.name.charAt(0).toUpperCase()}
            </div>
          ))}
          {(!task.assignees || task.assignees.length === 0) && (
            <span className="text-slate-400 font-normal text-xs">—</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center justify-between w-full h-full min-h-[40px] px-3 hover:bg-slate-50 dark:hover:bg-white/5 outline-none text-left">
          <div className="flex -space-x-2 overflow-hidden">
            {task.assignees?.map((a: any) => (
              <div key={a.userId} className="w-7 h-7 rounded-full bg-primary/10 border-2 border-background flex items-center justify-center text-[10px] font-bold text-primary shrink-0 animate-in fade-in zoom-in duration-200" title={a.user.name}>
                {a.user.name.charAt(0).toUpperCase()}
              </div>
            ))}
            {(!task.assignees || task.assignees.length === 0) && (
              <span className="text-slate-400 font-normal text-xs text-left">Unassigned</span>
            )}
          </div>
          <ChevronDown className="h-3 w-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity ml-1.5 shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52 bg-white dark:bg-[#1f1f1f] rounded-xl shadow-lg border border-slate-200 dark:border-white/10 p-1 z-50 max-h-60 overflow-y-auto custom-scrollbar">
        {assignableUsers.map((u: any) => {
          const isAssigned = assignedUserIds.includes(u.id);
          return (
            <DropdownMenuItem
              key={u.id}
              onClick={(e) => {
                e.preventDefault(); // Keep menu open for multiple assignments
                handleToggleAssignee(u.id);
              }}
              className="cursor-pointer rounded-lg px-2.5 py-1.5 text-xs font-semibold hover:bg-muted focus:bg-muted flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-bold text-primary shrink-0">
                  {u.name.charAt(0).toUpperCase()}
                </div>
                <span className="truncate">{u.name}</span>
              </div>
              {isAssigned && (
                <Check size={14} className="text-primary shrink-0" />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Kanban helpers ───────────────────────────────────────────────────────────

function KanbanTaskCard({ task, currentUser, openEdit, handleDelete, router, isDraggingOverlay = false }: any) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: task,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  const priorityHex = task.priority === 'CRITICAL' ? '#ef4444' : task.priority === 'HIGH' ? '#f97316' : task.priority === 'MEDIUM' ? '#3b82f6' : '#cbd5e1';

  return (
    <div
      ref={isDraggingOverlay ? null : setNodeRef}
      style={style}
      {...(isDraggingOverlay ? {} : attributes)}
      {...(isDraggingOverlay ? {} : listeners)}
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (openEdit) openEdit(task);
      }}
      className={`bg-background border border-border/40 rounded-xl p-4 shadow-sm hover:shadow-lg hover:border-primary/30 transition-all duration-300 group flex flex-col gap-3 cursor-grab active:cursor-grabbing relative overflow-hidden ${isDragging ? 'opacity-40' : ''} ${isDraggingOverlay ? 'cursor-grabbing shadow-2xl scale-105' : ''}`}
    >
      <div className="absolute top-0 left-0 w-[4px] h-full transition-all duration-300 group-hover:w-[6px]" style={{ backgroundColor: priorityHex }} />

      <div className="flex justify-between items-start gap-3 pl-2">
        <span className="font-semibold text-[14px] leading-snug text-foreground/90 transition-colors line-clamp-2 flex items-center gap-1.5 flex-wrap">
          {task.title}
          {task.isRepeated && (
            <Badge variant="outline" className="text-[9px] bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/50 py-0 px-1 font-semibold flex items-center gap-0.5 shrink-0 align-middle">
              <Repeat size={8} /> Recurring
            </Badge>
          )}
        </span>
        {currentUser.role !== 'CLIENT' && !isDraggingOverlay && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-muted rounded-md cursor-pointer shrink-0" onPointerDown={(e) => e.stopPropagation()}>
                <MoreHorizontal size={14} className="text-muted-foreground hover:text-foreground" />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEdit(task); }} className="cursor-pointer">
                <Edit className="w-4 h-4 mr-2" /> Edit Task
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  const savedPinned = localStorage.getItem("omniwork_pinned_tasks");
                  const pinnedIds: string[] = savedPinned ? JSON.parse(savedPinned) : [];
                  const isPinned = pinnedIds.includes(task.id);
                  const next = isPinned ? pinnedIds.filter(id => id !== task.id) : [...pinnedIds, task.id];
                  localStorage.setItem("omniwork_pinned_tasks", JSON.stringify(next));
                  window.dispatchEvent(new Event('omniwork_tasks_pinned_changed'));
                  toast.success(isPinned ? "Task unpinned" : "Task pinned to sidebar");
                }}
              >
                <Pin className="w-4 h-4 mr-2" />
                {typeof window !== 'undefined' && (JSON.parse(localStorage.getItem("omniwork_pinned_tasks") || "[]")).includes(task.id) ? "Unpin Task" : "Pin Task"}
              </DropdownMenuItem>
              {(currentUser.role === 'OWNER' || task.project?.projectManagerId === currentUser.userId) && (
                <DropdownMenuItem className="text-destructive focus:text-destructive cursor-pointer" onClick={(e) => { e.stopPropagation(); handleDelete(task.id); }}>
                  <Trash2 className="w-4 h-4 mr-2" /> Delete Task
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="pl-2 flex items-center justify-between">
        <span className="text-[12px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded flex items-center hover:bg-primary/20 transition-colors cursor-pointer" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); router.push(`/workspace/projects/${task.projectId}`); }}>
          {task.project?.name}
        </span>

        {task.dueDate && (
          <div className="text-[11px] font-semibold flex items-center gap-1.5 text-muted-foreground">
            <Calendar size={12} className="opacity-70" /> {formatDate(task.dueDate)}
          </div>
        )}
      </div>

      <div className="flex justify-between items-center mt-2 pl-2">
        <div className="flex -space-x-2 overflow-hidden py-1">
          {task.assignees?.map((a: any) => (
            <div key={a.userId} className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-background shadow-sm transition-transform group-hover:scale-110 duration-200 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 text-[9px]" title={a.user?.name}>
              {a.user?.name?.charAt(0).toUpperCase()}
            </div>
          ))}
          {(!task.assignees || task.assignees.length === 0) && (
            <div className="w-6 h-6 rounded-full bg-slate-50 dark:bg-slate-900 border-2 border-background border-dashed flex items-center justify-center">
              <Plus size={10} className="text-muted-foreground" />
            </div>
          )}
        </div>

        {task.allocatedHours > 0 && (
          <div className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
            <Clock size={12} className="opacity-70" />
            <span>{formatHours(task.trackedHours || 0)} / {task.allocatedHours}h</span>
          </div>
        )}
      </div>
    </div>
  );
}

function KanbanColumn({ status, title, count, taskStatuses, children, onAddTask, canAddTask = true, currentUser, handleDeleteStage, handleRenameStage }: any) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging, isOver } = useSortable({
    id: status,
    data: { type: "COLUMN", status }
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(title);

  const getStatusColor = (statusId: string) => {
    const statusObj = taskStatuses?.find((s: any) => s.id === statusId);
    return statusObj?.color || '#94a3b8';
  };

  const statusColor = getStatusColor(status);

  const getStatusIcon = (name: string) => {
    const t = name.toLowerCase();
    if (t.includes('todo') || t.includes('to do') || t.includes('pending')) return <CircleDashed size={14} />;
    if (t.includes('progress') || t.includes('doing') || t.includes('active')) return <CircleDot size={14} />;
    if (t.includes('done') || t.includes('complete') || t.includes('finish')) return <CheckCircle2 size={14} />;
    return <Circle size={14} />;
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    backgroundColor: `${statusColor}15`
  };

  const submitRename = () => {
    if (editName.trim() !== "" && editName.trim() !== title) {
      handleRenameStage(status, editName.trim());
    } else {
      setEditName(title);
    }
    setIsEditing(false);
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className={`flex flex-col min-w-[320px] max-w-[320px] rounded-2xl p-3.5 transition-all duration-300 ${isOver ? 'shadow-md scale-[1.01] opacity-90' : ''} ${isDragging ? 'opacity-50 z-50 shadow-2xl scale-105 rotate-1 cursor-grabbing' : ''}`}
    >
      <div className="flex items-center justify-between mb-4 px-1" {...attributes} {...listeners}>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-slate-300 shadow-sm" onPointerDown={(e) => e.stopPropagation()}>
              {getStatusIcon(title)}
              <input 
                autoFocus
                type="text" 
                value={editName} 
                onChange={(e) => setEditName(e.target.value)} 
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitRename();
                  if (e.key === 'Escape') { setEditName(title); setIsEditing(false); }
                }}
                className="font-bold text-[12px] tracking-wide uppercase bg-transparent outline-none w-28 text-slate-800"
              />
              <button onClick={submitRename} className="text-emerald-600 hover:text-emerald-700 ml-1">
                <Check size={14} />
              </button>
            </div>
          ) : (
            <div 
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-white shadow-sm cursor-pointer hover:opacity-90" 
              style={{ backgroundColor: statusColor }}
              onPointerDown={(e) => {
                if (currentUser?.role === 'OWNER') {
                  e.stopPropagation();
                  setIsEditing(true);
                }
              }}
            >
              {getStatusIcon(title)}
              <h3 className="font-bold text-[12px] tracking-wide uppercase">{title}</h3>
            </div>
          )}
          <span className="text-[13px] font-medium text-slate-500 dark:text-slate-400 ml-1">
            {count}
          </span>
        </div>
        
        {currentUser?.role === 'OWNER' && (
          <div className="flex items-center gap-1 text-slate-400" onPointerDown={(e) => e.stopPropagation()}>
            <button 
              onClick={() => handleDeleteStage(status)}
              className="hover:text-red-500 p-1 rounded-md transition-colors"
            >
              <Trash2 size={14} />
            </button>
            <button className="hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded-md transition-colors">
              <MoreHorizontal size={14} />
            </button>
          </div>
        )}
      </div>
      
      {canAddTask && (
        <button
          onClick={onAddTask}
          className="flex items-center gap-2 px-2 py-1.5 mb-3 text-sm font-medium transition-colors hover:opacity-80 rounded-md hover:bg-black/5 dark:hover:bg-white/5"
          style={{ color: statusColor }}
        >
          <Plus size={16} /> Add Task
        </button>
      )}

      <div className="flex flex-col gap-2.5 overflow-y-auto custom-scrollbar pr-1 flex-1 pb-2">
        {children}
      </div>
    </div>
  );
}

// ─── Utility ──────────────────────────────────────────────────────────────────

const formatDate = (dateInput: any) => {
  if (!dateInput) return '';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${month}/${day}/${year}`;
  } catch (e) {
    return String(dateInput);
  }
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TasksClient({ initialTasks, taskStatuses, projects, users, currentUser }: {
  initialTasks: any[],
  taskStatuses: any[],
  projects: any[],
  users: any[],
  currentUser: any
}) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [selectedStatusId, setSelectedStatusId] = useState<string>('all');
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [showFilters, setShowFilters] = useState(false);
  const [groupByField, setGroupByField] = useState<'Status' | 'Assignee' | 'Priority' | 'Due date'>('Status');
  const [groupByOrder, setGroupByOrder] = useState<'Ascending' | 'Descending'>('Descending');

  const getFieldIcon = (field: 'Status' | 'Assignee' | 'Priority' | 'Due date', className?: string) => {
    const size = 14;
    switch (field) {
      case 'Status':
        return <CircleDot size={size} className={className} />;
      case 'Assignee':
        return <User size={size} className={className} />;
      case 'Priority':
        return <Flag size={size} className={className} />;
      case 'Due date':
        return <CalendarIcon size={size} className={className} />;
    }
  };

  // ── Drag & Drop
  const [activeDragItem, setActiveDragItem] = useState<any>(null);
  const [confirmDropState, setConfirmDropState] = useState<{ task: any, targetStatus: any } | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const handleDragStart = (event: any) => {
    if (currentUser?.role === 'CLIENT') return;
    setActiveDragItem(event.active.data.current);
  };

  const handleDragEnd = (event: any) => {
    setActiveDragItem(null);
    const { active, over } = event;
    if (currentUser?.role === 'CLIENT') {
      toast.error("Clients cannot make changes.");
      return;
    }
    if (!over) return;

    const activeData = active.data.current as any;

    // Column Reordering Logic
    if (activeData?.type === "COLUMN") {
      if (active.id !== over.id) {
        const oldIndex = taskStatuses.findIndex((s: any) => s.id === active.id);
        const newIndex = taskStatuses.findIndex((s: any) => s.id === over.id);
        
        const newStatuses = arrayMove(taskStatuses, oldIndex, newIndex);
        
        startTransition(async () => {
          try {
            await Promise.all(newStatuses.map((s: any, index: number) => 
              updateTaskStatusAction(s.id, s.name, s.color, index)
            ));
            router.refresh();
          } catch(e) {
            toast.error("Failed to reorder columns.");
          }
        });
      }
      return;
    }

    // Task Drag Logic
    const taskId = active.id as string;
    const task = tasks.find(t => t.id === taskId);
    const newStatusId = over.id as string;
    const targetStatus = taskStatuses.find(s => s.id === newStatusId);

    if (task && task.statusId !== newStatusId && targetStatus) {
      setConfirmDropState({ task, targetStatus });
    }
  };

  const confirmStatusChange = async () => {
    if (!confirmDropState) return;
    setIsUpdatingStatus(true);
    try {
      const res = await updateTaskAction(confirmDropState.task.id, {
        statusId: confirmDropState.targetStatus.id
      });
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(`Task moved to ${confirmDropState.targetStatus.name}`);
        setTasks(tasks.map((t: any) => t.id === confirmDropState.task.id ? { ...t, statusId: confirmDropState.targetStatus.id, status: confirmDropState.targetStatus } : t));
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to update status");
    } finally {
      setIsUpdatingStatus(false);
      setConfirmDropState(null);
    }
  };

  React.useEffect(() => {
    const savedView = localStorage.getItem("omniwork_task_view");
    if (savedView === "table" || savedView === "kanban") {
      setViewMode(savedView as any);
    }
  }, []);

  const handleSetViewMode = (mode: 'table' | 'kanban') => {
    setViewMode(mode);
    localStorage.setItem("omniwork_task_view", mode);
  };

  const [isPending, startTransition] = useTransition();

  // ── Status creation / editing / deleting (Part 2 inline status)
  const [isCreateStatusOpen, setIsCreateStatusOpen] = useState(false);
  const [newStatusName, setNewStatusName] = useState("");
  const [newStatusColor, setNewStatusColor] = useState("#94a3b8");
  const [isCreatingStatus, setIsCreatingStatus] = useState(false);
  const [isDeleteStageDialogOpen, setIsDeleteStageDialogOpen] = useState(false);
  const [deleteStageId, setDeleteStageId] = useState<string | null>(null);

  const handleDeleteStage = (statusId: string) => {
    setDeleteStageId(statusId);
    setIsDeleteStageDialogOpen(true);
  };

  const confirmDeleteStage = async () => {
    if (!deleteStageId) return;
    try {
      const res = await deleteTaskStatusAction(deleteStageId);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Stage deleted!");
        setIsDeleteStageDialogOpen(false);
        setDeleteStageId(null);
        router.refresh();
      }
    } catch (e) {
      toast.error("Failed to delete stage.");
    }
  };

  const handleRenameStage = async (statusId: string, newName: string) => {
    const statusObj = taskStatuses.find((s: any) => s.id === statusId);
    if (!statusObj) return;
    try {
      const res = await updateTaskStatusAction(statusId, newName, statusObj.color, statusObj.order);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Stage renamed!");
        router.refresh();
      }
    } catch (e) {
      toast.error("Failed to rename stage.");
    }
  };

  const handleCreateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStatusName.trim() || !newStatusColor) return;
    setIsCreatingStatus(true);
    try {
      const order = taskStatuses.length;
      const res = await createTaskStatusAction(newStatusName.trim(), newStatusColor, order);
      if (res.error) {
        toast.error(res.error);
      } else {
        setIsCreateStatusOpen(false);
        setNewStatusName("");
        router.refresh();
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to create status.");
    } finally {
      setIsCreatingStatus(false);
    }
  };

  // ── Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isStatusManageOpen, setIsStatusManageOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);

  // ── Templates
  const [taskTemplates, setTaskTemplates] = useState<any[]>([]);
  const [isTemplateSelectOpen, setIsTemplateSelectOpen] = useState(false);
  const [templateSearchQuery, setTemplateSearchQuery] = useState("");
  const [selectedTemplateConfig, setSelectedTemplateConfig] = useState<any>(null);
  const [isRepeatFromDropdown, setIsRepeatFromDropdown] = useState(false);

  // ── Delete Confirmation – Task
  const [isDeleteTaskOpen, setIsDeleteTaskOpen] = useState(false);
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);

  // ── Delete Confirmation – Template
  const [isDeleteTemplateOpen, setIsDeleteTemplateOpen] = useState(false);
  const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null);

  // ── Custom Columns / Fields Drawer
  const [customColumns, setCustomColumns] = useState<{ id: string, name: string, type: string }[]>([]);
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
  const [isFieldsDrawerOpen, setIsFieldsDrawerOpen] = useState(false);
  const [fieldsTab, setFieldsTab] = useState(currentUser?.role === 'OWNER' ? 'create_new' : 'add_existing');
  const [selectedFieldType, setSelectedFieldType] = useState<string | null>(null);
  const [newFieldOptions, setNewFieldOptions] = useState<string[]>([]);
  const [newOptionInput, setNewOptionInput] = useState('');
  const [newCustomFieldName, setNewCustomFieldName] = useState('');

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  // ── Load hidden columns from DB on mount
  useEffect(() => {
    getTaskHiddenColumnsAction().then(res => {
      if (res.success && res.columns) {
        setHiddenColumns(res.columns);
      }
    }).catch(console.error);
  }, []);

  // ── Auto-open task details from query param (?taskId=...)
  useEffect(() => {
    if (typeof window !== 'undefined' && tasks.length > 0) {
      const urlParams = new URLSearchParams(window.location.search);
      const taskIdParam = urlParams.get('taskId');
      if (taskIdParam) {
        const foundTask = tasks.find(t => t.id === taskIdParam);
        if (foundTask) {
          openEdit(foundTask);
        }
      }
    }
  }, [tasks]);

  const hideColumn = (colName: string) => {
    if (hiddenColumns.includes(colName)) return;
    const next = [...hiddenColumns, colName];
    setHiddenColumns(next);
    setCustomColumns(prev => prev.filter(c => c.name !== colName));
    setTaskHiddenColumnsAction(next).catch(console.error);
  };

  const unhideColumn = (colName: string) => {
    if (!hiddenColumns.includes(colName)) return;
    const next = hiddenColumns.filter(n => n !== colName);
    setHiddenColumns(next);
    setTaskHiddenColumnsAction(next).catch(console.error);
  };

  // ── Sync custom columns from all tasks' customFields
  useEffect(() => {
    if (tasks.length > 0) {
      setCustomColumns(prev => {
        const allFieldsMap = new Map<string, any>();
        prev.forEach(col => {
          if (!hiddenColumns.includes(col.name)) {
            allFieldsMap.set(col.name, col);
          }
        });
        tasks.forEach((t: any) => {
          if (Array.isArray(t.customFields)) {
            t.customFields.forEach((f: any) => {
              if (f.name && !allFieldsMap.has(f.name) && !hiddenColumns.includes(f.name)) {
                allFieldsMap.set(f.name, { id: crypto.randomUUID(), name: f.name, type: f.type || 'Text' });
              }
            });
          }
        });
        const nextCols = Array.from(allFieldsMap.values());
        if (nextCols.length !== prev.length || nextCols.some((c, i) => c.name !== prev[i]?.name)) {
          return nextCols;
        }
        return prev;
      });
    }
  }, [tasks, hiddenColumns]);

  // ── Existing custom field names (for "Add existing" tab)
  const existingCustomFields = React.useMemo(() => {
    const fieldsSet = new Set<string>();
    
    // From projects
    if (Array.isArray(projects)) {
      projects.forEach((p: any) => {
        if (p.customFields && Array.isArray(p.customFields)) {
          p.customFields.forEach((f: any) => {
            if (f.name) fieldsSet.add(f.name);
          });
        }
      });
    }

    // From tasks
    if (Array.isArray(tasks)) {
      tasks.forEach((t: any) => {
        if (t.customFields && Array.isArray(t.customFields)) {
          t.customFields.forEach((f: any) => {
            if (f.name) fieldsSet.add(f.name);
          });
        }
      });
    }

    return Array.from(fieldsSet).sort() as string[];
  }, [tasks, projects]);

  useEffect(() => {
    if (isTemplateSelectOpen) {
      getTaskTemplatesAction().then((res: any) => {
        if (res.success && res.templates) {
          setTaskTemplates(res.templates);
        }
      });
    }
  }, [isTemplateSelectOpen]);

  const isClient = currentUser.role === 'CLIENT';
  const canCreateTask = currentUser.role === 'OWNER' ||
    (currentUser.role === 'MEMBER' && projects.some((p: any) => p.projectManagerId === currentUser.userId));
  const canManageStatuses = currentUser.role === 'OWNER';

  const availableUsers = (isClient
    ? users.filter(u => initialTasks.some(t => t.assignees.some((a: any) => a.userId === u.id)))
    : users).filter(u => u.role !== 'CLIENT');

  // ── Filters
  const filteredTasks = tasks.filter(t => {
    if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (selectedProjectId !== 'all' && t.projectId !== selectedProjectId) return false;
    if (selectedStatusId !== 'all' && t.statusId !== selectedStatusId) return false;
    if (selectedAssigneeId !== 'all' && !t.assignees.some((a: any) => a.userId === selectedAssigneeId)) return false;
    return true;
  });

  const totalAllocated = filteredTasks.reduce((acc, t) => acc + (t.allocatedHours || 0), 0);
  const totalTracked = filteredTasks.reduce((acc, t) => acc + (t.trackedHours || 0), 0);
  const remainingHours = Math.max(0, totalAllocated - totalTracked);

  // ── Task deletion with modal confirm
  const handleDelete = (taskId: string) => {
    setDeleteTaskId(taskId);
    setIsDeleteTaskOpen(true);
  };

  const confirmDeleteTask = () => {
    if (!deleteTaskId) return;
    const id = deleteTaskId;
    setIsDeleteTaskOpen(false);
    setDeleteTaskId(null);
    startTransition(async () => {
      const res = await deleteTaskAction(id);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success('Task deleted successfully');
        setTasks(prev => prev.filter(t => t.id !== id));
        router.refresh();
      }
    });
  };

  // ── Template deletion with modal confirm
  const handleDeleteTemplate = (templateId: string) => {
    setDeleteTemplateId(templateId);
    setIsDeleteTemplateOpen(true);
  };

  const confirmDeleteTemplate = async () => {
    if (!deleteTemplateId) return;
    const id = deleteTemplateId;
    setIsDeleteTemplateOpen(false);
    setDeleteTemplateId(null);
    const res = await deleteTaskTemplateAction(id);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success('Task template deleted');
      setTaskTemplates(prev => prev.filter(t => t.id !== id));
    }
  };

  const openEdit = (task: any) => {
    setEditingTask(task);
    setIsCreateOpen(true);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'bg-red-100 text-red-800';
      case 'HIGH': return 'bg-orange-100 text-orange-800';
      case 'MEDIUM': return 'bg-blue-100 text-blue-800';
      case 'LOW': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className=" max-w-7xl mx-auto space-y-6">
      {/* Header Container that stretches to touch the sidebar */}
     <div className="-mx-6 -mt-6 border-b border-slate-200 dark:border-white/10 bg-white dark:bg-[#151518] z-20 mb-6">
        {/* Task Space title row */}
        <div className="px-6 pt-3.5 pb-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
            <span className="flex items-center justify-center w-5 h-5 rounded bg-purple-600 text-white">
              <CheckSquare size={12} />
            </span>

            <span className="text-slate-900 dark:text-white font-semibold text-base">
              Task Space
            </span>

            <Star size={14} className="text-slate-400 hover:text-yellow-500 cursor-pointer ml-1" />
          </div>
        </div>

        {/* Controls row */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-6 pb-3.5">
          {/* Left side: view switcher + group button */}
          <div className="flex flex-wrap items-center gap-4">
            {/* View toggle (Table / Kanban switcher) */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-800/80 p-0.5 rounded-[8px] border border-slate-200/50 dark:border-white/5">
              <button
                type="button"
                onClick={() => handleSetViewMode('table')}
                className={`h-7 px-3 rounded-[6px] text-xs font-semibold transition-all flex items-center cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-[#2c2c30] shadow-sm text-slate-900 dark:text-white'
                    : 'text-slate-500 hover:text-slate-750 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5 mr-1.5" /> Table
              </button>
              <button
                type="button"
                onClick={() => handleSetViewMode('kanban')}
                className={`h-7 px-3 rounded-[6px] text-xs font-semibold transition-all flex items-center cursor-pointer ${
                  viewMode === 'kanban'
                    ? 'bg-white dark:bg-[#2c2c30] shadow-sm text-slate-900 dark:text-white'
                    : 'text-slate-500 hover:text-slate-750 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <Columns className="w-3.5 h-3.5 mr-1.5" /> Kanban
              </button>
            </div>

            {/* Group Status Popover (styled exactly like project module) */}
            <PopoverPrimitive.Root>
              <PopoverPrimitive.Trigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400 text-xs font-semibold border border-blue-100 dark:border-blue-900/50 cursor-pointer transition-all hover:bg-blue-100/50 shadow-none h-[28px]"
                >
                  <Layers size={12} />
                  <span>Group: {groupByField}</span>
                </button>
              </PopoverPrimitive.Trigger>
              <PopoverPrimitive.Portal>
                <PopoverPrimitive.Content align="start" sideOffset={6} className="z-50 w-auto bg-white dark:bg-[#1a1a1a] rounded-[8px] border border-slate-200 dark:border-white/10 shadow-lg p-3 outline-none animate-in fade-in-0 zoom-in-95 duration-100">
                  <div className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 mb-1.5 uppercase tracking-wider">Group by</div>
                  
                  <div className="flex items-center gap-2">
                    {/* Group By Field Selector Dropdown */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button type="button" className="flex items-center justify-between gap-1.5 px-3 py-1.5 border border-slate-200 dark:border-white/10 rounded-[8px] text-sm bg-transparent hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer min-w-[140px] text-slate-700 dark:text-slate-200 text-left outline-none font-medium">
                          <span className="flex items-center gap-1.5">
                            {getFieldIcon(groupByField, "text-slate-500")}
                            {groupByField}
                          </span>
                          <ChevronDown size={14} className="text-slate-400" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-48 bg-white dark:bg-[#1a1a1a] rounded-[8px] border border-slate-200 dark:border-white/10 shadow-md p-1 z-[60]">
                        {(["Status", "Assignee", "Priority", "Due date"] as const).map((field) => (
                          <DropdownMenuItem
                            key={field}
                            onClick={() => setGroupByField(field)}
                            className="flex items-center justify-between px-2 py-1.5 text-xs rounded-[4px] hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer text-slate-700 dark:text-slate-200"
                          >
                            <span className="flex items-center gap-2">
                              {getFieldIcon(field, "text-slate-400")}
                              {field}
                            </span>
                            {groupByField === field && <Check size={12} className="text-slate-500" />}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Sorting Order Selector Dropdown */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button type="button" className="flex items-center justify-between gap-1.5 px-3 py-1.5 border border-slate-200 dark:border-white/10 rounded-[8px] text-sm bg-transparent hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer min-w-[110px] text-slate-700 dark:text-slate-200 text-left outline-none font-medium">
                          <span>{groupByOrder}</span>
                          <ChevronDown size={14} className="text-slate-400" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-32 bg-white dark:bg-[#1a1a1a] rounded-[8px] border border-slate-200 dark:border-white/10 shadow-md p-1 z-[60]">
                        {(["Ascending", "Descending"] as const).map((order) => (
                          <DropdownMenuItem
                            key={order}
                            onClick={() => setGroupByOrder(order)}
                            className="flex items-center justify-between px-2 py-1.5 text-xs rounded-[4px] hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer text-slate-700 dark:text-slate-200"
                          >
                            <span>{order}</span>
                            {groupByOrder === order && <Check size={12} className="text-slate-500" />}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Reset Button (Trash Icon) */}
                    <button
                      type="button"
                      onClick={() => {
                        setGroupByField("Status");
                        setGroupByOrder("Descending");
                      }}
                      title="Reset Grouping"
                      className="p-2 rounded-[8px] text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer transition-colors border border-slate-200 dark:border-white/10 outline-none flex items-center justify-center h-[34px] w-[34px]"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </PopoverPrimitive.Content>
              </PopoverPrimitive.Portal>
            </PopoverPrimitive.Root>
          </div>

          {/* Right side: Filter + Manage Statuses + Add Task */}
          <div className="flex flex-wrap items-center gap-3 ml-auto sm:ml-0">
            {/* Filter button dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button 
                  type="button" 
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer transition-colors shadow-none h-[28px] ${
                    (searchQuery || selectedProjectId !== 'all' || selectedStatusId !== 'all' || selectedAssigneeId !== 'all')
                      ? 'bg-slate-900 border-slate-900 text-white dark:bg-white dark:border-white dark:text-slate-900' 
                      : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-350 bg-white dark:bg-transparent'
                  }`}
                >
                  <Filter size={12} />
                  <span>Filter</span>
                  {(searchQuery || selectedProjectId !== 'all' || selectedStatusId !== 'all' || selectedAssigneeId !== 'all') && (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 animate-pulse" />
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 p-4 bg-white dark:bg-[#1a1a1a] rounded-[8px] border border-slate-200 dark:border-white/10 shadow-lg z-50">
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b pb-2 border-slate-100 dark:border-white/5">
                    <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200">Filters</h4>
                    {(searchQuery || selectedProjectId !== 'all' || selectedStatusId !== 'all' || selectedAssigneeId !== 'all') && (
                      <button 
                        type="button"
                        onClick={() => {
                          setSearchQuery("");
                          setSelectedProjectId("all");
                          setSelectedStatusId("all");
                          setSelectedAssigneeId("all");
                        }}
                        className="text-xs text-blue-650 hover:text-blue-500 font-medium cursor-pointer bg-transparent border-0 outline-none"
                      >
                        Clear all
                      </button>
                    )}
                  </div>
                  
                  {/* Search input */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-500">Search</label>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <Input
                        placeholder="Search tasks..."
                        className="pl-8.5 w-full h-8 text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 !rounded-[8px] focus-visible:ring-1 focus-visible:ring-slate-400 focus-visible:border-slate-400 transition-all duration-200 text-slate-700 dark:text-slate-200"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Project Selector */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-500">Project</label>
                    <select
                      value={selectedProjectId}
                      onChange={(e) => setSelectedProjectId(e.target.value)}
                      className="w-full h-8 text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-[8px] px-2 text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
                    >
                      <option value="all">All Tasks</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Status Selector */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-500">Status</label>
                    <select
                      value={selectedStatusId}
                      onChange={(e) => setSelectedStatusId(e.target.value)}
                      className="w-full h-8 text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-[8px] px-2 text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
                    >
                      <option value="all">All Statuses</option>
                      {taskStatuses.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Assignee Selector */}
                  {currentUser.role !== 'MEMBER' && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-500">Assignee</label>
                      <select
                        value={selectedAssigneeId}
                        onChange={(e) => setSelectedAssigneeId(e.target.value)}
                        className="w-full h-8 text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-[8px] px-2 text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
                      >
                        <option value="all">All Assignees</option>
                        {availableUsers.map(u => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {canManageStatuses && (
              <Button 
                variant="outline" 
                onClick={() => setIsStatusManageOpen(true)} 
                className="!rounded-[8px] h-9 border-slate-200 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5 text-slate-800 dark:text-slate-200 font-medium text-xs"
              >
                <Settings className="w-4 h-4 mr-2" />
                Manage Statuses
              </Button>
            )}

            {/* split Create Task button */}
            {canCreateTask && (
              <div className="flex items-center -space-x-px shadow-sm rounded-[8px] overflow-hidden">
                <Button
                  onClick={() => {
                    setEditingTask(null);
                    setSelectedTemplateConfig(null);
                    setIsRepeatFromDropdown(false);
                    setIsCreateOpen(true);
                  }}
                  className="rounded-r-none h-9 px-4 rounded-l-[8px] bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-xs font-semibold"
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Task
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button className="rounded-l-none border-l border-white/20 px-2.5 h-9 rounded-r-[8px] bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100">
                      <ChevronDown className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52 bg-white dark:bg-[#1c1c1f] rounded-xl shadow-lg border border-slate-200 dark:border-white/10 p-1.5 z-50">
                    <DropdownMenuItem
                      onClick={() => {
                        setEditingTask(null);
                        setSelectedTemplateConfig(null);
                        setIsRepeatFromDropdown(false);
                        setIsCreateOpen(true);
                      }}
                      className="cursor-pointer rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted focus:bg-muted"
                    >
                      Create New Task
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setIsTemplateSelectOpen(true)}
                      className="cursor-pointer rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted focus:bg-muted"
                    >
                      Use Existing Task Template
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setEditingTask(null);
                        setSelectedTemplateConfig(null);
                        setIsRepeatFromDropdown(true);
                        setIsCreateOpen(true);
                      }}
                      className="cursor-pointer rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted focus:bg-muted"
                    >
                      Create Repeated Task
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3 cards stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-50/40 via-white to-white dark:from-indigo-950/10 dark:via-background dark:to-background border border-slate-100 dark:border-white/5 rounded-2xl p-5 shadow-sm transition-all duration-300 hover:shadow-md">
          <div className="flex justify-between items-start">
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-indigo-500 uppercase tracking-wider">Allocated Hours</span>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100">{totalAllocated.toFixed(1)}</span>
                <span className="text-sm font-semibold text-slate-500">h</span>
              </div>
            </div>
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Clock size={20} />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="font-medium text-indigo-600 dark:text-indigo-400">{filteredTasks.length}</span> active tasks matching filter
          </div>
        </div>

        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-50/40 via-white to-white dark:from-emerald-950/10 dark:via-background dark:to-background border border-slate-100 dark:border-white/5 rounded-2xl p-5 shadow-sm transition-all duration-300 hover:shadow-md">
          <div className="flex justify-between items-start">
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider">Tracked Hours</span>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100">{totalTracked.toFixed(1)}</span>
                <span className="text-sm font-semibold text-slate-500">h</span>
              </div>
            </div>
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-muted-foreground">Progress</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{totalAllocated > 0 ? ((totalTracked / totalAllocated) * 100).toFixed(0) : 0}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(100, totalAllocated > 0 ? (totalTracked / totalAllocated) * 100 : 0)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden bg-gradient-to-br from-amber-50/40 via-white to-white dark:from-amber-950/10 dark:via-background dark:to-background border border-slate-100 dark:border-white/5 rounded-2xl p-5 shadow-sm transition-all duration-300 hover:shadow-md">
          <div className="flex justify-between items-start">
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">Remaining Hours</span>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100">{remainingHours.toFixed(1)}</span>
                <span className="text-sm font-semibold text-slate-500">h</span>
              </div>
            </div>
            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 rounded-xl">
              <Hourglass size={20} />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
            {totalAllocated > 0 && totalTracked > totalAllocated ? (
              <span className="font-semibold text-red-500">Over allocated limit!</span>
            ) : (
              <>
                <span className="font-medium text-amber-600 dark:text-amber-400">{totalAllocated > 0 ? ((remainingHours / totalAllocated) * 100).toFixed(0) : 100}%</span> of allocation left
              </>
            )}
          </div>
        </div>
      </div>

      {viewMode === 'table' && (
        <div className="border rounded-lg bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-10 text-center font-semibold text-slate-700 dark:text-slate-300">#</TableHead>
                <TableHead className="border-l border-slate-100 dark:border-white/5 font-semibold text-slate-700 dark:text-slate-300">Task</TableHead>
                <TableHead className="border-l border-slate-100 dark:border-white/5 font-semibold text-slate-700 dark:text-slate-300">Project</TableHead>
                <TableHead className="border-l border-slate-100 dark:border-white/5 font-semibold text-slate-700 dark:text-slate-300">Status</TableHead>
                <TableHead className="border-l border-slate-100 dark:border-white/5 font-semibold text-slate-700 dark:text-slate-300">Priority</TableHead>
                <TableHead className="border-l border-slate-100 dark:border-white/5 font-semibold text-slate-700 dark:text-slate-300">Due Date</TableHead>
                <TableHead className="border-l border-slate-100 dark:border-white/5 font-semibold text-slate-700 dark:text-slate-300">Assignees</TableHead>
                <TableHead className="border-l border-slate-100 dark:border-white/5 font-semibold text-slate-700 dark:text-slate-300">Hours</TableHead>
                {customColumns.map(col => (
                  <TableHead key={col.id} className="w-[180px] text-slate-500 font-medium text-[13px] border-l border-slate-100 dark:border-white/5">
                    <div className="flex items-center justify-between group/col">
                      <div className="flex items-center gap-2">
                        {col.type === 'Text' && <Type size={14} className="text-slate-400 shrink-0" />}
                        {col.type === 'Date' && <CalendarIcon size={14} className="text-slate-400 shrink-0" />}
                        {col.type === 'Number' && <Hash size={14} className="text-slate-400 shrink-0" />}
                        {col.type === 'Dropdown' && <ListIcon2 size={14} className="text-slate-400 shrink-0" />}
                        {col.type === 'Checkbox' && <CheckSquare size={14} className="text-slate-400 shrink-0" />}
                        {col.type === 'Website' && <Globe size={14} className="text-slate-400 shrink-0" />}
                        {col.type === 'Email' && <Mail size={14} className="text-slate-400 shrink-0" />}
                        {col.type === 'Phone' && <Phone size={14} className="text-slate-400 shrink-0" />}
                        {(col.type === 'Text area' || col.type === 'Labels' || col.type === 'AI Autofill') && <AlignLeft size={14} className="text-slate-400 shrink-0" />}
                        <span className="truncate">{col.name}</span>
                      </div>
                      <button
                        onClick={() => hideColumn(col.name)}
                        className="opacity-0 group-hover/col:opacity-100 transition-opacity text-slate-400 hover:text-red-500 shrink-0 ml-1"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </TableHead>
                ))}
                <TableHead className="w-[60px] text-center border-l border-slate-100 dark:border-white/5">
                  {currentUser.role === 'OWNER' && (
                    <button
                      onClick={() => { setFieldsTab('create_new'); setIsFieldsDrawerOpen(true); }}
                      className="p-1 hover:bg-slate-100 dark:hover:bg-white/5 rounded text-slate-400 transition-colors"
                      title="Add custom field"
                    >
                      <Plus size={16} className="mx-auto" />
                    </button>
                  )}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9 + customColumns.length} className="text-center h-24 text-muted-foreground">
                    No tasks found matching your filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredTasks.map((task: any, index: number) => (
                  <TableRow key={task.id} className="group hover:bg-slate-50/55 dark:hover:bg-white/5 transition-colors border-b border-slate-100 dark:border-white/5 bg-white dark:bg-transparent">
                    <TableCell className="text-center font-medium text-slate-400 text-xs px-4">
                      {index + 1}
                    </TableCell>
                    <TableCell className="border-l border-slate-100 dark:border-white/5 p-0">
                      <TableTaskNameCell task={task} setTasks={setTasks} currentUser={currentUser} openEdit={openEdit} />
                    </TableCell>
                    <TableCell className="border-l border-slate-100 dark:border-white/5">
                      <div className="text-sm font-medium hover:underline cursor-pointer" onClick={() => router.push(`/workspace/projects/${task.projectId}`)}>
                        {task.project.name}
                      </div>
                    </TableCell>
                    <TableCell className="border-l border-slate-100 dark:border-white/5 p-0">
                      <TableTaskStatusCell task={task} taskStatuses={taskStatuses} setTasks={setTasks} currentUser={currentUser} />
                    </TableCell>
                    <TableCell className="border-l border-slate-100 dark:border-white/5 p-0">
                      <TableTaskPriorityCell task={task} setTasks={setTasks} currentUser={currentUser} />
                    </TableCell>
                    <TableCell className="border-l border-slate-100 dark:border-white/5 p-0 text-[13px] font-medium text-slate-700 dark:text-slate-300">
                      <TableTaskDueDateCell task={task} setTasks={setTasks} currentUser={currentUser} />
                    </TableCell>
                    <TableCell className="border-l border-slate-100 dark:border-white/5 p-0">
                      <TableTaskAssigneeCell task={task} users={users} setTasks={setTasks} currentUser={currentUser} />
                    </TableCell>
                    <TableCell className="border-l border-slate-100 dark:border-white/5">
                      <div className="text-xs">
                        <span className="font-medium text-emerald-600">{formatHours(task.trackedHours)}</span>
                        <span className="text-muted-foreground"> / {task.allocatedHours ? formatHours(task.allocatedHours) : '-'}</span>
                      </div>
                    </TableCell>
                    {customColumns.map(col => (
                      <TableCell key={col.id} className="border-l border-slate-100 dark:border-white/5 p-0 align-top">
                        <TableCustomFieldCell task={task} col={col} setTasks={setTasks} tasks={tasks} currentUser={currentUser} />
                      </TableCell>
                    ))}
                    <TableCell className="border-l border-slate-100 dark:border-white/5 text-center">
                      {currentUser.role !== 'CLIENT' && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 mx-auto">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(task)}><Edit className="w-4 h-4 mr-2" /> Edit Task</DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                const savedPinned = localStorage.getItem("omniwork_pinned_tasks");
                                const pinnedIds: string[] = savedPinned ? JSON.parse(savedPinned) : [];
                                const isPinned = pinnedIds.includes(task.id);
                                const next = isPinned ? pinnedIds.filter(id => id !== task.id) : [...pinnedIds, task.id];
                                localStorage.setItem("omniwork_pinned_tasks", JSON.stringify(next));
                                window.dispatchEvent(new Event('omniwork_tasks_pinned_changed'));
                                toast.success(isPinned ? "Task unpinned" : "Task pinned to sidebar");
                              }}
                            >
                              <Pin className="w-4 h-4 mr-2" />
                              {typeof window !== 'undefined' && (JSON.parse(localStorage.getItem("omniwork_pinned_tasks") || "[]")).includes(task.id) ? "Unpin Task" : "Pin Task"}
                            </DropdownMenuItem>
                            {(currentUser.role === 'OWNER' || task.project.projectManagerId === currentUser.userId) && (
                              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDelete(task.id)}>
                                <Trash2 className="w-4 h-4 mr-2" /> Delete Task
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {viewMode === 'kanban' && (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-5 overflow-x-auto pb-6 pt-2 custom-scrollbar min-h-[calc(100vh-220px)] animate-in fade-in zoom-in-95 duration-200 px-2">
            <SortableContext items={taskStatuses.map((s: any) => s.id)} strategy={horizontalListSortingStrategy}>
              {taskStatuses.map((status) => {
                const statusTasks = filteredTasks.filter(t => t.statusId === status.id);
                return (
                  <KanbanColumn
                    key={status.id}
                    status={status.id}
                    title={status.name}
                    count={statusTasks.length}
                    taskStatuses={taskStatuses}
                    onAddTask={() => {
                      setEditingTask({ statusId: status.id });
                      setIsCreateOpen(true);
                    }}
                    canAddTask={canCreateTask}
                    currentUser={currentUser}
                    handleDeleteStage={handleDeleteStage}
                    handleRenameStage={handleRenameStage}
                  >
                    {statusTasks.map((task: any) => (
                      <KanbanTaskCard
                        key={task.id}
                        task={task}
                        currentUser={currentUser}
                        openEdit={openEdit}
                        handleDelete={handleDelete}
                        router={router}
                      />
                    ))}
                  </KanbanColumn>
                );
              })}
            </SortableContext>

            {currentUser.role === 'OWNER' && (
              <div className="shrink-0 flex items-start">
                <button 
                  onClick={() => setIsCreateStatusOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-2 mt-2 text-[14px] font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors bg-transparent border border-dashed border-transparent rounded-lg hover:bg-slate-50 dark:hover:bg-white/5"
                >
                  <Plus size={16} /> Add group
                </button>
              </div>
            )}
          </div>
          <DragOverlay>
            {activeDragItem ? (
              activeDragItem.type === "COLUMN" ? (
                <div className="opacity-80 scale-105 transition-transform cursor-grabbing w-[320px] rounded-2xl border-2 border-dashed border-primary bg-background shadow-2xl h-[200px]" />
              ) : (
                <div className="opacity-80 rotate-2 scale-105 transition-transform cursor-grabbing">
                  <KanbanTaskCard
                    task={activeDragItem}
                    currentUser={currentUser}
                    openEdit={openEdit}
                    handleDelete={handleDelete}
                    router={router}
                    isDraggingOverlay
                  />
                </div>
              )
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Confirm Status Change (Kanban drag) */}
      <Dialog open={!!confirmDropState} onOpenChange={(open) => !open && !isUpdatingStatus && setConfirmDropState(null)}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-[#151518] border border-slate-200/80 dark:border-white/10 p-0 sm:!rounded-[8px] !rounded-[8px] shadow-2xl overflow-hidden [&>button]:hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#19191c] relative shrink-0">
            <h2 className="text-[16.5px] font-bold text-slate-900 dark:text-white leading-tight">Confirm Status Change</h2>
            <p className="text-xs text-slate-450 dark:text-slate-400 mt-1">
              Are you sure you want to move &quot;{confirmDropState?.task.title}&quot; to {confirmDropState?.targetStatus.name}?
            </p>
            <DialogPrimitive.Close className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-250 dark:hover:bg-zinc-700 transition-all rounded-full p-1.5 cursor-pointer outline-none flex items-center justify-center h-7 w-7">
              <X size={14} />
            </DialogPrimitive.Close>
          </div>
          <div className="p-6">
            <p className="text-sm text-slate-500">This will update the task status in the database.</p>
          </div>
          <div className="px-6 py-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#19191c] flex justify-end gap-2.5">
            <Button variant="outline" onClick={() => setConfirmDropState(null)} disabled={isUpdatingStatus} className="!rounded-[8px] h-9">Cancel</Button>
            <Button onClick={confirmStatusChange} disabled={isUpdatingStatus} className="!rounded-[8px] h-9 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100">
              {isUpdatingStatus ? 'Moving...' : 'Confirm Move'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Task Confirmation */}
      <Dialog open={isDeleteTaskOpen} onOpenChange={setIsDeleteTaskOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-[#151518] border border-slate-200/80 dark:border-white/10 p-0 sm:!rounded-[8px] !rounded-[8px] shadow-2xl overflow-hidden [&>button]:hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#19191c] relative shrink-0">
            <h2 className="text-[16.5px] font-bold text-slate-900 dark:text-white leading-tight">Delete Task</h2>
            <p className="text-xs text-slate-450 dark:text-slate-400 mt-1">Are you sure you want to delete this task?</p>
            <DialogPrimitive.Close className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-250 dark:hover:bg-zinc-700 transition-all rounded-full p-1.5 cursor-pointer outline-none flex items-center justify-center h-7 w-7">
              <X size={14} />
            </DialogPrimitive.Close>
          </div>
          <div className="p-6">
            <p className="text-sm text-slate-500">This action cannot be undone. This task will be permanently removed.</p>
          </div>
          <div className="px-6 py-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#19191c] flex justify-end gap-2.5">
            <Button variant="outline" onClick={() => setIsDeleteTaskOpen(false)} className="!rounded-[8px] h-9">Cancel</Button>
            <Button onClick={confirmDeleteTask} disabled={isPending} className="!rounded-[8px] h-9 bg-red-650 hover:bg-red-700 text-white">
              {isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Template Confirmation */}
      <Dialog open={isDeleteTemplateOpen} onOpenChange={setIsDeleteTemplateOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-[#151518] border border-slate-200/80 dark:border-white/10 p-0 sm:!rounded-[8px] !rounded-[8px] shadow-2xl overflow-hidden [&>button]:hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#19191c] relative shrink-0">
            <h2 className="text-[16.5px] font-bold text-slate-900 dark:text-white leading-tight">Delete Template</h2>
            <p className="text-xs text-slate-450 dark:text-slate-400 mt-1">Are you sure you want to delete this task template?</p>
            <DialogPrimitive.Close className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-250 dark:hover:bg-zinc-700 transition-all rounded-full p-1.5 cursor-pointer outline-none flex items-center justify-center h-7 w-7">
              <X size={14} />
            </DialogPrimitive.Close>
          </div>
          <div className="p-6">
            <p className="text-sm text-slate-500">This action cannot be undone. This template will be permanently removed.</p>
          </div>
          <div className="px-6 py-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#19191c] flex justify-end gap-2.5">
            <Button variant="outline" onClick={() => setIsDeleteTemplateOpen(false)} className="!rounded-[8px] h-9">Cancel</Button>
            <Button onClick={confirmDeleteTemplate} className="!rounded-[8px] h-9 bg-red-650 hover:bg-red-700 text-white">
              Delete Template
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Task Form Modal */}
      {isCreateOpen && (
        <TaskFormModal
          isOpen={isCreateOpen}
          onOpenChange={(open) => {
            setIsCreateOpen(open);
            if (!open) {
              setEditingTask(null);
              setSelectedTemplateConfig(null);
              setIsRepeatFromDropdown(false);
            }
          }}
          task={editingTask}
          projects={projects}
          taskStatuses={taskStatuses}
          users={users}
          currentUser={currentUser}
          initialRepeatEnabled={isRepeatFromDropdown}
          initialTemplateConfig={selectedTemplateConfig}
          onSuccess={() => {
            setIsCreateOpen(false);
            setEditingTask(null);
            setSelectedTemplateConfig(null);
            setIsRepeatFromDropdown(false);
            router.refresh();
          }}
        />
      )}

      {/* Template Selection Modal */}
      <Dialog open={isTemplateSelectOpen} onOpenChange={setIsTemplateSelectOpen}>
        <DialogContent className="sm:max-w-[850px] h-[80vh] flex flex-col overflow-hidden bg-white dark:bg-[#151518] border border-slate-200/80 dark:border-white/10 p-0 sm:!rounded-[8px] !rounded-[8px] shadow-2xl [&>button]:hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#19191c] relative shrink-0">
            <h2 className="text-[16.5px] font-bold text-slate-900 dark:text-white leading-tight">Select a Template</h2>
            <p className="text-xs text-slate-450 dark:text-slate-400 mt-1">Choose one of your saved custom task templates.</p>
            <DialogPrimitive.Close className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-250 dark:hover:bg-zinc-700 transition-all rounded-full p-1.5 cursor-pointer outline-none flex items-center justify-center h-7 w-7">
              <X size={14} />
            </DialogPrimitive.Close>
          </div>

          {/* Search bar inside modal */}
          <div className="px-6 pt-4 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search templates by name..."
                value={templateSearchQuery}
                onChange={(e) => setTemplateSearchQuery(e.target.value)}
                className="pl-9 h-10 !rounded-[8px] border bg-background text-sm shadow-sm"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar">
            {taskTemplates.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center border border-dashed rounded-2xl border-slate-200 dark:border-white/10 text-slate-450 dark:text-slate-400 p-6">
                <Repeat size={32} className="opacity-20 mb-2" />
                <p className="text-sm font-medium">No templates saved yet.</p>
                <p className="text-xs text-center mt-1">Save a template using the button in the task form footer to reuse it here.</p>
              </div>
            ) : (() => {
              const filtered = taskTemplates.filter(t =>
                t.name.toLowerCase().includes(templateSearchQuery.toLowerCase())
              );

              if (filtered.length === 0) {
                return (
                  <div className="h-48 flex flex-col items-center justify-center text-muted-foreground">
                    <p className="text-sm font-medium">No templates match "{templateSearchQuery}"</p>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filtered.map((tpl) => {
                    const config = tpl.config || {};
                    const fieldsCount = (config.customFields || []).length;
                    const dateFormatted = new Date(tpl.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      year: "numeric",
                      day: "numeric",
                    });

                    return (
                      <div
                        key={tpl.id}
                        className="relative overflow-hidden group hover:border-slate-350 dark:hover:border-white/20 transition-all duration-300 shadow-sm border border-slate-100 dark:border-white/5 rounded-lg bg-white dark:bg-[#151518] p-5 flex flex-col justify-between h-44"
                      >
                        {currentUser?.role === 'OWNER' && (
                          <button
                            type="button"
                            onClick={() => handleDeleteTemplate(tpl.id)}
                            className="absolute right-4 top-4 text-slate-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}

                        <div className="space-y-1.5 pr-6">
                          <div className="flex items-center gap-1.5">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">{tpl.name}</h3>
                          </div>
                          
                          <div className="flex flex-wrap gap-1.5">
                            <Badge variant="secondary" className="bg-purple-50 text-purple-700 dark:bg-purple-950/20 dark:text-purple-400 border border-purple-100/50 dark:border-purple-900/30 text-[10px] font-bold py-0.5 px-2">
                              {fieldsCount} {fieldsCount === 1 ? 'Field' : 'Fields'}
                            </Badge>
                          </div>

                          <p className="text-[10px] text-muted-foreground font-semibold flex items-center">
                            <CalendarIcon className="h-3 w-3 mr-1" />
                            Created: {dateFormatted}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTemplateConfig(config);
                            setIsTemplateSelectOpen(false);
                            setIsCreateOpen(true);
                          }}
                          className="w-full text-xs font-bold h-9 !rounded-[8px] shadow-sm transition-colors cursor-pointer bg-slate-900 hover:bg-slate-800 dark:bg-white text-white dark:text-slate-900 dark:hover:bg-slate-100"
                        >
                          Use Template
                        </button>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          <div className="px-6 py-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#19191c] flex justify-end gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsTemplateSelectOpen(false)}
              className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 !rounded-[8px] transition-colors outline-none cursor-pointer"
            >
              Close
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {isStatusManageOpen && (
        <StatusManagementModal
          isOpen={isStatusManageOpen}
          onOpenChange={setIsStatusManageOpen}
          taskStatuses={taskStatuses}
          onSuccess={() => {
            router.refresh();
          }}
        />
      )}

      {/* ── Fields Drawer ── */}
      <DialogPrimitive.Root open={isFieldsDrawerOpen} onOpenChange={setIsFieldsDrawerOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay
            id="omniwork-task-fields-drawer-overlay"
            className="fixed inset-0 z-[9999] transition-opacity bg-black/10"
          />
          <DialogPrimitive.Content
            id="omniwork-task-fields-drawer"
            onInteractOutside={(e) => {
              e.preventDefault();
              setIsFieldsDrawerOpen(false);
            }}
            className="fixed z-[9999] outline-none bg-white dark:bg-[#1C1C1C] flex flex-col inset-y-0 right-0 w-full sm:w-[360px] shadow-2xl border-l border-slate-200 dark:border-white/10 transform transition-transform duration-300 animate-in slide-in-from-right-full"
          >
            {selectedFieldType ? (
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-white/5">
                  <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100 font-semibold">
                    <span className="capitalize">{selectedFieldType}</span>
                  </div>
                  <button
                    onClick={() => { setSelectedFieldType(null); setNewCustomFieldName(''); }}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-full transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="p-5 flex-1">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
                    Field name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative mb-8">
                    <Input
                      autoFocus
                      placeholder="Enter name..."
                      value={newCustomFieldName}
                      onChange={(e) => setNewCustomFieldName(e.target.value)}
                      className="h-10 bg-white dark:bg-[#252525] border-slate-300 dark:border-white/10 rounded-lg text-[14px]"
                    />
                  </div>

                  {(selectedFieldType === 'Dropdown' || selectedFieldType === 'Labels') && (
                    <div className="mb-6 border border-slate-200 dark:border-white/10 rounded-lg p-4 bg-slate-50 dark:bg-[#151515]">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 block">Options <span className="text-red-500">*</span></label>
                      <div className="flex gap-2 mb-3">
                        <Input
                          placeholder="Type an option and press Add..."
                          value={newOptionInput}
                          onChange={(e) => setNewOptionInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && newOptionInput.trim()) {
                              e.preventDefault();
                              if (!newFieldOptions.includes(newOptionInput.trim())) {
                                setNewFieldOptions([...newFieldOptions, newOptionInput.trim()]);
                              }
                              setNewOptionInput('');
                            }
                          }}
                          className="h-9 text-[13px] bg-white dark:bg-[#252525]"
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          className="h-9 px-3"
                          onClick={() => {
                            if (newOptionInput.trim() && !newFieldOptions.includes(newOptionInput.trim())) {
                              setNewFieldOptions([...newFieldOptions, newOptionInput.trim()]);
                              setNewOptionInput('');
                            }
                          }}
                        >
                          Add
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {newFieldOptions.map((opt) => (
                          <span key={opt} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[13px] font-medium bg-white dark:bg-[#252525] border border-slate-200 dark:border-white/10">
                            {opt}
                            <button
                              type="button"
                              onClick={() => setNewFieldOptions(newFieldOptions.filter(o => o !== opt))}
                              className="text-slate-400 hover:text-red-500 ml-1 focus:outline-none"
                            >
                              <X size={12} />
                            </button>
                          </span>
                        ))}
                        {newFieldOptions.length === 0 && (
                          <span className="text-[13px] text-slate-400 italic">No options added yet.</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-4 border-t border-slate-100 dark:border-white/5 flex justify-end gap-3 bg-slate-50 dark:bg-[#151515]">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 px-4 rounded-lg font-medium"
                    onClick={() => { setSelectedFieldType(null); setNewCustomFieldName(''); }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    disabled={!newCustomFieldName.trim() || ((selectedFieldType === 'Dropdown' || selectedFieldType === 'Labels') && newFieldOptions.length === 0)}
                    onClick={() => {
                      const newFieldType = (selectedFieldType || 'text').toLowerCase();
                      const newField: any = { name: newCustomFieldName, type: newFieldType, value: '' };
                      if (newFieldType === 'dropdown' || newFieldType === 'labels') {
                        newField.options = newFieldOptions;
                        if (newFieldType === 'labels') newField.value = [];
                      }

                      // Propagate to ALL existing tasks locally
                      const updatedTasks = tasks.map((t: any) => {
                        const existingFields = Array.isArray(t.customFields) ? t.customFields : [];
                        return { ...t, customFields: [...existingFields, newField] };
                      });
                      setTasks(updatedTasks);

                      // Save to DB for all tasks
                      updatedTasks.forEach((t: any) => {
                        import('@/app/actions/tasks').then(m => {
                          m.updateTaskCustomFieldsAction(t.id, t.customFields).catch(console.error);
                        });
                      });

                      // Add column immediately
                      setCustomColumns(prev => [...prev, { id: crypto.randomUUID(), name: newCustomFieldName, type: selectedFieldType || 'Text' }]);

                      setSelectedFieldType(null);
                      setNewCustomFieldName('');
                      setNewFieldOptions([]);
                      setNewOptionInput('');
                      setIsFieldsDrawerOpen(false);
                    }}
                    className="h-9 px-5 rounded-lg font-medium bg-slate-700 hover:bg-slate-800 text-white disabled:opacity-50 transition-colors"
                  >
                    Create
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-white/5">
                  <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Fields</h2>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setIsFieldsDrawerOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-full transition-colors">
                      <X size={16} />
                    </button>
                  </div>
                </div>

                <div className="p-4 border-b border-slate-100 dark:border-white/5 space-y-4">
                  <div className="flex gap-6 text-sm font-medium">
                    {currentUser?.role === 'OWNER' && (
                      <button
                        onClick={() => setFieldsTab('create_new')}
                        className={`relative pb-2 ${fieldsTab === 'create_new' ? 'text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                      >
                        Create new
                        {fieldsTab === 'create_new' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-slate-900 dark:bg-white rounded-t" />}
                      </button>
                    )}
                    <button
                      onClick={() => setFieldsTab('add_existing')}
                      className={`relative pb-2 ${fieldsTab === 'add_existing' ? 'text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                      Add existing
                      {fieldsTab === 'add_existing' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-slate-900 dark:bg-white rounded-t" />}
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                  {fieldsTab === 'create_new' && (
                    <div className="py-2">
                      <div className="px-4 py-2">
                        <h3 className="text-[13px] font-medium text-slate-500 mb-2">Popular</h3>
                        <div className="space-y-1">
                          <button onClick={() => setSelectedFieldType('Dropdown')} className="w-full flex items-center gap-3 px-3 py-2 text-[14px] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 rounded-md transition-colors">
                            <ListIcon2 size={16} className="text-emerald-600" /> Dropdown
                          </button>
                          <button onClick={() => setSelectedFieldType('Text')} className="w-full flex items-center gap-3 px-3 py-2 text-[14px] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 rounded-md transition-colors">
                            <Type size={16} className="text-blue-500" /> Text
                          </button>
                          <button onClick={() => setSelectedFieldType('Date')} className="w-full flex items-center gap-3 px-3 py-2 text-[14px] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 rounded-md transition-colors">
                            <CalendarIcon size={16} className="text-emerald-600" /> Date
                          </button>
                          <button onClick={() => setSelectedFieldType('Text area')} className="w-full flex items-center gap-3 px-3 py-2 text-[14px] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 rounded-md transition-colors">
                            <AlignLeft size={16} className="text-blue-500" /> Text area <span className="text-slate-400 ml-1">(Long Text)</span>
                          </button>
                          <button onClick={() => setSelectedFieldType('Number')} className="w-full flex items-center gap-3 px-3 py-2 text-[14px] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 rounded-md transition-colors">
                            <Hash size={16} className="text-emerald-500" /> Number
                          </button>
                          <button onClick={() => setSelectedFieldType('Checkbox')} className="w-full flex items-center gap-3 px-3 py-2 text-[14px] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 rounded-md transition-colors">
                            <CheckSquare size={16} className="text-purple-500" /> Checkbox
                          </button>
                          <button onClick={() => setSelectedFieldType('Website')} className="w-full flex items-center gap-3 px-3 py-2 text-[14px] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 rounded-md transition-colors">
                            <Globe size={16} className="text-pink-500" /> Website
                          </button>
                          <button onClick={() => setSelectedFieldType('Phone')} className="w-full flex items-center gap-3 px-3 py-2 text-[14px] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 rounded-md transition-colors">
                            <Phone size={16} className="text-emerald-600" /> Phone
                          </button>
                          <button onClick={() => setSelectedFieldType('Email')} className="w-full flex items-center gap-3 px-3 py-2 text-[14px] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 rounded-md transition-colors">
                            <Mail size={16} className="text-blue-500" /> Email
                          </button>
                          <button onClick={() => setSelectedFieldType('Labels')} className="w-full flex items-center gap-3 px-3 py-2 text-[14px] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 rounded-md transition-colors">
                            <Tags size={16} className="text-emerald-600" /> Labels <span className="text-slate-400 ml-1">(Multi-select)</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {fieldsTab === 'add_existing' && (
                    <div className="py-2">
                      <div className="px-4 py-2">
                        {existingCustomFields.length > 0 ? (
                          <div className="space-y-1">
                            {existingCustomFields.map((fieldName) => (
                              <button
                                key={fieldName}
                                type="button"
                                onClick={() => {
                                  // Find type/options from any task that has it
                                  let matchedType = 'Text';
                                  let matchedOptions: string[] | undefined;
                                  const otherTask = tasks.find((t: any) => {
                                    const tFields = Array.isArray(t.customFields) ? t.customFields : [];
                                    return tFields.some((f: any) => f.name === fieldName);
                                  });
                                  if (otherTask) {
                                    const f = otherTask.customFields.find((f: any) => f.name === fieldName);
                                    matchedType = f?.type || 'Text';
                                    matchedOptions = f?.options;
                                  }

                                  // Unhide if hidden
                                  unhideColumn(fieldName);

                                  // Add field to all tasks that don't have it
                                  const newField = { name: fieldName, type: matchedType, value: '', options: matchedOptions };
                                  const updatedTasks = tasks.map((t: any) => {
                                    const existingFields = Array.isArray(t.customFields) ? t.customFields : [];
                                    if (existingFields.some((f: any) => f.name === fieldName)) return t;
                                    return { ...t, customFields: [...existingFields, newField] };
                                  });
                                  setTasks(updatedTasks);

                                  updatedTasks.forEach((t: any) => {
                                    import('@/app/actions/tasks').then(m => {
                                      m.updateTaskCustomFieldsAction(t.id, t.customFields).catch(console.error);
                                    });
                                  });

                                  // Add column if not present
                                  if (!customColumns.some(c => c.name === fieldName)) {
                                    setCustomColumns(prev => [...prev, { id: crypto.randomUUID(), name: fieldName, type: matchedType }]);
                                  }

                                  setIsFieldsDrawerOpen(false);
                                }}
                                className="w-full flex items-center justify-between px-3 py-2 text-[14px] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 rounded-md transition-colors group"
                              >
                                <div className="flex items-center gap-3">
                                  <Tags size={16} className="text-slate-400" />
                                  <span className="truncate">{fieldName}</span>
                                </div>
                                <Plus size={14} className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center text-sm text-slate-500 py-6">
                            No existing custom fields found.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      {/* CREATE STATUS DIALOG */}
      <Dialog open={isCreateStatusOpen} onOpenChange={setIsCreateStatusOpen}>
        <DialogContent className="sm:max-w-sm bg-background border-border">
          <DialogHeader>
            <DialogTitle>Add New Group</DialogTitle>
            <DialogDescription>
              Create a new status column for your workflow.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateStatus} className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Status Name</label>
              <Input 
                value={newStatusName} 
                onChange={(e) => setNewStatusName(e.target.value)} 
                placeholder="e.g. In Review" 
                required 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Color</label>
              <div className="flex gap-2">
                {["#94a3b8", "#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#a855f7"].map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewStatusColor(color)}
                    className={`w-8 h-8 rounded-full transition-transform ${newStatusColor === color ? 'scale-110 ring-2 ring-offset-2 ring-slate-400' : 'hover:scale-105'}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setIsCreateStatusOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isCreatingStatus || !newStatusName.trim()}>
                {isCreatingStatus ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Stage Confirmation Modal */}
      <Dialog open={isDeleteStageDialogOpen} onOpenChange={setIsDeleteStageDialogOpen}>
        <DialogContent className="sm:max-w-md bg-background border-border">
          <DialogHeader>
            <DialogTitle className="text-xl text-destructive flex items-center gap-2">
              <Trash2 size={20} /> Delete Stage
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete this stage? Ensure there are no tasks inside it first.
            </p>
          </div>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setIsDeleteStageDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteStage}>
              Delete Stage
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
