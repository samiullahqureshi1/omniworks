import Link from "next/link";
import Footer from "@/components/dashboard/Footer";
import { ArrowLeft, ShieldCheck, Lock, Eye, FileText } from "lucide-react";

export const metadata = {
  title: "Privacy Policy | BridgeWorkspace",
  description: "BridgeWorkspace Privacy Policy and Google API User Data Disclosures",
};

export default function PrivacyPolicyPage() {
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
              <ShieldCheck size={24} />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Legal & Transparency</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-extrabold leading-tight tracking-tight mb-4 text-slate-900 dark:text-white">
            Privacy Policy
          </h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-10">
            Last Updated: August 6, 2026
          </p>

          <div className="prose prose-slate dark:prose-invert max-w-none space-y-8 text-slate-700 dark:text-slate-300 leading-relaxed text-sm md:text-base">
            
            <section className="bg-white dark:bg-[#18181c] p-6 md:p-8 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">1. Introduction</h2>
              <p>
                Welcome to <strong>BridgeWorkspace</strong> ("we", "our", or "us"). We are committed to protecting your privacy and safeguarding your personal information. This Privacy Policy explains how we collect, use, store, and process your data when you use our platform, website, and services, including integrations with third-party providers such as Google Cloud Services.
              </p>
            </section>

            <section className="bg-white dark:bg-[#18181c] p-6 md:p-8 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">2. Information We Collect</h2>
              <p className="mb-3">We collect information to provide and improve our team workspace, scheduling, and project management services:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Account Data:</strong> Name, email address, password hash, profile picture, and role permissions.</li>
                <li><strong>Workspace & Task Data:</strong> Projects, tasks, milestones, time entries, notes, and activity logs.</li>
                <li><strong>Third-Party Integrations (Google Services):</strong> When you connect your Google Account, we access your basic Google profile (name, email address, profile picture), Google Calendar events, and Google Meet integration data strictly to facilitate meeting scheduling and automated calendar sync.</li>
              </ul>
            </section>

            {/* CRITICAL FOR GOOGLE VERIFICATION */}
            <section className="bg-amber-500/5 dark:bg-amber-500/10 p-6 md:p-8 rounded-2xl border border-amber-500/30 shadow-xs">
              <div className="flex items-center gap-2 mb-3">
                <Lock className="text-amber-600 dark:text-amber-400" size={20} />
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">3. Google API Limited Use Policy Disclosure</h2>
              </div>
              <p className="mb-4 font-semibold text-slate-900 dark:text-slate-100">
                BridgeWorkspace's use and transfer to any other app of information received from Google APIs will adhere to the{" "}
                <a 
                  href="https://developers.google.com/terms/api-services-user-data-policy#additional_requirements_for_specific_api_scopes" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-amber-600 dark:text-amber-400 underline font-bold"
                >
                  Google API Services User Data Policy
                </a>, including the Limited Use requirements.
              </p>
              <ul className="list-disc pl-5 space-y-2 text-sm">
                <li>We process Google user data strictly to provide user-facing features (scheduling meetings, syncing calendar events, generating Google Meet video call links).</li>
                <li>We do <strong>NOT</strong> transfer or sell Google user data to third parties, advertising platforms, data brokers, or information resellers.</li>
                <li>We do <strong>NOT</strong> use Google user data for serving advertisements, personalized marketing, or training machine learning or artificial intelligence models.</li>
              </ul>
            </section>

            <section className="bg-white dark:bg-[#18181c] p-6 md:p-8 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">4. How We Use Your Data</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>To provide, operate, and maintain BridgeWorkspace services.</li>
                <li>To synchronize scheduled meetings and calendar availability across team members.</li>
                <li>To generate automated meeting reminders and Google Meet links for scheduled calls.</li>
                <li>To send critical system notifications and security alerts.</li>
              </ul>
            </section>

            <section className="bg-white dark:bg-[#18181c] p-6 md:p-8 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">5. Data Retention & Revocation</h2>
              <p className="mb-3">
                We store your information as long as your account remains active. You have full control over your data:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Disconnect Integration:</strong> You can disconnect your Google account at any time from your Account / Workspace Settings, which immediately revokes API access tokens.</li>
                <li><strong>Account Deletion:</strong> You can request full account and data deletion by contacting support. Upon deletion, all associated user data and tokens are permanently removed from our databases.</li>
              </ul>
            </section>

            <section className="bg-white dark:bg-[#18181c] p-6 md:p-8 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">6. Security Measures</h2>
              <p>
                We employ industry-standard security measures including SSL/TLS encryption for all data in transit, encrypted storage for tokens, role-based access control (RBAC), and regular security audits to safeguard your personal data against unauthorized access.
              </p>
            </section>

            <section className="bg-white dark:bg-[#18181c] p-6 md:p-8 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">7. Contact Us</h2>
              <p>
                If you have any questions or privacy requests regarding this Privacy Policy or Google API integrations, please reach out to us at:
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
