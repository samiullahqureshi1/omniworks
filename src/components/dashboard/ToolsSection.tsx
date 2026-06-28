import {
  SiFigma,
  SiGooglemeet,
  SiGithub,
  SiSlack,
  SiWhatsapp,
  SiGoogledrive,
  SiGoogle,
} from "react-icons/si";
import { FaLinkedinIn } from "react-icons/fa6";

const tools = [
  { name: "Figma", icon: SiFigma, color: "text-[#f24e1e]" },
  { name: "Google Meet", icon: SiGooglemeet, color: "text-[#00897b]" },
  { name: "GitHub", icon: SiGithub, color: "text-black" },
  { name: "Slack", icon: SiSlack, color: "text-[#4a154b]" },
  { name: "LinkedIn", icon: FaLinkedinIn, color: "text-[#0a66c2]" },
  { name: "WhatsApp", icon: SiWhatsapp, color: "text-[#25d366]" },
  { name: "Microsoft", custom: "microsoft" },
  { name: "Google Drive", icon: SiGoogledrive, color: "text-[#0f9d58]" },
  { name: "Google", icon: SiGoogle, color: "text-[#4285f4]" },
];

export default function ToolsSection() {
  return (
    <section className="bg-white px-6 py-24 text-[#111]">
      <div className="mx-auto max-w-[1180px] text-center">
        <h2 className="mx-auto max-w-[820px] text-[48px] font-medium leading-[1.08] tracking-[-0.055em] md:text-[76px]">
          Connect taskflow with
          <br />
          your daily tools
        </h2>

        <p className="mx-auto mt-7 max-w-[640px] text-[20px] leading-tight text-black/55">
          Easily connect with email, calendars, chat apps, and more—keeping your
          workflow smooth and efficient.
        </p>

        <div className="mx-auto mt-24 max-w-[900px] rounded-[28px] border border-[#f0bd5e]/60 bg-[#fffdf8] px-8 py-9 shadow-[0_30px_90px_rgba(0,0,0,0.04)]">
         <div className="space-y-8">
  <div className="flex justify-center gap-8">
    {tools.slice(0, 5).map((tool) => {
      const Icon = tool.icon;

      return (
        <div
          key={tool.name}
          className="flex h-[135px] w-[150px] items-center justify-center rounded-[26px] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.04)]"
        >
          {tool.custom === "microsoft" ? (
            <div className="grid grid-cols-2 gap-1">
              <span className="h-4 w-4 bg-[#f25022]" />
              <span className="h-4 w-4 bg-[#7fba00]" />
              <span className="h-4 w-4 bg-[#00a4ef]" />
              <span className="h-4 w-4 bg-[#ffb900]" />
            </div>
          ) : Icon ? (
            <Icon className={`text-[38px] ${tool.color}`} />
          ) : null}
        </div>
      );
    })}
  </div>

  <div className="flex justify-center gap-8">
    {tools.slice(5).map((tool) => {
      const Icon = tool.icon;

      return (
        <div
          key={tool.name}
          className="flex h-[135px] w-[150px] items-center justify-center rounded-[26px] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.04)]"
        >
          {tool.custom === "microsoft" ? (
            <div className="grid grid-cols-2 gap-1">
              <span className="h-4 w-4 bg-[#f25022]" />
              <span className="h-4 w-4 bg-[#7fba00]" />
              <span className="h-4 w-4 bg-[#00a4ef]" />
              <span className="h-4 w-4 bg-[#ffb900]" />
            </div>
          ) : Icon ? (
            <Icon className={`text-[38px] ${tool.color}`} />
          ) : null}
        </div>
      );
    })}
  </div>
</div>
        </div>
      </div>
    </section>
  );
}