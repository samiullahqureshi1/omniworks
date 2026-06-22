import React from 'react';
import { getActiveTimerAction, getTimerLogsAction } from '@/app/actions/tracking';
import { getCurrentUser } from '@/app/actions/auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Square, Timer as TimerIcon } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default async function TimeTrackingPage() {
  const user = await getCurrentUser();
  const [activeRes, logsRes] = await Promise.all([
    getActiveTimerAction(),
    getTimerLogsAction()
  ]);

  if (!activeRes.success || !logsRes.success) {
    return <div className="p-6 text-destructive">Error loading tracking data.</div>;
  }

  const activeTracking = activeRes.timer;
  const recentLogs = logsRes.logs || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <TimerIcon className="text-primary" size={28} />
          Time Tracking
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Log time entries or start a live timer for your tasks.
        </p>
      </div>

      {/* Active Timer / Quick Log Section */}
      <Card className={`border-2 shadow-lg relative overflow-hidden transition-all duration-300 ${activeTracking ? 'border-primary/50 shadow-primary/10' : 'border-border'}`}>
        {activeTracking && (
          <div className="absolute top-0 left-0 w-full h-1 bg-primary animate-pulse"></div>
        )}
        <CardHeader>
          <CardTitle className="text-xl">{activeTracking ? 'Active Timer' : 'Start Tracking'}</CardTitle>
          <CardDescription>
            {activeTracking ? 'Currently tracking time for...' : 'What are you working on right now?'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeTracking ? (
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-4 rounded-xl bg-primary/5 border border-primary/20">
              <div className="flex-1 space-y-1 text-center md:text-left">
                <p className="font-medium text-lg">{activeTracking.task?.name || 'Unknown Task'}</p>
                <p className="text-sm text-muted-foreground">{activeTracking.project?.name}</p>
              </div>
              <div className="text-5xl font-mono font-light tracking-tighter text-primary">
                01:24:45 {/* Placeholder for live timer client component */}
              </div>
              <div className="flex gap-3">
                <Button variant="destructive" size="lg" className="rounded-full shadow-lg h-14 px-8">
                  <Square className="mr-2 h-5 w-5" /> Stop Timer
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row gap-4 items-end bg-muted/20 p-4 rounded-xl border border-dashed">
              <div className="flex-1 w-full space-y-2">
                <label className="text-sm font-medium">Select Task</label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  <option value="">Choose a task...</option>
                  <option value="1">Website Redesign (Acme Corp)</option>
                  <option value="2">API Integration (Globex)</option>
                </select>
              </div>
              <div className="flex-1 w-full space-y-2">
                <label className="text-sm font-medium">Description (optional)</label>
                <input
                  type="text"
                  placeholder="What are you doing?"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <Button size="lg" className="w-full md:w-auto mt-4 md:mt-0 shadow-md">
                <Play className="mr-2 h-4 w-4" /> Start Timer
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold tracking-tight">Today's Entries</h3>
        <Card className="shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>Task</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-[150px]">Time</TableHead>
                <TableHead className="w-[100px] text-right">Duration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                    No time logged today. Get to work!
                  </TableCell>
                </TableRow>
              ) : (
                recentLogs.map((log: any) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span>{log.task?.name || '—'}</span>
                        <span className="text-xs text-muted-foreground">{log.project?.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {log.description || '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(log.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
                      {log.endTime ? new Date(log.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      {log.hours}h
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
