"use client";

import React, { useState, Suspense } from "react";
import { resetPasswordAction } from "@/app/actions/auth";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Lock, KeyRound, ArrowLeft, Eye, EyeOff } from "lucide-react";

function ResetPasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) {
      setError("Reset token is missing.");
      return;
    }
    
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.append("token", token);
    const result = await resetPasswordAction(formData);

    setLoading(false);

    if (result?.error) {
      setError(result.error);
    } else {
      router.push("/login?reset=success");
    }
  }

  if (!token) {
    return (
      <div className="mt-7 text-center space-y-5">
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm font-medium text-red-700">
          Invalid or missing reset token. Please request a new password reset link.
        </div>
        <Link
          href="/forgot-password"
          className="inline-flex items-center text-[15px] text-black/75 hover:text-black font-medium"
        >
          <ArrowLeft size={16} className="mr-2" />
          Request New Link
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-7 space-y-3">
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
          id="password"
          name="password"
          type={showPassword ? "text" : "password"}
          required
          placeholder="New password"
          className="h-13 w-full rounded-2xl border border-black/5 bg-black/5 py-3.5 pl-14 pr-14 text-[16px] text-black outline-none placeholder:text-black/45 focus:ring-2 focus:ring-[#ffad0d]"
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-5 top-1/2 -translate-y-1/2 text-black/45 hover:text-black/70 focus:outline-none"
          tabIndex={-1}
        >
          {showPassword ? <Eye size={21} /> : <EyeOff size={21} />}
        </button>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="flex h-13 w-full items-center justify-center rounded-2xl bg-black py-3.5 text-[18px] font-medium text-white shadow-[0_16px_35px_rgba(0,0,0,0.20)] transition hover:bg-[#222] disabled:opacity-60 mt-4"
      >
        {loading ? "Resetting..." : "Reset Password"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
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
            Choose a New Password
          </h1>
          <p className="mx-auto mt-2 max-w-[350px] text-[16px] leading-snug text-black/55">
            Enter your new password below.
          </p>
        </div>

        <Suspense fallback={<div className="mt-8 text-center text-sm text-black/50">Loading...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </main>
  );
}
