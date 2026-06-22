'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plus, Clock, UserPlus, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

export default function DashboardHeader({ user }: { user: { name: string, role: string } }) {
  const [greeting, setGreeting] = React.useState('Welcome');

  React.useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  const getRoleBadge = (role: string) => {
    switch(role) {
      case 'OWNER': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'MEMBER': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'CLIENT': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const firstName = user.name.split(' ')[0];

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border shadow-sm">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
          {greeting}, {firstName} <Sparkles className="text-amber-500 h-6 w-6" />
        </h1>
        <div className="flex items-center gap-2 mt-1.5 text-muted-foreground text-sm">
          <span>Here's what's happening in your workspace today.</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold tracking-wider uppercase ${getRoleBadge(user.role)}`}>
            {user.role}
          </span>
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="flex items-center gap-2"
      >
        {(user.role === 'OWNER' || user.role === 'MEMBER') && (
          <Button variant="outline" className="shadow-sm border-dashed hover:border-primary/50 transition-colors" asChild>
            <Link href="/workspace/time-tracking">
              <Clock className="mr-2 h-4 w-4 text-emerald-500" /> Track Time
            </Link>
          </Button>
        )}
        
        {user.role === 'OWNER' && (
          <>
            <Button variant="outline" className="shadow-sm border-dashed hover:border-primary/50 transition-colors" asChild>
              <Link href="/workspace/users">
                <UserPlus className="mr-2 h-4 w-4 text-blue-500" /> Add User
              </Link>
            </Button>
            <Button className="shadow-md bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90" asChild>
              <Link href="/workspace/projects">
                <Plus className="mr-2 h-4 w-4" /> New Project
              </Link>
            </Button>
          </>
        )}
      </motion.div>
    </div>
  );
}
