'use client';

import React, { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { createContactAction } from '@/app/actions/contacts';
import { useRouter } from 'next/navigation';
import { X, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';

interface CreateContactModalProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onSuccess?: () => void;
}

const fieldLabel = 'text-[13px] font-medium text-slate-600 dark:text-slate-400';
const fieldInput =
  'flex h-9 w-full rounded-xl border border-slate-200 dark:border-white/10 bg-background dark:bg-white/5 px-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-500';

export default function CreateContactModal({
  isOpen,
  setIsOpen,
  onSuccess,
}: CreateContactModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [phone, setPhone] = useState('');

  const resetForm = () => {
    setName('');
    setEmail('');
    setJobTitle('');
    setCompany('');
    setLinkedin('');
    setCountry('');
    setCity('');
    setState('');
    setPhone('');
  };

  const handleCreate = () => {
    if (!name.trim()) {
      toast.error('Full name is required');
      return;
    }
    if (!email.trim()) {
      toast.error('Email is required');
      return;
    }

    startTransition(async () => {
      const res = await createContactAction({
        name,
        email,
        jobTitle: jobTitle || undefined,
        company: company || undefined,
        linkedin: linkedin || undefined,
        country: country || undefined,
        city: city || undefined,
        state: state || undefined,
      });

      if (res.success) {
        toast.success('Contact created successfully');
        resetForm();
        setIsOpen(false);
        if (onSuccess) onSuccess();
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to create contact');
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => setIsOpen(open)}>
      <DialogContent className="w-[calc(100%-2rem)] sm:max-w-[820px] h-auto min-h-[500px] max-h-[90vh] p-0 flex flex-col overflow-hidden rounded-[8px] sm:rounded-[8px] [&>button]:hidden border-slate-200 dark:border-white/10 bg-white dark:bg-[#1f1f1f] shadow-[0_24px_70px_rgba(0,0,0,0.28)]">
        <DialogTitle className="sr-only">Add Contact</DialogTitle>

        {/* Header with Tabs + Close */}
        <div className="flex items-center justify-between px-6 pt-4 pb-0 border-b border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-0">
            <div className="relative pb-3">
              <span className="text-[15px] font-semibold text-slate-900 dark:text-white">Contact</span>
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-slate-900 dark:bg-white rounded-full" />
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="mb-3 p-1.5 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 custom-scrollbar space-y-6">

          {/* Big name field at top */}
          <div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name this Contact..."
              className="w-full border-0 bg-transparent px-0 text-[25px] font-medium tracking-[-0.02em] text-slate-900 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500"
            />
          </div>

          <hr className="border-slate-200 dark:border-white/10" />

          {/* Properties grid — same two-column pattern as Project modal */}
          <div className="grid grid-cols-2 gap-x-10 gap-y-5">

            {/* Email */}
            <div className="space-y-2">
              <label className={fieldLabel}>
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={fieldInput}
                placeholder="e.g. john@example.com"
              />
            </div>

            {/* Job Title */}
            <div className="space-y-2">
              <label className={fieldLabel}>Job Title</label>
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                className={fieldInput}
                placeholder="e.g. Product Manager"
              />
            </div>

            {/* Company */}
            <div className="space-y-2">
              <label className={fieldLabel}>Company</label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className={fieldInput}
                placeholder="e.g. Acme Corp"
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <label className={fieldLabel}>Phone number</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={fieldInput}
                placeholder="e.g. +1 555-0199"
              />
            </div>

            {/* LinkedIn */}
            <div className="space-y-2">
              <label className={fieldLabel}>LinkedIn</label>
              <input
                type="text"
                value={linkedin}
                onChange={(e) => setLinkedin(e.target.value)}
                className={fieldInput}
                placeholder="e.g. linkedin.com/in/johndoe"
              />
            </div>

            {/* Country */}
            <div className="space-y-2">
              <label className={fieldLabel}>Country</label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className={fieldInput}
                placeholder="e.g. United States"
              />
            </div>

            {/* State */}
            <div className="space-y-2">
              <label className={fieldLabel}>State</label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className={fieldInput}
                placeholder="e.g. California"
              />
            </div>

            {/* City */}
            <div className="space-y-2">
              <label className={fieldLabel}>City</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className={fieldInput}
                placeholder="e.g. San Francisco"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-[#19191c] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => { resetForm(); setIsOpen(false); }}
            className="h-9 px-4 text-sm font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 rounded-[16px] transition-colors outline-none cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={isPending}
            className="h-9 min-w-[120px] px-5 text-sm font-bold rounded-[16px] bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isPending ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Adding...
              </>
            ) : (
              'Add Contact'
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
