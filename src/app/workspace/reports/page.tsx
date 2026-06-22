'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Download, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const mockData = [
  { name: 'Mon', hours: 4.5 },
  { name: 'Tue', hours: 6.2 },
  { name: 'Wed', hours: 8.0 },
  { name: 'Thu', hours: 5.5 },
  { name: 'Fri', hours: 7.0 },
  { name: 'Sat', hours: 0 },
  { name: 'Sun', hours: 0 },
];

const mockProjectData = [
  { name: 'Website Redesign', value: 45 },
  { name: 'API Integration', value: 25 },
  { name: 'Mobile App', value: 20 },
  { name: 'Internal Tools', value: 10 },
];

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2, 210, 80%, 60%))', 'hsl(var(--chart-3, 270, 70%, 60%))', 'hsl(var(--muted-foreground))'];

export default function ReportsPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <BarChart3 className="text-primary" size={28} />
            Reports & Analytics
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Insights into your team's time and project progression.
          </p>
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" className="shadow-sm flex-1 sm:flex-none">
            <Filter className="mr-2 h-4 w-4" /> Filters
          </Button>
          <Button className="shadow-sm flex-1 sm:flex-none">
            <Download className="mr-2 h-4 w-4" /> Export Report
          </Button>
        </div>
      </div>

      {/* KPI Summary */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Billable Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">124.5h</div>
            <p className="text-xs text-emerald-500 mt-1 flex items-center">
               +12% from last week
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Average Daily Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">6.2h</div>
            <p className="text-xs text-muted-foreground mt-1">Per active team member</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Most Active Project</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold truncate">Website Redesign</div>
            <p className="text-xs text-muted-foreground mt-1">45 hours logged this week</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Area */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4 shadow-sm">
          <CardHeader>
            <CardTitle>Hours Logged This Week</CardTitle>
            <CardDescription>Daily breakdown of total hours tracked across the organization.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip 
                    cursor={{ fill: 'hsl(var(--muted)/0.5)' }}
                    contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                  />
                  <Bar dataKey="hours" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 shadow-sm">
          <CardHeader>
            <CardTitle>Time by Project</CardTitle>
            <CardDescription>Distribution of effort across active projects.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={mockProjectData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {mockProjectData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-4">
              {mockProjectData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-2 text-sm">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                  <span className="text-muted-foreground">{entry.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
