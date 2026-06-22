'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, FolderKanban, CheckCircle2, ListTodo, MoreVertical } from 'lucide-react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function MemberDashboard({ metrics }: { metrics: any }) {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4 } }
  };

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'LOW': return 'bg-slate-100 text-slate-600 border-slate-200';
      case 'MEDIUM': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'HIGH': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'CRITICAL': return 'bg-red-50 text-red-700 border-red-200 font-bold';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 mt-6">
      
      {/* Mini Stats Row */}
      <div className="grid gap-4 md:grid-cols-3">
        <motion.div variants={item}>
          <Card className="border-none shadow-sm bg-white dark:bg-slate-900">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">My Tasks</p>
                <p className="text-2xl font-bold text-slate-800">{metrics.myTasks?.length || 0}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                <ListTodo size={18} />
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div variants={item}>
          <Card className="border-none shadow-sm bg-white dark:bg-slate-900">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">My Projects</p>
                <p className="text-2xl font-bold text-slate-800">{metrics.totalProjects || 0}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                <FolderKanban size={18} />
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div variants={item}>
          <Card className="border-none shadow-sm bg-white dark:bg-slate-900">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Hours Logged</p>
                <p className="text-2xl font-bold text-slate-800">{metrics.totalHours || 0}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                <Clock size={18} />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        
        {/* My Priorities (Tasks) */}
        <motion.div variants={item} className="lg:col-span-4 flex flex-col">
          <Card className="border-none shadow-sm bg-white dark:bg-slate-900 flex-1">
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>My Priorities</CardTitle>
                  <CardDescription>Your active task assignments.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {(!metrics.myTasks || metrics.myTasks.length === 0) ? (
                <div className="flex flex-col items-center justify-center h-48 text-center p-8 border border-dashed rounded-xl bg-slate-50 dark:bg-slate-900/50">
                  <div className="h-12 w-12 rounded-full bg-white shadow-sm flex items-center justify-center text-emerald-500 mb-3">
                    <CheckCircle2 size={24} />
                  </div>
                  <p className="text-sm font-semibold text-slate-700">All caught up!</p>
                  <p className="text-xs text-slate-500 mt-1">Enjoy your free time or check in with your PM.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {metrics.myTasks.map((task: any) => (
                    <div key={task.id} className="group flex flex-col sm:flex-row sm:items-center justify-between p-3.5 border rounded-xl hover:shadow-md transition-all bg-white hover:border-primary/30">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          {task.status === 'DONE' ? (
                            <CheckCircle2 className="text-emerald-500" size={18} />
                          ) : (
                            <div className="h-4 w-4 rounded-full border-2 border-slate-300 group-hover:border-primary transition-colors" />
                          )}
                        </div>
                        <div className="space-y-1">
                          <Link href={`/workspace/projects/${task.projectId}`} className="text-sm font-semibold leading-none hover:text-primary transition-colors">
                            {task.title}
                          </Link>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500 font-medium">in {task.project?.name}</span>
                            <Badge variant="outline" className={`text-[9px] px-1.5 py-0 border ${getPriorityColor(task.priority)}`}>
                              {task.priority}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-3 sm:mt-0 ml-7 sm:ml-0 flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">{task.status.replace('_', ' ')}</Badge>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 group-hover:text-primary">
                          <MoreVertical size={14} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Assigned Projects List */}
        <motion.div variants={item} className="lg:col-span-3 flex flex-col">
          <Card className="border-none shadow-sm bg-white dark:bg-slate-900 flex-1">
            <CardHeader className="pb-4">
              <CardTitle>Active Projects</CardTitle>
              <CardDescription>Workspaces you belong to.</CardDescription>
            </CardHeader>
            <CardContent>
              {(!metrics.assignedProjects || metrics.assignedProjects.length === 0) ? (
                <div className="text-center p-6 text-slate-500 text-sm">Not assigned to any projects.</div>
              ) : (
                <div className="space-y-4">
                  {metrics.assignedProjects.map((project: any) => (
                    <div key={project.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100">
                      <div className="space-y-1">
                        <Link href={`/workspace/projects/${project.id}`} className="text-sm font-semibold hover:text-primary transition-colors">
                          {project.name}
                        </Link>
                        {project.projectManager && (
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">
                            PM: {project.projectManager.name}
                          </p>
                        )}
                      </div>
                      <Badge variant="outline" className="bg-white">{project.status.replace('_', ' ')}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

      </div>
    </motion.div>
  );
}
