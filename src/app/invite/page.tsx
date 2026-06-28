'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { acceptInvitationAction } from '@/app/actions/users';

function InviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState('');
  const [initialName, setInitialName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = searchParams.get('token') || '';
    const n = searchParams.get('name') || '';
    setToken(t);
    setInitialName(n);
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.append('token', token);
    const result = await acceptInvitationAction(formData);

    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      router.push('/workspace');
      router.refresh();
    }
  }

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fbfaf7] dark:bg-zinc-950 p-4">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Invalid or Missing Link</h1>
          <p className="text-muted-foreground">It looks like the invitation link is broken or expired.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fbfaf7] dark:bg-[#181818] p-4">
      <div className="w-full max-w-md space-y-8 bg-white dark:bg-zinc-900 p-10 rounded-[34px] shadow-[0_25px_70px_rgba(0,0,0,0.08)] border border-black/5 dark:border-zinc-800">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <span className="text-primary font-bold text-xl">OT</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Join Organization</h2>
          <p className="text-sm text-muted-foreground mt-2">
            You've been invited! Please set your password to activate your account.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 mt-8">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400 rounded-md border border-red-200 dark:border-red-900/50">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Name</label>
            <input
              type="text"
              name="name"
              defaultValue={initialName}
              required
              className="flex h-11 w-full rounded-xl border border-black/10 bg-white px-4 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-[#ffad0d] focus:border-transparent transition-all"
              placeholder="Your Name"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Password</label>
            <input
              type="password"
              name="password"
              required
              className="flex h-11 w-full rounded-xl border border-black/10 bg-white px-4 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-[#ffad0d] focus:border-transparent transition-all"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex h-12 items-center justify-center rounded-full bg-black px-4 py-2 text-sm font-medium text-white hover:bg-[#222] focus:outline-none focus:ring-2 focus:ring-[#ffad0d] focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none transition-all shadow-[0_10px_25px_rgba(0,0,0,0.18)]"
          >
            {loading ? 'Activating...' : 'Join Workspace'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function InvitePage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <InviteContent />
    </Suspense>
  );
}
