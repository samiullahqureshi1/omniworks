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
<header className="sticky top-4 z-50 mx-auto w-full max-w-[1180px] px-4 pointer-events-none">

  <div className="
    flex
    h-[52px]
    items-center
    justify-between
    rounded-[16px]
    border
    border-black/10
    bg-white/90
    px-5
    shadow-[0_10px_30px_rgba(0,0,0,0.08)]
    backdrop-blur-xl
    pointer-events-auto
  ">


    {/* Logo */}
    <div className="flex items-center gap-2 text-[17px] font-semibold tracking-tight">

      {/* Omniwork SVG Logo */}
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="rounded-[6px]"
      >
        <rect
          width="24"
          height="24"
          rx="6"
          fill="black"
        />

        <path
          d="M7 12C7 9.23858 9.23858 7 12 7C14.7614 7 17 9.23858 17 12C17 14.7614 14.7614 17 12 17"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
        />

        <circle
          cx="12"
          cy="12"
          r="2"
          fill="white"
        />

      </svg>


      Omniwork

    </div>



    {/* Navigation */}
    <nav className="
      hidden
      items-center
      gap-9
      text-[13px]
      text-black/60
      md:flex
    ">

      <Link href="#product" className="hover:text-black">
        Product
      </Link>

      <Link href="#changelog" className="hover:text-black">
        Changelog
      </Link>

      <Link href="#customers" className="hover:text-black">
        Customers
      </Link>

      <Link href="#pricing" className="flex items-center gap-1 hover:text-black">
        Pricing
        <span className="text-[10px]">⌄</span>
      </Link>

    </nav>



    {/* Actions */}
    <div className="
      hidden
      items-center
      gap-5
      text-[13px]
      md:flex
    ">

      <Link
        href="/login"
        className="text-black/60 hover:text-black"
      >
        Log in
      </Link>


      <Link
        href="/signup"
        className="
          rounded-[10px]
          bg-[#111]
          px-4
          py-[8px]
          font-medium
          text-white
        "
      >
        Book a demo
      </Link>

    </div>


  </div>

</header>
  <section className="relative min-h-screen overflow-hidden bg-[#fbfaf8] text-[#151515] -mt-[92px]">

  {/* Background blur shapes */}
  <div className="absolute left-1/2 top-[420px] h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-[#e9e7ff] blur-[120px]" />
  <div className="absolute left-[15%] top-[600px] h-[250px] w-[250px] rounded-full bg-[#f3f3f3] blur-[80px]" />
  <div className="absolute right-[15%] top-[600px] h-[250px] w-[250px] rounded-full bg-[#f3f3f3] blur-[80px]" />


  <div className="relative z-10 mx-auto max-w-[1180px] px-6 pb-20 pt-36 text-center">


    {/* Small badge */}
    <div className="mx-auto mb-6 w-fit rounded-full border border-black/10 bg-white px-5 py-2 text-sm text-black/60">
      The smarter way to manage your workflow
    </div>


    {/* Heading */}
 <h1 className="
  mx-auto
  max-w-[1200px]
  text-[52px]
  font-semibold
  leading-[1.05]
  tracking-[-0.06em]
  md:text-[82px]
">
  Boost Your Team's Performance
  <br />
  with Omniwork
</h1>


    {/* Description */}
    <p className="mx-auto mt-6 max-w-[620px] text-lg leading-relaxed text-black/55">
      Connect your team, automate workflows, and manage projects
      effortlessly with powerful real-time collaboration tools.
    </p>


    {/* Buttons */}
    <div className="mt-8 flex justify-center gap-4">

      <button className="
      rounded-xl
      border border-black/10
      bg-white
      px-7 py-3
      text-sm
      font-medium
      shadow-sm
      ">
        Watch demo
      </button>


      <button className="
      rounded-xl
      bg-[#111]
      px-7 py-3
      text-sm
      font-medium
      text-white
      shadow-[0_10px_30px_rgba(0,0,0,.15)]
      ">
        Book a demo
      </button>

    </div>



    {/* Dashboard Image */}
    <div className="relative mx-auto mt-16 max-w-[1050px]">


      {/* image glow */}
      <div className="
      absolute inset-0
      rounded-[40px]
      bg-white
      blur-3xl
      opacity-80
      "></div>


      <img
        src="https://cdn.shopify.com/s/files/1/0732/4496/7128/files/Screenshot_1448-02-01_at_10.46.59_PM.png?v=1784138544"
        alt="Omniwork Dashboard"
        className="
        relative
        z-10
        w-full
        rounded-[28px]
        border
        border-black/5
        shadow-[0_40px_100px_rgba(0,0,0,.12)]
        "
      />

    </div>



    {/* Trusted companies */}
  <div className="mt-24 text-center">

          <div className="flex justify-center -space-x-3 mb-4">
            {[1,2,3,4,5].map((item)=>(
              <img
                key={item}
                src={`https://i.pravatar.cc/40?img=${item+10}`}
                className="
                h-8
                w-8
                rounded-full
                border-2
                border-white
                "
              />
            ))}

            <span className="ml-3 text-sm text-black/70">
              Join the 10,000+ users trusting Omniwork
            </span>

          </div>


          <div className="
          flex
          flex-wrap
          justify-center
          gap-12
          text-xl
          font-semibold
          text-black/30
          ">

            <span>Basel</span>
            <span>Sitemark</span>
            <span>Glossy</span>
            <span>Ljubljana</span>
            <span>London</span>

          </div>

        </div>

  </div>

</section>

<div id="features"><FeaturesSection/></div>
<CollaborationSection/>
<div id="pricing"><PricingSection/></div>
{/* <div id="tools"><ToolsSection/></div> */}

{/* <TrialSection/> */}
<Footer/>
    </>
    
  );
}