import React from 'react';
import { Calendar, Video, CheckCircle2, Shield, Users, Layers } from 'lucide-react';

export default function AppPurposeSection() {
  return (
    <section id="about-app" className="relative py-20 bg-white text-[#151515] border-t border-black/5 overflow-hidden">
      <div className="relative z-10 mx-auto max-w-[1180px] px-6">
        
        {/* Section Badge & Title */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-black/10 bg-[#faf9f6] text-xs font-semibold text-black/70 mb-4 shadow-2xs">
            <Layers size={14} className="text-blue-600" />
            <span>App Purpose & Features</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-semibold tracking-[-0.04em] text-slate-900 leading-tight">
            What is BridgeWorkspace?
          </h2>
          <p className="mt-4 text-base md:text-lg text-black/60 leading-relaxed">
            <strong>BridgeWorkspace</strong> (also known as <em>Bridge Workspace</em>) is a comprehensive team operations, project management, and scheduling platform built for modern teams, agencies, and businesses.
          </p>
        </div>

        {/* Purpose Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          
          <div className="p-8 rounded-[24px] bg-[#fbfaf8] border border-black/5 flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center mb-6 border border-blue-500/20">
                <Layers size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Project & Task Operations</h3>
              <p className="text-sm text-black/60 leading-relaxed">
                Centralize team workflows, manage task boards, track time entries, monitor project budgets, and collaborate seamlessly in real-time.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-black/5 text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-emerald-600" /> Real-time Kanban & Kanban Boards
            </div>
          </div>

          <div className="p-8 rounded-[24px] bg-[#fbfaf8] border border-black/5 flex flex-col justify-between shadow-xs">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mb-6 border border-amber-500/20">
                <Calendar size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Google Calendar & Meet Sync</h3>
              <p className="text-sm text-black/60 leading-relaxed">
                Connect your Google Account to enable automated client booking. BridgeWorkspace checks your calendar availability, reserves time slots, and creates Google Calendar events automatically.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-black/5 text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-emerald-600" /> Automated Calendar Event Creation
            </div>
          </div>

          <div className="p-8 rounded-[24px] bg-[#fbfaf8] border border-black/5 flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-6 border border-emerald-500/20">
                <Video size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Instant Video Call Links</h3>
              <p className="text-sm text-black/60 leading-relaxed">
                Every intro-call booked through BridgeWorkspace automatically generates a unique Google Meet video call link, sending calendar invites to both host and attendees.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-black/5 text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-emerald-600" /> Auto-Generated Google Meet Links
            </div>
          </div>

        </div>

        {/* Integration Explanation Banner for Google Reviewers */}
        <div className="p-6 md:p-8 rounded-[24px] bg-[#f4f3ed] border border-black/10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2">
            <h4 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Shield size={18} className="text-amber-600" /> Why BridgeWorkspace Accesses Google Data
            </h4>
            <p className="text-xs text-black/70 max-w-3xl leading-relaxed">
              BridgeWorkspace requests Google Calendar and profile permissions solely to display available meeting slots, schedule intro calls directly onto your Google Calendar, and generate Google Meet video call URLs for confirmed bookings. We adhere strictly to Google API Services User Data Policies.
            </p>
          </div>
        </div>

      </div>
    </section>
  );
}
