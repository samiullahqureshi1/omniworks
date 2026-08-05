"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { signupAction } from "@/app/actions/auth";
import { Eye, EyeOff } from "lucide-react";
import { AuthShell, GoogleG } from "@/components/auth/AuthShell";

const inputClass =
  "h-[46px] w-full rounded-[8px] border border-[#d8dce3] bg-white px-4 text-[15px] text-[#292d34] outline-none transition placeholder:text-[#8b909a] focus:border-[#292d34] focus:ring-[3px] focus:ring-[#292d34]/10";

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const canSubmit =
    companyName.trim().length > 0 &&
    name.trim().length > 0 &&
    email.trim().length > 0 &&
    password.length > 0 &&
    !loading;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await signupAction(formData);

    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      router.push("/workspace");
      router.refresh();
    }
  }

  return (
    <AuthShell
      title="Create your workspace"
      switchPrompt="Already have an account?"
      switchHref="/login"
      switchLabel="Log in"
    >
      {/* Google sign-up — creates the workspace on first sign-in. */}
      <a
        href="/api/auth/google/start?mode=signup"
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
        {error && (
          <div className="rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 text-[14px] font-medium text-red-700">
            {error}
          </div>
        )}

        <input
          id="companyName"
          name="companyName"
          type="text"
          required
          placeholder="Workspace / company name"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          className={inputClass}
        />

        <input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          required
          placeholder="Full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
        />

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
            autoComplete="new-password"
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
          {loading ? "Creating workspace…" : "Sign Up"}
        </button>
      </form>

      <p className="mt-4 text-center text-[13px] leading-relaxed text-[#7c828d]">
        By signing up you agree to our{" "}
        <a href="/terms-and-conditions" className="text-[#3b82f6] hover:underline">
          Terms
        </a>{" "}
        and{" "}
        <a href="/privacy-policy" className="text-[#3b82f6] hover:underline">
          Privacy Policy
        </a>
        .
      </p>
    </AuthShell>
  );
}
