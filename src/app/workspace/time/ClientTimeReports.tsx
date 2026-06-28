import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatHours } from '@/lib/utils';
import { FileText, Clock } from 'lucide-react';

export default function ClientTimeReports({ timeEntries, allProjects }: any) {
  const [filterProject, setFilterProject] = useState('all');

  const filteredEntries = timeEntries.filter((t: any) => {
    if (filterProject !== 'all' && t.projectId !== filterProject) return false;
    return true;
  });

  const totalHours = filteredEntries.reduce((acc: number, t: any) => acc + (t.duration || 0), 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2 flex flex-row justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Billable Hours</CardTitle>
            <Clock size={16} className="text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatHours(totalHours)}h</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">Projects</CardTitle>
            <FileText size={16} className="text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allProjects.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-4">
        <select 
          value={filterProject} 
          onChange={(e) => setFilterProject(e.target.value)}
          className="flex h-10 w-full md:w-[250px] rounded-xl border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-ring"
        >
          <option value="all">All My Projects</option>
          {allProjects.map((p: any) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      <Card className="shadow-sm border border-border/50 overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Project</TableHead>
              <TableHead>Task</TableHead>
              <TableHead>Start Time</TableHead>
              <TableHead>End Time</TableHead>
              <TableHead className="text-right">Duration</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEntries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">No reports available.</TableCell>
              </TableRow>
            ) : (
              filteredEntries.map((entry: any) => (
                <TableRow key={entry.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-semibold">{entry.project?.name}</TableCell>
                  <TableCell>{entry.task?.title || 'No Task'}</TableCell>
                  <TableCell>{new Date(entry.startTime).toLocaleString()}</TableCell>
                  <TableCell>{entry.endTime ? new Date(entry.endTime).toLocaleString() : 'Active...'}</TableCell>
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
