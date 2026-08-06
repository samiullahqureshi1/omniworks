import Link from "next/link";
import Footer from "@/components/dashboard/Footer";
import { ArrowLeft, FileText, Scale } from "lucide-react";

export const metadata = {
  title: "Terms & Conditions | BridgeWorkspace",
  description: "BridgeWorkspace Terms and Conditions of Service",
};

export default function TermsPage() {
  return (
    <>
      <section className="relative min-h-screen overflow-hidden bg-[#fbfaf7] dark:bg-[#111115] text-[#151515] dark:text-white flex flex-col pt-24 pb-16">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.04)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:260px_100%]" />
        <div className="absolute left-1/2 top-[100px] h-[430px] w-[760px] -translate-x-1/2 rounded-full bg-[#f6c56f]/25 dark:bg-amber-500/10 blur-[100px]" />
        
        <header className="relative z-30 mx-auto w-full max-w-4xl px-6 mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
            <ArrowLeft size={16} /> Back to Home
          </Link>
        </header>

        <div className="relative z-10 mx-auto w-full max-w-4xl px-6 flex-1">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <Scale size={24} />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Terms of Service</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-extrabold leading-tight tracking-tight mb-4 text-slate-900 dark:text-white">
            Terms & Conditions
          </h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-10">
            Last Updated: August 6, 2026
          </p>

          <div className="prose prose-slate dark:prose-invert max-w-none space-y-8 text-slate-700 dark:text-slate-300 leading-relaxed text-sm md:text-base">
            
            <section className="bg-white dark:bg-[#18181c] p-6 md:p-8 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">1. Agreement to Terms</h2>
              <p>
                By accessing or using <strong>BridgeWorkspace</strong> ("Platform"), you agree to be bound by these Terms & Conditions. If you do not agree to these terms, please do not access or use our services.
              </p>
            </section>

            <section className="bg-white dark:bg-[#18181c] p-6 md:p-8 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">2. Description of Service</h2>
              <p>
                BridgeWorkspace provides project management, task tracking, team communication, and scheduling software. We allow integrations with third-party service providers, including Google APIs (Calendar, Meet, OAuth), to facilitate workspace operations.
              </p>
            </section>

            <section className="bg-white dark:bg-[#18181c] p-6 md:p-8 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">3. User Responsibilities & Account Security</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>You are responsible for maintaining the confidentiality of your login credentials.</li>
                <li>You agree to use the service in compliance with all applicable laws and regulations.</li>
                <li>You must not use the platform for unlawful, harmful, or abusive activities.</li>
              </ul>
            </section>

            <section className="bg-white dark:bg-[#18181c] p-6 md:p-8 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">4. Third-Party Services & Google Integrations</h2>
              <p>
                BridgeWorkspace integrates with third-party platforms such as Google Workspace. Your use of third-party features is subject to the terms and privacy policies of those third-party providers. BridgeWorkspace is not responsible for the availability or actions of third-party services.
              </p>
            </section>

            <section className="bg-white dark:bg-[#18181c] p-6 md:p-8 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">5. Intellectual Property</h2>
              <p>
                All content, trademarks, logos, and code associated with BridgeWorkspace are the exclusive property of BridgeWorkspace or its licensors. You are granted a limited, non-exclusive license to use the service for its intended purpose.
              </p>
            </section>

            <section className="bg-white dark:bg-[#18181c] p-6 md:p-8 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">6. Termination</h2>
              <p>
                We reserve the right to suspend or terminate your account at any time for violation of these Terms of Service. You may close your account at any time by contacting our support team.
              </p>
            </section>

            <section className="bg-white dark:bg-[#18181c] p-6 md:p-8 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">7. Contact Information</h2>
              <p>
                For questions regarding these Terms & Conditions, please contact us at:
              </p>
              <p className="mt-3 font-semibold text-amber-600 dark:text-amber-400">
                Email: <a href="mailto:support@bridgeworkspace.com" className="underline">support@bridgeworkspace.com</a>
              </p>
            </section>

          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
