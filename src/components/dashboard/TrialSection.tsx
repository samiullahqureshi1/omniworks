import Link from "next/link";
import { ArrowRight, Bell, Clock, UserRound } from "lucide-react";

export default function TrialSection() {
  return (
    <section id="resources" className="bg-white px-6 py-24 text-[#111]">
      <div className="mx-auto max-w-[1180px]">
        <div className="relative overflow-hidden rounded-[34px] bg-[linear-gradient(180deg,#f8d890_0%,#fff7e4_100%)] px-6 py-24 shadow-[0_30px_90px_rgba(0,0,0,0.06)]">
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-white/80 to-transparent" />

          <div className="absolute -left-28 top-[155px] w-[360px] rounded-3xl bg-white/55 p-6 text-left blur-[0.2px]">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#dce6ff]">
                <UserRound size={28} />
              </div>
              <div>
                <h3 className="text-3xl font-medium tracking-[-0.05em] text-black/55">
                  Design Branding
                </h3>
                <p className="mt-3 text-2xl text-black/45">Teacher : Jack alven</p>
              </div>
            </div>

            <div className="mt-12 flex justify-between text-xl text-black/45">
              <span>Progress</span>
              <span>35%</span>
            </div>

            <div className="mt-4 h-3 rounded-full bg-black/5">
              <div className="h-full w-[35%] rounded-full bg-[#cbd9fb]/80" />
            </div>
          </div>

          <div className="absolute -left-20 bottom-0 flex w-[330px] items-center gap-4 rounded-3xl bg-white/45 p-5 text-left">
            <img
              src="https://i.pravatar.cc/80?img=12"
              alt=""
              className="h-14 w-14 rounded-xl object-cover opacity-60"
            />
            <div className="flex-1">
              <h4 className="text-xl font-medium text-black/50">Bradley Lawlor</h4>
              <p className="mt-1 text-sm text-black/20">Just Now</p>
            </div>
            <span className="flex h-8 w-12 items-center justify-center rounded-full bg-black/45 text-white">
              9
            </span>
          </div>

          <div className="absolute left-[115px] top-[75px] flex h-20 w-20 items-center justify-center rounded-2xl bg-white/70 shadow-[0_20px_60px_rgba(0,0,0,0.05)]">
            <Bell className="fill-[#ffb22c] text-[#ffb22c]" size={32} />
          </div>

          <div className="absolute right-0 top-12 flex w-[260px] items-center justify-between rounded-l-[28px] bg-white/60 px-8 py-7 shadow-[0_20px_60px_rgba(0,0,0,0.04)]">
            <div>
              <h3 className="text-[34px] font-medium tracking-[-0.05em] text-black/65">
                8h 12m
              </h3>
              <p className="mt-2 text-lg text-black/45">Average time spent</p>
            </div>

            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#6d624e] text-white">
              <Clock size={26} />
            </div>
          </div>

          <div className="relative z-10 mx-auto max-w-[760px] text-center">
            <div className="mb-8 flex justify-center -space-x-4">
              {[32, 12, 15].map((img) => (
                <img
                  key={img}
                  src={`https://i.pravatar.cc/90?img=${img}`}
                  alt=""
                  className="h-16 w-16 rounded-full border-[3px] border-white object-cover"
                />
              ))}
            </div>

            <p className="text-2xl font-semibold tracking-[-0.04em]">
              20k+ Projects Tracked Effortlessly
            </p>

            <h2 className="mt-12 text-[52px] font-medium leading-[1.05] tracking-[-0.06em] md:text-[76px]">
              Start your free trial today
            </h2>

            <div className="mt-14 flex flex-wrap justify-center gap-6">
              <Link
                href="/signup"
                className="flex items-center gap-3 rounded-full bg-[#111] px-6 py-3.5 font-medium text-white shadow-[0_15px_30px_rgba(0,0,0,0.2)]"
              >
                Try for Free
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-black">
                  <ArrowRight size={18} />
                </span>
              </Link>

              <Link
                href="/signup"
                className="flex items-center gap-3 rounded-full border border-black/15 bg-white/40 px-6 py-3.5 font-medium shadow-[0_15px_30px_rgba(0,0,0,0.05)] backdrop-blur-sm"
              >
                Schedule a Demo
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-white">
                  <ArrowRight size={18} />
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}