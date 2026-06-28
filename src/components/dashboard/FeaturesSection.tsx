import {
  BellRing,
  ChartNoAxesColumnIncreasing,
  Clock3,
  ListTodo,
  Plug,
  Users,
} from "lucide-react";

const features = [
  {
    icon: ListTodo,
    title: "Task Management",
    text: "Create, assign, and prioritize tasks in seconds. Keep your projects organized from start to finish.",
  },
  {
    icon: Users,
    title: "Team Collaboration",
    text: "Chat, share files, and brainstorm with your team. Work together in real time, no matter where you are.",
  },
  {
    icon: Clock3,
    title: "Project Timeline",
    text: "Track every milestone with Gantt & Kanban views. Stay on schedule and deliver projects on time.",
  },
  {
    icon: Plug,
    title: "Integrations",
    text: "Seamlessly connect with your favorite tools. From Slack to Google Calendar, we’ve got you covered.",
  },
  {
    icon: ChartNoAxesColumnIncreasing,
    title: "Reports & Analytics",
    text: "Gain valuable insights into your team’s performance. Make data-driven decisions with ease.",
    active: true,
  },
  {
    icon: BellRing,
    title: "Notifications & Reminders",
    text: "Never miss an update or deadline again. Stay focused with smart reminders and alerts.",
  },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="bg-white px-6 py-24 text-[#111]">
      <div className="mx-auto max-w-[1180px]">
        <div className="text-center">
          <span className="inline-flex rounded-full border border-black/20 bg-white px-4 py-1.5 text-sm">
            Our Feature
          </span>

          <h2 className="mx-auto mt-5 max-w-[780px] text-[46px] font-medium leading-[1.08] tracking-[-0.055em] md:text-[64px]">
            Everything your team needs
            <br />
            in one place
          </h2>

          <p className="mt-7 text-base text-black/70">
            All-in-one solution for task, project, and team management.
          </p>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.title}
                className={`min-h-[220px] rounded-[24px] border p-6 transition ${
                  item.active
                    ? "border-[#f0bd5e] bg-[radial-gradient(circle_at_70%_20%,rgba(246,197,111,0.35),transparent_45%),#fffaf0]"
                    : "border-black/10 bg-[#fcfbf8]"
                }`}
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-[0_12px_30px_rgba(0,0,0,0.05)]">
                  <Icon size={20} strokeWidth={1.8} />
                </div>

                <h3 className="mt-16 text-[22px] font-medium tracking-[-0.04em]">
                  {item.title}
                </h3>

                <p className="mt-4 max-w-[310px] text-[16px] leading-[1.35] text-black/80">
                  {item.text}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}