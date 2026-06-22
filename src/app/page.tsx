'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ChevronRight,
  CheckCircle2,
  BarChart3,
  Users,
  Timer,
  LayoutDashboard,
  CheckCircle,
  Menu,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const staggerContainer = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20">
      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/60 backdrop-blur-xl transition-all">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
                <Timer size={20} />
              </div>
              <span className="text-xl font-bold tracking-tight">Omnitrack</span>
            </div>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-8">
              <Link href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Features</Link>
              <Link href="#workflows" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Workflows</Link>
              <Link href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>
              <Link href="#faq" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">FAQ</Link>
            </nav>

            <div className="hidden md:flex items-center gap-4">
              <Link href="/login" className="text-sm font-medium hover:text-primary transition-colors">Log in</Link>
              <Link href="/signup">
                <Button>Get Started</Button>
              </Link>
            </div>

            {/* Mobile Nav Toggle */}
            <button className="md:hidden p-2 text-foreground" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-background/95 backdrop-blur pt-20 px-6">
          <nav className="flex flex-col gap-6 text-lg font-medium">
            <Link href="#features" onClick={() => setMobileMenuOpen(false)}>Features</Link>
            <Link href="#workflows" onClick={() => setMobileMenuOpen(false)}>Workflows</Link>
            <Link href="#pricing" onClick={() => setMobileMenuOpen(false)}>Pricing</Link>
            <Link href="/login" onClick={() => setMobileMenuOpen(false)}>Log in</Link>
            <Link href="/signup" onClick={() => setMobileMenuOpen(false)}>
              <Button className="w-full mt-4">Get Started</Button>
            </Link>
          </nav>
        </div>
      )}

      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-24 pb-32 lg:pt-36 lg:pb-40">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
          <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-primary/20 opacity-50 blur-[100px]"></div>

          <div className="container relative mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.div initial="hidden" animate="show" variants={staggerContainer} className="max-w-3xl mx-auto space-y-8">
              <motion.div variants={fadeInUp} className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-sm text-primary">
                <span className="flex h-2 w-2 rounded-full bg-primary mr-2 animate-pulse"></span>
                Omnitrack 2.0 is now live
              </motion.div>
              <motion.div variants={fadeInUp}>
                <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-foreground leading-[1.1]">
                  Manage projects & time <br className="hidden md:block"/>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">effortlessly.</span>
                </h1>
              </motion.div>

              <motion.p variants={fadeInUp} className="text-lg md:text-xl text-muted-foreground leading-relaxed">
                The all-in-one workspace for modern teams. Consolidate your projects, tasks, time tracking, and client reporting into one beautiful, blazingly fast platform.
              </motion.p>

              <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                <Link href="/signup">
                  <Button size="lg" className="h-12 px-8 text-base shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5 transition-all">
                    Start your free trial
                  </Button>
                </Link>
                <Link href="#product">
                  <Button size="lg" variant="outline" className="h-12 px-8 text-base">
                    See how it works
                  </Button>
                </Link>
              </motion.div>
            </motion.div>

            {/* Dashboard Mockup Preview */}
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.4 }}
              className="mt-16 md:mt-24 relative mx-auto max-w-5xl"
            >
              <div className="rounded-xl border border-border/50 bg-background shadow-2xl p-2 bg-gradient-to-b from-white/10 to-white/5 backdrop-blur-sm">
                <div className="rounded-lg overflow-hidden border border-border bg-slate-950 aspect-[16/9] relative flex items-center justify-center">
                  {/* Abstract UI representation since we don't have an image */}
                  <div className="absolute inset-0 bg-slate-900 flex">
                    {/* Sidebar */}
                    <div className="w-48 border-r border-slate-800 p-4 space-y-4">
                      <div className="h-6 w-24 bg-slate-800 rounded"></div>
                      <div className="space-y-2 mt-8">
                        {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-8 w-full bg-slate-800/50 rounded"></div>)}
                      </div>
                    </div>
                    {/* Main area */}
                    <div className="flex-1 p-8 flex flex-col gap-6">
                      <div className="h-10 w-48 bg-slate-800 rounded"></div>
                      <div className="grid grid-cols-3 gap-4">
                        {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-slate-800/40 rounded-lg border border-slate-700"></div>)}
                      </div>
                      <div className="flex-1 bg-slate-800/20 rounded-lg border border-slate-700 p-6">
                        <div className="h-6 w-32 bg-slate-700 rounded mb-6"></div>
                        <div className="space-y-3">
                          {[1, 2, 3, 4].map((i) => <div key={i} className="h-12 bg-slate-800/60 rounded"></div>)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Trusted By Section */}
        <section className="py-12 border-y border-border/40 bg-muted/30">
          <div className="container mx-auto px-4 text-center">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-8">Trusted by forward-thinking teams worldwide</p>
            <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-50 grayscale">
              {/* Placeholder Logos */}
              <div className="text-xl font-bold font-serif">Acme Corp</div>
              <div className="text-xl font-bold font-mono">Quantum</div>
              <div className="text-xl font-bold">Globex</div>
              <div className="text-xl font-bold italic">Soylent</div>
              <div className="text-xl font-bold tracking-widest">INITRO</div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24 bg-background">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">Everything you need to run your agency</h2>
              <p className="text-lg text-muted-foreground">Replace your messy stack of tools with one unified, deeply integrated platform designed for speed and clarity.</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                { icon: LayoutDashboard, title: "Project Management", desc: "Organize tasks, milestones, and deliverables with customizable kanban boards and lists." },
                { icon: Timer, title: "Time Tracking", desc: "Frictionless 1-click timers integrated directly into your tasks. Never lose a billable minute." },
                { icon: Users, title: "Team Collaboration", desc: "Bring clients and team members together with role-based access controls." },
                { icon: BarChart3, title: "Advanced Reporting", desc: "Generate stunning, exportable reports that give you crystal clear insights into profitability." },
                { icon: CheckCircle, title: "Timesheets", desc: "Weekly grids and approval workflows to keep payroll and invoicing perfectly synchronized." },
                { icon: Users, title: "Multi-Organization", desc: "Manage multiple companies or distinct workspaces under a single unified login." },
              ].map((feature, i) => (
                <div key={i} className="p-8 rounded-2xl border border-border bg-card hover:shadow-lg transition-shadow">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-6">
                    <feature.icon size={24} />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Workflows Section */}
        <section id="workflows" className="py-24 bg-slate-950 text-slate-50 relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-primary/20 blur-[120px]"></div>
          
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="mb-16 md:w-2/3">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 text-white">Built for every role</h2>
              <p className="text-lg text-slate-400">Omnitrack adapts to who you are. The interface transforms to provide exactly what you need to see, without the clutter.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="space-y-8">
                <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors">
                  <h4 className="text-xl font-bold text-white mb-2">For Owners</h4>
                  <p className="text-slate-400">Get a bird's-eye view of your entire organization. Monitor project health, team utilization, and financial metrics at a glance.</p>
                </div>
                <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors">
                  <h4 className="text-xl font-bold text-white mb-2">For Project Managers</h4>
                  <p className="text-slate-400">Allocate resources, monitor deadlines, and keep track of task progression for the specific projects you manage.</p>
                </div>
                <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors">
                  <h4 className="text-xl font-bold text-white mb-2">For Members</h4>
                  <p className="text-slate-400">A distraction-free zone. See your assigned tasks, log your hours, and focus on doing great work.</p>
                </div>
              </div>
              <div className="relative">
                <div className="aspect-square rounded-full border border-slate-800 bg-slate-900/50 flex items-center justify-center p-8 relative">
                   <div className="absolute inset-10 rounded-full border border-slate-800 animate-[spin_60s_linear_infinite]"></div>
                   <div className="absolute inset-20 rounded-full border border-slate-800 animate-[spin_40s_linear_infinite_reverse]"></div>
                   <div className="z-10 text-center">
                     <Timer size={64} className="text-primary mx-auto mb-4" />
                     <h3 className="text-2xl font-bold text-white">Perfectly synced</h3>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-24 bg-background">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">Simple, transparent pricing</h2>
              <p className="text-lg text-muted-foreground">Start for free, upgrade when you need more power.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {[
                { name: "Starter", price: "$0", desc: "Perfect for freelancers and small teams just getting started.", features: ["Up to 3 users", "Unlimited projects", "Basic time tracking", "Community support"] },
                { name: "Pro", price: "$12", popular: true, desc: "Everything you need for a growing agency or consultancy.", features: ["Unlimited users", "Advanced reporting", "Timesheet approvals", "Client dashboards", "Priority support"] },
                { name: "Enterprise", price: "Custom", desc: "For large organizations requiring advanced security and control.", features: ["SAML SSO", "Custom domain", "Dedicated account manager", "On-premise deployment options"] },
              ].map((plan, i) => (
                <div key={i} className={`relative p-8 rounded-2xl border ${plan.popular ? 'border-primary shadow-xl scale-105 bg-card z-10' : 'border-border bg-card'}`}>
                  {plan.popular && <div className="absolute top-0 right-8 -translate-y-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Most Popular</div>}
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mb-4">
                    <span className="text-4xl font-extrabold">{plan.price}</span>
                    {plan.price !== "Custom" && <span className="text-muted-foreground">/user/mo</span>}
                  </div>
                  <p className="text-muted-foreground text-sm mb-8 h-10">{plan.desc}</p>
                  <Link href="/signup">
                    <Button className="w-full mb-8" variant={plan.popular ? 'default' : 'outline'}>
                      {plan.price === "Custom" ? "Contact Sales" : "Start Free Trial"}
                    </Button>
                  </Link>
                  <ul className="space-y-4">
                    {plan.features.map((f, j) => (
                      <li key={j} className="flex items-start gap-3 text-sm">
                        <CheckCircle2 size={18} className="text-primary shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Timer size={24} className="text-primary" />
            <span className="text-xl font-bold tracking-tight">Omnitrack</span>
          </div>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <Link href="#" className="hover:text-foreground">Privacy Policy</Link>
            <Link href="#" className="hover:text-foreground">Terms of Service</Link>
            <Link href="#" className="hover:text-foreground">Contact</Link>
          </div>
          <p className="text-sm text-muted-foreground">© 2026 Omnitrack Inc. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
