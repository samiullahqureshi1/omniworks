"use client";

import React, { useState } from "react";
import { forgotPasswordAction } from "@/app/actions/auth";
import Link from "next/link";
import { Mail, KeyRound, ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await forgotPasswordAction(formData);

    setLoading(false);

    if (result?.error) {
      setError(result.error);
    } else {
      setSuccess(true);
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
          <KeyRound size={30} />
        </div>

        <div className="mt-6 text-center">
          <h1 className="text-[32px] font-semibold tracking-[-0.05em]">
            Reset Password
          </h1>
          <p className="mx-auto mt-2 max-w-[350px] text-[16px] leading-snug text-black/55">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>

        {success ? (
          <div className="mt-7 text-center space-y-5">
            <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-4 text-sm font-medium text-green-700">
              Check your inbox! We've sent password reset instructions to your email address.
            </div>
            <Link
              href="/login"
              className="inline-flex items-center text-[15px] text-black/75 hover:text-black font-medium"
            >
              <ArrowLeft size={16} className="mr-2" />
              Back to Login
            </Link>
          </div>
        ) : (
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
                placeholder="Email address"
                className="h-13 w-full rounded-2xl border border-black/5 bg-black/5 py-3.5 pl-14 pr-4 text-[16px] text-black outline-none placeholder:text-black/45 focus:ring-2 focus:ring-[#ffad0d]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex h-13 w-full items-center justify-center rounded-2xl bg-black py-3.5 text-[18px] font-medium text-white shadow-[0_16px_35px_rgba(0,0,0,0.20)] transition hover:bg-[#222] disabled:opacity-60 mt-4"
            >
              {loading ? "Sending link..." : "Send Reset Link"}
            </button>
            
            <div className="pt-4 text-center">
              <Link
                href="/login"
                className="inline-flex items-center text-[15px] text-black/75 hover:text-black font-medium"
              >
                <ArrowLeft size={16} className="mr-2" />
                Back to Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
