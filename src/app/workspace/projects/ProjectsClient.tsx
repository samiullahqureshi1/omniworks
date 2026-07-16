  "use client";

  import React, { useState, useTransition, useEffect } from "react";
  import { createPortal } from "react-dom";
  import * as DialogPrimitive from "@radix-ui/react-dialog";
  import { useSearchParams, useRouter } from "next/navigation";
  import Link from "next/link";
  import { Button } from "@/components/ui/button";
  import { Input } from "@/components/ui/input";
  import { NumberStepper } from "@/components/ui/NumberStepper";
  import {
    FolderKanban,
    Search,
    Plus,
    Calendar as CalendarIcon,
    Clock,
    MoreHorizontal,
    Users,
    ShieldAlert,
    ArrowRight,
    X,
    Trash2,
    LayoutGrid,
    List as ListIcon,
    Table as TableIcon,
    Edit2,
    ChevronDown,
    Repeat,
    Check,
    Pin,
    Shield,
    Crown,
    Star,
    Inbox,
    Briefcase,
    CircleDashed,
    CircleDot,
    CheckCircle2,
    Circle,
    Flag,
    Settings,
    DollarSign,
    MessageSquare,
    AlignLeft,
    Type,
    Hash,
    Tags,
    Sparkles,
    PlusSquare,
    CheckSquare,
    Globe,
    Mail,
    Phone,
    Smile,
    EyeOff,
  } from "lucide-react";
  import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from "@/components/ui/table";
  import { Badge } from "@/components/ui/badge";
  import { Avatar, AvatarFallback } from "@/components/ui/avatar";
  import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
  } from "@/components/ui/dialog";
  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
  } from "@/components/ui/dropdown-menu";
  import { toast } from "sonner";
  import {
    createProjectAction,
    updateProjectAction,
    deleteProjectAction,
    quickCreateClientAction,
    updateProjectStatusAction,
    createProjectTemplateAction,
    getProjectTemplatesAction,
    deleteProjectTemplateAction,
    updateProjectDueDateAction,
    updateProjectPriorityAction,
    updateProjectCustomFieldsAction,
  } from "@/app/actions/projects";
  import { addDays, addWeeks, format } from "date-fns";
  import { ChevronRight } from "lucide-react";
  import { Calendar } from "@/components/ui/calendar";
  import { ProjectDescriptionEditor } from "@/components/ui/RichTextEditor";
  import { ProjectRulesHeaderControl } from "@/components/modals/ProjectRulesHeaderControl";
  import { ModalTabsHeader } from "@/components/ui/ModalTabsHeader";
  import { DraftDocument, ProjectDocumentComposer } from "@/components/documents/DocumentsPanel";
  import { createDocumentAction } from "@/app/actions/documents";
  import { getRulesAction, createRuleAction } from "@/app/actions/rules";
  import { getHiddenColumnsAction, setHiddenColumnsAction } from "@/app/actions/settings";
  import { DndContext, DragEndEvent, useDraggable, useDroppable, DragOverlay, useSensor, useSensors, PointerSensor } from "@dnd-kit/core";
  import { SortableContext, horizontalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
  import { CSS } from "@dnd-kit/utilities";

  const formatDate = (dateInput: any) => {
    if (!dateInput) return "";
    try {
      const d = new Date(dateInput);
      if (isNaN(d.getTime())) return String(dateInput);
      const year = d.getUTCFullYear();
      const month = String(d.getUTCMonth() + 1).padStart(2, "0");
      const day = String(d.getUTCDate()).padStart(2, "0");
      return `${month}/${day}/${year}`;
    } catch (e) {
      return String(dateInput);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PLANNING":
        return "bg-[#fbfaf7]0/10 text-slate-500 border-slate-500/20";
      case "IN_PROGRESS":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "ON_HOLD":
        return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "COMPLETE":
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      default:
        return "bg-[#fbfaf7]0/10 text-slate-500 border-slate-500/20";
    }
  };

  const getProjectMembers = (project: any) => {
    const membersMap = new Map();
    if (project.assignees) {
      project.assignees.forEach((a: any) => {
        if (a.user) membersMap.set(a.user.id, a.user);
      });
    }
    if (project.tasks) {
      project.tasks.forEach((t: any) => {
        if (t.assignees) {
          t.assignees.forEach((a: any) => {
            if (a.user) membersMap.set(a.user.id, a.user);
          });
        }
      });
    }
    return Array.from(membersMap.values());
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "LOW":
        return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
      case "MEDIUM":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      case "HIGH":
        return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
      case "CRITICAL":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-bold";
      default:
        return "bg-slate-100 text-slate-600";
    }
  };

  function TableDueDateCell({ project, setProjects, currentUser }: any) {
    const [isOpen, setIsOpen] = useState(false);
    const [isPending, startTransition] = React.useTransition();
    const router = useRouter();

    const isEditable = currentUser?.role === 'OWNER' || (currentUser?.role === 'MEMBER' && project.projectManagerId === currentUser?.userId);

    const handleDateSelect = (date: Date | undefined) => {
      if (!date) return;
      
      startTransition(async () => {
        // Optimistic update
        const previousDate = project.endDate;
        const previousIsOngoing = project.isOngoing;
        const newDateStr = date.toISOString();
        
        setProjects((prev: any) => prev.map((p: any) => 
          p.id === project.id ? { ...p, endDate: newDateStr, isOngoing: false } : p
        ));
        
        const res = await updateProjectDueDateAction(project.id, newDateStr, false);
        if (res.error) {
          toast.error(res.error);
          // Revert optimistic update
          setProjects((prev: any) => prev.map((p: any) => 
            p.id === project.id ? { ...p, endDate: previousDate, isOngoing: previousIsOngoing } : p
          ));
          router.refresh();
        } else {
          toast.success("Due date updated");
        }
      });
      setIsOpen(false);
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
          {project.isOngoing ? (
            <span className="text-emerald-600 font-medium flex items-center gap-1.5"><Clock size={12} /> Ongoing</span>
          ) : project.endDate ? (
            <span className={project.endDate && new Date(project.endDate) < new Date() ? 'text-red-500' : ''}>
              {format(new Date(project.endDate), 'MMM d, yyyy')}
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
            {project.isOngoing ? (
              <span className="text-emerald-600 font-medium flex items-center gap-1.5"><Clock size={12} /> Ongoing</span>
            ) : project.endDate ? (
              <span className={project.endDate && new Date(project.endDate) < new Date() ? 'text-red-500' : ''}>
                {format(new Date(project.endDate), 'MMM d, yyyy')}
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
              <button className="w-full flex justify-between items-center px-4 py-2 hover:bg-slate-50 dark:hover:bg-white/5 text-[13px] font-medium transition-colors text-slate-700 dark:text-slate-300">
                Set Recurring <ChevronRight size={14} className="text-slate-400" />
              </button>
            </div>
          </div>
          <div className="p-3">
            <Calendar
              mode="single"
              selected={project.endDate ? new Date(project.endDate) : undefined}
              onSelect={handleDateSelect}
            />
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  function TablePriorityCell({ project, setProjects, currentUser }: any) {
    const [isOpen, setIsOpen] = useState(false);
    const [isPending, startTransition] = React.useTransition();
    const router = useRouter();

    const isEditable = currentUser?.role === 'OWNER' || (currentUser?.role === 'MEMBER' && project.projectManagerId === currentUser?.userId);

    const priorities = [
      { value: "CRITICAL", label: "Urgent", color: "text-red-500", bg: "bg-red-50 dark:bg-red-950/20" },
      { value: "HIGH", label: "High", color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-950/20" },
      { value: "MEDIUM", label: "Normal", color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950/20" },
      { value: "LOW", label: "Low", color: "text-slate-400", bg: "bg-slate-50 dark:bg-slate-900/20" },
    ];

    const handlePrioritySelect = (newPriority: string) => {
      if (project.priority === newPriority) return;
      
      startTransition(async () => {
        // Optimistic update
        const previousPriority = project.priority;
        
        setProjects((prev: any) => prev.map((p: any) => 
          p.id === project.id ? { ...p, priority: newPriority } : p
        ));
        
        const res = await updateProjectPriorityAction(project.id, newPriority);
        if (res.error) {
          toast.error(res.error);
          // Revert optimistic update
          setProjects((prev: any) => prev.map((p: any) => 
            p.id === project.id ? { ...p, priority: previousPriority } : p
          ));
          router.refresh();
        } else {
          toast.success("Priority updated");
        }
      });
      setIsOpen(false);
    };

    if (!isEditable) {
      return (
        <div className="flex items-center gap-1.5 w-full h-full bg-transparent text-slate-700 dark:text-slate-300 font-medium px-4 py-3 text-[13px] tracking-wide text-left select-none">
          <Badge variant="outline" className={`font-semibold bg-transparent border-slate-200 dark:border-white/10 ${getPriorityColor(project.priority)}`}>
            <Flag size={12} className="mr-1.5" />
            {project.priority}
          </Badge>
        </div>
      );
    }

    return (
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-1.5 w-full h-full bg-transparent hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300 font-medium px-4 py-3 text-[13px] tracking-wide transition-colors outline-none text-left">
            <Badge variant="outline" className={`font-semibold bg-transparent border-slate-200 dark:border-white/10 ${getPriorityColor(project.priority)}`}>
              <Flag size={12} className="mr-1.5" />
              {project.priority}
            </Badge>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[180px] p-1 bg-white dark:bg-[#1C1C1C] rounded-xl shadow-lg border border-slate-200 dark:border-white/10">
          <div className="px-2 py-1.5 mb-1">
            <span className="text-xs font-semibold text-slate-500 px-1">Priority</span>
          </div>
          {priorities.map((pr) => (
            <DropdownMenuItem 
              key={pr.value}
              onSelect={(e) => { e.preventDefault(); handlePrioritySelect(pr.value); }}
              className="flex items-center gap-2 text-[13px] font-medium cursor-pointer py-2 px-2.5 rounded-lg mb-0.5 transition-colors hover:bg-slate-50 dark:hover:bg-white/5"
            >
              <Flag size={14} className={pr.color} />
              <span className="text-slate-700 dark:text-slate-300">{pr.label}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  function TableCustomFieldCell({ project, col, setProjects, projects, currentUser }: any) {
    const [isPending, startTransition] = React.useTransition();
    const customFields = Array.isArray(project.customFields) ? project.customFields : [];
    const fieldIndex = customFields.findIndex((f: any) => f.name === col.name);
    const field = fieldIndex >= 0 ? customFields[fieldIndex] : null;
    const value = field ? field.value : undefined;

    const isEditable = currentUser?.role === 'OWNER' || (currentUser?.role === 'MEMBER' && project.projectManagerId === currentUser?.userId);

    let options = field?.options;
    if (!options && Array.isArray(projects)) {
      const otherProjectWithField = projects.find((p: any) => {
        const pFields = Array.isArray(p.customFields) ? p.customFields : [];
        return pFields.some((f: any) => f.name === col.name && Array.isArray(f.options) && f.options.length > 0);
      });
      if (otherProjectWithField) {
        const f = otherProjectWithField.customFields.find((f: any) => f.name === col.name);
        options = f?.options;
      }
    }

    const updateValue = (val: any) => {
      setProjects((prev: any) => prev.map((p: any) => {
        if (p.id === project.id) {
          const pFields = Array.isArray(p.customFields) ? [...p.customFields] : [];
          const fIndex = pFields.findIndex((f: any) => f.name === col.name);
          
          if (fIndex >= 0) {
            pFields[fIndex] = { ...pFields[fIndex], value: val };
          } else {
            pFields.push({ name: col.name, type: col.type, value: val, options: options });
          }
          
          import('@/app/actions/projects').then(m => {
            m.updateProjectCustomFieldsAction(p.id, pFields).catch(console.error);
          });
          
          return {
            ...p,
            customFields: pFields
          };
        }
        return p;
      }));
    };

    const commonClasses = "w-full h-full border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-3 bg-transparent text-[13px] text-slate-700 dark:text-slate-300 rounded-none shadow-none outline-none appearance-none";
    const typeStr = (col.type || "text").toLowerCase();

    switch (typeStr) {
      case 'text area':
        return <textarea disabled={!isEditable} value={value || ''} onChange={e => updateValue(e.target.value)} placeholder="—" className={`${commonClasses} py-2 resize-none custom-scrollbar min-h-[40px]`} />;
      case 'checkbox':
        return <div className="flex items-center justify-center h-full min-h-[40px]"><input type="checkbox" disabled={!isEditable} checked={!!value} onChange={e => updateValue(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" /></div>;
      case 'dropdown':
        return (
          <select disabled={!isEditable} value={value || ''} onChange={e => updateValue(e.target.value)} className={`${commonClasses} cursor-pointer min-h-[40px]`}>
            <option value="" disabled>—</option>
            {(options || []).map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        );
      case 'labels':
        const currentValues = Array.isArray(value) ? value : [];
        return (
          <div className="flex items-center flex-wrap gap-1.5 h-full px-3 py-1 overflow-y-auto custom-scrollbar min-h-[40px]">
            {currentValues.map((v: string) => (
              <span key={v} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                {v}
                {isEditable && (
                  <button type="button" onClick={() => updateValue(currentValues.filter(val => val !== v))} className="text-slate-400 hover:text-red-500"><X size={10} /></button>
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

  function TableNameCell({ project, setProjects, currentUser }: any) {
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(project.name);
    const [isPending, startTransition] = React.useTransition();
    const router = useRouter();

    const isEditable = currentUser?.role === 'OWNER' || (currentUser?.role === 'MEMBER' && project.projectManagerId === currentUser?.userId);

    const handleSave = () => {
      if (!name.trim() || name === project.name) {
        setIsEditing(false);
        return;
      }
      
      startTransition(async () => {
        const prevName = project.name;
        setProjects((prev: any) => prev.map((p: any) => 
          p.id === project.id ? { ...p, name: name } : p
        ));
        
        const res = await updateProjectAction(project.id, { 
          name,
          startDate: project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          endDate: project.endDate ? new Date(project.endDate).toISOString().split('T')[0] : undefined,
          isOngoing: project.isOngoing || false,
          priority: project.priority,
          totalAllocatedHours: project.totalAllocatedHours || 0,
          assigneeIds: project.assignees ? project.assignees.map((a: any) => a.userId) : [],
        });
        if (res.error) {
          toast.error(res.error);
          setProjects((prev: any) => prev.map((p: any) => 
            p.id === project.id ? { ...p, name: prevName } : p
          ));
        } else {
          toast.success("Project name updated");
          router.refresh();
        }
      });
      setIsEditing(false);
    };

    if (isEditing && isEditable) {
      return (
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") { setName(project.name); setIsEditing(false); }
          }}
          className="h-8 py-1 px-2 border border-slate-200 rounded-lg text-[13px] font-medium w-full"
          autoFocus
        />
      );
    }

    return (
      <div className="flex items-center gap-2 group/name w-full">
        <CircleDashed size={14} className="text-slate-400 shrink-0" />
        <Link
          href={`/workspace/projects/${project.id}`}
          className="font-medium text-[13px] text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white transition-colors truncate flex-1"
        >
          {project.name}
        </Link>
        {isEditable && (
          <button 
            onClick={() => setIsEditing(true)} 
            className="opacity-0 group-hover/name:opacity-100 transition-opacity p-0.5 hover:bg-slate-100 dark:hover:bg-white/10 rounded shrink-0 cursor-pointer"
          >
            <Edit2 size={12} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200" />
          </button>
        )}
      </div>
    );
  }

  function TableStatusCell({ project, projectStatuses, setProjects, currentUser }: any) {
    const [search, setSearch] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const [isPending, startTransition] = React.useTransition();
    const router = useRouter();

    const isEditable = currentUser?.role === 'OWNER' || (currentUser?.role === 'MEMBER' && project.projectManagerId === currentUser?.userId);

    const filteredStatuses = projectStatuses.filter((s: any) => 
      s.name.toLowerCase().includes(search.toLowerCase())
    );

    const handleUpdateStatus = (newStatusId: string) => {
      if (project.statusId === newStatusId) return;

      startTransition(async () => {
        // Optimistic Update
        const previousStatusId = project.statusId;
        const newStatusObj = projectStatuses.find((s: any) => s.id === newStatusId);
        
        setProjects((prev: any) => prev.map((p: any) => 
          p.id === project.id ? { ...p, statusId: newStatusId, status: newStatusObj } : p
        ));

        const res = await updateProjectStatusAction(project.id, newStatusId as any);
        if (res.error) {
          toast.error(res.error);
          // Revert Optimistic Update
          setProjects((prev: any) => prev.map((p: any) => 
            p.id === project.id ? { ...p, statusId: previousStatusId, status: projectStatuses.find((s: any) => s.id === previousStatusId) } : p
          ));
          router.refresh();
        } else {
          toast.success(`Status updated to ${newStatusObj?.name}`);
        }
      });
    };

    if (!isEditable) {
      return (
        <div className="flex items-center gap-1.5 w-fit bg-slate-100 dark:bg-[#303030] text-slate-600 dark:text-slate-300 font-semibold px-2.5 py-1 rounded-md text-[11px] tracking-wide select-none">
          <CircleDashed size={12} className="text-slate-400" />
          {project.status?.name?.toUpperCase() || "NO STATUS"}
        </div>
      );
    }

    return (
      <DropdownMenu open={isOpen} onOpenChange={(open) => { setIsOpen(open); if(!open) setSearch(""); }}>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-1.5 w-fit bg-slate-100 dark:bg-[#303030] hover:bg-slate-200 dark:hover:bg-[#404040] text-slate-600 dark:text-slate-300 font-semibold px-2.5 py-1 rounded-md text-[11px] tracking-wide transition-colors outline-none group/status">
            <CircleDashed size={12} className="text-slate-400 group-hover/status:text-slate-500 transition-colors" />
            {project.status?.name?.toUpperCase() || "NO STATUS"}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[220px] p-1 bg-white dark:bg-[#1C1C1C] rounded-xl shadow-lg border border-slate-200 dark:border-white/10" onInteractOutside={() => setIsOpen(false)}>
          <div className="px-2 py-1.5 mb-1 border-b border-slate-100 dark:border-white/5">
            <Input 
              autoFocus
              placeholder="Search status..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-7 text-xs bg-transparent border-none focus-visible:ring-0 px-1 placeholder:text-slate-400" 
              onKeyDown={(e) => {
                // Stop propagation to prevent any table row interactions
                e.stopPropagation();
              }}
            />
          </div>
          <div className="max-h-[220px] overflow-y-auto custom-scrollbar p-1">
            {filteredStatuses.length === 0 ? (
              <div className="px-2 py-3 text-center text-xs text-slate-500">No status found</div>
            ) : (
              filteredStatuses.map((s: any) => (
                <DropdownMenuItem 
                  key={s.id}
                  onSelect={(e) => {
                    e.preventDefault(); // Don't close immediately if you want smooth animation or standard behavior, but here we DO want it to close immediately
                    handleUpdateStatus(s.id);
                    setIsOpen(false);
                  }}
                  className={`flex items-center justify-between text-[13px] font-medium cursor-pointer py-2 px-2.5 rounded-lg mb-0.5 transition-colors ${project.statusId === s.id ? 'bg-slate-50 dark:bg-white/5' : 'hover:bg-slate-50 dark:hover:bg-white/5'}`}
                >
                  <div className="flex items-center gap-2.5">
                    <CircleDashed size={14} style={{ color: s.color || '#94a3b8' }} />
                    {s.name}
                  </div>
                  {project.statusId === s.id && <Check size={14} className="text-slate-800 dark:text-slate-200" />}
                </DropdownMenuItem>
              ))
            )}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  function KanbanColumn({ status, title, count, projectStatuses, children, onAddProject, currentUser, handleDeleteStage, handleRenameStage }: any) {
    const { setNodeRef, attributes, listeners, transform, transition, isDragging, isOver } = useSortable({
      id: status,
      data: { type: "COLUMN", status }
    });

    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(title);

    const getStatusColor = (statusId: string) => {
      const statusObj = projectStatuses?.find((s: any) => s.id === statusId);
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
        
        {currentUser?.role === 'OWNER' && (
          <button 
            onClick={onAddProject}
            className="flex items-center gap-2 px-2 py-1.5 mb-3 text-sm font-medium transition-colors hover:opacity-80 rounded-md hover:bg-black/5 dark:hover:bg-white/5"
            style={{ color: statusColor }}
          >
            <Plus size={16} /> Add Project
          </button>
        )}

        <div className="flex flex-col gap-2.5 overflow-y-auto custom-scrollbar pr-1 flex-1 pb-2">
          {children}
        </div>
      </div>
    );
  }

  function KanbanCard({ project, currentUser, handleDelete, handleEdit }: any) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
      id: project.id,
      data: project,
      disabled: currentUser?.role === 'CLIENT',
    });

    const style = transform ? {
      transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    } : undefined;

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`bg-white dark:bg-[#252525] border border-black/5 dark:border-white/10 rounded-xl p-4 shadow-sm hover:border-black/10 dark:hover:border-white/20 transition-all duration-200 group flex flex-col gap-3 cursor-grab active:cursor-grabbing relative overflow-hidden ${isDragging ? 'opacity-50 scale-95 z-50 shadow-2xl rotate-2' : ''}`}
        {...attributes}
        {...listeners}
      >
        <div className="flex justify-between items-start gap-3 relative z-10">
          <Link href={`/workspace/projects/${project.id}`} className="font-semibold text-[14px] leading-snug text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 pr-4" onPointerDown={(e) => e.stopPropagation()}>
            {project.name}
          </Link>

          {currentUser.role === "OWNER" && (
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 shrink-0 absolute right-0 -top-1 bg-white/90 dark:bg-[#252525]/90 backdrop-blur-sm p-1 rounded-lg" onPointerDown={(e) => e.stopPropagation()}>
              <button onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); handleEdit(project); }} className="p-1 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-md cursor-pointer">
                <Edit2 size={14} />
              </button>
              <div onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(project.id); }} className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400 hover:text-red-600 rounded-md cursor-pointer">
                <Trash2 size={14} />
              </div>
            </div>
          )}
        </div>
        
        <div className="flex flex-col gap-2.5 mt-1 relative z-10">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={`text-[10px] uppercase font-bold border-0 px-1.5 py-0.5 rounded-md ${getPriorityColor(project.priority)}`}>
              {project.priority}
            </Badge>
            {(project.startDate || project.endDate) && (
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium bg-slate-50 dark:bg-white/5 px-1.5 py-0.5 rounded-md border border-slate-100 dark:border-white/10">
                <CalendarIcon size={10} className="text-slate-400" />
                <span>{project.startDate ? formatDate(project.startDate) : '--'} - {project.endDate ? formatDate(project.endDate) : '--'}</span>
              </div>
            )}
          </div>
          
          {project.tasks && project.tasks.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <div className="text-[12px] text-slate-600 dark:text-slate-300 flex items-center gap-2 bg-slate-50 dark:bg-[#202020] px-2 py-1.5 rounded-lg border border-slate-100 dark:border-white/5">
                <CheckCircle2 size={12} className="text-slate-400 shrink-0" />
                <span className="truncate">{project.tasks[0].title}</span>
              </div>
              {project.tasks.length > 1 && (
                <Link 
                  href={`/workspace/tasks?projectId=${project.id}`} 
                  className="text-[11px] font-medium text-slate-400 hover:text-blue-500 transition-colors inline-block pl-1" 
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  + {project.tasks.length - 1} more tasks
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  export default function ProjectsClient({
    initialProjects,
    users,
    currentUser,
    projectStatuses = [],
    taskStatuses = []
  }: {
    initialProjects: any[];
    users: any[];
    currentUser: any;
    projectStatuses?: any[];
    taskStatuses?: any[];
  }) {
    const [projects, setProjects] = useState(initialProjects);
    useEffect(() => {
      setProjects(initialProjects);
    }, [initialProjects]);
    const [isPending, startTransition] = useTransition();

    // Search & Filters
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
const [isPMOpen, setIsPMOpen] = useState(false);
    // Modal States
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [activeCreateTab, setActiveCreateTab] = useState<"project" | "doc">("project");
    const [draftDocs, setDraftDocs] = useState<DraftDocument[]>([]);
    const [isQuickClientOpen, setIsQuickClientOpen] = useState(false);
    const [isCreateStatusOpen, setIsCreateStatusOpen] = useState(false);

    const persistDraftDocs = async (projectId: string) => {
      for (const draft of draftDocs) {
        await createDocumentAction({
          type: draft.type,
          title: draft.title,
          content: draft.content ?? null,
          fileUrl: draft.fileUrl ?? null,
          fileName: draft.fileName ?? null,
          fileSize: draft.fileSize ?? null,
          projectId,
        });
      }
    };
    
    const [isEditMode, setIsEditMode] = useState(false);
    const [editProjectId, setEditProjectId] = useState<string | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null);
    const [isDeleteStageDialogOpen, setIsDeleteStageDialogOpen] = useState(false);
    const [deleteStageId, setDeleteStageId] = useState<string | null>(null);
    const [isDeleteTemplateOpen, setIsDeleteTemplateOpen] = useState(false);
    const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null);
    const [isFieldsDrawerOpen, setIsFieldsDrawerOpen] = useState(false);
    const [fieldsTab, setFieldsTab] = useState(currentUser?.role === 'OWNER' ? "create_new" : "add_existing");
    const [selectedFieldType, setSelectedFieldType] = useState<string | null>(null);
    const [newFieldOptions, setNewFieldOptions] = useState<string[]>([]);
    const [newOptionInput, setNewOptionInput] = useState("");
    const [newCustomFieldName, setNewCustomFieldName] = useState("");
    const [customColumns, setCustomColumns] = useState<{id: string, name: string, type: string}[]>([]);
    const [fieldsDrawerTarget, setFieldsDrawerTarget] = useState<"TABLE" | "FORM">("TABLE");
    
    // Status Creation States
    const [newStatusName, setNewStatusName] = useState("");
    const [newStatusColor, setNewStatusColor] = useState("#3b82f6");
    const [isCreatingStatus, setIsCreatingStatus] = useState(false);

    const searchParams = useSearchParams();
    const router = useRouter();

    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => setIsMounted(true), []);

    useEffect(() => {
      if (searchParams.get('new') === 'true') {
        setIsCreateOpen(true);
        router.replace('/workspace/projects');
      }
    }, [searchParams, router]);
    // Form States
    const [isOngoing, setIsOngoing] = useState(false);

    type DraftTask = {
      id: string;
      title: string;
      description: string;
      status: string;
      priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
      assigneeId: string;
    };
    const [projectTasks, setProjectTasks] = useState<DraftTask[]>([]);
    const [customFields, setCustomFields] = useState<
      { name: string; type: string; value: any; options?: string[] }[]
    >([]);
    const [description, setDescription] = useState("");
    const [viewMode, setViewMode] = useState<"TABLE" | "KANBAN" | "LIST">("TABLE");

    const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
    useEffect(() => {
      console.log("Fetching hidden columns from DB...");
      getHiddenColumnsAction().then(res => {
        console.log("Fetched hidden columns:", res);
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
      console.log("Saving hidden columns to DB:", next);
      setHiddenColumnsAction(next).then(res => console.log("Save result:", res)).catch(console.error);
    };

    const unhideColumn = (colName: string) => {
      if (!hiddenColumns.includes(colName)) return;
      const next = hiddenColumns.filter(n => n !== colName);
      setHiddenColumns(next);
      console.log("Saving hidden columns to DB:", next);
      setHiddenColumnsAction(next).then(res => console.log("Save result:", res)).catch(console.error);
    };

    // Form Control States for Project Creation
    const [formName, setFormName] = useState("");
    const [formClientId, setFormClientId] = useState("");
    const [formPMId, setFormPMId] = useState("");
    const [formStatusId, setFormStatusId] = useState("");
    const [formPriority, setFormPriority] = useState("MEDIUM");
    const [formStartDate, setFormStartDate] = useState("");
    const [formEndDate, setFormEndDate] = useState("");
    const [formBudget, setFormBudget] = useState("");
    const [formAllocatedHours, setFormAllocatedHours] = useState("");
    const [formNotes, setFormNotes] = useState("");
    const [formAssigneeIds, setFormAssigneeIds] = useState<string[]>([]);

    const [isRepeatEnabled, setIsRepeatEnabled] = useState(false);
    const [repeatFrequency, setRepeatFrequency] = useState<"DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY">("DAILY");
    const [repeatTime, setRepeatTime] = useState("09:00");

    // Template Management States
    const [isTemplateSelectOpen, setIsTemplateSelectOpen] = useState(false);
    const [templates, setTemplates] = useState<any[]>([]);
    const [templateSearchQuery, setTemplateSearchQuery] = useState("");
    const [pinnedTemplateIds, setPinnedTemplateIds] = useState<string[]>([]);
    const pinnedTemplates = React.useMemo(() => {
      return templates.filter((t) => pinnedTemplateIds.includes(t.id));
    }, [templates, pinnedTemplateIds]);
    const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
    const [isSaveTemplateOpen, setIsSaveTemplateOpen] = useState(false);
    const [templateName, setTemplateName] = useState("");
    const [defaultTemplateId, setDefaultTemplateId] = useState<string | null>(null);

    // Rule States
    const [rules, setRules] = useState<any[]>([]);
    const [attachedRuleIds, setAttachedRuleIds] = useState<string[]>([]);
    const [isCreateRuleOpen, setIsCreateRuleOpen] = useState(false);

    // Rule Form States
    const [ruleFormName, setRuleFormName] = useState("");
    const [ruleFormDescription, setRuleFormDescription] = useState("");
    const [ruleFormTriggerField, setRuleFormTriggerField] = useState("Status");
    const [ruleFormTriggerOperator, setRuleFormTriggerOperator] = useState("Equals");
    const [ruleFormTriggerValue, setRuleFormTriggerValue] = useState("");
    const [ruleFormActionType, setRuleFormActionType] = useState("In-app Notification");
    const [ruleFormRecipients, setRuleFormRecipients] = useState<string[]>([]);
    const [ruleFormRecipientSearch, setRuleFormRecipientSearch] = useState("");

    const fetchRules = async () => {
      const res = await getRulesAction();
      if (res.success && res.rules) {
        setRules(res.rules);
      }
    };

    useEffect(() => {
      if (isCreateOpen) {
        fetchRules();
      }
    }, [isCreateOpen]);

    // Auto-save custom fields in Edit Mode
    useEffect(() => {
      if (isEditMode && editProjectId && customFields) {
        const timer = setTimeout(() => {
          updateProjectCustomFieldsAction(editProjectId, customFields).catch(console.error);
        }, 1000);
        return () => clearTimeout(timer);
      }
    }, [customFields, isEditMode, editProjectId]);

    const handleCreateRule = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!ruleFormName.trim()) {
        toast.error("Rule name is required");
        return;
      }

      startTransition(async () => {
        const res = await createRuleAction({
          name: ruleFormName,
          description: ruleFormDescription,
          triggerField: ruleFormTriggerField,
          triggerOperator: ruleFormTriggerOperator,
          triggerValue: ruleFormTriggerValue,
          actionType: ruleFormActionType,
          actionRecipients: ruleFormRecipients,
          recipients: ruleFormRecipients,
        });

        if (res.error) {
          toast.error(res.error);
        } else {
          toast.success("Rule created and attached successfully");
          setIsCreateRuleOpen(false);
          if (res.rule) {
            setAttachedRuleIds((prev) => [...prev, res.rule.id]);
          }
          fetchRules();
          // Reset form
          setRuleFormName("");
          setRuleFormDescription("");
          setRuleFormTriggerField("Status");
          setRuleFormTriggerOperator("Equals");
          setRuleFormTriggerValue("");
          setRuleFormActionType("In-app Notification");
          setRuleFormRecipients([]);
          setRuleFormRecipientSearch("");
        }
      });
    };

    const toggleRuleRecipient = (role: string) => {
      if (ruleFormRecipients.includes(role)) {
        setRuleFormRecipients((prev) => prev.filter((r) => r !== role));
      } else {
        setRuleFormRecipients((prev) => [...prev, role]);
      }
    };

    const fetchTemplates = async () => {
      setIsLoadingTemplates(true);
      try {
        const res = await getProjectTemplatesAction();
        if (res.success && res.templates) {
          setTemplates(res.templates);
        } else {
          toast.error(res.error || "Failed to load templates");
        }
      } catch (e) {
        toast.error("Failed to load templates");
      } finally {
        setIsLoadingTemplates(false);
      }
    };

    useEffect(() => {
      if (isTemplateSelectOpen) {
        fetchTemplates();
      }
    }, [isTemplateSelectOpen]);

    const handleSaveTemplate = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!templateName.trim()) {
        toast.error("Please enter a template name");
        return;
      }

      const config = {
        name: formName,
        clientId: formClientId || undefined,
        projectManagerId: formPMId || undefined,
        statusId: formStatusId || undefined,
        priority: formPriority,
        startDate: formStartDate,
        endDate: formEndDate,
        isOngoing,
        projectBudget: formBudget ? Number(formBudget) : undefined,
        totalAllocatedHours: formAllocatedHours ? Number(formAllocatedHours) : undefined,
        notes: formNotes,
        description: description,
        customFields,
        tasks: projectTasks.map((t) => ({
          title: t.title,
          description: t.description,
          priority: t.priority,
          statusId: t.status || undefined,
          assigneeIds: t.assigneeId ? [t.assigneeId] : [],
        })),
        attachedRuleIds,
        isRepeatEnabled,
        repeatFrequency,
        repeatTime,
      };

      startTransition(async () => {
        const res = await createProjectTemplateAction(templateName.trim(), config);
        if (res.error) {
          toast.error(res.error);
        } else {
          toast.success("Template saved successfully");
          setIsSaveTemplateOpen(false);
          setTemplateName("");
        }
      });
    };

    const handleDeleteTemplate = (templateId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setDeleteTemplateId(templateId);
      setIsDeleteTemplateOpen(true);
    };

    const confirmDeleteTemplate = async () => {
      if (!deleteTemplateId) return;
      try {
        const res = await deleteProjectTemplateAction(deleteTemplateId);
        if (res.error) {
          toast.error(res.error);
        } else {
          toast.success("Template deleted");
          setTemplates(templates.filter((t) => t.id !== deleteTemplateId));
          setPinnedTemplateIds((prev) => {
            const next = prev.filter((id) => id !== deleteTemplateId);
            localStorage.setItem("omniwork_pinned_templates", JSON.stringify(next));
            return next;
          });
        }
      } catch (err) {
        toast.error("Failed to delete template");
      } finally {
        setIsDeleteTemplateOpen(false);
        setDeleteTemplateId(null);
      }
    };

    const handleSetDefaultTemplate = (templateId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const newDefault = defaultTemplateId === templateId ? null : templateId;
      setDefaultTemplateId(newDefault);
      if (newDefault) {
        localStorage.setItem("omniwork_default_project_template_id", newDefault);
        toast.success("Template set as default");
      } else {
        localStorage.removeItem("omniwork_default_project_template_id");
        toast.success("Default template removed");
      }
    };

    const handleTogglePinTemplate = (templateId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setPinnedTemplateIds((prev) => {
        const isPinned = prev.includes(templateId);
        const next = isPinned
          ? prev.filter((id) => id !== templateId)
          : [...prev, templateId];
        localStorage.setItem("omniwork_pinned_templates", JSON.stringify(next));
        return next;
      });
    };

    const handleUseTemplate = (template: any) => {
      const config = template.config;
      if (!config) return;

      setFormName(config.name || "");
      setFormClientId(config.clientId || "");
      setFormPMId(config.projectManagerId || "");
      setFormStatusId(config.statusId || "");
      setFormPriority(config.priority || "MEDIUM");
      
      const formatDateForInput = (dateStr: string) => {
        if (!dateStr) return "";
        try {
          return new Date(dateStr).toISOString().split("T")[0];
        } catch (err) {
          return "";
        }
      };
      
      setFormStartDate(formatDateForInput(config.startDate));
      setFormEndDate(formatDateForInput(config.endDate));
      setIsOngoing(config.isOngoing || false);
      setFormBudget(config.projectBudget ? String(config.projectBudget) : "");
      setFormAllocatedHours(config.totalAllocatedHours ? String(config.totalAllocatedHours) : "");
      setFormNotes(config.notes || "");
      setDescription(config.description || "");

      if (config.customFields && Array.isArray(config.customFields)) {
        setCustomFields(config.customFields);
      } else {
        setCustomFields([]);
      }

      if (config.tasks && Array.isArray(config.tasks)) {
        setProjectTasks(
          config.tasks.map((t: any) => ({
            id: t.id || Math.random().toString(),
            title: t.title || "",
            description: t.description || "",
            status: t.statusId || t.status || "",
            priority: t.priority || "MEDIUM",
            assigneeId: (t.assigneeIds && t.assigneeIds[0]) || t.assigneeId || "",
          }))
        );
      } else {
        setProjectTasks([]);
      }

      if (config.attachedRuleIds && Array.isArray(config.attachedRuleIds)) {
        setAttachedRuleIds(config.attachedRuleIds);
      } else {
        setAttachedRuleIds([]);
      }

      setIsRepeatEnabled(config.isRepeatEnabled || false);
      setRepeatFrequency(config.repeatFrequency || "DAILY");
      setRepeatTime(config.repeatTime || "09:00");

      setIsTemplateSelectOpen(false);
      setIsCreateOpen(true);
    };

    const handleOpenCreateProject = () => {
      if (defaultTemplateId) {
        const defaultTemplate = templates.find((t) => t.id === defaultTemplateId);
        if (defaultTemplate) {
          handleUseTemplate(defaultTemplate);
          return;
        }
      }
      setIsRepeatEnabled(false);
      setFormName("");
      setFormClientId("");
      setFormPMId("");
      setFormStatusId("");
      setFormPriority("MEDIUM");
      setFormStartDate("");
      setFormEndDate("");
      setFormBudget("");
      setFormAllocatedHours("");
      setFormNotes("");
      setDescription("");
      setProjectTasks([]);
      setCustomFields([]);
      setAttachedRuleIds([]);
      setFormAssigneeIds([]);
      setIsCreateOpen(true);
    };

    useEffect(() => {
      const savedView = localStorage.getItem("omniwork_project_view");
      if (savedView === "TABLE" || savedView === "KANBAN" || savedView === "LIST") {
        setViewMode(savedView);
      }
      const savedPinned = localStorage.getItem("omniwork_pinned_templates");
      if (savedPinned) {
        try {
          setPinnedTemplateIds(JSON.parse(savedPinned));
        } catch (e) {}
      }
      const savedDefault = localStorage.getItem("omniwork_default_project_template_id");
      if (savedDefault) {
        setDefaultTemplateId(savedDefault);
      }
      fetchTemplates();
    }, []);

    const handleSetViewMode = (mode: "TABLE" | "KANBAN" | "LIST") => {
      setViewMode(mode);
      localStorage.setItem("omniwork_project_view", mode);
    };

    // DND State
    const [activeDragProject, setActiveDragProject] = useState<any>(null);

    const sensors = useSensors(
      useSensor(PointerSensor, {
        activationConstraint: {
          distance: 5,
        },
      })
    );

    const openCreateModalForStatus = (statusId: string) => {
      if (defaultTemplateId) {
        const defaultTemplate = templates.find((t) => t.id === defaultTemplateId);
        if (defaultTemplate) {
          handleUseTemplate(defaultTemplate);
          // Overwrite the template's status with the kanban column's status
          setFormStatusId(statusId);
          return;
        }
      }

      setFormName("");
      setDescription("");
      setFormStartDate("");
      setFormEndDate("");
      setFormPriority("MEDIUM");
      setFormStatusId(statusId);
      setFormBudget("");
      setFormAllocatedHours("");
      setProjectTasks([]);
      setCustomFields([]);
      setAttachedRuleIds([]);
      setFormAssigneeIds([]);
      setIsEditMode(false);
      setEditProjectId(null);
      setIsCreateOpen(true);
    };

    const handleCreateStatus = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newStatusName.trim() || !newStatusColor) return;
      setIsCreatingStatus(true);
      try {
        const res = await fetch("/api/project-statuses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newStatusName, color: newStatusColor })
        });
        if (res.ok) {
          setIsCreateStatusOpen(false);
          setNewStatusName("");
          router.refresh();
        } else {
          alert("Failed to create status. Ensure the name is unique.");
        }
      } catch (error) {
        console.error(error);
      } finally {
        setIsCreatingStatus(false);
      }
    };

    const clients = users.filter(
      (u) => u.role === "CLIENT" && u.status === "ACTIVE",
    );
    const members = users.filter(
      (u) => u.role === "MEMBER" && u.status === "ACTIVE",
    );

    // Extract unique custom fields
    const existingCustomFields = React.useMemo(() => {
      return Array.from(
        new Set(
          projects
            .filter((p: any) => p.customFields && Array.isArray(p.customFields))
            .flatMap((p: any) => p.customFields.map((f: any) => f.name).filter(Boolean))
        )
      ).sort();
    }, [projects]);

    // Sync table columns from all project fields
    useEffect(() => {
      if (projects.length > 0) {
        setCustomColumns((prev) => {
          const allFieldsMap = new Map<string, any>();
          
          // Preserve existing columns unless they are hidden
          prev.forEach(col => {
            if (!hiddenColumns.includes(col.name)) {
              allFieldsMap.set(col.name, col);
            }
          });
          
          // Add new columns from projects if they are not hidden
          projects.forEach((p: any) => {
            if (Array.isArray(p.customFields)) {
              p.customFields.forEach((f: any) => {
                if (f.name && !allFieldsMap.has(f.name) && !hiddenColumns.includes(f.name)) {
                  allFieldsMap.set(f.name, { id: crypto.randomUUID(), name: f.name, type: f.type || "Text" });
                }
              });
            }
          });
          
          const nextCols = Array.from(allFieldsMap.values());
          // Only update if changed to prevent infinite re-renders
          if (nextCols.length !== prev.length || nextCols.some((c, i) => c.name !== prev[i]?.name)) {
            return nextCols;
          }
          return prev;
        });
      }
    }, [projects, hiddenColumns]);

    // Filtered Projects
    const filteredProjects = projects.filter((p) => {
      const matchesSearch = p.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "ALL" || p.status?.name === statusFilter || p.status?.id === statusFilter;
      return matchesSearch && matchesStatus;
    });

    const getStatusColor = (status: string) => {
      switch (status) {
        case "PLANNING":
          return "bg-[#fbfaf7]0/10 text-slate-500 border-slate-500/20";
        case "IN_PROGRESS":
          return "bg-blue-500/10 text-blue-500 border-blue-500/20";
        case "ON_HOLD":
          return "bg-amber-500/10 text-amber-500 border-amber-500/20";
        case "COMPLETE":
          return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
        default:
          return "bg-[#fbfaf7]0/10 text-slate-500 border-slate-500/20";
      }
    };

    const openEditModal = (project: any) => {
      setIsEditMode(true);
      setEditProjectId(project.id);
      
      setFormName(project.name || "");
      setFormClientId(project.clientId || "");
      setFormPMId(project.projectManagerId || "");
      setFormStatusId(project.statusId || "");
      setFormPriority(project.priority || "MEDIUM");
      setFormStartDate(project.startDate ? (typeof project.startDate === 'string' ? project.startDate.split('T')[0] : new Date(project.startDate).toISOString().split('T')[0]) : "");
      setFormEndDate(project.endDate ? (typeof project.endDate === 'string' ? project.endDate.split('T')[0] : new Date(project.endDate).toISOString().split('T')[0]) : "");
      setIsOngoing(project.isOngoing || false);
      setFormBudget(project.projectBudget?.toString() || "");
      setFormAllocatedHours(project.totalAllocatedHours?.toString() || "");
      setDescription(project.description || "");
      setFormNotes(project.notes || "");
      
      if (project.customFields && Array.isArray(project.customFields)) {
        setCustomFields(project.customFields);
      } else {
        setCustomFields([]);
      }
      setIsRepeatEnabled(project.repeatSettings?.enabled || false);
      if(project.repeatSettings) {
        setRepeatFrequency(project.repeatSettings.frequency || "DAILY");
        setRepeatTime(project.repeatSettings.time || "09:00");
      }
      
      if (project.rules && Array.isArray(project.rules)) {
        setAttachedRuleIds(project.rules.map((r: any) => r.ruleId));
      } else {
        setAttachedRuleIds([]);
      }
      
      if (project.assignees && Array.isArray(project.assignees)) {
        setFormAssigneeIds(project.assignees.map((a: any) => a.userId));
      } else {
        setFormAssigneeIds([]);
      }
      
      if (project.tasks && Array.isArray(project.tasks)) {
        setProjectTasks(project.tasks.map((t: any) => ({
          id: t.id || Math.random().toString(),
          title: t.title || "",
          description: t.description || "",
          status: t.statusId || "",
          priority: t.priority || "MEDIUM",
          assigneeId: t.assignees?.[0]?.userId || "",
        })));
      } else {
        setProjectTasks([]);
      }
      
      setIsCreateOpen(true);
    };

    const handleRenameStage = async (statusId: string, newName: string) => {
      try {
        const res = await fetch(`/api/project-statuses/${statusId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newName })
        });
        if (res.ok) {
          toast.success("Stage renamed!");
          router.refresh();
        } else {
          toast.error("Failed to rename stage.");
        }
      } catch (e) {
        toast.error("Failed to rename stage.");
      }
    };

    const handleDeleteStage = (statusId: string) => {
      setDeleteStageId(statusId);
      setIsDeleteStageDialogOpen(true);
    };

    const confirmDeleteStage = async () => {
      if (!deleteStageId) return;
      try {
        const res = await fetch(`/api/project-statuses/${deleteStageId}`, {
          method: "DELETE",
        });
        if (res.ok) {
          toast.success("Stage deleted!");
          setIsDeleteStageDialogOpen(false);
          setDeleteStageId(null);
          router.refresh();
        } else {
          const data = await res.json();
          toast.error(data.error || "Failed to delete stage.");
        }
      } catch (e) {
        toast.error("Failed to delete stage.");
      }
    };

    const handleDragStart = (e: any) => {
      if (currentUser?.role === 'CLIENT') return;
      setActiveDragProject(e.active.data.current);
    };

    const handleDragEnd = (e: DragEndEvent) => {
      const { active, over } = e;
      const activeData = active.data.current as any;
      
      setActiveDragProject(null);
      if (currentUser?.role === 'CLIENT') {
        toast.error("Clients cannot make changes.");
        return;
      }
      
      if (!over) return;
      
      // Column Reordering Logic
      if (activeData?.type === "COLUMN") {
        if (active.id !== over.id) {
          const oldIndex = projectStatuses.findIndex((s: any) => s.id === active.id);
          const newIndex = projectStatuses.findIndex((s: any) => s.id === over.id);
          
          const newStatuses = arrayMove(projectStatuses, oldIndex, newIndex);
          
          startTransition(async () => {
            try {
              await Promise.all(newStatuses.map((s: any, index: number) => 
                fetch(`/api/project-statuses/${s.id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ order: index })
                })
              ));
              router.refresh();
            } catch(e) {
              toast.error("Failed to reorder columns.");
            }
          });
        }
        return;
      }

      // Project Drag Logic
      const projectId = active.id as string;
      const project = projects.find(p => p.id === projectId);
      const newStatus = over.id as string;

      if (project && project.statusId !== newStatus) {
        const statusObj = projectStatuses?.find((s: any) => s.id === newStatus);
        const newStatusName = statusObj?.name || newStatus;
        
        startTransition(async () => {
          // Optimistic update
          setProjects(projects.map(p => p.id === projectId ? { ...p, statusId: newStatus } : p));
          
          const res = await updateProjectStatusAction(projectId, newStatus as any);
          if (res.error) {
            toast.error(res.error);
            // Revert optimistic update
            router.refresh();
          } else {
            toast.success(`Project moved to ${newStatusName}`);
          }
        });
      }
    };

    const handleCreateProject = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      if (isRepeatEnabled && (!formEndDate || isOngoing)) {
        toast.error("An End Date is required to schedule repeated projects.");
        return;
      }

      const data = {
        name: formName,
        clientId: formClientId || undefined,
        projectManagerId: formPMId || undefined,
        description: description,
        statusId: formStatusId || undefined,
        priority: formPriority as any,
        startDate: formStartDate,
        endDate: formEndDate,
        isOngoing,
        projectBudget: formBudget ? Number(formBudget) : undefined,
        totalAllocatedHours: formAllocatedHours ? Number(formAllocatedHours) : undefined,
        notes: formNotes,
        assigneeIds: formAssigneeIds,
        customFields,
        repeatSettings: {
          enabled: isRepeatEnabled,
          frequency: repeatFrequency,
            time: repeatTime,
        },
        tasks: projectTasks
          .filter((t) => t.title.trim() !== "")
          .map((t) => ({
            id: t.id,
            title: t.title,
            description: t.description,
            priority: t.priority as any,
            statusId: t.status as string,
            assigneeIds: t.assigneeId ? [t.assigneeId] : [],
          })),
        ruleIds: attachedRuleIds,
      };

      startTransition(async () => {
        let res;
        if (isEditMode && editProjectId) {
          res = await updateProjectAction(editProjectId, data);
        } else {
          res = await createProjectAction(data);
        }
        if (res.error) {
          toast.error(res.error);
        } else {
          const targetProjectId = isEditMode ? editProjectId : (res as any).project?.id;
          if (targetProjectId && draftDocs.length > 0) {
            await persistDraftDocs(targetProjectId);
          }
          toast.success(isEditMode ? "Project updated successfully" : "Project created successfully");
          setIsCreateOpen(false);
          setActiveCreateTab("project");
          setDraftDocs([]);
          setIsEditMode(false);
          setEditProjectId(null);
          setProjectTasks([]);
          setCustomFields([]);
          setFormName("");
          setFormClientId("");
          setFormPMId("");
          setFormStatusId("");
          setFormPriority("MEDIUM");
          setFormStartDate("");
          setFormEndDate("");
          setFormBudget("");
          setFormAllocatedHours("");
          setFormNotes("");
          setDescription("");
          setIsRepeatEnabled(false);
          setRepeatFrequency("DAILY");
          setRepeatTime("09:00");
          setAttachedRuleIds([]);
          setFormAssigneeIds([]);
          router.refresh();
        }
      });
    };

    const handleQuickCreateClient = async (
      e: React.FormEvent<HTMLFormElement>,
    ) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);

      startTransition(async () => {
        const res = await quickCreateClientAction(
          formData.get("name") as string,
          formData.get("email") as string
        );
        if (res.error) {
          toast.error(res.error);
        } else {
          toast.success("Client created successfully");
          setIsQuickClientOpen(false);
          router.refresh(); // Refresh to update client list
        }
      });
    };

    const handleDelete = (id: string) => {
      setDeleteProjectId(id);
      setIsDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
      if (!deleteProjectId) return;
      startTransition(async () => {
        const res = await deleteProjectAction(deleteProjectId);
        if (res.error) toast.error(res.error);
        else {
          toast.success("Project deleted");
          setProjects(projects.filter((p) => p.id !== deleteProjectId));
          setIsDeleteDialogOpen(false);
          setDeleteProjectId(null);
        }
      });
    };

    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <FolderKanban className="text-primary" size={28} />
              Projects
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Manage your organization's projects and team assignments.
            </p>
          </div>

          {currentUser.role === "OWNER" && (
            <div className="flex items-center -space-x-px w-full sm:w-auto shadow-md rounded-xl overflow-hidden">
              <Button
                onClick={handleOpenCreateProject}
                className="rounded-r-none h-10 px-4 flex-1 sm:flex-initial"
              >
                <Plus className="mr-2 h-4 w-4" /> New Project
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="rounded-l-none border-l border-white/20 px-2.5 h-10 flex-none">
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 bg-white dark:bg-[#1f1f1f] rounded-xl shadow-lg border border-black/5 dark:border-white/10 p-1.5 z-50">
                  <DropdownMenuItem
                    onClick={handleOpenCreateProject}
                    className="cursor-pointer rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted focus:bg-muted"
                  >
                    Create New Project
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setIsRepeatEnabled(false);
                      setIsTemplateSelectOpen(true);
                    }}
                    className="cursor-pointer rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted focus:bg-muted"
                  >
                    Use Existing Template
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setIsRepeatEnabled(true);
                      setIsOngoing(false);
                      setFormName("");
                      setFormClientId("");
                      setFormPMId("");
                      setFormStatusId("");
                      setFormPriority("MEDIUM");
                      setFormStartDate("");
                      setFormEndDate("");
                      setFormBudget("");
                      setFormAllocatedHours("");
                      setFormNotes("");
                      setDescription("");
                      setProjectTasks([]);
                      setCustomFields([]);
                      setIsCreateOpen(true);
                    }}
                    className="cursor-pointer rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted focus:bg-muted"
                  >
                    Create Repeated Project
                  </DropdownMenuItem>

                  {pinnedTemplates.length > 0 && (
                    <>
                      <DropdownMenuSeparator className="my-1 border-t border-black/5 dark:border-white/10" />
                      <div className="px-3 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider select-none">
                        Pinned Templates
                      </div>
                      {pinnedTemplates.map((template) => (
                        <DropdownMenuItem
                          key={template.id}
                          onClick={() => handleUseTemplate(template)}
                          className="cursor-pointer rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted focus:bg-muted flex items-center gap-2"
                        >
                          <Pin className="h-3.5 w-3.5 fill-purple-600 text-purple-600 dark:fill-purple-400 dark:text-purple-400 rotate-45 shrink-0" />
                          <span className="truncate">{template.name}</span>
                        </DropdownMenuItem>
                      ))}
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        {/* Filters & Views */}
        <div className="flex flex-col sm:flex-row justify-between gap-4 p-1">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              className="pl-9 bg-background shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex bg-muted/50 p-1 rounded-xl shadow-sm border">
              <button
                onClick={() => handleSetViewMode("TABLE")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === "TABLE"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <TableIcon size={14} /> Table
              </button>
              <button
                onClick={() => handleSetViewMode("KANBAN")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === "KANBAN"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <LayoutGrid size={14} /> Kanban
              </button>
              <button
                onClick={() => handleSetViewMode("LIST")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === "LIST"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <ListIcon size={14} /> List
              </button>
            </div>
            
            <select
              className="flex h-9 rounded-xl border bg-background px-3 text-sm shadow-sm focus:ring-1 focus:ring-ring min-w-[140px]"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              {projectStatuses.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Projects Views */}
        {viewMode === "TABLE" && (
        <div className="bg-background border-y sm:border sm:rounded-xl shadow-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <Table>
            <TableHeader>
              <TableRow className="bg-white dark:bg-[#202020] border-b border-slate-200 dark:border-white/10 hover:bg-white dark:hover:bg-[#202020]">
                <TableHead className="w-[48px] text-center px-4">
                  <input type="checkbox" className="rounded border-slate-300 w-3.5 h-3.5 cursor-pointer accent-blue-600" />
                </TableHead>
                <TableHead className="w-[350px] text-slate-500 font-medium text-[13px]">Name</TableHead>
                <TableHead className="w-[180px] text-slate-500 font-medium text-[13px] border-l border-slate-100 dark:border-white/5">Status</TableHead>
                <TableHead className="w-[150px] text-slate-500 font-medium text-[13px] border-l border-slate-100 dark:border-white/5">Due date</TableHead>
                <TableHead className="w-[150px] text-slate-500 font-medium text-[13px] border-l border-slate-100 dark:border-white/5">Priority</TableHead>
                {customColumns.map(col => (
                  <TableHead key={col.id} className="w-[180px] text-slate-500 font-medium text-[13px] border-l border-slate-100 dark:border-white/5">
                    <div className="flex items-center justify-between group/col">
                      <div className="flex items-center gap-2">
                        {col.type === "Text" && <Type size={14} className="text-slate-400 shrink-0" />}
                        {col.type === "Date" && <CalendarIcon size={14} className="text-slate-400 shrink-0" />}
                        {col.type === "Number" && <Hash size={14} className="text-slate-400 shrink-0" />}
                        {col.type === "Dropdown" && <ListIcon size={14} className="text-slate-400 shrink-0" />}
                        {col.type === "Checkbox" && <CheckSquare size={14} className="text-slate-400 shrink-0" />}
                        {col.type === "Website" && <Globe size={14} className="text-slate-400 shrink-0" />}
                        {col.type === "Email" && <Mail size={14} className="text-slate-400 shrink-0" />}
                        {col.type === "Phone" && <Phone size={14} className="text-slate-400 shrink-0" />}
                        {(col.type === "Text area" || col.type === "Labels" || col.type === "AI Autofill") && <AlignLeft size={14} className="text-slate-400 shrink-0" />}
                        <span className="truncate">{col.name}</span>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover/col:opacity-100 transition-opacity shrink-0">
                        <button className="text-slate-400 hover:text-slate-600"><Settings size={12} /></button>
                        <button onClick={() => hideColumn(col.name)} className="text-slate-400 hover:text-red-500"><X size={12} /></button>
                      </div>
                    </div>
                  </TableHead>
                ))}
                <TableHead className="w-[60px] text-center border-l border-slate-100 dark:border-white/5">
                  <button onClick={() => { setFieldsDrawerTarget("TABLE"); setIsFieldsDrawerOpen(true); }} className="p-1 hover:bg-slate-100 dark:hover:bg-white/5 rounded text-slate-400 transition-colors">
                    <Plus size={16} className="mx-auto" />
                  </button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProjects.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-48 text-center text-muted-foreground"
                  >
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <FolderKanban size={40} className="opacity-20" />
                      <p>No projects found.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredProjects.map((p: any, index: number) => (
                  <TableRow
                    key={p.id}
                    className="group hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors border-b border-slate-100 dark:border-white/5 bg-white dark:bg-transparent"
                  >
                    <TableCell className="text-center font-medium text-slate-400 text-xs px-4">
                      {index + 1}
                    </TableCell>
                    <TableCell className="border-l border-slate-100/50 dark:border-white/5">
                      <TableNameCell project={p} setProjects={setProjects} currentUser={currentUser} />
                    </TableCell>
                    <TableCell className="border-l border-slate-100 dark:border-white/5">
                      <TableStatusCell project={p} projectStatuses={projectStatuses} setProjects={setProjects} currentUser={currentUser} />
                    </TableCell>
                    <TableCell className="border-l border-slate-100 dark:border-white/5 text-[13px] font-medium text-slate-700 dark:text-slate-300 p-0">
                      <TableDueDateCell project={p} setProjects={setProjects} currentUser={currentUser} />
                    </TableCell>
                    <TableCell className="border-l border-slate-100 dark:border-white/5 p-0">
                      <TablePriorityCell project={p} setProjects={setProjects} currentUser={currentUser} />
                    </TableCell>
                    {customColumns.map(col => (
                      <TableCell key={col.id} className="border-l border-slate-100 dark:border-white/5 p-0 align-top">
                        <TableCustomFieldCell project={p} col={col} setProjects={setProjects} projects={projects} currentUser={currentUser} />
                      </TableCell>
                    ))}
                    <TableCell className="border-l border-slate-100 dark:border-white/5 text-center">
                      {currentUser.role === "OWNER" && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 mx-auto"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/workspace/projects/${p.id}`}>
                                View Project
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditModal(p)} className="cursor-pointer">
                              Edit Project
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive cursor-pointer"
                              onClick={() => handleDelete(p.id)}
                            >
                              Delete Project
                            </DropdownMenuItem>
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

        {viewMode === "KANBAN" && (
          <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar h-[calc(100vh-220px)] animate-in fade-in zoom-in-95 duration-200">
              <SortableContext items={projectStatuses.map((s: any) => s.id)} strategy={horizontalListSortingStrategy}>
                {projectStatuses.map((status) => {
                  const statusProjects = filteredProjects.filter(p => p.statusId === status.id);
                  return (
                    <KanbanColumn 
                      key={status.id} 
                      status={status.id} 
                      title={status.name} 
                      count={statusProjects.length} 
                      projectStatuses={projectStatuses} 
                      onAddProject={() => openCreateModalForStatus(status.id)}
                      currentUser={currentUser}
                      handleDeleteStage={handleDeleteStage}
                      handleRenameStage={handleRenameStage}
                    >
                      {statusProjects.map((p: any) => (
                        <KanbanCard key={p.id} project={p} currentUser={currentUser} handleDelete={handleDelete} handleEdit={openEditModal} />
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
              {activeDragProject ? (
                activeDragProject.type === "COLUMN" ? (
                  <div className="opacity-80 scale-105 transition-transform cursor-grabbing w-[320px] rounded-2xl border-2 border-dashed border-primary bg-background shadow-2xl h-[200px]" />
                ) : (
                  <div className="opacity-80 rotate-2 scale-105 transition-transform cursor-grabbing">
                    <KanbanCard project={activeDragProject} currentUser={currentUser} handleDelete={handleDelete} handleEdit={openEditModal} />
                  </div>
                )
              ) : null}
            </DragOverlay>
          </DndContext>
        )}

        {viewMode === "LIST" && (
          <div className="flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
            {filteredProjects.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center space-y-3 bg-background rounded-xl border border-dashed">
                <FolderKanban size={40} className="opacity-20" />
                <p className="text-muted-foreground text-sm">No projects found.</p>
              </div>
            ) : (
              filteredProjects.map(p => (
                <div key={p.id} className="bg-background border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row gap-5 items-start sm:items-center relative overflow-hidden group">
                  <div className="absolute left-0 top-0 w-1.5 h-full" style={{ backgroundColor: getPriorityColor(p.priority).includes("red") ? "#ef4444" : getPriorityColor(p.priority).includes("orange") ? "#f97316" : getPriorityColor(p.priority).includes("blue") ? "#3b82f6" : "#cbd5e1" }} />
                  
                  <div className="flex-1 min-w-0 pl-2">
                    <div className="flex items-center gap-3 mb-1">
                      <Link href={`/workspace/projects/${p.id}`} className="text-lg font-bold text-foreground hover:text-primary transition-colors truncate">
                        {p.name}
                      </Link>
                      {p.isRepeated && (
                        <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/50 py-0 px-1.5 font-semibold flex items-center gap-1">
                          <Repeat size={8} /> Recurring
                        </Badge>
                      )}
                      <Badge variant="outline" className="border-transparent font-medium text-white" style={{ backgroundColor: p.status?.color || '#cccccc' }}>{p.status?.name || "No Status"}</Badge>
                    </div>
                    {p.description ? (
                      <div className="text-sm text-muted-foreground line-clamp-2 max-w-3xl" dangerouslySetInnerHTML={{ __html: p.description }} />
                    ) : (
                      <p className="text-sm text-muted-foreground italic">No description provided.</p>
                    )}
                    {p.client && currentUser.role !== "MEMBER" && <p className="text-xs text-muted-foreground mt-2 font-medium">Client: {p.client.name}</p>}
                  </div>
                  
                  <div className="flex items-center gap-6 sm:ml-auto w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
                    <div className="flex flex-col gap-1 min-w-[120px]">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Timeline</span>
                      <div className="flex flex-col gap-0.5 text-xs font-medium">
                        <span className="flex items-center gap-1.5 text-foreground"><CalendarIcon size={12} className="text-muted-foreground" /> {formatDate(p.startDate)}</span>
                        {p.isOngoing ? (
                          <span className="flex items-center gap-1.5 text-emerald-600"><Clock size={12} /> Ongoing</span>
                        ) : p.endDate ? (
                          <span className="flex items-center gap-1.5 text-foreground"><ArrowRight size={12} className="text-muted-foreground" /> {formatDate(p.endDate)}</span>
                        ) : null}
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-1 min-w-[120px]">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Team</span>
                      <div className="flex -space-x-2 overflow-hidden py-1">
                        {p.projectManager && (
                          <Avatar className="h-8 w-8 border-2 border-background ring-2 ring-purple-500 z-10" title={`PM: ${p.projectManager.name}`}>
                            <AvatarFallback className="bg-purple-100 text-purple-700 text-xs">{p.projectManager.name.substring(0,2)}</AvatarFallback>
                          </Avatar>
                        )}
                        {getProjectMembers(p).slice(0, 4).map((u: any) => (
                          <Avatar key={u.id} className="h-8 w-8 border-2 border-background" title={u.name}>
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">{u.name.substring(0,2)}</AvatarFallback>
                          </Avatar>
                        ))}
                        {getProjectMembers(p).length > 4 && (
                          <div className="h-8 w-8 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[10px] font-medium text-muted-foreground z-10">
                            +{getProjectMembers(p).length - 4}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 pl-4 border-l border-border/50">
                      <Button variant="outline" size="sm" asChild className="h-9 font-medium shadow-sm">
                        <Link href={`/workspace/projects/${p.id}`}>View</Link>
                      </Button>
                      {currentUser.role === "OWNER" && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-9 w-9">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditModal(p)} className="cursor-pointer">Edit Project</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive focus:text-destructive cursor-pointer" onClick={() => handleDelete(p.id)}>
                              <Trash2 className="mr-2 h-4 w-4" /> Delete Project
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Create / Edit Project Modal */}
        <Dialog open={isCreateOpen} onOpenChange={(isOpen) => {
          setIsCreateOpen(isOpen);
          if (!isOpen) {
            setIsEditMode(false);
            setEditProjectId(null);
            setActiveCreateTab("project");
          }
        }}>
        <DialogContent
    className="w-[calc(100%-2rem)] sm:max-w-[820px] h-[78vh] min-h-[560px] max-h-[720px] p-0 flex flex-col overflow-hidden rounded-[8px] sm:rounded-[8px] [&>button]:hidden"

    onInteractOutside={(e) => {
      e.preventDefault();
    }}

    onPointerDownOutside={(e) => {
      e.preventDefault();
    }}
  >
            <DialogTitle className="sr-only">
              {activeCreateTab === "doc" ? "Create Document" : isEditMode ? "Edit Project" : "Create Project"}
            </DialogTitle>
            <ModalTabsHeader
              tabs={[
                { id: "project", label: "Project" },
                { id: "doc", label: "Doc" },
              ]}
              activeTab={activeCreateTab}
              onTabChange={(tab) => setActiveCreateTab(tab as "project" | "doc")}
              onClose={() => {
                setIsCreateOpen(false);
                setIsEditMode(false);
                setEditProjectId(null);
              }}
              rightSlot={activeCreateTab === "project" ? (
                <ProjectRulesHeaderControl
                  rules={rules}
                  attachedRuleIds={attachedRuleIds}
                  onAttachedRuleIdsChange={setAttachedRuleIds}
                  onCreateRule={() => setIsCreateRuleOpen(true)}
                />
              ) : undefined}
              className={activeCreateTab === "doc" ? "border-b-0 dark:border-b-0" : undefined}
            />
            {activeCreateTab === "project" ? (
              <>
            <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
              <form onSubmit={handleCreateProject} className="space-y-6 pb-6">

                {/* Basics */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <input
                    name="name"
                    required
                    placeholder="Name this Project..."
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full border-0 bg-transparent px-0 text-[25px] font-medium tracking-[-0.02em] text-slate-900 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500"
                  />
                </div>
              </div>

              <div className="project-properties-grid">
              <div className="grid grid-cols-2 gap-4 bg-muted/30 p-4 rounded-lg border">
           <div className="space-y-2">
 <div className="flex flex-col">

  <label className="text-sm font-medium leading-none">
    Client
  </label>

  <button
    type="button"
    onClick={() => setIsQuickClientOpen(true)}
    className="
      mt-1
      text-[11px]
      font-semibold
      text-primary
      hover:underline
      flex
      items-center
      w-fit
    "
  >
    <Plus size={11} className="mr-1" />
    Quick Add
  </button>

</div>

    <DropdownMenu>
    <DropdownMenuTrigger asChild>
  <button
    type="button"
    className="
      group
      w-full
      min-h-[40px]
      flex
      items-center
      px-2
      rounded-lg
      hover:bg-slate-100
      dark:hover:bg-white/5
      transition-colors
      text-left
    "
  >

    {formClientId ? (
      (() => {
        const client = clients.find(c => c.id === formClientId);

        return (
          <div className="flex items-center gap-2">

<Avatar className="h-6 w-6">              <AvatarFallback className="bg-slate-500 text-white text-xs">
                {client?.name?.substring(0,2).toUpperCase()}
              </AvatarFallback>
            </Avatar>


            <span className="text-[15px] text-slate-800 dark:text-white">
              {client?.name}
            </span>

          </div>
        );

      })()

    ) : (

      <span className="text-slate-400 text-sm">
        Select client
      </span>

    )}

  </button>
</DropdownMenuTrigger>

    <DropdownMenuContent
  align="start"
  className="
    w-[240px]
    p-1.5
    rounded-xl
    bg-white
    dark:bg-[#1C1C1C]
    shadow-lg
    border
  "
>

        {/* Search */}
        <Input
          placeholder="Search clients..."
          className="mb-2 h-9"
        />


        <div className="max-h-[250px] overflow-y-auto">

          {clients.map((client)=>(
            <DropdownMenuItem
              key={client.id}
              onSelect={(e)=>{
                e.preventDefault();
                setFormClientId(client.id);
              }}
              className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer"
            >

<Avatar className="h-6 w-6"><AvatarFallback className="text-[10px] bg-slate-500 text-white">                  {client.name.substring(0,2).toUpperCase()}
                </AvatarFallback>
              </Avatar>


              <div className="flex flex-col">
                <span className="font-medium">
                  {client.name}
                </span>

                <span className="text-xs text-slate-400">
                  {client.email}
                </span>
              </div>

            </DropdownMenuItem>
          ))}

        </div>


      </DropdownMenuContent>

    </DropdownMenu>

  </div>



  
             <div className="space-y-2">
  <label className="text-sm font-medium">
    Project Manager
  </label>

  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <button
        type="button"
        className="
          group
          w-full
          min-h-[40px]
          flex
          items-center
          px-2
          rounded-lg
          hover:bg-slate-100
          dark:hover:bg-white/5
          transition-colors
          text-left
        "
      >

        {formPMId ? (
          (() => {
            const manager = members.find((m) => m.id === formPMId);

            return (
              <div className="flex items-center gap-2">

                <Avatar className="h-6 w-6">
                  <AvatarFallback className="bg-slate-500 text-white text-[10px]">
                    {manager?.name
                      ?.substring(0, 2)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <span className="text-[14px] text-slate-800 dark:text-white">
                  {manager?.name}
                </span>

              </div>
            );

          })()

        ) : (

          <span className="text-slate-400 text-sm">
            Unassigned
          </span>

        )}

      </button>
    </DropdownMenuTrigger>


   <DropdownMenuContent
  align="start"
  className="
    w-[240px]
    p-1
    rounded-xl
    bg-white
    dark:bg-[#1C1C1C]
    shadow-lg
    border
  "
>

      <Input
        placeholder="Search members..."
        className="
          h-8
          text-sm
          rounded-lg
          mb-1.5
        "
      />


      <div className="max-h-[180px] overflow-y-auto">

        {members.map((m) => (

        <DropdownMenuItem
  key={m.id}
  onSelect={(e) => {
    e.preventDefault();
    setFormPMId(m.id);
    setIsPMOpen(false);
  }}
  className="
    flex
    items-center
    gap-2
    px-2
    py-1.5
    rounded-lg
    cursor-pointer
    hover:bg-slate-100
    dark:hover:bg-white/5
  "
>

            <Avatar className="h-6 w-6">
              <AvatarFallback className="bg-slate-500 text-white text-[10px]">
                {m.name.substring(0,2).toUpperCase()}
              </AvatarFallback>
            </Avatar>


            <div className="flex flex-col">
              <span className="text-sm font-medium">
                {m.name}
              </span>

              <span className="text-[11px] text-slate-400">
                {m.email}
              </span>
            </div>

          </DropdownMenuItem>

        ))}

      </div>

    </DropdownMenuContent>

  </DropdownMenu>

</div>
                
           <div className="space-y-2">
  <label className="text-sm font-medium">
    Assigned Users
  </label>


  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <button
        type="button"
        className="
          group
          w-full
          min-h-[40px]
          flex
          items-center
          px-2
          rounded-lg
          hover:bg-slate-100
          dark:hover:bg-white/5
          transition-colors
          text-left
        "
      >

        {formAssigneeIds.length > 0 ? (

          <div className="flex items-center -space-x-2">

            {formAssigneeIds.slice(0,5).map((userId)=>{

              const userObj = members.find(
                m => m.id === userId
              );

              if(!userObj) return null;

              return (

                <Avatar
                  key={userId}
                  className="
                    h-7
                    w-7
                    border-2
                    border-background
                  "
                  title={userObj.name}
                >

                  <AvatarFallback
                    className="
                      bg-slate-500
                      text-white
                      text-[10px]
                    "
                  >
                    {userObj.name
                      .substring(0,2)
                      .toUpperCase()}
                  </AvatarFallback>

                </Avatar>

              );

            })}


            {formAssigneeIds.length > 5 && (

              <div
                className="
                  h-7
                  w-7
                  rounded-full
                  bg-slate-200
                  text-slate-600
                  text-[10px]
                  flex
                  items-center
                  justify-center
                  border-2
                  border-background
                "
              >
                +{formAssigneeIds.length - 5}
              </div>

            )}

          </div>


        ) : (

          <span className="text-slate-400 text-sm">
            Assign users...
          </span>

        )}

      </button>
    </DropdownMenuTrigger>



    <DropdownMenuContent
      align="start"
      className="
        w-[260px]
        max-h-[220px]
        overflow-y-auto
        bg-white
        dark:bg-[#1C1C1C]
        rounded-xl
        shadow-lg
        border
        p-1.5
        custom-scrollbar
      "
      onInteractOutside={(e)=>e.stopPropagation()}
    >

      {members.length === 0 ? (

        <div className="p-2 text-center text-xs text-slate-500">
          No active team members
        </div>

      ) : (

        members.map((m)=>{

          const isAssigned = formAssigneeIds.includes(m.id);

          return (

            <DropdownMenuItem
              key={m.id}

              onSelect={(e)=>e.preventDefault()}

              onClick={()=>{

                if(isAssigned){

                  setFormAssigneeIds(prev =>
                    prev.filter(id => id !== m.id)
                  );

                }else{

                  setFormAssigneeIds(prev => [
                    ...prev,
                    m.id
                  ]);

                }

              }}

              className="
                cursor-pointer
                rounded-lg
                px-2
                py-1.5
                flex
                items-center
                gap-2
                hover:bg-slate-100
                dark:hover:bg-white/5
              "
            >

              <Avatar className="h-6 w-6">

                <AvatarFallback
                  className="
                    bg-slate-500
                    text-white
                    text-[10px]
                  "
                >
                  {m.name
                    .substring(0,2)
                    .toUpperCase()}
                </AvatarFallback>

              </Avatar>


              <div className="flex flex-col flex-1">

                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {m.name}
                </span>

                <span className="text-[11px] text-slate-400">
                  {m.email}
                </span>

              </div>


              {isAssigned && (
                <Check
                  size={14}
                  className="text-green-600"
                />
              )}

            </DropdownMenuItem>

          );

        })

      )}

    </DropdownMenuContent>

  </DropdownMenu>

</div>
              </div>

              {/* Configuration */}
              <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
  <label className="text-sm font-medium">
    Status
  </label>


  <DropdownMenu>
    <DropdownMenuTrigger asChild>

      <button
        type="button"
        className="
          group
          w-full
          min-h-[40px]
          flex
          items-center
          px-2
          rounded-lg
          hover:bg-slate-100
          dark:hover:bg-white/5
          transition-colors
          text-left
        "
      >

        {formStatusId ? (

          (() => {

            const status = projectStatuses.find(
              s => s.id === formStatusId
            );

            return (

              <div className="flex items-center gap-2">

                <CircleDashed
                  size={16}
                  style={{
                    color: status?.color || "#94a3b8"
                  }}
                />

                <span className="text-sm font-medium">
                  {status?.name}
                </span>

              </div>

            );

          })()

        ) : (

          <span className="text-slate-400 text-sm">
            Select status...
          </span>

        )}

      </button>

    </DropdownMenuTrigger>



    <DropdownMenuContent
      align="start"
      className="
        w-[220px]
        p-1.5
        rounded-xl
        bg-white
        dark:bg-[#1C1C1C]
        shadow-lg
        border
      "
    >


      <Input
        placeholder="Search..."
        className="
          h-8
          text-sm
          rounded-lg
          mb-2
        "
      />


      {projectStatuses.map((status)=>{


        const selected = formStatusId === status.id;


        return (

          <DropdownMenuItem

            key={status.id}

            onSelect={(e)=>{
              e.preventDefault();
              setFormStatusId(status.id);
            }}

            className={`
              flex
              items-center
              justify-between
              px-2.5
              py-2
              rounded-lg
              cursor-pointer
              ${
                selected
                ? "bg-slate-100 dark:bg-white/10"
                : "hover:bg-slate-100 dark:hover:bg-white/5"
              }
            `}

          >


            <div className="flex items-center gap-2.5">

              <CircleDashed
                size={16}
                style={{
                  color: status.color || "#94a3b8"
                }}
              />


              <span className="text-sm">
                {status.name}
              </span>


            </div>



            {selected && (

              <Check
                size={15}
                className="text-slate-700 dark:text-white"
              />

            )}


          </DropdownMenuItem>

        );


      })}


    </DropdownMenuContent>


  </DropdownMenu>

</div>



              <div className="space-y-2">
  <label className="text-sm font-medium">
    Priority
  </label>


  <DropdownMenu>
    <DropdownMenuTrigger asChild>

      <button
        type="button"
        className="
          group
          w-full
          min-h-[40px]
          flex
          items-center
          px-2
          rounded-lg
          hover:bg-slate-100
          dark:hover:bg-white/5
          transition-colors
          text-left
        "
      >

        {formPriority ? (

          (() => {

            const priority = {
              LOW: {
                label: "Low",
                color: "text-slate-400"
              },
              MEDIUM: {
                label: "Normal",
                color: "text-blue-500"
              },
              HIGH: {
                label: "High",
                color: "text-yellow-500"
              },
              CRITICAL: {
                label: "Urgent",
                color: "text-red-500"
              }
            }[formPriority];


            return (

              <div className="flex items-center gap-2">

                <Flag
                  size={16}
                  className={priority.color}
                  fill="currentColor"
                />

                <span className="text-sm font-medium">
                  {priority.label}
                </span>

              </div>

            );


          })()

        ) : (

          <span className="text-slate-400 text-sm">
            Select priority
          </span>

        )}

      </button>

    </DropdownMenuTrigger>



    <DropdownMenuContent
      align="start"
      className="
        w-[220px]
        p-1.5
        rounded-xl
        bg-white
        dark:bg-[#1C1C1C]
        shadow-lg
        border
      "
    >

      <div className="px-2 py-1.5 text-sm text-slate-500">
        Priority
      </div>


      {[
        {
          value:"CRITICAL",
          label:"Urgent",
          color:"text-red-500"
        },
        {
          value:"HIGH",
          label:"High",
          color:"text-yellow-500"
        },
        {
          value:"MEDIUM",
          label:"Normal",
          color:"text-blue-500"
        },
        {
          value:"LOW",
          label:"Low",
          color:"text-slate-400"
        }

      ].map((item)=>{


        const selected = formPriority === item.value;


        return (

          <DropdownMenuItem
            key={item.value}

            onSelect={(e)=>{
              e.preventDefault();
              setFormPriority(item.value);
            }}

            className={`
              flex
              items-center
              justify-between
              px-2.5
              py-2
              rounded-lg
              cursor-pointer
              ${
                selected
                ? "bg-slate-100 dark:bg-white/10"
                : "hover:bg-slate-100 dark:hover:bg-white/5"
              }
            `}
          >

            <div className="flex items-center gap-3">

              <Flag
                size={16}
                fill="currentColor"
                className={item.color}
              />


              <span className="text-sm">
                {item.label}
              </span>


            </div>


            {selected && (
              <Check
                size={15}
                className="text-slate-700 dark:text-white"
              />
            )}


          </DropdownMenuItem>

        )


      })}


    </DropdownMenuContent>


  </DropdownMenu>


</div>
              </div>

              {/* Timeline */}
              <div className="grid grid-cols-2 gap-4 bg-muted/30 p-4 rounded-lg border">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Start Date <span className="text-destructive">*</span>
                  </label>
                  <Input
                    name="startDate"
                    type="date"
                    required
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2 flex flex-col justify-between">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium">Due Date</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        id="ongoing"
                        checked={isOngoing}
                        onChange={(e) => {
                          setIsOngoing(e.target.checked);
                          if (e.target.checked) {
                            setFormEndDate("");
                          }
                        }}
                        disabled={isRepeatEnabled}
                        className="rounded border-gray-300 text-primary focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <label
                        htmlFor="ongoing"
                        className={`text-xs ${isRepeatEnabled ? 'text-muted-foreground/50 cursor-not-allowed' : 'text-muted-foreground cursor-pointer'}`}
                      >
                        Ongoing
                      </label>
                    </div>
                  </div>
                  {isRepeatEnabled && (
                    <div className="text-[10px] text-amber-600 dark:text-amber-400 -mt-1 mb-1">
                      * Ongoing is disabled for repeating projects.
                    </div>
                  )}
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button type="button" variant="outline" className="w-full justify-between h-9 rounded-xl border text-slate-700 dark:text-slate-300 px-3 text-sm font-medium flex items-center">
                        {isOngoing ? (
                          <span className="text-emerald-600 font-medium flex items-center gap-1.5"><Clock size={12} /> Ongoing</span>
                        ) : formEndDate ? (
                          <span>{format(new Date(formEndDate + "T12:00:00"), 'MMM d, yyyy')}</span>
                        ) : (
                          <span className="text-slate-400 font-normal">Set due date</span>
                        )}
                        <CalendarIcon className="h-4 w-4 text-muted-foreground ml-2 shrink-0" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-auto p-0 flex flex-row bg-white dark:bg-[#1C1C1C] rounded-xl shadow-lg border border-slate-200 dark:border-white/10 z-[9999]" onInteractOutside={(e) => e.stopPropagation()}>
                      <div className="flex flex-col border-r border-slate-100 dark:border-white/5 w-[140px] py-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            const today = new Date();
                            setFormEndDate(today.toISOString().split('T')[0]);
                            setIsOngoing(false);
                          }}
                          className="flex justify-between items-center px-4 py-2 hover:bg-slate-50 dark:hover:bg-white/5 text-[13px] font-medium transition-colors text-left group"
                        >
                          <span className="text-slate-700 dark:text-slate-300 font-medium">Today</span>
                          <span className="text-[10px] text-slate-400 group-hover:text-slate-500">{format(new Date(), 'EEE')}</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            const tomorrow = addDays(new Date(), 1);
                            setFormEndDate(tomorrow.toISOString().split('T')[0]);
                            setIsOngoing(false);
                          }}
                          className="flex justify-between items-center px-4 py-2 hover:bg-slate-50 dark:hover:bg-white/5 text-[13px] font-medium transition-colors text-left group"
                        >
                          <span className="text-slate-700 dark:text-slate-300 font-medium">Tomorrow</span>
                          <span className="text-[10px] text-slate-400 group-hover:text-slate-500">{format(addDays(new Date(), 1), 'EEE')}</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            const nextWeek = addWeeks(new Date(), 1);
                            setFormEndDate(nextWeek.toISOString().split('T')[0]);
                            setIsOngoing(false);
                          }}
                          className="flex justify-between items-center px-4 py-2 hover:bg-slate-50 dark:hover:bg-white/5 text-[13px] font-medium transition-colors text-left group"
                        >
                          <span className="text-slate-700 dark:text-slate-300 font-medium">Next week</span>
                          <span className="text-[10px] text-slate-400 group-hover:text-slate-500">{format(addWeeks(new Date(), 1), 'EEE')}</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            const twoWeeks = addWeeks(new Date(), 2);
                            setFormEndDate(twoWeeks.toISOString().split('T')[0]);
                            setIsOngoing(false);
                          }}
                          className="flex justify-between items-center px-4 py-2 hover:bg-slate-50 dark:hover:bg-white/5 text-[13px] font-medium transition-colors text-left"
                        >
                          <span className="text-slate-700 dark:text-slate-300 font-medium">2 weeks</span>
                        </button>
                        
                        {!isRepeatEnabled && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              setIsOngoing(true);
                              setFormEndDate("");
                            }}
                            className="flex justify-between items-center px-4 py-2 hover:bg-slate-50 dark:hover:bg-white/5 text-[13px] font-medium transition-colors text-left text-emerald-600 dark:text-emerald-400"
                          >
                            <span className="font-medium">Ongoing</span>
                            <Clock size={12} className="text-emerald-500" />
                          </button>
                        )}
                      </div>
                      <div className="p-3">
                        <Calendar
                          mode="single"
                          selected={formEndDate ? new Date(formEndDate + "T12:00:00") : undefined}
                          onSelect={(date) => {
                            if (date) {
                              setFormEndDate(date.toISOString().split('T')[0]);
                              setIsOngoing(false);
                            }
                          }}
                        />
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              </div>

              <div className="space-y-3 border-t border-slate-200 pt-5 dark:border-white/10">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Description</h3>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Add context, type “/” for blocks, or “@” to mention a teammate.</p>
                </div>
                <ProjectDescriptionEditor
                  content={description}
                  onChange={setDescription}
                  placeholder="Add description, or write with AI"
                  people={members}
                  plain
                />
              </div>

              {/* Repeat Settings */}
              <div className="space-y-4 bg-gradient-to-r from-purple-500/5 to-indigo-500/5 dark:from-purple-950/10 dark:to-indigo-950/10 p-5 rounded-2xl border border-purple-100/80 dark:border-purple-900/20 shadow-sm transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Repeat className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      Repeat Project
                    </label>
                    <p className="text-xs text-muted-foreground">
                      Automatically create duplicate projects based on frequency.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isRepeatEnabled}
                    onClick={() => {
                      const newVal = !isRepeatEnabled;
                      setIsRepeatEnabled(newVal);
                      if (newVal) {
                        setIsOngoing(false);
                      }
                    }}
                    className={`${
                      isRepeatEnabled ? "bg-purple-600" : "bg-zinc-200 dark:bg-zinc-800"
                    } relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2`}
                  >
                    <span
                      aria-hidden="true"
                      className={`${
                        isRepeatEnabled ? "translate-x-5" : "translate-x-0"
                      } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out`}
                    />
                  </button>
                </div>

                {isRepeatEnabled && (
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-purple-100/50 dark:border-purple-900/20 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground tracking-wide uppercase">Repeat Frequency</label>
                      <div className="relative">
                        <select
                          value={repeatFrequency}
                          onChange={(e) => setRepeatFrequency(e.target.value as any)}
                          className="flex h-10 w-full appearance-none rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 cursor-pointer pr-10"
                        >
                          <option value="DAILY">Daily</option>
                            <option value="WEEKLY">Weekly</option>
                            <option value="MONTHLY">Monthly</option>
                            <option value="QUARTERLY">Quarterly</option>
                            <option value="YEARLY">Yearly</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                      </div>
                    </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-muted-foreground tracking-wide uppercase">Repeat Time</label>
                        <div className="relative">
                          <input
                            type="time"
                            value={repeatTime}
                            onChange={(e) => setRepeatTime(e.target.value)}
                            className="flex h-10 w-full appearance-none rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 cursor-pointer"
                          />
                        </div>
                      </div>

                  </div>
                )}
              </div>

              {/* Resources */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Project Budget ($){" "}
                    <span className="text-xs text-muted-foreground font-normal">
                      (Optional)
                    </span>
                  </label>
                  <NumberStepper
                    name="projectBudget"
                    step={1}
                    min={0}
                    placeholder="e.g. 5000"
                    value={formBudget}
                    onChange={(e) => setFormBudget(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Total Allocated Hours{" "}
                    <span className="text-destructive">*</span>
                  </label>
                  <NumberStepper
                    name="totalAllocatedHours"
                    step={0.1}
                    min={0}
                    required
                    placeholder="e.g. 120"
                    value={formAllocatedHours}
                    onChange={(e) => setFormAllocatedHours(e.target.value)}
                  />
                </div>
              </div>



              {/* Custom Fields */}
              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium flex items-center gap-1.5">
                    Custom Fields{" "}
                    <span className="text-xs text-muted-foreground font-normal">
                      (Optional)
                    </span>
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFieldsDrawerTarget("FORM");
                      setFieldsTab("create_new");
                      setIsFieldsDrawerOpen(true);
                    }}
                    className="h-8 px-3 text-[13px] bg-white dark:bg-[#252525] border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-slate-700 dark:text-slate-300 shadow-sm rounded-lg"
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5 text-slate-400" /> Add Field
                  </Button>
                </div>

                {customFields.length > 0 && (
                  <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1 custom-scrollbar">
                    {customFields.map((field, index) => {
                      const getIconForType = (type: string) => {
                        switch (type) {
                          case 'number': return <Hash size={14} className="text-slate-400" />;
                          case 'url':
                          case 'website': return <Globe size={14} className="text-slate-400" />;
                          case 'email': return <Mail size={14} className="text-slate-400" />;
                          case 'phone': return <Phone size={14} className="text-slate-400" />;
                          case 'dropdown': return <Tags size={14} className="text-slate-400" />;
                          case 'checkboxes': return <CheckSquare size={14} className="text-slate-400" />;
                          case 'date': return <CircleDashed size={14} className="text-slate-400" />;
                          default: return <Type size={14} className="text-slate-400" />;
                        }
                      };

                      const renderFieldValueInput = () => {
                        const updateValue = (val: any) => {
                          const newFields = [...customFields];
                          newFields[index].value = val;
                          setCustomFields(newFields);
                        };
                        
                        const commonClasses = "h-full w-full border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-4 bg-transparent text-[14px] text-slate-700 dark:text-slate-300 rounded-none shadow-none outline-none appearance-none";
                        
                        switch(field.type) {
                          case 'text area':
                            return <textarea value={field.value || ''} onChange={e => updateValue(e.target.value)} placeholder="—" className={`${commonClasses} py-2.5 resize-none custom-scrollbar`} />;
                          case 'checkbox':
                            return <div className="flex items-center h-full px-4"><input type="checkbox" checked={!!field.value} onChange={e => updateValue(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" /></div>;
                          case 'dropdown':
                            return (
                              <select value={field.value || ''} onChange={e => updateValue(e.target.value)} className={`${commonClasses} cursor-pointer`}>
                                <option value="" disabled>Select an option</option>
                                {(field.options || []).map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                              </select>
                            );
                          case 'labels':
                            const currentValues = Array.isArray(field.value) ? field.value : [];
                            return (
                              <div className="flex items-center flex-wrap gap-1.5 h-full px-4 py-1 overflow-y-auto custom-scrollbar">
                                {currentValues.map((v: string) => (
                                  <span key={v} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[12px] font-medium bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                                    {v}
                                    <button type="button" onClick={() => updateValue(currentValues.filter(val => val !== v))} className="text-slate-400 hover:text-red-500"><X size={10} /></button>
                                  </span>
                                ))}
                                <select 
                                  value="" 
                                  onChange={e => {
                                      if (e.target.value && !currentValues.includes(e.target.value)) {
                                        updateValue([...currentValues, e.target.value]);
                                      }
                                  }}
                                  className="bg-transparent text-[12px] text-slate-500 outline-none cursor-pointer"
                                >
                                  <option value="" disabled>+ Add label</option>
                                  {(field.options || []).filter((o: string) => !currentValues.includes(o)).map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                              </div>
                            );
                          case 'number':
                            return <NumberStepper value={field.value || ''} onChange={e => updateValue(e.target.value)} placeholder="0" min={0} step={1} className={commonClasses} />;
                          case 'date':
                            return <Input type="date" value={field.value || ''} onChange={e => updateValue(e.target.value)} className={commonClasses} />;
                          case 'website':
                          case 'url':
                            return <Input type="url" value={field.value || ''} onChange={e => updateValue(e.target.value)} placeholder="https://..." className={commonClasses} />;
                          case 'phone':
                            return <Input type="tel" value={field.value || ''} onChange={e => updateValue(e.target.value)} placeholder="+1..." className={commonClasses} />;
                          case 'email':
                            return <Input type="email" value={field.value || ''} onChange={e => updateValue(e.target.value)} placeholder="email@example.com" className={commonClasses} />;
                          default:
                            return <Input type="text" value={field.value || ''} onChange={e => updateValue(e.target.value)} placeholder="—" className={commonClasses} />;
                        }
                      };

                      return (
                        <div
                          key={index}
                          className={`flex items-stretch w-full border border-slate-200 dark:border-white/10 rounded-md overflow-hidden group transition-all ${field.type === 'text area' ? 'h-[80px]' : field.type === 'labels' ? 'min-h-[42px]' : 'h-[42px]'}`}
                        >
                          {/* Left Side: Field info */}
                          <div className="flex items-center gap-2 px-3 py-2 min-w-[150px] w-1/3 border-r border-slate-200 dark:border-white/10 bg-[#FAFAFA] dark:bg-[#1A1A1A] relative">
                            {getIconForType(field.type)}
                            <Input
                              value={field.name}
                              onChange={(e) => {
                                const newFields = [...customFields];
                                newFields[index].name = e.target.value;
                                setCustomFields(newFields);
                              }}
                              className="h-7 text-[14px] bg-transparent border-0 focus-visible:ring-1 focus-visible:ring-slate-300 px-1 font-medium text-slate-700 dark:text-slate-300 w-full shadow-none"
                            />
                            
                            <div className="absolute right-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-[#FAFAFA] dark:bg-[#1A1A1A] pl-1">
                              <button type="button" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                                <EyeOff size={14} />
                              </button>
                              <button type="button" className="border border-slate-200 dark:border-white/10 rounded p-[3px] text-slate-500 hover:text-slate-700 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-all bg-white dark:bg-[#252525] shadow-sm">
                                <Settings size={13} />
                              </button>
                            </div>
                          </div>

                          {/* Right Side: Value */}
                          <div className="flex-1 relative bg-white dark:bg-[#252525]">
                            {renderFieldValueInput()}
                            <button
                              type="button"
                              onClick={() =>
                                setCustomFields(
                                  customFields.filter((_, i) => i !== index)
                                )
                              }
                              className="absolute right-2 top-2 border border-slate-200 dark:border-white/10 rounded p-[3px] text-slate-500 hover:text-destructive hover:bg-slate-50 dark:hover:bg-white/5 transition-all bg-white dark:bg-[#252525] opacity-0 group-hover:opacity-100 shadow-sm z-10"
                            >
                              <X size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Project Tasks */}
              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium">
                    Initial Tasks{" "}
                    <span className="text-xs text-muted-foreground font-normal">
                      (Optional)
                    </span>
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setProjectTasks([
                        ...projectTasks,
                        {
                          id: Math.random().toString(),
                          title: "",
                          description: "",
                          status: "",
                          priority: "MEDIUM",
                          assigneeId: "",
                        },
                      ])
                    }
                    className="h-8 text-xs"
                  >
                    <Plus className="mr-1 h-3 w-3" /> Add Task
                  </Button>
                </div>

                {projectTasks.length > 0 && (
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                    {projectTasks.map((task, index) => (
                      <div
                        key={task.id}
                        className="p-3 border rounded-xl bg-muted/20 space-y-3 relative group"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setProjectTasks(
                              projectTasks.filter((t) => t.id !== task.id),
                            )
                          }
                          className="absolute right-2 top-2 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>

                        <div className="space-y-1.5 pr-6">
                          <Input
                            placeholder="Task Title *"
                            value={task.title}
                            onChange={(e) => {
                              const newTasks = [...projectTasks];
                              newTasks[index].title = e.target.value;
                              setProjectTasks(newTasks);
                            }}
                            className="h-8 text-sm bg-background"
                            required
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Input
                            placeholder="Description (Optional)"
                            value={task.description}
                            onChange={(e) => {
                              const newTasks = [...projectTasks];
                              newTasks[index].description = e.target.value;
                              setProjectTasks(newTasks);
                            }}
                            className="h-8 text-sm bg-background"
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <select
                            value={task.status}
                            onChange={(e) => {
                              const newTasks = [...projectTasks];
                              newTasks[index].status = e.target.value;
                              setProjectTasks(newTasks);
                            }}
                            className="flex h-8 w-full rounded-xl border bg-background px-2 text-xs focus:ring-1 focus:ring-ring"
                          >
                            <option value="">No Status</option>
                            {taskStatuses.map((ts) => (
                              <option key={ts.id} value={ts.id}>{ts.name}</option>
                            ))}
                          </select>

                          <select
                            value={task.priority}
                            onChange={(e) => {
                              const newTasks = [...projectTasks];
                              newTasks[index].priority = e.target.value as any;
                              setProjectTasks(newTasks);
                            }}
                            className="flex h-8 w-full rounded-xl border bg-background px-2 text-xs focus:ring-1 focus:ring-ring"
                          >
                            <option value="LOW">Low</option>
                            <option value="MEDIUM">Medium</option>
                            <option value="HIGH">High</option>
                            <option value="CRITICAL">Critical</option>
                          </select>

                          <select
                            value={task.assigneeId}
                            onChange={(e) => {
                              const newTasks = [...projectTasks];
                              newTasks[index].assigneeId = e.target.value;
                              setProjectTasks(newTasks);
                            }}
                            className="flex h-8 w-full rounded-xl border bg-background px-2 text-xs focus:ring-1 focus:ring-ring"
                          >
                            <option value="">Unassigned</option>
                            {members.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <DialogFooter className="pt-4 border-t mt-6 sticky bottom-0 bg-background pb-2 flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsSaveTemplateOpen(true)}
                  className="text-purple-600 border-purple-200 hover:bg-purple-50 dark:text-purple-400 dark:border-purple-900/50 dark:hover:bg-purple-950/20"
                >
                  Save as Template
                </Button>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => { setIsCreateOpen(false); setIsEditMode(false); setEditProjectId(null); }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isPending}>
                    {isPending ? "Saving..." : (isEditMode ? "Save Changes" : "Create Project")}
                  </Button>
                </div>
              </DialogFooter>
            </form>
            </div>
              </>
            ) : (
              <ProjectDocumentComposer drafts={draftDocs} onDraftsChange={setDraftDocs} />
            )}

            {/* Quick Create Client Modal */}
            <Dialog open={isQuickClientOpen} onOpenChange={setIsQuickClientOpen}>
              <DialogContent className="sm:max-w-[400px] ">
                <DialogHeader>
                  <DialogTitle>Quick Add Client</DialogTitle>
                  <DialogDescription>
                    Create a client record instantly to assign to this project.
                  </DialogDescription>
                </DialogHeader>
                <form
                  onSubmit={handleQuickCreateClient}
                  className="space-y-4 pt-4"
                >
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Client Name</label>
                    <Input name="name" required placeholder="Acme Corp" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Client Email</label>
                    <Input
                      name="email"
                      type="email"
                      required
                      placeholder="contact@acme.com"
                    />
                  </div>
                  <DialogFooter className="pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsQuickClientOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isPending}>
                      {isPending ? "Adding..." : "Add Client"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </DialogContent>
        </Dialog>

        {/* Save Template Name Modal */}
        <Dialog open={isSaveTemplateOpen} onOpenChange={setIsSaveTemplateOpen}>
          <DialogContent className="sm:max-w-[400px] bg-background border-border">
            <DialogHeader>
              <DialogTitle>Save as Template</DialogTitle>
              <DialogDescription>
                Enter a name for this template. This will save the project structure, custom fields, and task template.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSaveTemplate} className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Template Name</label>
                <Input
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  required
                  placeholder="e.g. Website Development Template"
                />
              </div>
              <DialogFooter className="pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsSaveTemplateOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Saving..." : "Save Template"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Template Selection Modal */}
        <Dialog open={isTemplateSelectOpen} onOpenChange={setIsTemplateSelectOpen}>
          <DialogContent className="sm:max-w-[850px] h-[80vh] flex flex-col overflow-hidden bg-background border-border p-0 rounded-2xl shadow-xl">
            <DialogHeader className="px-6 py-5 border-b shrink-0 bg-slate-50/50 dark:bg-zinc-900/50 z-10 sticky top-0">
              <DialogTitle className="text-xl font-extrabold tracking-tight">Select a Template</DialogTitle>
              <DialogDescription className="text-xs mt-1 text-muted-foreground">
                Choose one of your saved custom configurations. You can set any template as default using the star icon.
              </DialogDescription>
            </DialogHeader>

            {/* Search bar inside modal */}
            <div className="px-6 pt-4 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search templates by name..."
                  value={templateSearchQuery}
                  onChange={(e) => setTemplateSearchQuery(e.target.value)}
                  className="pl-9 h-10 rounded-xl border bg-background text-sm shadow-sm"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
              {isLoadingTemplates ? (
                <div className="flex items-center justify-center h-48">
                  <span className="text-sm text-muted-foreground animate-pulse font-medium">Loading templates...</span>
                </div>
              ) : templates.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 border border-dashed rounded-2xl p-6 text-center">
                  <FolderKanban className="h-8 w-8 text-muted-foreground mb-2" />
                  <h3 className="font-semibold text-sm">No templates saved yet</h3>
                  <p className="text-xs text-muted-foreground mt-1 max-w-[280px]">
                    Create a new project and click "Save as Template" to add one.
                  </p>
                </div>
              ) : (() => {
                const query = templateSearchQuery.toLowerCase();
                const filtered = templates.filter(t => t.name.toLowerCase().includes(query));

                if (filtered.length === 0) {
                  return (
                    <div className="text-center py-16 text-sm text-muted-foreground font-medium italic border border-dashed rounded-2xl p-8">
                      No templates match "{templateSearchQuery}"
                    </div>
                  );
                }

                // Sort default template to the top
                const sorted = [...filtered].sort((a, b) => {
                  if (a.id === defaultTemplateId) return -1;
                  if (b.id === defaultTemplateId) return 1;
                  return 0;
                });

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {sorted.map((template) => {
                      const config = template.config || {};
                      const customFieldsCount = Array.isArray(config.customFields) ? config.customFields.length : 0;
                      const tasksCount = Array.isArray(config.tasks) ? config.tasks.length : 0;
                      const isPinned = pinnedTemplateIds.includes(template.id);
                      const isDefault = template.id === defaultTemplateId;

                      return (
                        <div
                          key={template.id}
                          className={`border rounded-2xl p-4.5 bg-slate-50/40 dark:bg-zinc-900/20 hover:shadow-md transition-all duration-300 flex flex-col justify-between group relative animate-in fade-in duration-200 ${
                            isDefault 
                              ? 'border-amber-400 dark:border-amber-600 bg-amber-50/5 dark:bg-amber-950/5 shadow-sm' 
                              : 'border-slate-200/60 dark:border-zinc-800/80 hover:border-purple-400'
                          }`}
                        >
                          <div className="absolute right-3 top-3 flex items-center gap-1.5">
                            {isDefault && (
                              <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[9px] font-bold py-0.5 px-1.5 rounded-lg border border-amber-200 dark:border-amber-900 mr-1.5">
                                Default
                              </Badge>
                            )}
                            <button
                              type="button"
                              onClick={(e) => handleSetDefaultTemplate(template.id, e)}
                              className="text-muted-foreground hover:text-amber-400 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                              title={isDefault ? "Remove default status" : "Set as default template"}
                            >
                              <Star className={`h-4 w-4 transition-all duration-200 ${isDefault ? "fill-amber-400 text-amber-400" : "opacity-40 group-hover:opacity-100"}`} />
                            </button>

                            <button
                              type="button"
                              onClick={(e) => handleTogglePinTemplate(template.id, e)}
                              className="text-muted-foreground hover:text-purple-600 dark:hover:text-purple-400 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                              title={isPinned ? "Unpin template" : "Pin template"}
                            >
                              <Pin className={`h-4 w-4 transition-all duration-200 ${isPinned ? "fill-purple-600 text-purple-600 dark:fill-purple-400 dark:text-purple-400 rotate-45" : "opacity-40 group-hover:opacity-100"}`} />
                            </button>

                            <button
                              type="button"
                              onClick={(e) => handleDeleteTemplate(template.id, e)}
                              className="text-muted-foreground hover:text-destructive p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 opacity-0 group-hover:opacity-100 transition-all duration-200"
                              title="Delete template"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>

                          <div className="space-y-3.5 mb-4">
                            <h4 className="font-bold text-base text-slate-900 dark:text-white leading-tight truncate pr-28" title={template.name}>
                              {template.name}
                            </h4>
                            
                            <div className="flex flex-wrap gap-1.5">
                              <Badge variant="secondary" className="bg-purple-50 text-purple-700 dark:bg-purple-950/20 dark:text-purple-400 border border-purple-100/50 dark:border-purple-900/30 text-[10px] font-bold py-0.5 px-2">
                                {customFieldsCount} {customFieldsCount === 1 ? 'Field' : 'Fields'}
                              </Badge>
                              <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400 border border-indigo-100/50 dark:border-indigo-900/30 text-[10px] font-bold py-0.5 px-2">
                                {tasksCount} {tasksCount === 1 ? 'Task' : 'Tasks'}
                              </Badge>
                            </div>

                            <p className="text-[10px] text-muted-foreground font-semibold flex items-center">
                              <CalendarIcon className="h-3 w-3 mr-1" />
                              Created: {new Date(template.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                            </p>
                          </div>

                          <Button
                            type="button"
                            onClick={() => handleUseTemplate(template)}
                            className={`w-full text-xs font-semibold h-9 rounded-xl shadow-sm transition-all duration-200 ${
                              isDefault
                                ? 'bg-amber-500 hover:bg-amber-600 text-white'
                                : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white'
                            }`}
                          >
                            Use Template
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            <DialogFooter className="px-6 py-4 border-t shrink-0 bg-slate-50/50 dark:bg-zinc-900/50 sticky bottom-0 z-10">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsTemplateSelectOpen(false)}
                className="rounded-xl shadow-sm text-xs font-bold"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* CREATE RULE DIALOG */}
        <Dialog open={isCreateRuleOpen} onOpenChange={setIsCreateRuleOpen}>
          <DialogContent className="sm:max-w-[550px] bg-background border-border max-h-[85vh] p-0 flex flex-col overflow-hidden">
            <DialogHeader className="p-6 pb-4 border-b shrink-0">
              <DialogTitle>Create Automation Rule</DialogTitle>
              <DialogDescription>
                Define automation trigger conditions and actions.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateRule} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Rule Name</label>
                  <Input
                    required
                    value={ruleFormName}
                    onChange={(e) => setRuleFormName(e.target.value)}
                    placeholder="e.g. Bug Auto-Notification"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Description</label>
                  <Input
                    value={ruleFormDescription}
                    onChange={(e) => setRuleFormDescription(e.target.value)}
                    placeholder="Alerts when a new bug is reported"
                  />
                </div>

                {/* IF Trigger block */}
                <div className="space-y-3 p-4 border rounded-2xl bg-muted/15">
                  <div className="text-xs font-bold text-primary flex items-center gap-1">
                    <Badge variant="secondary" className="bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold">IF</Badge>
                    Condition
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Field</label>
                      <select
                        value={ruleFormTriggerField}
                        onChange={(e) => setRuleFormTriggerField(e.target.value)}
                        className="flex h-9 w-full rounded-xl border bg-background px-3 text-sm focus:ring-1 focus:ring-ring"
                      >
                        <option value="Title">Title</option>
                        <option value="Status">Status</option>
                        <option value="Priority">Priority</option>
                        <option value="Due Date">Due Date</option>
                        <option value="Assigned User">Assigned User</option>
                        <option value="Project">Project</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Condition</label>
                      <select
                        value={ruleFormTriggerOperator}
                        onChange={(e) => setRuleFormTriggerOperator(e.target.value)}
                        className="flex h-9 w-full rounded-xl border bg-background px-3 text-sm focus:ring-1 focus:ring-ring"
                      >
                        <option value="Contains">Contains</option>
                        <option value="Equals">Equals</option>
                        <option value="Starts With">Starts With</option>
                        <option value="Ends With">Ends With</option>
                      </select>
                    </div>
                    <div className="space-y-1.5 col-span-2">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Value</label>
                      <Input
                        required
                        value={ruleFormTriggerValue}
                        onChange={(e) => setRuleFormTriggerValue(e.target.value)}
                        placeholder="e.g. Bug"
                      />
                    </div>
                  </div>
                </div>

                {/* THEN Action block */}
                <div className="space-y-3 p-4 border rounded-2xl bg-muted/15">
                  <div className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                    <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-bold">THEN</Badge>
                    Action & Recipients
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Action</label>
                    <select
                      value={ruleFormActionType}
                      onChange={(e) => setRuleFormActionType(e.target.value)}
                      className="flex h-9 w-full rounded-xl border bg-background px-3 text-sm focus:ring-1"
                    >
                      <option value="In-app Notification">In-app Notification</option>
                      <option value="Notification Email">Notification Email</option>
                      <option value="Create Task">Create Task</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">To (Recipients)</label>
                    
                    {/* Selected Pills */}
                    {ruleFormRecipients.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 dark:bg-zinc-900 border rounded-xl">
                        {ruleFormRecipients.map(id => {
                          const roleLabel = id === 'PROJECT_MANAGER' ? 'Project Manager' : id === 'PROJECT_OWNER' ? 'Project Owner' : id === 'ASSIGNED_USER' ? 'All Assigned Users' : '';
                          const userLabel = users.find(u => u.id === id)?.name || id;
                          const displayName = roleLabel || userLabel;
                          return (
                            <Badge key={id} variant="secondary" className="gap-1.5 pl-2 pr-1 py-0.5 rounded-lg text-[10px] font-semibold bg-background shadow-sm border border-slate-200 text-slate-800 dark:text-slate-200">
                              {displayName}
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); toggleRuleRecipient(id); }}
                                className="hover:bg-muted p-0.5 rounded-full text-slate-500 hover:text-slate-900"
                              >
                                <X size={10} />
                              </button>
                            </Badge>
                          );
                        })}
                      </div>
                    )}

                    {/* Search Bar */}
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="Search roles or team members..."
                        value={ruleFormRecipientSearch}
                        onChange={(e) => setRuleFormRecipientSearch(e.target.value)}
                        className="pl-9 pr-4 rounded-xl text-sm"
                      />
                    </div>

                    {/* Scroll Box */}
                    <div className="border rounded-2xl p-2.5 max-h-[200px] overflow-y-auto space-y-3 bg-background custom-scrollbar">
                      
                      {/* Default Roles Grid */}
                      {('project manager'.includes(ruleFormRecipientSearch.toLowerCase()) || 
                        'project owner'.includes(ruleFormRecipientSearch.toLowerCase()) || 
                        'all assigned users'.includes(ruleFormRecipientSearch.toLowerCase())) && (
                        <div className="space-y-1.5">
                          <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block px-1">Roles</span>
                          <div className="grid grid-cols-1 gap-2">
                            {[
                              { id: 'PROJECT_MANAGER', label: 'Project Manager (PM)', desc: 'Person leading project operations', icon: Shield },
                              { id: 'PROJECT_OWNER', label: 'Project Owner', desc: 'Organization owner or creator', icon: Crown },
                              { id: 'ASSIGNED_USER', label: 'All Assigned Users', desc: 'All members assigned to the task/project', icon: Users }
                            ].filter(role => role.label.toLowerCase().includes(ruleFormRecipientSearch.toLowerCase())).map(role => {
                              const isSel = ruleFormRecipients.includes(role.id);
                              const IconComp = role.icon;
                              return (
                                <div 
                                  key={role.id} 
                                  onClick={() => toggleRuleRecipient(role.id)}
                                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                                    isSel 
                                      ? 'border-primary bg-primary/5 text-primary' 
                                      : 'border-slate-100 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-900'
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg shrink-0 ${isSel ? 'bg-primary/10 text-primary' : 'bg-slate-100 dark:bg-zinc-800 text-slate-500'}`}>
                                      <IconComp size={16} />
                                    </div>
                                    <div className="text-left">
                                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-none">{role.label}</p>
                                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{role.desc}</p>
                                    </div>
                                  </div>
                                  <div className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${isSel ? 'border-primary bg-primary text-white' : 'border-slate-300'}`}>
                                    {isSel && <Check size={10} className="stroke-[3]" />}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Specific Users List */}
                      <div className="space-y-1.5 pt-1.5 border-t border-dashed">
                        <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block px-1">Specific Users</span>
                        <div className="space-y-1.5">
                          {users.filter(u => 
                            u.name.toLowerCase().includes(ruleFormRecipientSearch.toLowerCase()) || 
                            u.email.toLowerCase().includes(ruleFormRecipientSearch.toLowerCase())
                          ).map(user => {
                            const isSel = ruleFormRecipients.includes(user.id);
                            return (
                              <div 
                                key={user.id} 
                                onClick={() => toggleRuleRecipient(user.id)}
                                className={`flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer ${
                                  isSel 
                                    ? 'border-primary bg-primary/5 text-primary' 
                                    : 'border-slate-100 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-900'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-slate-200 to-slate-300 text-slate-700 dark:from-zinc-700 dark:to-zinc-800 dark:text-zinc-300 flex items-center justify-center text-xs font-extrabold shrink-0">
                                    {user.name.substring(0, 2).toUpperCase()}
                                  </div>
                                  <div className="text-left">
                                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-none">{user.name}</p>
                                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{user.email}</p>
                                  </div>
                                </div>
                                <div className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${isSel ? 'border-primary bg-primary text-white' : 'border-slate-300'}`}>
                                  {isSel && <Check size={10} className="stroke-[3]" />}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter className="p-6 pt-4 border-t bg-muted/10 shrink-0">
                <Button type="button" variant="outline" onClick={() => setIsCreateRuleOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? 'Creating...' : 'Create & Attach'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

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

        {/* Delete Project Confirmation Modal */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="sm:max-w-md bg-background border-border">
            <DialogHeader>
              <DialogTitle className="text-xl text-destructive flex items-center gap-2">
                <Trash2 size={20} /> Delete Project
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to delete this project? This action cannot be undone and will remove all associated tasks, time entries, and messages.
              </p>
            </div>
            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmDelete} disabled={isPending}>
                {isPending ? "Deleting..." : "Delete Project"}
              </Button>
            </DialogFooter>
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
                Are you sure you want to delete this stage? Ensure there are no projects inside it first.
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

        {/* Delete Template Confirmation Modal */}
        <Dialog open={isDeleteTemplateOpen} onOpenChange={setIsDeleteTemplateOpen}>
          <DialogContent className="sm:max-w-md bg-background border-border">
            <DialogHeader>
              <DialogTitle className="text-xl text-destructive flex items-center gap-2">
                <Trash2 size={20} /> Delete Template
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to delete this template? This action cannot be undone.
              </p>
            </div>
            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={() => setIsDeleteTemplateOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmDeleteTemplate}>
                Delete Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Fields UI (Drawer or Modal) */}
        <DialogPrimitive.Root open={isFieldsDrawerOpen} onOpenChange={setIsFieldsDrawerOpen}>
          <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay 
              id="omniwork-fields-drawer-overlay"
              className={`fixed inset-0 z-[9999] transition-opacity ${fieldsDrawerTarget === "FORM" ? "bg-black/50 backdrop-blur-sm" : "bg-black/10"}`} 
            />
            <DialogPrimitive.Content 
              id="omniwork-fields-drawer"
              onInteractOutside={(e) => {
                e.preventDefault(); // Stop Radix from bubbling the outside click to the Project Modal
                setIsFieldsDrawerOpen(false); // Only close the Add Field modal
              }}
              className={`fixed z-[9999] outline-none bg-white dark:bg-[#1C1C1C] flex flex-col ${
                fieldsDrawerTarget === "FORM" 
                  ? "left-[50%] top-[50%] w-full max-w-md translate-x-[-50%] translate-y-[-50%] border border-slate-200 dark:border-white/10 shadow-xl sm:rounded-xl overflow-hidden max-h-[85vh] animate-in fade-in zoom-in-95 duration-200"
                  : "inset-y-0 right-0 w-full sm:w-[360px] shadow-2xl border-l border-slate-200 dark:border-white/10 transform transition-transform duration-300 animate-in slide-in-from-right-full"
              }`}
            >
              {selectedFieldType ? (
                <div className="flex flex-col h-full">
                  <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-white/5">
                    <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100 font-semibold">
                      <span className="capitalize">{selectedFieldType}</span> <ChevronDown size={14} className="text-slate-400 cursor-pointer" />
                    </div>
                    <button onClick={() => { setSelectedFieldType(null); setNewCustomFieldName(""); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-full transition-colors">
                      <X size={16} />
                    </button>
                  </div>
                  
                  <div className="p-5 flex-1">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
                      Field name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative mb-8">
                      <Smile size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <Input 
                        autoFocus 
                        placeholder="Enter name..." 
                        value={newCustomFieldName} 
                        onChange={(e) => setNewCustomFieldName(e.target.value)} 
                        className="pl-10 h-10 bg-white dark:bg-[#252525] border-slate-300 dark:border-white/10 rounded-lg text-[14px]" 
                      />
                    </div>
                    
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 block">Fill method</label>
                    <div className="flex gap-2 p-1 bg-slate-100 dark:bg-white/5 rounded-lg mb-6">
                      <button className="flex-1 py-1.5 bg-white dark:bg-[#303030] text-slate-800 dark:text-slate-200 text-[13px] font-medium rounded-md shadow-sm border border-slate-200 dark:border-white/10">Manual fill</button>
                      <button className="flex-1 py-1.5 flex items-center justify-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 text-[13px] font-medium rounded-md transition-colors"><Sparkles size={14} className="text-purple-500" /> Fill with AI</button>
                    </div>
                    
                    {(selectedFieldType === "Dropdown" || selectedFieldType === "Labels") && (
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
                                setNewOptionInput("");
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
                                setNewOptionInput("");
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

                    <div className="border-t border-slate-100 dark:border-white/5 pt-5">
                      <button className="w-full flex items-center justify-between text-[14px] font-semibold text-slate-800 dark:text-slate-200 hover:text-slate-600 dark:hover:text-slate-400 transition-colors">
                        More settings and permissions <ChevronDown size={16} className="text-slate-400" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="p-4 border-t border-slate-100 dark:border-white/5 flex justify-end gap-3 bg-slate-50 dark:bg-[#151515]">
                    <Button 
                      type="button" 
                      onPointerDown={(e) => e.stopPropagation()} 
                      variant="outline" 
                      className="h-9 px-4 rounded-lg font-medium" 
                      onClick={() => { setSelectedFieldType(null); setNewCustomFieldName(""); }}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="button"
                      onPointerDown={(e) => e.stopPropagation()}
                      disabled={!newCustomFieldName.trim() || ((selectedFieldType === "Dropdown" || selectedFieldType === "Labels") && newFieldOptions.length === 0)} 
                      onClick={() => {
                        const newFieldType = (selectedFieldType || "text").toLowerCase();
                        if (fieldsDrawerTarget === "FORM") {
                          const newField: any = { name: newCustomFieldName, type: newFieldType, value: "" };
                          if (newFieldType === "dropdown" || newFieldType === "labels") {
                            newField.options = newFieldOptions;
                            if (newFieldType === "labels") {
                              newField.value = []; // Array for multi-select
                            }
                          }
                          setCustomFields([...customFields, newField]);

                        } else {
                          // TABLE VIEW PROPAGATION
                          const newField: any = { name: newCustomFieldName, type: newFieldType, value: "" };
                          if (newFieldType === "dropdown" || newFieldType === "labels") {
                            newField.options = newFieldOptions;
                            if (newFieldType === "labels") {
                              newField.value = []; // Array for multi-select
                            }
                          }



                          // 2. Propagate to ALL existing projects locally
                          const updatedProjects = projects.map((p: any) => {
                            const existingConfigFields = Array.isArray(p.customFields) ? p.customFields : [];
                            return {
                              ...p,
                              customFields: [...existingConfigFields, newField]
                            };
                          });
                          setProjects(updatedProjects);

                          // 3. Immediately save to DB for all projects
                          updatedProjects.forEach((p: any) => {
                            updateProjectCustomFieldsAction(p.id, p.customFields).catch(console.error);
                          });

                          // 4. Update customColumns so it appears in the table immediately
                          setCustomColumns([...customColumns, { id: crypto.randomUUID(), name: newCustomFieldName, type: selectedFieldType || "Text" }]);
                        }
                        setSelectedFieldType(null);
                        setNewCustomFieldName("");
                        setNewFieldOptions([]);
                        setNewOptionInput("");
                        setIsFieldsDrawerOpen(false);
                      }}
                      className="h-9 px-5 rounded-lg font-medium bg-slate-400 hover:bg-slate-500 text-white disabled:opacity-50 transition-colors"
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
                  <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1">
                    <Settings size={18} />
                  </button>
                  <button onClick={() => setIsFieldsDrawerOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-full transition-colors">
                    <X size={16} />
                  </button>
                </div>
              </div>

              {fieldsDrawerTarget === "TABLE" && (
                <div className="p-4 border-b border-slate-100 dark:border-white/5 space-y-4">
                  <div className="relative">
                    <Input placeholder="Search Task Fields" className="pl-3 py-5 text-sm rounded-lg border-slate-300 dark:border-white/10 bg-transparent focus-visible:ring-1" />
                  </div>
                  <div className="flex gap-6 text-sm font-medium">
                    {currentUser?.role === 'OWNER' && (
                      <button 
                        onClick={() => setFieldsTab("create_new")}
                        className={`relative pb-2 ${fieldsTab === "create_new" ? "text-slate-900 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
                      >
                        Create new
                        {fieldsTab === "create_new" && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-slate-900 dark:bg-white rounded-t" />}
                      </button>
                    )}
                    <button 
                      onClick={() => setFieldsTab("add_existing")}
                      className={`relative pb-2 ${fieldsTab === "add_existing" ? "text-slate-900 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
                    >
                      Add existing
                      {fieldsTab === "add_existing" && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-slate-900 dark:bg-white rounded-t" />}
                    </button>
                  </div>
                </div>
              )}
              {fieldsDrawerTarget === "FORM" && (
                <div className="p-4 border-b border-slate-100 dark:border-white/5">
                  <div className="relative">
                    <Input placeholder="Search Task Fields" className="pl-3 py-5 text-sm rounded-lg border-slate-300 dark:border-white/10 bg-transparent focus-visible:ring-1" />
                  </div>
                </div>
              )}

              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {fieldsTab === "create_new" && (
                  <div className="py-2">
                    <div className="px-4 py-2">
                      <h3 className="text-[13px] font-medium text-slate-500 mb-2">Popular</h3>
                      <div className="space-y-1">
                        <button onClick={() => setSelectedFieldType("Dropdown")} className="w-full flex items-center gap-3 px-3 py-2 text-[14px] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 rounded-md transition-colors">
                          <ListIcon size={16} className="text-emerald-600" /> Dropdown
                        </button>
                        <button onClick={() => setSelectedFieldType("Text")} className="w-full flex items-center gap-3 px-3 py-2 text-[14px] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 rounded-md transition-colors">
                          <Type size={16} className="text-blue-500" /> Text
                        </button>
                        <button onClick={() => setSelectedFieldType("Date")} className="w-full flex items-center gap-3 px-3 py-2 text-[14px] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 rounded-md transition-colors">
                          <CalendarIcon size={16} className="text-emerald-600" /> Date
                        </button>
                        <button onClick={() => setSelectedFieldType("Text area")} className="w-full flex items-center gap-3 px-3 py-2 text-[14px] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 rounded-md transition-colors">
                          <AlignLeft size={16} className="text-blue-500" /> Text area <span className="text-slate-400 ml-1">(Long Text)</span>
                        </button>
                        <button onClick={() => setSelectedFieldType("Number")} className="w-full flex items-center gap-3 px-3 py-2 text-[14px] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 rounded-md transition-colors">
                          <Hash size={16} className="text-emerald-500" /> Number
                        </button>
                        <button onClick={() => setSelectedFieldType("Checkbox")} className="w-full flex items-center gap-3 px-3 py-2 text-[14px] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 rounded-md transition-colors">
                          <CheckSquare size={16} className="text-purple-500" /> Checkbox
                        </button>
                        <button onClick={() => setSelectedFieldType("Website")} className="w-full flex items-center gap-3 px-3 py-2 text-[14px] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 rounded-md transition-colors">
                          <Globe size={16} className="text-pink-500" /> Website
                        </button>
                        <button onClick={() => setSelectedFieldType("Phone")} className="w-full flex items-center gap-3 px-3 py-2 text-[14px] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 rounded-md transition-colors">
                          <Phone size={16} className="text-emerald-600" /> Phone
                        </button>
                        <button onClick={() => setSelectedFieldType("Email")} className="w-full flex items-center gap-3 px-3 py-2 text-[14px] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 rounded-md transition-colors">
                          <Mail size={16} className="text-blue-500" /> Email
                        </button>
                        <button onClick={() => setSelectedFieldType("Labels")} className="w-full flex items-center gap-3 px-3 py-2 text-[14px] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 rounded-md transition-colors">
                          <Tags size={16} className="text-emerald-600" /> Labels <span className="text-slate-400 ml-1">(Multi-select)</span>
                        </button>
                        <button onClick={() => setSelectedFieldType("AI Autofill")} className="w-full flex items-center gap-3 px-3 py-2 text-[14px] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 rounded-md transition-colors">
                          <Sparkles size={16} className="text-purple-500" /> AI Autofill
                        </button>
                      </div>
                    </div>

                    <div className="h-px bg-slate-100 dark:bg-white/5 my-2" />

                    <div className="px-4 py-2">
                      <h3 className="text-[13px] font-medium text-slate-500 mb-2">All</h3>
                      <div className="space-y-1">
                        <button className="w-full flex items-center gap-3 px-3 py-2 text-[14px] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 rounded-md transition-colors">
                          <PlusSquare size={16} className="text-blue-500" /> Button
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                {fieldsTab === "add_existing" && (
                  <div className="py-2">
                    <div className="px-4 py-2">
                      {existingCustomFields.length > 0 ? (
                        <div className="space-y-1">
                          {existingCustomFields.map((fieldName) => (
                            <button 
                              key={fieldName} 
                              type="button"
                              onPointerDown={(e) => e.stopPropagation()}
                              onClick={() => {
                                // Find type and options from other projects if they exist
                                let matchedType = "Text";
                                let matchedOptions = undefined;
                                const otherProj = projects.find((p: any) => {
                                  const pFields = Array.isArray(p.customFields) ? p.customFields : [];
                                  return pFields.some((f: any) => f.name === fieldName);
                                });
                                if (otherProj) {
                                  const f = otherProj.customFields.find((f: any) => f.name === fieldName);
                                  matchedType = f?.type || "Text";
                                  matchedOptions = f?.options;
                                }

                                const newField = { name: fieldName, type: matchedType, value: "", options: matchedOptions };

                                if (fieldsDrawerTarget === "FORM") {
                                  if (customFields.some((f: any) => f.name === fieldName)) {
                                    setIsFieldsDrawerOpen(false);
                                    return;
                                  }
                                  setCustomFields([...customFields, newField]);

                                } else {
                                  // 2. Unhide column if it was hidden
                                  unhideColumn(fieldName);

                                  // 3. Propagate to ALL existing projects locally ONLY if they don't already have it
                                  const updatedProjects = projects.map((p: any) => {
                                    const existingConfigFields = Array.isArray(p.customFields) ? p.customFields : [];
                                    if (existingConfigFields.some((f: any) => f.name === fieldName)) {
                                      return p;
                                    }
                                    return {
                                      ...p,
                                      customFields: [...existingConfigFields, newField]
                                    };
                                  });
                                  setProjects(updatedProjects);

                                  // 3. Immediately save to DB for all projects
                                  updatedProjects.forEach((p: any) => {
                                    updateProjectCustomFieldsAction(p.id, p.customFields).catch(console.error);
                                  });

                                  // 4. Update customColumns so it appears in the table immediately if not present
                                  if (!customColumns.some(c => c.name === fieldName)) {
                                    setCustomColumns([...customColumns, { id: crypto.randomUUID(), name: fieldName, type: matchedType }]);
                                  }
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

      </div>
    );
  }
