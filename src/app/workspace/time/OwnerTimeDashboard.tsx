import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { formatHours } from '@/lib/utils';
import { Plus, Users, Clock, Loader2, Activity } from 'lucide-react';

export default function OwnerTimeDashboard({ timeEntries, allUsers, allProjects }: any) {
  const [filterUser, setFilterUser] = useState('all');
  const [filterProject, setFilterProject] = useState('all');

  const filteredEntries = timeEntries.filter((t: any) => {
    if (filterUser !== 'all' && t.memberId !== filterUser) return false;
    if (filterProject !== 'all' && t.projectId !== filterProject) return false;
    return true;
  });

  const totalHours = filteredEntries.reduce((acc: number, t: any) => acc + (t.duration || 0), 0);
  const activeHours = filteredEntries.reduce((acc: number, t: any) => acc + (t.activeWorkedDuration ? t.activeWorkedDuration / 3600 : 0), 0);
  const idleHours = filteredEntries.reduce((acc: number, t: any) => acc + (t.idleDuration ? t.idleDuration / 3600 : 0), 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2 flex flex-row justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Tracked Hours</CardTitle>
            <Clock size={16} className="text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatHours(totalHours)}h</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Work Hours</CardTitle>
            <Activity size={16} className="text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatHours(activeHours)}h</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">Idle Time</CardTitle>
            <Clock size={16} className="text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatHours(idleHours)}h</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">Team Members</CardTitle>
            <Users size={16} className="text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allUsers.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-4">
          <select 
            value={filterUser} 
            onChange={(e) => setFilterUser(e.target.value)}
            className="flex h-10 w-full md:w-[180px] rounded-xl border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-ring"
          >
            <option value="all">All Members</option>
            {allUsers.map((u: any) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
          <select 
            value={filterProject} 
            onChange={(e) => setFilterProject(e.target.value)}
            className="flex h-10 w-full md:w-[180px] rounded-xl border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-ring"
          >
            <option value="all">All Projects</option>
            {allProjects.map((p: any) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <Button className="rounded-xl font-bold shadow-md hover:shadow-lg transition-all" onClick={() => alert('Manual hours modal can go here.')}>
          <Plus className="mr-2" size={16} /> Add Manual Hours
        </Button>
      </div>

      <Card className="shadow-sm border border-border/50 overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Project / Task</TableHead>
              <TableHead>Start Time</TableHead>
              <TableHead>End Time</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Total Duration</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEntries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">No time entries found.</TableCell>
              </TableRow>
            ) : (
              filteredEntries.map((entry: any) => (
                <TableRow key={entry.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-medium">{entry.member?.name}</TableCell>
                  <TableCell>
                    <div className="font-semibold">{entry.project?.name}</div>
                    <div className="text-xs text-muted-foreground">{entry.task?.title || 'No Task'}</div>
                  </TableCell>
                  <TableCell>{new Date(entry.startTime).toLocaleString()}</TableCell>
                  <TableCell>{entry.endTime ? new Date(entry.endTime).toLocaleString() : 'Active...'}</TableCell>
                  <TableCell>
                    <span className="text-xs px-2 py-1 bg-muted rounded-full font-medium">
                      {entry.entryType}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-bold text-primary">
                    {formatHours(entry.duration || 0)}h
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
