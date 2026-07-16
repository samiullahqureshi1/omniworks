"use client";

import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, UserRoundCog } from "lucide-react";
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
        overlayClassName="bg-slate-950/45 backdrop-blur-[1px]"
        onPointerDownOutside={(event) => event.preventDefault()}
        className={cn(
          "w-[calc(100%-2rem)] max-w-md p-0 gap-0 flex flex-col rounded-[8px] sm:rounded-[8px] overflow-hidden border-slate-200 dark:border-white/10 bg-white dark:bg-[#1f1f1f] shadow-[0_24px_70px_rgba(0,0,0,0.28)] [&>button]:right-5 [&>button]:top-5 [&>button]:text-slate-400 [&>button]:opacity-100 [&>button_svg]:size-5",
          className
        )}
      >
        <div className="px-6 py-[18px] border-b border-slate-200/80 dark:border-white/10">
          <DialogTitle className="pr-10 text-[17px] font-bold text-slate-900 dark:text-white leading-tight tracking-[-0.01em]">
            {title}
          </DialogTitle>
          {description ? (
            <DialogDescription className="pr-8 text-[12.5px] leading-5 text-slate-500 dark:text-slate-400 mt-1">
              {description}
            </DialogDescription>
          ) : null}
        </div>

        {children}

        {footer ? (
          <div className="px-6 py-4 border-t border-slate-200/80 dark:border-white/10 bg-slate-50/60 dark:bg-[#19191c] flex justify-end items-center gap-2.5">
            {footer}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

/** Bold field label matching the reference modal. */
export const formFieldLabel =
  "block text-[13px] leading-4 font-bold text-slate-600 dark:text-slate-300";

/** Rounded input styling matching the reference modal. */
export const formInputClass =
  "h-[42px] rounded-[8px] border-slate-200 px-4 text-[15px] text-slate-900 placeholder:text-slate-500 focus-visible:border-slate-700 focus-visible:ring-1 focus-visible:ring-slate-700 dark:border-white/10 dark:bg-transparent dark:text-white dark:focus-visible:border-slate-300 dark:focus-visible:ring-slate-300";

export type WorkspaceRole = "MEMBER" | "CLIENT" | "OWNER";

const workspaceRoles: Array<{
  value: WorkspaceRole;
  label: string;
  description: string;
}> = [
  {
    value: "MEMBER",
    label: "Member",
    description: "Can access all public items in your Workspace.",
  },
  {
    value: "CLIENT",
    label: "Client",
    description: "Can access client projects and items shared with them.",
  },
  {
    value: "OWNER",
    label: "Owner",
    description: "Can manage people, projects, billing and Workspace settings.",
  },
];

/** Rich role dropdown used by every user/client invitation modal. */
export function FormRoleSelect({
  id,
  name = "role",
  defaultValue = "MEMBER",
  value: controlledValue,
  onValueChange,
}: {
  id: string;
  name?: string;
  defaultValue?: WorkspaceRole;
  value?: WorkspaceRole;
  onValueChange?: (value: WorkspaceRole) => void;
}) {
  const [internalValue, setInternalValue] = React.useState<WorkspaceRole>(defaultValue);
  const value = controlledValue ?? internalValue;
  const selectedRole = workspaceRoles.find((role) => role.value === value) ?? workspaceRoles[0];

  const handleValueChange = (nextValue: string) => {
    const nextRole = nextValue as WorkspaceRole;
    if (controlledValue === undefined) setInternalValue(nextRole);
    onValueChange?.(nextRole);
  };

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-[13px] leading-4 font-medium text-slate-500 dark:text-slate-400">
        Invite as
      </label>
      <SelectPrimitive.Root
        name={name}
        value={value}
        onValueChange={handleValueChange}
      >
        <SelectPrimitive.Trigger
          id={id}
          aria-label="Invite as role"
          className="group flex w-full items-center gap-3 rounded-[8px] text-left outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 dark:focus-visible:ring-slate-500 dark:focus-visible:ring-offset-[#1f1f1f]"
        >
          <span className="flex size-12 shrink-0 items-center justify-center rounded-[8px] bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300">
            <UserRoundCog className="size-6" strokeWidth={1.8} />
          </span>
          <span className="min-w-0 flex-1 py-0.5">
            <span className="flex items-center gap-2 text-[16px] font-medium leading-6 text-slate-900 dark:text-white">
              <SelectPrimitive.Value>{selectedRole.label}</SelectPrimitive.Value>
              <SelectPrimitive.Icon asChild>
                <ChevronDown className="size-4 transition-transform duration-150 group-data-[state=open]:rotate-180" strokeWidth={2} />
              </SelectPrimitive.Icon>
            </span>
            <span className="mt-0.5 block truncate text-[13px] leading-5 text-slate-500 dark:text-slate-400">
              {selectedRole.description}
            </span>
          </span>
        </SelectPrimitive.Trigger>

        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            position="popper"
            sideOffset={8}
            align="start"
            className="z-[100] w-[var(--radix-select-trigger-width)] overflow-hidden rounded-[14px] border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.22)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 dark:border-white/10 dark:bg-[#202024]"
          >
            <SelectPrimitive.Viewport className="p-2">
              {workspaceRoles.map((role) => (
                <SelectPrimitive.Item
                  key={role.value}
                  value={role.value}
                  className="relative cursor-pointer select-none rounded-[8px] px-3 py-2.5 outline-none data-[highlighted]:bg-slate-100 dark:data-[highlighted]:bg-white/10"
                >
                  <span className="flex items-start justify-between gap-3">
                    <SelectPrimitive.ItemText>
                      <span className="text-[15px] font-medium leading-5 text-slate-900 dark:text-white">
                        {role.label}
                      </span>
                    </SelectPrimitive.ItemText>
                    <SelectPrimitive.ItemIndicator className="mt-0.5 shrink-0 text-slate-900 dark:text-white">
                      <Check className="size-4" strokeWidth={2.5} />
                    </SelectPrimitive.ItemIndicator>
                  </span>
                  <span className="mt-1 block pr-5 text-[13px] leading-5 text-slate-500 dark:text-slate-400">
                    {role.description}
                  </span>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    </div>
  );
}

export function FormDialogCancelButton({
  className,
  children = "Cancel",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        "h-9 px-4 text-sm font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 rounded-[16px] transition-colors outline-none cursor-pointer disabled:opacity-50",
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
        "h-9 min-w-[79px] px-5 text-sm font-bold rounded-[16px] bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors shadow-sm disabled:bg-slate-500 disabled:text-white disabled:opacity-65 disabled:cursor-not-allowed outline-none cursor-pointer",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
