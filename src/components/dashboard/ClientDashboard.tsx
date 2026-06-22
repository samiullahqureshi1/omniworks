'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FolderKanban, Clock, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function ClientDashboard({ metrics }: { metrics: any }) {
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

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 mt-6">
      
      {/* Mini Stats Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <motion.div variants={item}>
          <Card className="border-none shadow-sm bg-white dark:bg-slate-900 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16"></div>
            <CardContent className="p-5 flex items-center justify-between relative z-10">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Active Projects</p>
                <p className="text-3xl font-extrabold text-slate-800">{metrics.totalProjects || 0}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100">
                <FolderKanban size={20} />
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div variants={item}>
          <Card className="border-none shadow-sm bg-white dark:bg-slate-900 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16"></div>
            <CardContent className="p-5 flex items-center justify-between relative z-10">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Total Hours Billed</p>
                <p className="text-3xl font-extrabold text-slate-800">{metrics.totalHours || 0}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
                <Clock size={20} />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
        
        {/* Project Portfolios */}
        <motion.div variants={item} className="lg:col-span-3 flex flex-col">
          <Card className="border-none shadow-sm bg-white dark:bg-slate-900 flex-1">
            <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800">
              <CardTitle>Project Portfolios</CardTitle>
              <CardDescription>Status and financial health of your active projects.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {(!metrics.projects || metrics.projects.length === 0) ? (
                <div className="flex flex-col items-center justify-center h-48 text-center p-8">
                  <FolderKanban size={32} className="text-slate-300 mb-3" />
                  <p className="text-sm font-semibold text-slate-600">No active projects</p>
                  <p className="text-xs text-slate-400 mt-1">We are currently setting up your workspaces.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {metrics.projects.map((project: any) => {
                    const trackedHours = 0; // The logic for exact project-level hours isn't in metrics.projects by default, 
                    // but we can show allocated hours.
                    return (
                      <div key={project.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="space-y-1">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
                              <Link href={`/workspace/projects/${project.id}`} className="hover:text-primary transition-colors">
                                {project.name}
                              </Link>
                            </h3>
                            <div className="flex items-center gap-3 text-sm text-slate-500">
                              <span className="flex items-center gap-1"><Clock size={14}/> Started: {new Date(project.startDate).toLocaleDateString()}</span>
                              <Badge variant="secondary" className="font-normal">{project.status.replace('_', ' ')}</Badge>
                            </div>
                          </div>
                          
                          <div className="flex flex-col items-start sm:items-end w-full sm:w-64 gap-2">
                            {project.totalAllocatedHours ? (
                              <div className="w-full">
                                <div className="flex justify-between text-xs font-medium mb-1.5">
                                  <span className="text-slate-500">Budget</span>
                                  <span className="text-slate-800">{project.totalAllocatedHours} hrs</span>
                                </div>
                                <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                  <div className="h-full bg-primary rounded-full w-[0%] transition-all" />
                                </div>
                              </div>
                            ) : (
                              <Badge variant="outline" className="text-slate-500 bg-slate-50 border-slate-200 shadow-sm">
                                Open Budget
                              </Badge>
                            )}
                            
                            <Button variant="ghost" size="sm" asChild className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8 -mr-3 mt-1">
                              <Link href={`/workspace/projects/${project.id}`}>View Details &rarr;</Link>
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

      </div>
    </motion.div>
  );
}
