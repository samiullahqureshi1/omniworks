import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Lock, EyeOff, Server, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function PrivacySection() {
  const privacyPillars = [
    {
      icon: EyeOff,
      title: "Google API Limited Use Compliance",
      desc: "We strictly adhere to Google API Services User Data Policy. Your calendar, meet, and profile data is never sold, shared with ad networks, or used for AI model training.",
      badge: "Google Certified"
    },
    {
      icon: Lock,
      title: "Enterprise-Grade Encryption",
      desc: "All workspace communications, tokens, and time logs are encrypted in transit via TLS 1.3 and at rest using AES-256 bank-grade encryption.",
      badge: "Bank-Grade"
    },
    {
      icon: ShieldCheck,
      title: "Full Revocation & Data Control",
      desc: "You retain 100% ownership of your workspace data. Instantly disconnect integrations or purge stored records at any time from your account panel.",
      badge: "User Controlled"
    },
    {
      icon: Server,
      title: "Isolated Multi-Tenant Security",
      desc: "Strict organizational data isolation with role-based access control (RBAC) ensures members only access authorized tasks, projects, and meetings.",
      badge: "Isolated Storage"
    }
  ];

  return (
    <section id="privacy" className="relative py-24 bg-[#fbfaf8] text-[#151515] overflow-hidden border-t border-black/5">
      {/* Subtle Background Glow */}
      <div className="absolute left-1/2 top-1/2 h-[450px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f3efe6] blur-[120px] pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-[1180px] px-6">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-black/10 bg-white text-xs font-semibold text-black/70 mb-4 shadow-2xs">
            <ShieldCheck size={14} className="text-amber-600" />
            <span>Privacy & Data Protection</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-semibold tracking-[-0.04em] text-slate-900 leading-tight">
            Your Privacy is Our Priority
          </h2>
          <p className="mt-4 text-base md:text-lg text-black/55 leading-relaxed">
            BridgeWorkspace is engineered with privacy at its core. We safeguard your team’s sensitive projects, meetings, and calendar data with transparent policies and stringent security protocols.
          </p>
        </div>

        {/* 4 Privacy Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          {privacyPillars.map((pillar, idx) => {
            const Icon = pillar.icon;
            return (
              <div 
                key={idx} 
                className="group relative p-8 rounded-[24px] bg-white border border-black/5 shadow-[0_10px_30px_rgba(0,0,0,0.03)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.06)] hover:border-black/15 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="p-3 rounded-2xl bg-[#f5f3ec] text-slate-900 border border-black/5 group-hover:bg-[#111] group-hover:text-white transition-colors duration-300">
                      <Icon size={22} />
                    </div>
                    <span className="text-[11px] font-bold tracking-wider uppercase px-3 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200/60">
                      {pillar.badge}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2 tracking-tight">
                    {pillar.title}
                  </h3>
                  <p className="text-sm text-black/60 leading-relaxed font-normal">
                    {pillar.desc}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs font-semibold text-slate-900">
                  <CheckCircle2 size={14} className="text-emerald-600" />
                  <span>Verified & Compliant</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Banner with Links to Privacy Policy & Terms */}
        <div className="p-8 rounded-[28px] bg-[#111] text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
          <div className="space-y-1 text-center md:text-left">
            <h4 className="text-xl font-bold tracking-tight">Ready to review our legal transparency?</h4>
            <p className="text-xs text-white/70 max-w-xl">
              Explore our full Privacy Policy and Terms of Service to learn how we protect your organization.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap justify-center">
            <Link
              href="/privacy-policy"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-slate-900 text-xs font-bold hover:bg-slate-100 transition-colors shadow-sm"
            >
              Privacy Policy <ArrowRight size={14} />
            </Link>
            <Link
              href="/terms-and-conditions"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 text-white text-xs font-bold hover:bg-white/20 border border-white/15 transition-colors"
            >
              Terms of Service
            </Link>
          </div>
        </div>

      </div>
    </section>
  );
}
