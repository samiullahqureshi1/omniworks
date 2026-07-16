"use client";

import * as React from "react";
import { X, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ModalTab {
  id: string;
  label: string;
}

/**
 * Tabbed modal header matching the reference design: a row of text tabs with
 * an animated underline under the active one, plus a minimize (collapse) button
 * and a circular close button on the right.
 */
export function ModalTabsHeader({
  tabs,
  activeTab,
  onTabChange,
  onClose,
  onMinimize,
  rightSlot,
  className,
}: {
  tabs: ModalTab[];
  activeTab: string;
  onTabChange: (id: string) => void;
  onClose: () => void;
  onMinimize?: () => void;
  rightSlot?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-[60px] items-center justify-between gap-4 px-5 sm:px-6 border-b border-slate-100 dark:border-white/5 bg-background sticky top-0 z-20 shrink-0",
        className
      )}
    >
      <div className="flex h-full items-stretch gap-4 sm:gap-6 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "relative flex h-full items-center whitespace-nowrap text-[15px] font-semibold outline-none transition-colors",
                isActive
                  ? "text-slate-900 dark:text-white"
                  : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
              )}
            >
              {tab.label}
              <span
                className={cn(
                  "absolute bottom-0 left-0 h-0.5 w-full rounded-full bg-slate-900 dark:bg-white transition-opacity",
                  isActive ? "opacity-100" : "opacity-0"
                )}
              />
            </button>
          );
        })}
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        {rightSlot}
        {onMinimize && (
          <button
            type="button"
            onClick={onMinimize}
            aria-label="Minimize"
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors outline-none"
          >
            <ArrowDownRight className="h-[18px] w-[18px]" />
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="p-1.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/15 hover:text-slate-800 dark:hover:text-white transition-colors outline-none"
        >
          <X className="h-[18px] w-[18px]" />
        </button>
      </div>
    </div>
  );
}
