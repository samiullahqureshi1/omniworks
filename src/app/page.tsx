import Link from "next/link";
import {
  ArrowRight,
  Bell,
  Calendar,
  Clock,
  Grid3X3,
  MoreVertical,
  UserRound,
} from "lucide-react";
import FeaturesSection from "@/components/dashboard/FeaturesSection";
import CollaborationSection from "@/components/dashboard/CollaborationSection";
import ToolsSection from "@/components/dashboard/ToolsSection";
import PricingSection from "@/components/dashboard/PricingSection";
import TrialSection from "@/components/dashboard/TrialSection";
import Footer from "@/components/dashboard/Footer";

export default function CollabixHero() {
  return (
    <>
<header className="sticky top-5 z-50 mx-auto w-full max-w-[1180px] px-4 pointer-events-none">
  <div className="flex h-[72px] items-center justify-between rounded-[28px] border border-black/5 bg-white/90 px-6 shadow-[0_18px_50px_rgba(0,0,0,0.08)] backdrop-blur-xl pointer-events-auto">
    <div className="flex items-center gap-2 text-xl font-semibold">
      <div className="grid grid-cols-3 gap-1">
        {Array.from({ length: 9 }).map((_, i) => (
          <span key={i} className="h-1.5 w-1.5 rounded-full bg-black" />
        ))}
      </div>
      Collabix
    </div>

    <nav className="hidden items-center gap-12 text-[15px] text-black/70 md:flex">
      <Link href="#features">Features</Link>
      <Link href="#pricing">Pricing</Link>
      <Link href="/about">About</Link>
      <Link href="/blog">Resources</Link>
    </nav>

    <div className="hidden items-center gap-6 text-[15px] md:flex">
      <Link href="/login" className="text-black/70">
        Log In
      </Link>

      <Link
        href="/signup"
        className="flex items-center gap-3 rounded-full bg-[#111] px-5 py-2.5 font-medium text-white shadow-[0_10px_25px_rgba(0,0,0,0.18)]"
      >
        Get Started
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-black">
          <ArrowRight size={17} />
        </span>
      </Link>
    </div>
  </div>
</header>
    <section className="relative min-h-screen overflow-hidden bg-[#fbfaf7] text-[#151515] -mt-[92px]">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.06)_1px,transparent_1px)] bg-[size:260px_100%]" />
      <div className="absolute left-1/2 top-[280px] h-[430px] w-[760px] -translate-x-1/2 rounded-full bg-[#f6c56f]/35 blur-[90px]" />
      
      <div className="relative z-10 mx-auto max-w-[1180px] px-6 pb-20 pt-32 text-center">
        <div className="mx-auto mb-5 w-fit rounded-full border border-black/15 bg-white/50 px-4 py-1.5 text-sm text-black/65">
          20k+ Projects Tracked Effortlessly
        </div>

        <h1 className="mx-auto max-w-[850px] text-[52px] font-semibold leading-[1.08] tracking-[-0.055em] md:text-[76px]">
          Manage your Team, Tasks &
          <br />
          Projects in one place
        </h1>

        <p className="mx-auto mt-5 max-w-[390px] text-sm leading-tight text-black/60">
          Boost productivity, collaborate effortlessly, and stay on top of
          deadlines with Task Flow
        </p>

        <Link
          href="/signup"
          className="mx-auto mt-8 flex w-fit items-center gap-4 rounded-full bg-black px-6 py-3 text-sm font-medium text-white"
        >
          Try for Free
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-black">
            <ArrowRight size={16} />
          </span>
        </Link>

        <div className="relative mx-auto mt-12 h-[390px] max-w-[1130px]">
          <div className="absolute left-0 top-[78px] w-[355px] rounded-3xl bg-white/90 p-5 text-left shadow-[0_25px_70px_rgba(0,0,0,0.08)] backdrop-blur">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#dce6ff]">
                <UserRound className="text-black" size={28} />
              </div>
              <div>
                <h3 className="text-2xl font-semibold tracking-[-0.04em]">
                  Design Branding
                </h3>
                <p className="mt-1 text-lg text-black/60">
                  Teacher : Jack alven
                </p>
              </div>
            </div>

            <div className="mt-7 flex items-center justify-between text-base">
              <span className="text-black/70">Progress</span>
              <span className="text-black/70">35%</span>
            </div>

            <div className="mt-3 h-2.5 rounded-full bg-black/10">
              <div className="h-full w-[35%] rounded-full bg-[#cbd9fb]" />
            </div>
          </div>

          <div className="absolute left-[25px] top-[275px] flex w-[335px] items-center gap-4 rounded-2xl bg-white/90 p-4 text-left shadow-[0_25px_70px_rgba(0,0,0,0.08)]">
            <img
              src="https://i.pravatar.cc/80?img=12"
              alt="Bradley Lawlor"
              className="h-14 w-14 rounded-xl object-cover"
            />
            <div className="flex-1">
              <h4 className="text-lg font-semibold">Bradley Lawlor</h4>
              <p className="mt-1 text-sm text-black/35">Mostow Co.</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-black/20">Just Now</p>
              <span className="mt-1 inline-flex h-7 w-10 items-center justify-center rounded-full bg-black text-sm text-white">
                9
              </span>
            </div>
          </div>

          <div className="absolute left-[295px] top-[8px] flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-[0_25px_70px_rgba(0,0,0,0.08)]">
            <Bell className="fill-[#f6a313] text-[#f6a313]" size={27} />
          </div>

          <div className="absolute left-1/2 top-[8px] w-[370px] -translate-x-1/2 rounded-3xl bg-white/95 p-5 text-left shadow-[0_25px_70px_rgba(0,0,0,0.08)]">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">Task Completed</h3>
              <button className="rounded-full bg-black/5 px-3 py-1 text-xs text-black/50">
                Yearly
              </button>
            </div>

            <div className="mt-3 flex items-center gap-2 text-sm">
              <span className="rounded-full bg-black px-3 py-1 text-white">
                12
              </span>
              <span className="text-black/25">Best result</span>
            </div>

            <div className="mt-6 flex h-[155px] items-end justify-between gap-5 px-2">
              {[
                ["Jan", "80px", false],
                ["Feb", "45px", false],
                ["Mar", "140px", true],
                ["Apr", "85px", false],
                ["May", "115px", false],
                ["Jun", "105px", false],
              ].map((item, index) => {
                const [month, height, active] = item as [string, string, boolean];
                return (
                <div key={month} className="flex flex-1 flex-col items-center">
                  <div
                    className={`relative w-full rounded-2xl ${
                      active ? "bg-[#3f3f3d]" : "bg-black/8"
                    }`}
                    style={{ height }}
                  >
                    {active && (
                      <span className="absolute -right-5 top-3 rounded-full bg-[#a54deb] px-2 py-1 text-xs text-white">
                        +8
                      </span>
                    )}
                  </div>
                  <span
                    className={`mt-3 text-sm ${
                      active ? "font-medium text-black" : "text-black/50"
                    }`}
                  >
                    {month}
                  </span>
                </div>
                );
              })}
            </div>
          </div>

          <div className="absolute right-0 top-[8px] flex w-[360px] items-center justify-between rounded-3xl bg-white/95 p-5 text-left shadow-[0_25px_70px_rgba(0,0,0,0.08)]">
            <div>
              <h3 className="text-3xl font-medium tracking-[-0.05em]">
                8h 12m
              </h3>
              <p className="text-sm text-black/50">Average time spent</p>
            </div>
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black text-white">
              <Clock size={25} />
            </div>
          </div>

          <div className="absolute right-0 top-[118px] w-[360px] rounded-3xl bg-white/95 p-6 text-left shadow-[0_25px_70px_rgba(0,0,0,0.08)]">
            <div className="mb-8 flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#6e695e] text-white">
                <Grid3X3 size={24} />
              </div>
              <button className="flex h-12 w-12 items-center justify-center rounded-2xl border border-black/10">
                <MoreVertical size={20} />
              </button>
            </div>

            <h3 className="text-2xl font-semibold tracking-[-0.04em]">
              Technical Meeting
            </h3>

            <p className="mt-4 max-w-[285px] text-sm leading-tight text-black/18">
              Falszh Design is dedicated to creating visually compelling,
              user-centered website that seamlessly blend creativity with
              functionality.
            </p>

            <div className="mt-6 flex gap-2 text-sm text-black/60">
              <span className="flex items-center gap-1 rounded-md border border-black/10 px-2 py-1">
                <Calendar size={14} />
                Aug 18, 2025
              </span>
              <span className="flex items-center gap-1 rounded-md border border-black/10 px-2 py-1">
                <Clock size={14} />
                05:50 pm
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <h2 className="text-2xl font-semibold tracking-[-0.04em]">
            Trusted by 10,000+ Companies
          </h2>

          <div className="mt-9 flex flex-wrap items-center justify-between gap-8 text-xl font-bold text-black/50">
            <span>GoLemon</span>
            <span>printivo</span>
            <span>Propel</span>
            <span>inawö</span>
            <span>TalentQL</span>
            <span>frigoglass</span>
          </div>
        </div>
      </div>
    </section>

<div id="features"><FeaturesSection/></div>
<CollaborationSection/>
<div id="tools"><ToolsSection/></div>
<div id="pricing"><PricingSection/></div>
<TrialSection/>
<Footer/>
    </>
    
  );
}