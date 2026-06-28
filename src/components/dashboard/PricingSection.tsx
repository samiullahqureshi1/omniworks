import Link from "next/link";
import { Check, Star } from "lucide-react";

const plans = [
  {
    name: "Starter",
    price: "$29",
    desc: "For small teams just getting started.",
    features: [
      "Up to 25 employees",
      "Basic license tracking",
      "Core integrations",
      "Email support",
      "Basic license tracking",
    ],
    button: "Start Free Trial",
  },
  {
    name: "Growth",
    price: "$99",
    desc: "For scaling companies that need power.",
    popular: true,
    features: [
      "Unlimited employees",
      "Advanced reporting & analytics",
      "Workflow automation",
      "Priority support",
      "Team-based access controls & permissions",
    ],
    button: "Start Free Trial",
  },
  {
    name: "Enterprise",
    price: "$180",
    desc: "Custom solutions for larger organizations.",
    features: [
      "Advanced security & compliance",
      "Dedicated account manager",
      "Custom integrations",
      "SLA + 24/7 support",
      "Single Sign-On (SSO) & advanced identity",
    ],
    button: "Contact Sales",
  },
];

export default function PricingSection() {
  return (
    <section id="pricing" className="bg-[#fbfaf7] dark:bg-[#181818] px-6 py-24 text-[#111]">
      <div className="mx-auto max-w-[1180px]">
        <div className="text-center">
          <h2 className="text-[48px] font-medium leading-tight tracking-[-0.055em] md:text-[76px]">
            Simple, Transparent Pricing
          </h2>

          <p className="mt-5 text-[19px] text-black/65">
            Discover, manage, and optimize all your SaaS tools from one powerful
            platform.
          </p>
        </div>

        <div className="mt-20 grid gap-7 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`flex min-h-[560px] flex-col rounded-[28px] border p-8 shadow-[0_25px_80px_rgba(0,0,0,0.04)] ${
                plan.popular
                  ? "border-[#f0bd5e] bg-[radial-gradient(circle_at_70%_5%,rgba(246,197,111,0.48),transparent_40%),#fffaf0]"
                  : "border-black/5 bg-white"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  {plan.popular && (
                    <p className="mb-10 text-3xl font-semibold tracking-[-0.05em]">
                      {plan.price}
                    </p>
                  )}

                  <h3 className="flex items-center gap-3 text-[32px] font-medium tracking-[-0.055em]">
                    {plan.name}
                    {plan.popular && (
                      <Star className="fill-black text-black" size={30} />
                    )}
                  </h3>

                  <p className="mt-3 text-[17px] text-black/65">
                    {plan.desc}
                  </p>
                </div>

                {!plan.popular && (
                  <div className="rounded-2xl bg-black/5 px-5 py-4 text-[28px] font-semibold tracking-[-0.05em]">
                    {plan.price}
                  </div>
                )}
              </div>

              <div className="mt-10 h-px bg-black/8" />

              <ul className="mt-9 space-y-6">
               {plan.features.map((feature, index) => (
  <li
    key={`${plan.name}-${feature}-${index}`}
                    className="flex items-center gap-4 text-[17px] font-medium"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#ffad0d] text-white">
                      <Check size={15} strokeWidth={3} />
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>

              <div className="mt-auto pt-10">
                <Link
                  href="/signup"
                  className={`flex h-14 w-full items-center justify-center rounded-full border text-[18px] font-medium ${
                    plan.popular
                      ? "border-[#ffad0d] bg-[#ffad0d] text-white shadow-[0_12px_35px_rgba(255,173,13,0.35)]"
                      : "border-[#e3bd58] bg-white text-black"
                  }`}
                >
                  {plan.button}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}