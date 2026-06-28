// 'use client';

// import React, { useState } from 'react';
// import { useRouter } from 'next/navigation';
// import { loginAction } from '@/app/actions/auth';
// import Link from 'next/link';

// export default function LoginPage() {
//   const [error, setError] = useState<string | null>(null);
//   const [loading, setLoading] = useState(false);
//   const router = useRouter();

//   async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
//     e.preventDefault();
//     setError(null);
//     setLoading(true);

//     const formData = new FormData(e.currentTarget);
//     const result = await loginAction(formData);

//     setLoading(false);
//     if (result.error) {
//       setError(result.error);
//     } else {
//       router.push('/workspace');
//       router.refresh();
//     }
//   }

//   return (
//     <div className="flex min-h-screen flex-col justify-center py-12 sm:px-6 lg:px-8 bg-[#fbfaf7] dark:bg-[#181818]">
//       <div className="sm:mx-auto sm:w-full sm:max-w-md">
//         <h2 className="mt-6 text-center text-3xl font-extrabold tracking-tight text-slate-900">
//           Omnitrack Workspace
//         </h2>
//         <p className="mt-2 text-center text-sm text-slate-600">
//           Or{' '}
//           <Link href="/signup" className="font-medium text-black hover:text-[#ffad0d] underline underline-offset-4">
//             register a new organization
//           </Link>
//         </p>
//       </div>

//       <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
//         <div className="bg-white py-10 px-4 shadow-[0_25px_70px_rgba(0,0,0,0.08)] sm:rounded-[34px] sm:px-10 border border-black/5">
//           <form className="space-y-6" onSubmit={handleSubmit}>
//             {error && (
//               <div className="rounded-md bg-red-50 p-4 border border-red-150">
//                 <div className="flex">
//                   <div className="text-sm font-medium text-red-800">{error}</div>
//                 </div>
//               </div>
//             )}

//             <div>
//               <label htmlFor="email" className="block text-sm font-medium text-slate-700">
//                 Email address
//               </label>
//               <div className="mt-1">
//                 <input
//                   id="email"
//                   name="email"
//                   type="email"
//                   autoComplete="email"
//                   required
//                   className="appearance-none block w-full px-4 py-3 border border-black/10 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#ffad0d] focus:border-transparent sm:text-sm text-black transition-all"
//                 />
//               </div>
//             </div>

//             <div>
//               <label htmlFor="password" className="block text-sm font-medium text-slate-700">
//                 Password
//               </label>
//               <div className="mt-1">
//                 <input
//                   id="password"
//                   name="password"
//                   type="password"
//                   autoComplete="current-password"
//                   required
//                   className="appearance-none block w-full px-4 py-3 border border-black/10 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#ffad0d] focus:border-transparent sm:text-sm text-black transition-all"
//                 />
//               </div>
//             </div>

//             <div>
//               <button
//                 type="submit"
//                 disabled={loading}
//                 className="w-full flex justify-center py-3 px-4 border border-transparent rounded-full shadow-[0_10px_25px_rgba(0,0,0,0.18)] text-sm font-medium text-white bg-black hover:bg-[#222] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#ffad0d] disabled:opacity-50 transition-all"
//               >
//                 {loading ? 'Logging in...' : 'Sign in'}
//               </button>
//             </div>
//           </form>
//         </div>
//       </div>
//     </div>
//   );
// }
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { loginAction } from "@/app/actions/auth";
import Link from "next/link";
import { EyeOff, Lock, Mail, LogIn } from "lucide-react";
import { FaGoogle, FaFacebookF, FaApple } from "react-icons/fa6";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pending2FaUserId, setPending2FaUserId] = useState<string | null>(null);
  const [twoFactorToken, setTwoFactorToken] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await loginAction(formData);

    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else if (result.requiresTwoFactor) {
      setPending2FaUserId(result.userId);
    } else {
      router.push("/workspace");
      router.refresh();
    }
  }

  async function handleTwoFactorSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!pending2FaUserId) return;
    setError(null);
    setLoading(true);

    const { verifyTwoFactorLoginAction } = await import("@/app/actions/auth");
    const result = await verifyTwoFactorLoginAction(pending2FaUserId, twoFactorToken);

    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      router.push("/workspace");
      router.refresh();
    }
  }

  return (
    <main className="relative flex h-screen items-center justify-center overflow-hidden bg-[#fbfaf7] dark:bg-[#181818] px-6 py-4 text-[#111]">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.045)_1px,transparent_1px)] bg-[size:260px_100%]" />
      <div className="absolute left-1/2 top-[42%] h-[480px] w-[760px] -translate-x-1/2 rounded-full bg-[#f6c56f]/30 blur-[100px]" />

      <div className="absolute left-[-120px] top-[22%] h-[520px] w-[520px] rounded-full border border-white/70" />
      <div className="absolute right-[-180px] bottom-[10%] h-[620px] w-[620px] rounded-full border border-white/70" />

      <div className="relative z-10 w-full max-w-[500px] rounded-[32px] border border-black/10 bg-white/75 px-8 py-7 shadow-[0_30px_90px_rgba(0,0,0,0.10)] backdrop-blur-xl sm:px-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
          <LogIn size={30} />
        </div>

        {pending2FaUserId ? (
          <>
            <div className="mt-6 text-center">
              <h1 className="text-[32px] font-semibold tracking-[-0.05em]">
                Two-Factor Authentication
              </h1>
              <p className="mx-auto mt-2 max-w-[350px] text-[16px] leading-snug text-black/55">
                Please enter the 6-digit code from your authenticator app.
              </p>
            </div>

            <form onSubmit={handleTwoFactorSubmit} className="mt-7 space-y-3">
              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {error}
                </div>
              )}

              <div className="relative">
                <Lock
                  className="absolute left-5 top-1/2 -translate-y-1/2 text-black/45"
                  size={20}
                />
                <input
                  id="twoFactorToken"
                  name="twoFactorToken"
                  type="text"
                  required
                  placeholder="6-digit code"
                  value={twoFactorToken}
                  onChange={(e) => setTwoFactorToken(e.target.value)}
                  maxLength={6}
                  className="h-13 w-full rounded-2xl border border-black/5 bg-black/5 py-3.5 pl-14 pr-4 text-[16px] text-black outline-none placeholder:text-black/45 focus:ring-2 focus:ring-[#ffad0d] text-center tracking-[0.5em] font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex h-13 w-full items-center justify-center rounded-2xl bg-black py-3.5 text-[18px] font-medium text-white shadow-[0_16px_35px_rgba(0,0,0,0.20)] transition hover:bg-[#222] disabled:opacity-60 mt-4"
              >
                {loading ? "Verifying..." : "Verify & Sign In"}
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setPending2FaUserId(null);
                  setTwoFactorToken("");
                  setError(null);
                }}
                className="w-full mt-3 py-3 text-sm font-medium text-black/60 hover:text-black transition-colors"
              >
                Back to Login
              </button>
            </form>
          </>
        ) : (
          <>
            <div className="mt-6 text-center">
              <h1 className="text-[32px] font-semibold tracking-[-0.05em]">
                Sign in with email
              </h1>
              <p className="mx-auto mt-2 max-w-[350px] text-[16px] leading-snug text-black/55">
                Welcome back to Collabix. Manage your team, tasks, and projects in
                one place.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-7 space-y-3">
              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {error}
                </div>
              )}

              <div className="relative">
                <Mail
                  className="absolute left-5 top-1/2 -translate-y-1/2 text-black/45"
                  size={20}
                />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="Email"
                  className="h-13 w-full rounded-2xl border border-black/5 bg-black/5 py-3.5 pl-14 pr-4 text-[16px] text-black outline-none placeholder:text-black/45 focus:ring-2 focus:ring-[#ffad0d]"
                />
              </div>

              <div className="relative">
                <Lock
                  className="absolute left-5 top-1/2 -translate-y-1/2 text-black/45"
                  size={20}
                />
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  placeholder="Password"
                  className="h-13 w-full rounded-2xl border border-black/5 bg-black/5 py-3.5 pl-14 pr-14 text-[16px] text-black outline-none placeholder:text-black/45 focus:ring-2 focus:ring-[#ffad0d]"
                />
                <EyeOff
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-black/45"
                  size={21}
                />
              </div>

              <div className="flex justify-end">
                <Link href="#" className="text-[15px] text-black/75 hover:text-black">
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex h-13 w-full items-center justify-center rounded-2xl bg-black py-3.5 text-[18px] font-medium text-white shadow-[0_16px_35px_rgba(0,0,0,0.20)] transition hover:bg-[#222] disabled:opacity-60"
              >
                {loading ? "Signing in..." : "Get Started"}
              </button>
            </form>

            <div className="my-5 flex items-center gap-4">
              <div className="h-px flex-1 border-t border-dotted border-black/20" />
              <span className="text-sm text-black/45">Or sign in with</span>
              <div className="h-px flex-1 border-t border-dotted border-black/20" />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <button className="flex h-12 items-center justify-center rounded-2xl border border-black/5 bg-white shadow-[0_12px_35px_rgba(0,0,0,0.04)]">
                <FaGoogle className="text-[22px] text-[#4285f4]" />
              </button>
              <button className="flex h-12 items-center justify-center rounded-2xl border border-black/5 bg-white shadow-[0_12px_35px_rgba(0,0,0,0.04)]">
                <FaFacebookF className="text-[22px] text-[#1877f2]" />
              </button>
              <button className="flex h-12 items-center justify-center rounded-2xl border border-black/5 bg-white shadow-[0_12px_35px_rgba(0,0,0,0.04)]">
                <FaApple className="text-[24px] text-black" />
              </button>
            </div>
          </>
        )}

        <p className="mt-5 text-center text-sm text-black/55">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="font-semibold text-black underline underline-offset-4"
          >
            Register new organization
          </Link>
        </p>
      </div>
    </main>
  );
}