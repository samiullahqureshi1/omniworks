'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Filter, Download, Printer, RefreshCcw, Search, SortAsc, SortDesc } from 'lucide-react';
import { formatHours as globalFormatHours } from '@/lib/utils';
import { getTimesheetAction, TimesheetFilters } from '@/app/actions/timesheet';
import { toast } from 'sonner';
import { useRealtime } from '@/hooks/useRealtime';

export default function TimesheetClient({ currentUser, projects, users, tasks }: {
  currentUser: any;
  projects: any[];
  users: any[];
  tasks: any[];
}) {
  const [isPending, startTransition] = useTransition();
  const [entries, setEntries] = useState<any[]>([]);

  // Default dates: First day of current month to today
  const defaultStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  const defaultEnd = new Date().toISOString().split('T')[0];

  const [filters, setFilters] = useState<TimesheetFilters>({
    startDate: defaultStart,
    endDate: defaultEnd,
    projectId: 'ALL',
    taskId: 'ALL',
    memberId: 'ALL',
    status: 'ALL',
    entryType: 'ALL',
  });

  const [groupBy, setGroupBy] = useState<'NONE' | 'DATE' | 'MEMBER' | 'PROJECT' | 'TASK'>('NONE');

  const fetchTimesheet = () => {
    startTransition(async () => {
      // Clean filters before sending
      const cleanFilters: any = {
        startDate: filters.startDate,
        endDate: filters.endDate,
      };
      if (filters.projectId !== 'ALL') cleanFilters.projectId = filters.projectId;
      if (filters.taskId !== 'ALL') cleanFilters.taskId = filters.taskId;
      if (filters.memberId !== 'ALL') cleanFilters.memberId = filters.memberId;
      if (filters.status !== 'ALL') cleanFilters.status = filters.status;
      if (filters.entryType !== 'ALL') cleanFilters.entryType = filters.entryType;

      const res = await getTimesheetAction(cleanFilters);
      if (res.error) {
        toast.error(res.error);
      } else {
        setEntries(res.entries || []);
      }
    });
  };

  useEffect(() => {
    fetchTimesheet();
  }, []);

  const { lastEvent } = useRealtime([{ taskId: undefined, projectId: undefined }]);

  useEffect(() => {
    if (lastEvent) {
      // Refresh timesheet automatically
      fetchTimesheet();
    }
  }, [lastEvent]);

  const resetFilters = () => {
    setFilters({
      startDate: defaultStart,
      endDate: defaultEnd,
      projectId: 'ALL',
      taskId: 'ALL',
      memberId: 'ALL',
      status: 'ALL',
      entryType: 'ALL',
    });
    setGroupBy('NONE');
    // We don't auto-fetch here to prevent double fetch, user can click apply
  };

  // Summaries
  const totalSessionSec = entries.reduce((acc, e) => acc + (e.activeWorkedDuration + e.idleDuration), 0);
  const totalActiveSec = entries.reduce((acc, e) => acc + e.activeWorkedDuration, 0);
  const totalIdleSec = entries.reduce((acc, e) => acc + e.idleDuration, 0);
  const totalBillableHours = totalActiveSec / 3600;

  const totalEntries = entries.length;
  const uniqueProjects = new Set(entries.map(e => e.projectId)).size;
  const uniqueTasks = new Set(entries.map(e => e.taskId)).size;

  const formatHours = (sec: number) => globalFormatHours(sec / 3600);

  // Grouping Logic
  let groupedData: Record<string, any[]> = {};
  if (groupBy !== 'NONE') {
    entries.forEach(e => {
      let key = 'Other';
      if (groupBy === 'DATE') key = new Date(e.startTime).toLocaleDateString();
      else if (groupBy === 'MEMBER') key = e.member?.name || 'Unknown';
      else if (groupBy === 'PROJECT') key = e.project?.name || 'General';
      else if (groupBy === 'TASK') key = e.task?.title || 'General';

      if (!groupedData[key]) groupedData[key] = [];
      groupedData[key].push(e);
    });
  }

  // Exports
  const handleExportCSV = () => {
    const headers = ['Date', 'Project', 'Task', 'Member', 'Start Time', 'End Time', 'Total Session (hrs)', 'Active Worked (hrs)', 'Idle (hrs)', 'Type', 'Status', 'Notes'];
    const rows = entries.map(e => [
      new Date(e.startTime).toLocaleDateString(),
      `"${e.project?.name || 'General'}"`,
      `"${e.task?.title || 'General'}"`,
      `"${e.member?.name || 'Unknown'}"`,
      new Date(e.startTime).toLocaleTimeString(),
      e.endTime ? new Date(e.endTime).toLocaleTimeString() : 'Running',
      formatHours(e.activeWorkedDuration + e.idleDuration),
      formatHours(e.activeWorkedDuration),
      formatHours(e.idleDuration),
      e.entryType,
      e.status,
      `"${(e.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `timesheet_${filters.startDate}_to_${filters.endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  const isClient = currentUser.role === 'CLIENT';
  const isMember = currentUser.role === 'MEMBER';

  return (
    <div className="space-y-6">
      
      {/* Filters (Hide when printing) */}
      <div className="bg-card p-4 rounded-xl border shadow-sm print:hidden space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-border/50">
          <h2 className="text-lg font-semibold flex items-center gap-2"><Filter size={18}/> Filters</h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={resetFilters}><RefreshCcw size={14} className="mr-2"/> Reset</Button>
            <Button size="sm" onClick={fetchTimesheet} disabled={isPending}>{isPending ? 'Loading...' : 'Apply Filters'}</Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Start Date</label>
            <Input type="date" value={filters.startDate} onChange={e => setFilters({...filters, startDate: e.target.value})} className="h-9" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">End Date</label>
            <Input type="date" value={filters.endDate} onChange={e => setFilters({...filters, endDate: e.target.value})} className="h-9" />
          </div>
          
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Project</label>
            <select className="flex h-9 w-full rounded-xl border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" value={filters.projectId} onChange={e => setFilters({...filters, projectId: e.target.value})}>
              <option value="ALL">All Projects</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Task</label>
            <select className="flex h-9 w-full rounded-xl border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" value={filters.taskId} onChange={e => setFilters({...filters, taskId: e.target.value})}>
              <option value="ALL">All Tasks</option>
              {tasks.filter(t => filters.projectId === 'ALL' || t.projectId === filters.projectId).map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
          </div>

          {/* Members filter is mostly useless for regular members as they can only see their own anyway, but we can hide it or just leave it. Hide for Client if we want, but Client can see who worked on their projects */}
          {!isMember && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Member</label>
              <select className="flex h-9 w-full rounded-xl border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" value={filters.memberId} onChange={e => setFilters({...filters, memberId: e.target.value})}>
                <option value="ALL">All Members</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Status</label>
            <select className="flex h-9 w-full rounded-xl border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})}>
              <option value="ALL">All Statuses</option>
              <option value="SAVED">Saved</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Entry Type</label>
            <select className="flex h-9 w-full rounded-xl border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" value={filters.entryType} onChange={e => setFilters({...filters, entryType: e.target.value})}>
              <option value="ALL">All Types</option>
              <option value="TIMER">Live Timer</option>
              <option value="MANUAL">Manual Entry</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-primary">Group By</label>
            <select className="flex h-9 w-full rounded-xl border border-primary/50 bg-primary/5 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary text-primary font-medium" value={groupBy} onChange={e => setGroupBy(e.target.value as any)}>
              <option value="NONE">None (List All)</option>
              <option value="DATE">Date</option>
              <option value="MEMBER">Member</option>
              <option value="PROJECT">Project</option>
              <option value="TASK">Task</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="shadow-sm border-slate-200 dark:border-white/10">
          <CardContent className="p-5 flex flex-col justify-center">
            <p className="text-sm font-medium text-muted-foreground mb-1">Tracked/Billable</p>
            <p className="text-3xl font-bold tracking-tight text-primary">{globalFormatHours(totalBillableHours)}</p>
            <p className="text-xs text-muted-foreground mt-1">Active time only</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-slate-200 dark:border-white/10">
          <CardContent className="p-5 flex flex-col justify-center">
            <p className="text-sm font-medium text-muted-foreground mb-1">Total Session</p>
            <p className="text-3xl font-bold tracking-tight text-foreground">{formatHours(totalSessionSec)}</p>
            <p className="text-xs text-muted-foreground mt-1">Includes idle time ({formatHours(totalIdleSec)})</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-slate-200 dark:border-white/10 hidden md:block">
          <CardContent className="p-5 flex flex-col justify-center">
            <p className="text-sm font-medium text-muted-foreground mb-1">Logs</p>
            <p className="text-3xl font-bold tracking-tight text-foreground">{totalEntries}</p>
            <p className="text-xs text-muted-foreground mt-1">Across {uniqueTasks} tasks</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-slate-200 dark:border-white/10 hidden md:block">
          <CardContent className="p-5 flex flex-col justify-center">
            <p className="text-sm font-medium text-muted-foreground mb-1">Projects</p>
            <p className="text-3xl font-bold tracking-tight text-foreground">{uniqueProjects}</p>
            <p className="text-xs text-muted-foreground mt-1">Active in this period</p>
          </CardContent>
        </Card>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between print:hidden">
        <h3 className="text-xl font-bold">Timesheet Report</h3>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExportCSV} disabled={entries.length === 0}><Download className="w-4 h-4 mr-2" /> CSV</Button>
          <Button variant="outline" onClick={handlePrint} disabled={entries.length === 0}><Printer className="w-4 h-4 mr-2" /> PDF / Print</Button>
        </div>
      </div>

      {/* Table Data */}
      <div className="border rounded-xl bg-card shadow-sm overflow-hidden timesheet-table-container">
        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            body * { visibility: hidden; }
            .timesheet-table-container, .timesheet-table-container * { visibility: visible; }
            .timesheet-table-container { position: absolute; left: 0; top: 0; width: 100%; border: none; box-shadow: none; }
          }
        `}} />
        
        {entries.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center">
            <Search className="w-8 h-8 mb-4 text-slate-300 dark:text-slate-600" />
            <p className="text-lg font-medium">No time entries found</p>
            <p className="text-sm mt-1">Adjust your filters and try again.</p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Project / Task</TableHead>
                {!isMember && <TableHead>Member</TableHead>}
                <TableHead className="text-right">Duration</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupBy === 'NONE' ? (
                // Flat List
                entries.map(e => (
                  <TableRow key={e.id} className="group">
                    <TableCell>
                      <div className="font-medium text-sm">{new Date(e.startTime).toLocaleDateString()}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(e.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - 
                        {e.endTime ? new Date(e.endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Running'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm text-primary">{e.project?.name || 'General'}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-[200px]">{e.task?.title || '-'}</div>
                    </TableCell>
                    {!isMember && (
                      <TableCell>
                        <div className="text-sm font-medium">{e.member?.name}</div>
                        <div className="text-xs text-muted-foreground">{e.member?.email}</div>
                      </TableCell>
                    )}
                    <TableCell className="text-right">
                      <div className="font-mono font-bold">{formatHours(e.activeWorkedDuration)}</div>
                      {e.idleDuration > 0 && <div className="text-xs text-orange-500 dark:text-orange-400 font-mono">+{formatHours(e.idleDuration)} idle</div>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] uppercase">{e.entryType}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px] uppercase">{e.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                // Grouped View
                Object.entries(groupedData).map(([groupKey, groupEntries]) => {
                  const gActive = groupEntries.reduce((acc, e) => acc + e.activeWorkedDuration, 0);
                  const gIdle = groupEntries.reduce((acc, e) => acc + e.idleDuration, 0);
                  return (
                    <React.Fragment key={groupKey}>
                      <TableRow className="bg-muted/40 hover:bg-muted/40 border-t-2 border-slate-200 dark:border-white/10">
                        <TableCell colSpan={!isMember ? 6 : 5} className="py-2">
                          <div className="flex items-center justify-between w-full">
                            <span className="font-bold text-primary">{groupKey}</span>
                            <span className="text-sm font-bold bg-background px-2 py-1 rounded-xl border shadow-sm">
                              {formatHours(gActive)} <span className="text-muted-foreground font-normal ml-1">({groupEntries.length} entries)</span>
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                      {groupEntries.map(e => (
                        <TableRow key={e.id} className="opacity-90">
                          <TableCell className="pl-6">
                            <div className="font-medium text-sm">{new Date(e.startTime).toLocaleDateString()}</div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(e.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">{e.project?.name || 'General'}</div>
                            <div className="text-xs text-muted-foreground truncate max-w-[150px]">{e.task?.title || '-'}</div>
                          </TableCell>
                          {!isMember && (
                            <TableCell>
                              <div className="text-sm">{e.member?.name}</div>
                            </TableCell>
                          )}
                          <TableCell className="text-right">
                            <div className="font-mono font-medium">{formatHours(e.activeWorkedDuration)}</div>
                            {e.idleDuration > 0 && <div className="text-[10px] text-orange-500 dark:text-orange-400 font-mono">+{formatHours(e.idleDuration)} idle</div>}
                          </TableCell>
                          <TableCell><Badge variant="outline" className="text-[10px]">{e.entryType}</Badge></TableCell>
                          <TableCell><Badge variant="secondary" className="text-[10px]">{e.status}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </React.Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        )}
      </div>

    </div>
  );
}
