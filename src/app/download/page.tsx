import Link from "next/link";
import { ArrowRight, Download, Monitor, Command } from "lucide-react";

export default function DownloadPage() {
  const macUrl = process.env.NEXT_PUBLIC_MAC_DOWNLOAD_URL;
  const windowsUrl = process.env.NEXT_PUBLIC_WINDOWS_DOWNLOAD_URL;

  return (
    <>
      <header className="sticky top-5 z-50 mx-auto w-full max-w-[1180px] px-4 pointer-events-none">
        <div className="flex h-[72px] items-center justify-between rounded-[28px] border border-black/5 bg-white/90 px-6 shadow-[0_18px_50px_rgba(0,0,0,0.08)] backdrop-blur-xl pointer-events-auto">
          <Link href="/" className="flex items-center gap-2 text-xl font-semibold">
            <div className="grid grid-cols-3 gap-1">
              {Array.from({ length: 9 }).map((_, i) => (
                <span key={i} className="h-1.5 w-1.5 rounded-full bg-black" />
              ))}
            </div>
            BridgeWorkspace
          </Link>

          <nav className="hidden items-center gap-12 text-[15px] text-black/70 md:flex">
            <Link href="/#features">Features</Link>
            <Link href="/#pricing">Pricing</Link>
            <Link href="/about">About</Link>
            <Link href="/blog">Resources</Link>
            <Link href="/download">Download</Link>
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
        
        <div className="relative z-10 mx-auto max-w-[1180px] px-6 pb-20 pt-48 text-center">
          <div className="mx-auto max-w-[800px]">
            <h1 className="mb-6 text-5xl font-semibold tracking-tight md:text-6xl lg:text-7xl">
              Get the Desktop App
            </h1>
            <p className="mb-12 text-lg text-black/60 md:text-xl leading-relaxed max-w-[600px] mx-auto">
              Track your time, automatically capture progress, and stay focused with our lightweight native desktop app.
            </p>

            <div className="grid md:grid-cols-2 gap-8 max-w-[900px] mx-auto">
              
              {/* macOS Card */}
              <div className="bg-white/80 backdrop-blur-sm border border-black/5 rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-left flex flex-col h-full hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-shadow">
                <div className="bg-black/5 w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
                  <Command size={32} className="text-black" />
                </div>
                <h3 className="text-2xl font-semibold mb-2">macOS</h3>
                <p className="text-black/60 mb-8 flex-1">
                  Optimized for Apple Silicon and Intel Macs. Requires macOS 11.0 or later.
                </p>
                
                {macUrl ? (
                  <a 
                    href={macUrl}
                    className="flex items-center justify-center gap-2 bg-[#111] text-white py-4 px-6 rounded-full font-medium hover:bg-black transition-colors"
                  >
                    <Download size={18} />
                    Download for Mac
                  </a>
                ) : (
                  <button 
                    disabled
                    className="flex items-center justify-center gap-2 bg-black/5 text-black/40 py-4 px-6 rounded-full font-medium cursor-not-allowed"
                  >
                    Coming Soon
                  </button>
                )}
              </div>

              {/* Windows Card */}
              <div className="bg-white/80 backdrop-blur-sm border border-black/5 rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-left flex flex-col h-full hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-shadow">
                <div className="bg-blue-50 w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
                  <Monitor size={32} className="text-blue-600" />
                </div>
                <h3 className="text-2xl font-semibold mb-2">Windows</h3>
                <p className="text-black/60 mb-8 flex-1">
                  Native 64-bit performance for your Windows desktop. Requires Windows 10 or later.
                </p>

                {windowsUrl ? (
                  <a 
                    href={windowsUrl}
                    className="flex items-center justify-center gap-2 bg-[#111] text-white py-4 px-6 rounded-full font-medium hover:bg-black transition-colors"
                  >
                    <Download size={18} />
                    Download for Windows
                  </a>
                ) : (
                  <button 
                    disabled
                    className="flex items-center justify-center gap-2 bg-black/5 text-black/40 py-4 px-6 rounded-full font-medium cursor-not-allowed"
                  >
                    Coming Soon
                  </button>
                )}
              </div>

            </div>
          </div>
        </div>
      </section>
    </>
  );
}
