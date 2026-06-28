import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function CollaborationSection() {
  return (
    <section id="about" className="bg-[#fbfaf7] dark:bg-[#181818] px-6 py-24 text-[#111]">
      <div className="mx-auto grid max-w-[1180px] gap-20 lg:grid-cols-2">
        <div className="flex flex-col justify-center">
          <span className="w-fit rounded-full border border-black/20 bg-white px-4 py-1.5 text-sm">
            Our Feature
          </span>

          <h2 className="mt-5 max-w-[520px] text-[44px] font-medium leading-[1.08] tracking-[-0.055em] md:text-[58px]">
            Collaboration that
            <br />
            moves at your speed
          </h2>

          <p className="mt-6 max-w-[410px] text-sm leading-tight text-black/70">
            With instant syncing across devices, Taskflow ensures that every
            message, task update, or file shared is reflected in real time.
          </p>

          <Link
            href="/signup"
            className="mt-10 flex w-fit items-center gap-4 rounded-full bg-black px-5 py-3 text-sm font-medium text-white"
          >
            Learn More
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-black">
              <ArrowRight size={15} />
            </span>
          </Link>
        </div>

        <div className="rounded-[32px] bg-white p-8 shadow-[0_25px_80px_rgba(0,0,0,0.05)]">
          <div className="relative flex h-[390px] items-center justify-center">
            <div className="absolute h-[310px] w-[310px] rounded-full border border-black/10" />
            <div className="absolute h-[220px] w-[220px] rounded-full border border-black/5" />
            <div className="absolute h-[130px] w-[130px] rounded-full border border-black/5" />

            <div className="z-10 grid h-16 w-16 place-items-center rounded-2xl border border-black/10 bg-white shadow-sm">
              <div className="grid grid-cols-3 gap-1">
                {Array.from({ length: 9 }).map((_, i) => (
                  <span key={i} className="h-1.5 w-1.5 rounded-full bg-black" />
                ))}
              </div>
            </div>

            {[
              "top-[35px] left-[110px]",
              "top-[45px] right-[95px]",
              "top-[105px] left-[45px]",
              "top-[105px] right-[40px]",
              "bottom-[50px] left-[105px]",
              "bottom-[35px] right-[80px]",
            ].map((pos, i) => (
              <div
                key={i}
                className={`absolute ${pos} h-10 w-10 overflow-hidden rounded-full border-4 border-white bg-black/10 shadow-md`}
              >
                <img
                  src={`https://i.pravatar.cc/80?img=${i + 20}`}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
            ))}

            <div className="absolute left-[55px] top-[190px] text-2xl">📹</div>
            <div className="absolute right-[55px] top-[190px] text-2xl">💬</div>
          </div>
        </div>

        <div className="relative h-[455px] overflow-hidden rounded-[32px] bg-white p-8 shadow-[0_25px_80px_rgba(0,0,0,0.05)]">
          <div className="absolute -left-10 top-10 w-[330px] rounded-3xl bg-white p-5 shadow-[0_25px_70px_rgba(0,0,0,0.08)]">
            <h3 className="text-2xl font-semibold tracking-[-0.04em]">
              Design Branding
            </h3>
            <p className="mt-1 text-lg text-black/60">Teacher : Jack alven</p>

            <div className="mt-7 flex justify-between text-sm text-black/70">
              <span>Progress</span>
              <span>35%</span>
            </div>

            <div className="mt-3 h-2.5 rounded-full bg-black/10">
              <div className="h-full w-[35%] rounded-full bg-[#cbd9fb]" />
            </div>
          </div>

          <div className="absolute right-16 top-24 rounded-3xl bg-white px-7 py-5 shadow-[0_25px_70px_rgba(0,0,0,0.08)]">
            <h3 className="text-2xl font-medium tracking-[-0.05em]">8h 12m</h3>
            <p className="text-sm text-black/50">Average time spent</p>
          </div>

          <div className="absolute bottom-0 left-16 w-[370px] rounded-t-[28px] bg-white p-6 shadow-[0_25px_70px_rgba(0,0,0,0.08)]">
            <h3 className="text-xl font-semibold">Task Completed</h3>

            <div className="mt-3 flex items-center gap-2 text-sm">
              <span className="rounded-full bg-black px-3 py-1 text-white">12</span>
              <span className="text-black/25">Best result</span>
            </div>

            <div className="mt-7 flex h-[170px] items-end justify-between gap-5">
              {["80px", "45px", "140px", "85px", "115px"].map((h, i) => (
                <div
                  key={i}
                  className={`w-full rounded-2xl ${
                    i === 2 ? "bg-[#3f3f3d]" : "bg-black/8"
                  }`}
                  style={{ height: h }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-center">
          <span className="w-fit rounded-full border border-black/20 bg-white px-4 py-1.5 text-sm">
            Our Feature
          </span>

          <h2 className="mt-5 max-w-[520px] text-[44px] font-medium leading-[1.08] tracking-[-0.055em] md:text-[58px]">
            Track every task in
            <br />
            real time
          </h2>

          <p className="mt-6 max-w-[440px] text-sm leading-tight text-black/70">
            Monitor every task as it moves from start to finish. Stay updated
            with live progress, deadlines, and team accountability—all in one
            place.
          </p>

          <Link
            href="/signup"
            className="mt-10 flex w-fit items-center gap-4 rounded-full bg-black px-5 py-3 text-sm font-medium text-white"
          >
            Learn More
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-black">
              <ArrowRight size={15} />
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}