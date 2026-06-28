import Link from "next/link";
import { FaFacebookF, FaInstagram, FaXTwitter, FaGoogle } from "react-icons/fa6";

const productLinks = [
  { name: "Overview", href: "/" },
  { name: "Features", href: "/#features" },
  { name: "Integrations", href: "/#tools" },
  { name: "Pricing", href: "/#pricing" },
  { name: "Compare Plans", href: "/compare-plans" },
];

const resourceLinks = [
  { name: "Blog", href: "/blog" },
  { name: "Case Studies", href: "/case-studies" },
  { name: "Help Center", href: "/help-center" },
  { name: "Guides & E-books", href: "/guides" },
  { name: "API Documentation", href: "/api-docs" },
];

const companyLinks = [
  { name: "About Us", href: "/about" },
  { name: "Careers", href: "/careers" },
  { name: "Press & Media Kit", href: "/press" },
  { name: "Partners", href: "/partners" },
  { name: "Security & Compliance", href: "/security" },
];

export default function Footer() {
  return (
    <footer className="bg-[#fbfaf7] dark:bg-[#181818] px-6 pb-8 pt-28 text-[#111]">
      <div className="mx-auto max-w-[1180px]">
        <div className="grid gap-16 lg:grid-cols-[1.4fr_2fr]">
          <div>
            <Link href="/" className="flex items-center gap-3 text-3xl font-semibold">
              <div className="grid grid-cols-3 gap-1">
                {Array.from({ length: 9 }).map((_, i) => (
                  <span key={i} className="h-2 w-2 rounded-full bg-black" />
                ))}
              </div>
              Collabix
            </Link>

            <p className="mt-7 max-w-[430px] text-[22px] leading-tight text-black/75">
              The all-in-one platform to manage, optimize, and secure your SaaS
              stack.
            </p>
          </div>

          <div className="grid gap-10 sm:grid-cols-3">
            {[
              ["Product", productLinks],
              ["Resources", resourceLinks],
              ["Company", companyLinks],
            ].map(([title, links]) => (
              <div key={title as string}>
                <h3 className="text-3xl font-medium tracking-[-0.05em]">
                  {title as string}
                </h3>

                <ul className="mt-8 space-y-6">
                  {(links as { name: string; href: string }[]).map((link) => (
                    <li key={link.name}>
                      <Link href={link.href} className="text-[20px] text-black/65">
                        {link.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-28 flex flex-col gap-6 rounded-full bg-white px-8 py-7 shadow-[0_20px_70px_rgba(0,0,0,0.04)] lg:flex-row lg:items-center lg:justify-between">
          <p className="text-[20px] text-black/70">
            © 2025 Collabix. All rights reserved.
          </p>

          <Link href="/privacy-policy" className="text-[20px] text-black/70">
            Privacy Policy
          </Link>

          <div className="flex items-center gap-9 text-black">
            <FaFacebookF size={22} fill="black" />
            <FaXTwitter className="text-[22px]" />
            <FaGoogle className="text-[24px]" />
            <FaInstagram size={23} />
          </div>

          <Link href="/terms-and-conditions" className="text-[20px] text-black/70">
            Terms & Condition
          </Link>

          <p className="text-[20px] text-black/70">All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}