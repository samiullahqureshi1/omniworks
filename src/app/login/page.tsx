"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loginAction, getPendingTwoFactorUserAction } from "@/app/actions/auth";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { AuthShell, GoogleG } from "@/components/auth/AuthShell";

/** Messages for the ?error= codes the Google callback can redirect back with. */
const OAUTH_ERRORS: Record<string, string> = {
  google_not_configured: "Google sign-in isn't configured on this server yet.",
  google_cancelled: "Google sign-in was cancelled.",
  google_state: "Google sign-in expired or was tampered with. Please try again.",
  google_failed: "Could not complete Google sign-in. Please try again.",
  no_account: "No account found for that Google address. Sign up first.",
  rate_limited: "Too many sign-in attempts. Please wait a moment and try again.",
};

const inputClass =
  "h-[46px] w-full rounded-[8px] border border-[#d8dce3] bg-white px-4 text-[15px] text-[#292d34] outline-none transition placeholder:text-[#8b909a] focus:border-[#292d34] focus:ring-[3px] focus:ring-[#292d34]/10";

function LoginPageInner() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending2FaUserId, setPending2FaUserId] = useState<string | null>(null);
  const [twoFactorToken, setTwoFactorToken] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();

  const canSubmit = email.trim().length > 0 && password.length > 0 && !loading;

  // Any error the Google callback redirected back with is derived from the URL
  // rather than mirrored into state, so it needs no effect.
  const oauthErrorCode = searchParams.get("error");
  const oauthError = oauthErrorCode
    ? OAUTH_ERRORS[oauthErrorCode] ?? "Sign-in failed. Please try again."
    : null;
  const shownError = error ?? oauthError;

  // Pick up a 2FA challenge parked by the Google callback. The user id comes from
  // a short-lived httpOnly cookie, never the URL.
  useEffect(() => {
    if (searchParams.get("twofa") !== "1") return;
    getPendingTwoFactorUserAction().then((res) => {
      if (res.userId) setPending2FaUserId(res.userId);
    });
  }, [searchParams]);

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

  // ── Two-factor step ──────────────────────────────────────────────────────
  if (pending2FaUserId) {
    return (
      <AuthShell
        title="Two-factor authentication"
        switchPrompt="Enter the 6-digit code from your authenticator app."
        switchHref="/login"
        switchLabel=""
      >
        <form onSubmit={handleTwoFactorSubmit} className="space-y-3">
          {shownError && (
            <div className="rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 text-[14px] font-medium text-red-700">
              {shownError}
            </div>
          )}

          <input
            id="twoFactorToken"
            name="twoFactorToken"
            type="text"
            inputMode="numeric"
            required
            autoFocus
            placeholder="6-digit code"
            value={twoFactorToken}
            onChange={(e) => setTwoFactorToken(e.target.value)}
            maxLength={6}
            className={`${inputClass} text-center font-mono tracking-[0.5em]`}
          />

          <button
            type="submit"
            disabled={loading || twoFactorToken.length === 0}
            className="h-[46px] w-full rounded-[8px] bg-[#292d34] text-[15px] font-semibold text-white transition hover:bg-[#3d424b] disabled:cursor-not-allowed disabled:bg-[#b8bcc4]"
          >
            {loading ? "Verifying…" : "Verify & log in"}
          </button>

          <button
            type="button"
            onClick={() => {
              setPending2FaUserId(null);
              setTwoFactorToken("");
              setError(null);
            }}
            className="w-full py-2 text-[14px] font-medium text-[#7c828d] transition hover:text-[#292d34]"
          >
            Back to log in
          </button>
        </form>
      </AuthShell>
    );
  }

  // ── Credentials step ─────────────────────────────────────────────────────
  return (
    <AuthShell
      title="Welcome back!"
      switchPrompt="Don't have an account?"
      switchHref="/signup"
      switchLabel="Sign up"
    >
      {/* Google sign-in. A plain link so the browser performs a full navigation
          to the OAuth start route, which sets the CSRF cookie and redirects. */}
      <a
        href="/api/auth/google/start?mode=login"
        className="flex h-[46px] w-full items-center justify-center gap-3 rounded-[8px] border border-[#d8dce3] bg-white text-[15px] font-medium text-[#292d34] transition hover:bg-[#f7f8f9]"
      >
        <GoogleG size={19} />
        Continue with Google
      </a>

      <div className="my-5 flex items-center gap-4">
        <div className="h-px flex-1 bg-[#e4e7ec]" />
        <span className="text-[14px] text-[#8b909a]">or</span>
        <div className="h-px flex-1 bg-[#e4e7ec]" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {shownError && (
          <div className="rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 text-[14px] font-medium text-red-700">
            {shownError}
          </div>
        )}

        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="Work email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />

        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`${inputClass} pr-12`}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8b909a] transition hover:text-[#54575d]"
            tabIndex={-1}
          >
            {showPassword ? <Eye size={19} /> : <EyeOff size={19} />}
          </button>
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="h-[46px] w-full rounded-[8px] bg-[#292d34] text-[15px] font-semibold text-white transition hover:bg-[#3d424b] disabled:cursor-not-allowed disabled:bg-[#b8bcc4]"
        >
          {loading ? "Logging in…" : "Log In"}
        </button>
      </form>

      <div className="mt-4 text-center">
        <Link href="/forgot-password" className="text-[14px] font-medium text-[#3b82f6] hover:underline">
          Forgot Password?
        </Link>
      </div>
    </AuthShell>
  );
}

/**
 * useSearchParams() opts a route into client-side rendering, so Next requires it to
 * sit inside a Suspense boundary — without one the production build fails while
 * prerendering /login.
 */
export default function LoginPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-white" />}>
      <LoginPageInner />
    </Suspense>
  );
}
