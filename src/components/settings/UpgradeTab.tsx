'use client';

import React, { useState } from 'react';
import { ArrowUpCircle, Check, Sparkles } from 'lucide-react';

export function UpgradeTab() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');

  const plans = [
    {
      name: 'Free Forever',
      priceMonthly: '$0',
      priceYearly: '$0',
      desc: 'Great for personal tracking & small startup teams.',
      buttonText: 'Current Plan',
      buttonStyle: 'border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-slate-200 disabled:opacity-75 cursor-default',
      features: [
        'Up to 5 team members',
        '1 child organization space',
        'Kanban & Table Views',
        'Basic Custom Fields',
        'Standard Email support',
      ],
      isPopular: false,
      disabled: true
    },
    {
      name: 'Business',
      priceMonthly: '$9',
      priceYearly: '$7',
      desc: 'Best for growing departments, PMs, and agencies.',
      buttonText: 'Upgrade Now',
      buttonStyle: 'bg-violet-600 hover:bg-violet-700 text-white shadow-md cursor-pointer',
      features: [
        'Unlimited team members',
        'Unlimited child organizations',
        'Custom Roles & Permissions',
        'Advanced Custom Fields & Automations',
        'AI Chatbot integration & suggestions',
        'Priority Slack & Email support',
      ],
      isPopular: true,
      disabled: false
    },
    {
      name: 'Enterprise',
      priceMonthly: 'Custom',
      priceYearly: 'Custom',
      desc: 'For large organizations needing security and scale.',
      buttonText: 'Contact Sales',
      buttonStyle: 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 shadow-md cursor-pointer',
      features: [
        'Multi-organization clusters',
        'SAML Single Sign-On (SSO)',
        'Custom data retention policies',
        'Dedicated success manager',
        '99.9% guaranteed uptime SLA',
        '24/7 Phone & Email support',
      ],
      isPopular: false,
      disabled: false
    }
  ];

  return (
    <div className="bg-white dark:bg-[#151518] rounded-xl shadow-sm border border-slate-200/80 dark:border-white/10 overflow-hidden">
      <div className="p-5 border-b border-slate-100 dark:border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ArrowUpCircle size={16} className="text-slate-500" />
            <span>Billing Plans & Upgrades</span>
          </h2>
          <p className="text-[12px] text-slate-450 dark:text-slate-400 mt-1">
            Choose the workspace plan that best fits your scale and collaboration requirements.
          </p>
        </div>

        {/* Monthly/Yearly toggle */}
        <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-black/20 p-1.5 rounded-lg border border-slate-200/40 dark:border-white/5 self-start md:self-auto">
          <button
            onClick={() => setBillingPeriod('monthly')}
            className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
              billingPeriod === 'monthly'
                ? 'bg-white dark:bg-[#1e1e24] text-slate-800 dark:text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-655'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingPeriod('yearly')}
            className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
              billingPeriod === 'yearly'
                ? 'bg-white dark:bg-[#1e1e24] text-slate-800 dark:text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-655'
            }`}
          >
            <span>Yearly</span>
            <span className="bg-violet-100 text-violet-650 dark:bg-violet-950/40 dark:text-violet-400 text-[8px] font-extrabold px-1 rounded">
              -20%
            </span>
          </button>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {plans.map((plan, idx) => {
            const price = billingPeriod === 'yearly' ? plan.priceYearly : plan.priceMonthly;
            const priceLabel = price === 'Custom' ? 'Custom' : `${price}/mo`;

            return (
              <div 
                key={idx}
                className={`rounded-xl border p-5.5 flex flex-col relative transition-all ${
                  plan.isPopular
                    ? 'border-violet-500 shadow-md ring-1 ring-violet-500/25 bg-violet-600/[0.01]'
                    : 'border-slate-200/60 dark:border-white/5 bg-transparent'
                }`}
              >
                {plan.isPopular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-violet-600 text-white font-extrabold text-[9px] uppercase px-3 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                    <Sparkles size={9} />
                    Popular
                  </span>
                )}

                <span className="text-[13px] font-black text-slate-900 dark:text-white uppercase tracking-wider">{plan.name}</span>
                
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-slate-900 dark:text-white">{price}</span>
                  {price !== 'Custom' && (
                    <span className="text-[11px] text-slate-400 font-semibold">/ user / month</span>
                  )}
                </div>

                <p className="text-[11px] text-slate-400 font-medium mt-2 leading-relaxed min-h-[32px]">{plan.desc}</p>

                <button
                  disabled={plan.disabled}
                  className={`w-full py-2.5 rounded-lg text-xs font-bold text-center mt-5 transition-all outline-none ${plan.buttonStyle}`}
                >
                  {plan.buttonText}
                </button>

                <div className="border-t border-slate-100 dark:border-white/5 my-5" />

                <div className="flex-1 space-y-3">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Includes:</span>
                  {plan.features.map((feat, fIdx) => (
                    <div key={fIdx} className="flex items-start gap-2.5">
                      <Check size={13} className="text-violet-500 mt-0.5 shrink-0" />
                      <span className="text-[11.5px] text-slate-700 dark:text-slate-300 leading-normal">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
