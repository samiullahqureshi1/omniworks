"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * Shared modal shell for "invite / add user or client" style dialogs.
 * Matches the reference Invite User design: bold title + description header,
 * a form body, and a light footer bar with a text Cancel button and a filled
 * primary action. Built on the accessible Radix Dialog primitives.
 */
export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "p-0 gap-0 max-w-md flex flex-col rounded-[8px] overflow-hidden border-slate-200/80 dark:border-white/10 shadow-2xl",
          className
        )}
      >
        <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5">
          <DialogTitle className="text-[16.5px] font-bold text-slate-900 dark:text-white leading-tight">
            {title}
          </DialogTitle>
          {description ? (
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {description}
            </DialogDescription>
          ) : null}
        </div>

        {children}

        {footer ? (
          <div className="px-6 py-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#19191c] flex justify-end gap-2.5">
            {footer}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

/** Bold field label matching the reference modal. */
export const formFieldLabel =
  "text-[12.5px] font-bold text-slate-600 dark:text-slate-350";

/** Rounded input styling matching the reference modal. */
export const formInputClass =
  "h-10 rounded-lg border-slate-200 focus-visible:ring-1 focus-visible:ring-slate-450 dark:border-white/10 dark:bg-transparent text-sm";

/** Native <select> styling matching the reference modal. */
export const formSelectClass =
  "flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-450 dark:border-white/10 dark:bg-[#151518] dark:text-white";

export function FormDialogCancelButton({
  className,
  children = "Cancel",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        "px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors outline-none cursor-pointer disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function FormDialogSubmitButton({
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "px-5 py-2 text-sm font-bold rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors shadow-sm disabled:opacity-50 outline-none cursor-pointer",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
