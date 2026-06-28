import Link from "next/link";
import Footer from "@/components/dashboard/Footer";
import { ArrowLeft } from "lucide-react";

export default function Page() {
  return (
    <>
      <section className="relative min-h-[70vh] overflow-hidden bg-[#fbfaf7] text-[#151515] flex flex-col pt-32">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.06)_1px,transparent_1px)] bg-[size:260px_100%]" />
        <div className="absolute left-1/2 top-[100px] h-[430px] w-[760px] -translate-x-1/2 rounded-full bg-[#f6c56f]/35 blur-[90px]" />
        
        <header className="relative z-30 mx-auto w-full max-w-[1180px] px-6 mb-12">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-black/60 hover:text-black">
            <ArrowLeft size={16} /> Back to Home
          </Link>
        </header>

        <div className="relative z-10 mx-auto w-full max-w-[1180px] px-6 flex-1">
          <h1 className="text-[52px] font-semibold leading-[1.08] tracking-[-0.055em] md:text-[64px] mb-8">
            Security & Compliance
          </h1>
          <div className="max-w-3xl space-y-6 text-lg text-black/70">
            <p>
              This is the Security & Compliance page. Content is currently being updated and will be available soon.
            </p>
            <p>
              Collabix is dedicated to providing the best tools and resources to help you manage your team, tasks, and projects in one place.
            </p>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
