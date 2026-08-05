"use client";

import React from "react";
import { Check as CheckIcon } from "lucide-react";
import {
  HiBriefcase,
  HiCalendar,
  HiClipboardList,
  HiUser,
  HiUserGroup,
  HiVideoCamera,
  HiSparkles,
  HiBell,
  HiClock,
} from "react-icons/hi";

export type PermAction = "view" | "edit" | "create" | "delete";

export type PermResource =
  | "project"
  | "task"
  | "calendar"
  | "meeting"
  | "event"
  | "reminder"
  | "contact"
  | "availability"
  | "user"
  | "client";

export type PermissionState = Record<PermResource, Record<PermAction, boolean>>;

export const PERM_ACTIONS: PermAction[] = ["view", "edit", "create", "delete"];

type ResourceDef = {
  key: PermResource;
  label: string;
  Icon: React.ElementType;
  color: string;
  /** Which of the four actions this module actually supports. */
  actions: PermAction[];
};

const ALL: PermAction[] = ["view", "edit", "create", "delete"];
/** Calendar and Booking Availability are view/edit only — they have no create/delete surface. */
const VIEW_EDIT: PermAction[] = ["view", "edit"];

/** Top-level modules rendered as flat rows. */
export const CORE_RESOURCES: ResourceDef[] = [
  { key: "project", label: "Project", Icon: HiBriefcase, color: "text-violet-500", actions: ALL },
  { key: "task", label: "Task", Icon: HiClipboardList, color: "text-blue-500", actions: ALL },
  { key: "user", label: "User", Icon: HiUser, color: "text-amber-500", actions: ALL },
  { key: "client", label: "Client", Icon: HiUserGroup, color: "text-rose-500", actions: ALL },
];

/** Planner sub-modules, rendered nested under a single parent checkbox. */
export const PLANNER_RESOURCES: ResourceDef[] = [
  { key: "calendar", label: "My Calendar", Icon: HiCalendar, color: "text-emerald-500", actions: VIEW_EDIT },
  { key: "meeting", label: "Meetings", Icon: HiVideoCamera, color: "text-sky-500", actions: ALL },
  { key: "event", label: "Events", Icon: HiSparkles, color: "text-fuchsia-500", actions: ALL },
  { key: "reminder", label: "Reminders", Icon: HiBell, color: "text-orange-500", actions: ALL },
  { key: "contact", label: "Contacts", Icon: HiUserGroup, color: "text-teal-500", actions: ALL },
  { key: "availability", label: "Booking Availability", Icon: HiClock, color: "text-indigo-500", actions: VIEW_EDIT },
];

export const ALL_RESOURCES: ResourceDef[] = [...CORE_RESOURCES, ...PLANNER_RESOURCES];

const blank = (): Record<PermAction, boolean> => ({ view: false, edit: false, create: false, delete: false });

export const defaultPerms = (): PermissionState =>
  ALL_RESOURCES.reduce((acc, r) => {
    acc[r.key] = blank();
    return acc;
  }, {} as PermissionState);

/** Preset: VIEW on every module, nothing else. */
export const viewOnlyPerms = (): PermissionState =>
  ALL_RESOURCES.reduce((acc, r) => {
    acc[r.key] = { ...blank(), view: true };
    return acc;
  }, {} as PermissionState);

/** Preset: every action each module supports. */
export const fullAccessPerms = (): PermissionState =>
  ALL_RESOURCES.reduce((acc, r) => {
    const next = blank();
    r.actions.forEach((a) => {
      next[a] = true;
    });
    acc[r.key] = next;
    return acc;
  }, {} as PermissionState);

/**
 * Permission dependency rules for one module:
 *  - enabling CREATE / EDIT / DELETE implies VIEW
 *  - disabling VIEW clears CREATE / EDIT / DELETE
 * The backend still checks each action independently — this is UX only.
 */
export const applyPermDependencies = (
  current: Record<PermAction, boolean>,
  action: PermAction,
  nextValue: boolean,
): Record<PermAction, boolean> => {
  const next = { ...current, [action]: nextValue };
  if (action === "view" && !nextValue) return blank();
  if (action !== "view" && nextValue) next.view = true;
  return next;
};

/** Merges a stored permissions object onto the full default shape. */
export const mergeStoredPerms = (stored: unknown): PermissionState => {
  const merged = defaultPerms();
  if (!stored || typeof stored !== "object") return merged;
  const source = stored as Record<string, Record<string, unknown> | undefined>;
  for (const r of ALL_RESOURCES) {
    const saved = source[r.key];
    if (!saved || typeof saved !== "object") continue;
    for (const a of r.actions) {
      if (typeof saved[a] === "boolean") merged[r.key][a] = saved[a];
    }
  }
  return merged;
};

// ─── UI ─────────────────────────────────────────────────────────────────────

/** Shared responsive grid: narrower action columns on small screens. */
const GRID = "grid grid-cols-[1fr_repeat(4,38px)] sm:grid-cols-[1fr_repeat(4,48px)]";

function Checkbox({
  state,
  onClick,
  disabled,
}: {
  state: "on" | "partial" | "off";
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-checked={state === "on" ? "true" : state === "partial" ? "mixed" : "false"}
      role="checkbox"
      className={`w-5 h-5 rounded-[4px] border-2 flex items-center justify-center transition-all flex-shrink-0 ${
        state === "on"
          ? "bg-slate-900 dark:bg-white border-slate-900 dark:border-white"
          : state === "partial"
            ? "bg-slate-300 dark:bg-slate-600 border-slate-300 dark:border-slate-600"
            : "border-slate-300 dark:border-white/20 hover:border-slate-500 dark:hover:border-white/40"
      } ${disabled ? "opacity-30 cursor-not-allowed" : ""}`}
    >
      {state !== "off" && (
        <CheckIcon
          size={11}
          className={state === "on" ? "text-white dark:text-slate-900" : "text-white"}
          strokeWidth={3}
        />
      )}
    </button>
  );
}

function ResourceRow({
  def,
  value,
  onToggleAction,
  onToggleAll,
  indent,
}: {
  def: ResourceDef;
  value: PermissionState;
  onToggleAction: (r: PermResource, a: PermAction) => void;
  onToggleAll: (r: PermResource) => void;
  indent?: boolean;
}) {
  const allOn = def.actions.every((a) => value[def.key][a]);
  const someOn = def.actions.some((a) => value[def.key][a]);
  const { Icon } = def;

  return (
    <div
      className={`${GRID} gap-x-1 items-center rounded-[8px] px-2 sm:px-3 py-2.5 transition-colors ${
        someOn
          ? "bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10"
          : "border border-transparent hover:bg-slate-50/60 dark:hover:bg-white/[0.02]"
      }`}
    >
      <button
        type="button"
        onClick={() => onToggleAll(def.key)}
        className={`flex items-center gap-2 sm:gap-2.5 text-left group min-w-0 ${indent ? "pl-3 sm:pl-5" : ""}`}
      >
        <Checkbox state={allOn ? "on" : someOn ? "partial" : "off"} onClick={() => onToggleAll(def.key)} />
        <span className="flex items-center gap-1.5 text-[12.5px] sm:text-[13px] font-semibold text-slate-700 dark:text-slate-200 min-w-0">
          <Icon className={`text-[15px] ${def.color} shrink-0`} />
          <span className="truncate">{def.label}</span>
        </span>
      </button>

      {PERM_ACTIONS.map((action) => {
        const supported = def.actions.includes(action);
        return (
          <div key={action} className="flex items-center justify-center">
            {supported ? (
              <Checkbox
                state={value[def.key][action] ? "on" : "off"}
                onClick={() => onToggleAction(def.key, action)}
              />
            ) : (
              // Module does not support this action — render a placeholder, not a control.
              <span className="text-slate-300 dark:text-white/15 text-[13px] select-none">—</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function PermissionMatrix({
  value,
  onChange,
}: {
  value: PermissionState;
  onChange: (next: PermissionState) => void;
}) {
  const toggleAction = (resource: PermResource, action: PermAction) => {
    onChange({
      ...value,
      [resource]: applyPermDependencies(value[resource], action, !value[resource][action]),
    });
  };

  const toggleAll = (resource: PermResource) => {
    const def = ALL_RESOURCES.find((r) => r.key === resource)!;
    const allOn = def.actions.every((a) => value[resource][a]);
    const next = blank();
    if (!allOn) def.actions.forEach((a) => (next[a] = true));
    onChange({ ...value, [resource]: next });
  };

  // Parent Planner checkbox: selects / clears every Planner sub-module at once.
  const plannerAllOn = PLANNER_RESOURCES.every((r) => r.actions.every((a) => value[r.key][a]));
  const plannerSomeOn = PLANNER_RESOURCES.some((r) => r.actions.some((a) => value[r.key][a]));

  const toggleAllPlanner = () => {
    const next = { ...value };
    for (const r of PLANNER_RESOURCES) {
      const fresh = blank();
      if (!plannerAllOn) r.actions.forEach((a) => (fresh[a] = true));
      next[r.key] = fresh;
    }
    onChange(next);
  };

  return (
    // Horizontal scroll on narrow screens keeps the 4 action columns usable instead
    // of crushing the label column; the inner min-width preserves the grid.
    <div className="-mx-1 overflow-x-auto">
      <div className="min-w-[340px] px-1">
        {/* Column headers — stay visible while the rows below scroll. */}
        <div className={`${GRID} gap-x-1 mb-2 pr-1 sticky top-0 z-10 bg-white dark:bg-[#1f1f1f] pb-1`}>
          <div />
          {PERM_ACTIONS.map((action) => (
            <div
              key={action}
              className="text-center text-[10.5px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500"
            >
              {action.charAt(0).toUpperCase() + action.slice(1)}
            </div>
          ))}
        </div>

        {/* Vertical scroller — caps the matrix height so the modal always fits. */}
        <div className="space-y-1 max-h-[46vh] sm:max-h-[380px] overflow-y-auto custom-scrollbar pr-1">
          {CORE_RESOURCES.map((def) => (
            <ResourceRow
              key={def.key}
              def={def}
              value={value}
              onToggleAction={toggleAction}
              onToggleAll={toggleAll}
            />
          ))}

          {/* ── Planner group ── */}
          <div className="pt-2">
            <div className={`${GRID} gap-x-1 items-center rounded-[8px] px-3 py-2.5 bg-slate-100/70 dark:bg-white/[0.06] border border-slate-200 dark:border-white/10`}>
              <button type="button" onClick={toggleAllPlanner} className="flex items-center gap-2.5 text-left min-w-0">
                <Checkbox
                  state={plannerAllOn ? "on" : plannerSomeOn ? "partial" : "off"}
                  onClick={toggleAllPlanner}
                />
                <span className="flex items-center gap-1.5 text-[13px] font-bold text-slate-800 dark:text-slate-100 truncate">
                  <HiCalendar className="text-[15px] text-emerald-500 shrink-0" />
                  Planner
                </span>
              </button>
              <div className="col-span-4 text-[10.5px] text-slate-400 dark:text-slate-500 text-right pr-1 hidden sm:block">
                all planner modules
              </div>
            </div>

            <div className="space-y-1 mt-1">
              {PLANNER_RESOURCES.map((def) => (
                <ResourceRow
                  key={def.key}
                  def={def}
                  value={value}
                  onToggleAction={toggleAction}
                  onToggleAll={toggleAll}
                  indent
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
