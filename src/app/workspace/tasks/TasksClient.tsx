'use client';

import React, { useState, useTransition, useEffect } from 'react';
import { createPortal } from 'react-dom';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatHours } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Search, Plus, Settings, Calendar, Clock, LayoutGrid, List, Columns,
  X, Type, Hash, Tags, Sparkles, PlusSquare, CheckSquare, Globe, Mail, Phone,
  AlignLeft, ChevronDown, Check, CircleDashed, CircleDot, CheckCircle2, Circle
} from 'lucide-react';
import { List as ListIcon2 } from 'lucide-react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Trash2, Repeat } from 'lucide-react';
import { deleteTaskAction, updateTaskAction, getTaskTemplatesAction, deleteTaskTemplateAction, createTaskStatusAction, updateTaskStatusAction, deleteTaskStatusAction } from '@/app/actions/tasks';
import { getTaskHiddenColumnsAction, setTaskHiddenColumnsAction } from '@/app/actions/settings';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import TaskFormModal from './TaskFormModal';
import StatusManagementModal from './StatusManagementModal';
import { DndContext, DragOverlay, useDraggable, useDroppable, closestCorners, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ─── TableCustomFieldCell ────────────────────────────────────────────────────

function TableCustomFieldCell({ task, col, setTasks, tasks }: any) {
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

  const updateValue = (val: any) => {
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
      return <textarea value={value || ''} onChange={e => updateValue(e.target.value)} placeholder="—" className={`${commonClasses} py-2 resize-none custom-scrollbar`} />;
    case 'checkbox':
      return (
        <div className="flex items-center justify-center h-full min-h-[40px]">
          <input type="checkbox" checked={!!value} onChange={e => updateValue(e.target.checked)} className="h-4 w-4 cursor-pointer" />
        </div>
      );
    case 'dropdown':
      return (
        <select value={value || ''} onChange={e => updateValue(e.target.value)} className={`${commonClasses} cursor-pointer`}>
          <option value="">—</option>
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
              <button type="button" onClick={() => updateValue(currentValues.filter((val: string) => val !== v))} className="text-slate-400 hover:text-red-500"><X size={10} /></button>
            </span>
          ))}
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
        </div>
      );
    }
    case 'date':
      return <input type="date" value={value || ''} onChange={e => updateValue(e.target.value)} className={`${commonClasses} cursor-pointer`} />;
    case 'number':
      return <input type="number" value={value || ''} onChange={e => updateValue(e.target.value)} placeholder="—" className={commonClasses} />;
    case 'email':
      return <input type="email" value={value || ''} onChange={e => updateValue(e.target.value)} placeholder="—" className={commonClasses} />;
    case 'phone':
      return <input type="tel" value={value || ''} onChange={e => updateValue(e.target.value)} placeholder="—" className={commonClasses} />;
    case 'website':
    case 'url':
      return <input type="url" value={value || ''} onChange={e => updateValue(e.target.value)} placeholder="—" className={commonClasses} />;
    default:
      return <input type="text" value={value || ''} onChange={e => updateValue(e.target.value)} placeholder="—" className={commonClasses} />;
  }
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

function KanbanColumn({ status, title, count, taskStatuses, children, onAddTask, currentUser, handleDeleteStage, handleRenameStage }: any) {
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
      
      <button 
        onClick={onAddTask}
        className="flex items-center gap-2 px-2 py-1.5 mb-3 text-sm font-medium transition-colors hover:opacity-80 rounded-md hover:bg-black/5 dark:hover:bg-white/5"
        style={{ color: statusColor }}
      >
        <Plus size={16} /> Add Task
      </button>

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
  const [fieldsTab, setFieldsTab] = useState('create_new');
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
    return Array.from(
      new Set(
        tasks
          .filter((t: any) => t.customFields && Array.isArray(t.customFields))
          .flatMap((t: any) => t.customFields.map((f: any) => f.name).filter(Boolean))
      )
    ).sort() as string[];
  }, [tasks]);

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
    (currentUser.role === 'MEMBER' && projects.some((p: any) => p.projectManagerId === currentUser.userId)) ||
    isClient;
  const canManageStatuses = currentUser.role === 'OWNER';

  const availableUsers = isClient
    ? users.filter(u => initialTasks.some(t => t.assignees.some((a: any) => a.userId === u.id)))
    : users;

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
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground">Manage your tasks, track hours, and monitor timelines.</p>
        </div>
        <div className="flex items-center gap-3">
          {canManageStatuses && (
            <Button variant="outline" onClick={() => setIsStatusManageOpen(true)}>
              <Settings className="w-4 h-4 mr-2" />
              Manage Statuses
            </Button>
          )}
          {canCreateTask && (
            <div className="flex items-center -space-x-px shadow-sm rounded-xl overflow-hidden">
              <Button
                onClick={() => {
                  setEditingTask(null);
                  setSelectedTemplateConfig(null);
                  setIsRepeatFromDropdown(false);
                  setIsCreateOpen(true);
                }}
                className="rounded-r-none h-10 px-4"
              >
                <Plus className="mr-2 h-4 w-4" /> Create Task
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="rounded-l-none border-l border-white/20 px-2.5 h-10">
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 bg-white dark:bg-[#1f1f1f] rounded-xl shadow-lg border border-black/5 dark:border-white/10 p-1.5 z-50">
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex flex-col gap-1">
            <span className="text-sm font-medium text-muted-foreground">Allocated Hours</span>
            <span className="text-2xl font-bold">{totalAllocated.toFixed(1)}h</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex flex-col gap-1">
            <span className="text-sm font-medium text-muted-foreground">Tracked Hours</span>
            <span className="text-2xl font-bold">{totalTracked.toFixed(1)}h</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex flex-col gap-1">
            <span className="text-sm font-medium text-muted-foreground">Remaining Hours</span>
            <span className="text-2xl font-bold">{remainingHours.toFixed(1)}h</span>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center bg-card p-4 rounded-lg border shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            className="pl-8 w-full bg-background"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <select
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          className="flex h-10 w-full md:w-[180px] rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <option value="all">All Tasks</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        <select
          value={selectedStatusId}
          onChange={(e) => setSelectedStatusId(e.target.value)}
          className="flex h-10 w-full md:w-[180px] rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">All Statuses</option>
          {taskStatuses.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        {currentUser.role !== 'MEMBER' && (
          <select
            value={selectedAssigneeId}
            onChange={(e) => setSelectedAssigneeId(e.target.value)}
            className="flex h-10 w-full md:w-[180px] rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">All Assignees</option>
            {availableUsers.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        )}

        <div className="flex items-center gap-1 bg-muted p-1 rounded-xl">
          <Button variant={viewMode === 'table' ? 'secondary' : 'ghost'} size="sm" className="px-2" onClick={() => handleSetViewMode('table')}>
            <List className="w-4 h-4" />
          </Button>
          <Button variant={viewMode === 'kanban' ? 'secondary' : 'ghost'} size="sm" className="px-2" onClick={() => handleSetViewMode('kanban')}>
            <Columns className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {viewMode === 'table' && (
        <div className="border rounded-lg bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Task</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Assignees</TableHead>
                <TableHead>Hours</TableHead>
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
                  <button
                    onClick={() => { setFieldsTab('create_new'); setIsFieldsDrawerOpen(true); }}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-white/5 rounded text-slate-400 transition-colors"
                    title="Add custom field"
                  >
                    <Plus size={16} className="mx-auto" />
                  </button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7 + customColumns.length} className="text-center h-24 text-muted-foreground">
                    No tasks found matching your filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredTasks.map((task: any) => (
                  <TableRow key={task.id} className="group hover:bg-muted/30">
                    <TableCell>
                      <div className="font-medium flex items-center gap-1.5 flex-wrap">
                        {task.title}
                        {task.isRepeated && (
                          <Badge variant="outline" className="text-[9px] bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/50 py-0 px-1 font-semibold flex items-center gap-0.5 align-middle">
                            <Repeat size={8} /> Recurring
                          </Badge>
                        )}
                      </div>
                      {task.dueDate && <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><Calendar size={12} /> {formatDate(task.dueDate)}</div>}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium hover:underline cursor-pointer" onClick={() => router.push(`/workspace/projects/${task.projectId}`)}>
                        {task.project.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      {task.status ? (
                        <Badge variant="outline" style={{ borderColor: task.status.color, color: task.status.color, backgroundColor: `${task.status.color}10` }}>
                          {task.status.name}
                        </Badge>
                      ) : (
                        <Badge variant="outline">No Status</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={`${getPriorityColor(task.priority)} border-transparent`}>
                        {task.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex -space-x-2">
                        {task.assignees.map((a: any) => (
                          <div key={a.userId} className="w-7 h-7 rounded-full bg-primary/10 border-2 border-background flex items-center justify-center text-[10px] font-bold text-primary" title={a.user.name}>
                            {a.user.name.charAt(0).toUpperCase()}
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs">
                        <span className="font-medium text-emerald-600">{formatHours(task.trackedHours)}</span>
                        <span className="text-muted-foreground"> / {task.allocatedHours ? formatHours(task.allocatedHours) : '-'}</span>
                      </div>
                    </TableCell>
                    {customColumns.map(col => (
                      <TableCell key={col.id} className="border-l border-slate-100 dark:border-white/5 p-0 align-top">
                        <TableCustomFieldCell task={task} col={col} setTasks={setTasks} tasks={tasks} />
                      </TableCell>
                    ))}
                    <TableCell>
                      {currentUser.role !== 'CLIENT' && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(task)}><Edit className="w-4 h-4 mr-2" /> Edit Task</DropdownMenuItem>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Status Change</DialogTitle>
            <DialogDescription>
              Are you sure you want to move &quot;{confirmDropState?.task.title}&quot; to {confirmDropState?.targetStatus.name}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDropState(null)} disabled={isUpdatingStatus}>Cancel</Button>
            <Button onClick={confirmStatusChange} disabled={isUpdatingStatus}>
              {isUpdatingStatus ? 'Moving...' : 'Confirm Move'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Task Confirmation */}
      <Dialog open={isDeleteTaskOpen} onOpenChange={setIsDeleteTaskOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Task</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this task? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteTaskOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDeleteTask} disabled={isPending}>
              {isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Template Confirmation */}
      <Dialog open={isDeleteTemplateOpen} onOpenChange={setIsDeleteTemplateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Template</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this task template? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteTemplateOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDeleteTemplate}>
              Delete Template
            </Button>
          </DialogFooter>
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
        <DialogContent className="sm:max-w-[600px] bg-background border-border flex flex-col h-[70vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Use Task Template</DialogTitle>
            <DialogDescription>
              Select a task template to pre-populate details and custom fields.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-4 space-y-4 custom-scrollbar">
            {taskTemplates.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center border border-dashed rounded-2xl text-muted-foreground p-6">
                <Repeat size={32} className="opacity-20 mb-2" />
                <p className="text-sm font-medium">No task templates saved yet.</p>
                <p className="text-xs text-center mt-1">Save a task template inside the creation form to reuse it here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {taskTemplates.map((tpl) => {
                  const config = tpl.config || {};
                  const fieldsCount = (config.customFields || []).length;
                  const dateFormatted = new Date(tpl.createdAt).toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  });

                  return (
                    <Card key={tpl.id} className="relative overflow-hidden group hover:border-purple-200 dark:hover:border-purple-900/50 transition-all duration-300 shadow-sm flex flex-col justify-between">
                      {currentUser.role === "OWNER" && (
                        <button
                          type="button"
                          onClick={() => handleDeleteTemplate(tpl.id)}
                          className="absolute right-3 top-3 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                      <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-sm font-bold truncate pr-6">{tpl.name}</CardTitle>
                        <CardDescription className="text-xs truncate">{config.title || "Untitled Task"}</CardDescription>
                      </CardHeader>
                      <CardContent className="p-4 pt-0 space-y-2 text-xs">
                        <div className="flex justify-between text-muted-foreground">
                          <span>Custom Fields:</span>
                          <span className="font-semibold text-foreground">{fieldsCount}</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                          <span>Created:</span>
                          <span className="font-semibold text-foreground">{dateFormatted}</span>
                        </div>
                        <Button
                          onClick={() => {
                            setSelectedTemplateConfig(config);
                            setIsTemplateSelectOpen(false);
                            setIsCreateOpen(true);
                          }}
                          className="w-full mt-2 h-8 text-xs font-semibold bg-purple-600 text-white hover:bg-purple-700"
                        >
                          Use Template
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
          <DialogFooter className="pt-4 border-t shrink-0">
            <Button variant="outline" onClick={() => setIsTemplateSelectOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
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
                    <button
                      onClick={() => setFieldsTab('create_new')}
                      className={`relative pb-2 ${fieldsTab === 'create_new' ? 'text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                      Create new
                      {fieldsTab === 'create_new' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-slate-900 dark:bg-white rounded-t" />}
                    </button>
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
