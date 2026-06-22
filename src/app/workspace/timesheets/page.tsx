import React from 'react';
import { getTimesheetsAction } from '@/app/actions/tracking';
import { getCurrentUser } from '@/app/actions/auth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarDays, ChevronLeft, ChevronRight, CheckCircle, Download } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default async function TimesheetsPage() {
  const user = await getCurrentUser();
  const res = await getTimesheetsAction();

  if (!res.success) {
    return <div className="p-6 text-destructive">Error loading timesheets: {res.error}</div>;
  }

  const timesheets = res.timesheets || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <CalendarDays className="text-primary" size={28} />
            Timesheets
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Review and approve weekly timesheets.
          </p>
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" className="shadow-sm flex-1 sm:flex-none">
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
          <Button className="shadow-sm flex-1 sm:flex-none">
            Submit Current Week
          </Button>
        </div>
      </div>

      {/* Week Navigator */}
      <div className="flex items-center justify-between bg-card p-2 rounded-lg border shadow-sm max-w-md mx-auto sm:mx-0">
        <Button variant="ghost" size="icon"><ChevronLeft className="h-5 w-5" /></Button>
        <span className="font-semibold text-sm">Oct 16 - Oct 22, 2026</span>
        <Button variant="ghost" size="icon"><ChevronRight className="h-5 w-5" /></Button>
      </div>

      {/* Timesheet Grid */}
      <div className="bg-card rounded-xl border shadow-sm overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="w-[250px] sticky left-0 bg-muted/30">Project / Task</TableHead>
              <TableHead className="text-center min-w-[60px]">Mon<br/><span className="text-xs font-normal text-muted-foreground">16</span></TableHead>
              <TableHead className="text-center min-w-[60px]">Tue<br/><span className="text-xs font-normal text-muted-foreground">17</span></TableHead>
              <TableHead className="text-center min-w-[60px]">Wed<br/><span className="text-xs font-normal text-muted-foreground">18</span></TableHead>
              <TableHead className="text-center min-w-[60px]">Thu<br/><span className="text-xs font-normal text-muted-foreground">19</span></TableHead>
              <TableHead className="text-center min-w-[60px]">Fri<br/><span className="text-xs font-normal text-muted-foreground">20</span></TableHead>
              <TableHead className="text-center min-w-[60px] bg-muted/10">Sat<br/><span className="text-xs font-normal text-muted-foreground">21</span></TableHead>
              <TableHead className="text-center min-w-[60px] bg-muted/10">Sun<br/><span className="text-xs font-normal text-muted-foreground">22</span></TableHead>
              <TableHead className="text-right font-bold w-[100px]">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {timesheets.length === 0 ? (
               <TableRow>
                 <TableCell colSpan={9} className="h-48 text-center text-muted-foreground">
                   No timesheet data for this period.
                 </TableCell>
               </TableRow>
            ) : (
              timesheets.map((ts: any) => (
                <TableRow key={ts.id} className="group hover:bg-muted/20">
                  <TableCell className="font-medium sticky left-0 bg-card group-hover:bg-muted/20">
                    <div className="flex flex-col">
                      <span className="text-sm">Client Portal</span>
                      <span className="text-xs text-muted-foreground">Frontend Dev</span>
                    </div>
                  </TableCell>
                  <TableCell className="p-1"><input type="text" className="w-full text-center h-10 border rounded focus:ring-2 focus:ring-primary outline-none" defaultValue="4.0" /></TableCell>
                  <TableCell className="p-1"><input type="text" className="w-full text-center h-10 border rounded focus:ring-2 focus:ring-primary outline-none" defaultValue="3.5" /></TableCell>
                  <TableCell className="p-1"><input type="text" className="w-full text-center h-10 border rounded focus:ring-2 focus:ring-primary outline-none" defaultValue="" placeholder="-" /></TableCell>
                  <TableCell className="p-1"><input type="text" className="w-full text-center h-10 border rounded focus:ring-2 focus:ring-primary outline-none" defaultValue="6.0" /></TableCell>
                  <TableCell className="p-1"><input type="text" className="w-full text-center h-10 border rounded focus:ring-2 focus:ring-primary outline-none" defaultValue="" placeholder="-" /></TableCell>
                  <TableCell className="p-1 bg-muted/10"><input type="text" className="w-full text-center h-10 border rounded bg-transparent focus:ring-2 focus:ring-primary outline-none" defaultValue="" placeholder="-" /></TableCell>
                  <TableCell className="p-1 bg-muted/10"><input type="text" className="w-full text-center h-10 border rounded bg-transparent focus:ring-2 focus:ring-primary outline-none" defaultValue="" placeholder="-" /></TableCell>
                  <TableCell className="text-right font-bold font-mono text-primary">13.5</TableCell>
                </TableRow>
              ))
            )}
            {/* Example row for presentation if db is empty but we want to show the premium UI */}
            {timesheets.length === 0 && (
                <TableRow className="group hover:bg-muted/20">
                  <TableCell className="font-medium sticky left-0 bg-card group-hover:bg-muted/20">
                    <div className="flex flex-col">
                      <span className="text-sm">Acme Redesign</span>
                      <span className="text-xs text-muted-foreground">UI Design</span>
                    </div>
                  </TableCell>
                  <TableCell className="p-1"><input type="text" className="w-full text-center h-10 border border-transparent bg-transparent focus:border-input focus:bg-background rounded transition-all focus:ring-2 focus:ring-primary outline-none" defaultValue="2.0" /></TableCell>
                  <TableCell className="p-1"><input type="text" className="w-full text-center h-10 border border-transparent bg-transparent focus:border-input focus:bg-background rounded transition-all focus:ring-2 focus:ring-primary outline-none" defaultValue="4.5" /></TableCell>
                  <TableCell className="p-1"><input type="text" className="w-full text-center h-10 border border-transparent bg-transparent focus:border-input focus:bg-background rounded transition-all focus:ring-2 focus:ring-primary outline-none" defaultValue="8.0" /></TableCell>
                  <TableCell className="p-1"><input type="text" className="w-full text-center h-10 border border-transparent bg-transparent focus:border-input focus:bg-background rounded transition-all focus:ring-2 focus:ring-primary outline-none" defaultValue="5.0" /></TableCell>
                  <TableCell className="p-1"><input type="text" className="w-full text-center h-10 border border-transparent bg-transparent focus:border-input focus:bg-background rounded transition-all focus:ring-2 focus:ring-primary outline-none" defaultValue="7.0" /></TableCell>
                  <TableCell className="p-1 bg-muted/10"><input type="text" className="w-full text-center h-10 border border-transparent bg-transparent focus:border-input focus:bg-background rounded transition-all focus:ring-2 focus:ring-primary outline-none" defaultValue="" placeholder="-" /></TableCell>
                  <TableCell className="p-1 bg-muted/10"><input type="text" className="w-full text-center h-10 border border-transparent bg-transparent focus:border-input focus:bg-background rounded transition-all focus:ring-2 focus:ring-primary outline-none" defaultValue="" placeholder="-" /></TableCell>
                  <TableCell className="text-right font-bold font-mono text-primary">26.5</TableCell>
                </TableRow>
            )}
            
            {/* Footer Totals */}
            <TableRow className="bg-muted/30 font-bold border-t-2">
              <TableCell className="sticky left-0 bg-muted/30 uppercase text-xs tracking-wider">Daily Totals</TableCell>
              <TableCell className="text-center">2.0</TableCell>
              <TableCell className="text-center">4.5</TableCell>
              <TableCell className="text-center">8.0</TableCell>
              <TableCell className="text-center">5.0</TableCell>
              <TableCell className="text-center">7.0</TableCell>
              <TableCell className="text-center text-muted-foreground bg-muted/40">0</TableCell>
              <TableCell className="text-center text-muted-foreground bg-muted/40">0</TableCell>
              <TableCell className="text-right text-lg text-primary">26.5</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
      
      {/* Approvals (Owner/PM only) */}
      {user.role !== 'MEMBER' && (
        <div className="mt-12 space-y-4">
          <h3 className="text-lg font-semibold tracking-tight">Pending Approvals</h3>
          <Card className="shadow-sm">
             <div className="p-6 text-center text-muted-foreground flex flex-col items-center">
               <CheckCircle size={32} className="text-emerald-500/50 mb-3" />
               <p>All timesheets have been approved for this period.</p>
             </div>
          </Card>
        </div>
      )}
    </div>
  );
}
