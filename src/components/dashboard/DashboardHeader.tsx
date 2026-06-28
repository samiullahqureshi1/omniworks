'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plus, Clock, UserPlus, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import GlobalCreateProjectModal from '@/components/modals/GlobalCreateProjectModal';
import GlobalAddUserModal from '@/components/modals/GlobalAddUserModal';

export default function DashboardHeader({ user }: { user: { name: string, role: string } }) {
  const [greeting, setGreeting] = React.useState('Welcome');
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);

  React.useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  const firstName = user.name.split(' ')[0];

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 py-2 mb-2">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mb-1">
            Boost Your Day And Workflow 🚀
          </p>
          <h1 className="text-[32px] md:text-[40px] font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
            Welcome Back, {firstName}
          </h1>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex flex-wrap items-center gap-2 md:gap-3"
        >
          

          {user.role === 'OWNER' && (
            <>
              <Button 
                variant="outline" 
                className="rounded-full shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors h-11 px-5 font-semibold text-sm border-black/5 dark:border-white/10" 
                onClick={() => setIsAddUserOpen(true)}
              >
                <UserPlus className="mr-2 h-[18px] w-[18px]" /> Invite User
              </Button>
              <Button 
                className="rounded-full shadow-md bg-[#1f1f1f] text-white hover:bg-black transition-colors h-11 px-6 font-semibold text-sm border border-white/10" 
                onClick={() => setIsCreateProjectOpen(true)}
              >
                <Plus className="mr-2 h-[18px] w-[18px]" /> New Project
              </Button>
            </>
          )}
        </motion.div>
      </div>

      <GlobalAddUserModal isOpen={isAddUserOpen} setIsOpen={setIsAddUserOpen} />
      <GlobalCreateProjectModal isOpen={isCreateProjectOpen} setIsOpen={setIsCreateProjectOpen} />
    </>
  );
}
