import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatHours } from '@/lib/utils';
import { Download, Monitor } from 'lucide-react';

export default function MemberTimeTracker({ timeEntries, assignedTasks }: any) {
  const totalHours = timeEntries.reduce((acc: number, t: any) => acc + (t.duration || 0), 0);

  return (
    <div className="space-y-6">
      <Card className="border-2 border-primary/20 bg-primary/5">
        <CardContent className="pt-6 flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center text-primary">
            <Monitor size={32} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">OmniWork Desktop Tracker</h2>
            <p className="text-muted-foreground mt-2 max-w-lg text-sm">
              To track time silently without browser interruptions, please use the desktop tracker. 
              The desktop app supports automatic silent screenshots and idle detection.
            </p>
          </div>
          <Button size="lg" className="rounded-full shadow-lg hover:shadow-xl font-bold px-8 mt-2">
            <Download className="mr-2" /> Download Desktop Tracker
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>My Tracked Time</CardTitle>
            <CardDescription>You have tracked a total of <strong className="text-foreground">{formatHours(totalHours)}h</strong></CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project / Task</TableHead>
                  <TableHead>Start Time</TableHead>
                  <TableHead>End Time</TableHead>
                  <TableHead className="text-right">Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {timeEntries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">No time entries.</TableCell>
                  </TableRow>
                ) : (
                  timeEntries.map((entry: any) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <div className="font-semibold">{entry.project?.name}</div>
                        <div className="text-xs text-muted-foreground">{entry.task?.title || 'No Task'}</div>
                      </TableCell>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
