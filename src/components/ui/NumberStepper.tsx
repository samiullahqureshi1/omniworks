"use client";

import * as React from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type ChangeLike = { target: { value: string; name?: string } };

export interface NumberStepperProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "onChange" | "type" | "value" | "defaultValue" | "min" | "max" | "step"
  > {
  value?: string | number;
  defaultValue?: string | number;
  /** Receives a React change event when typing, or a synthetic `{ target: { value, name } }` when using the +/- buttons. */
  onChange?: (e: React.ChangeEvent<HTMLInputElement> | ChangeLike) => void;
  min?: number | string;
  max?: number | string;
  /** Increment used by the +/- buttons. Defaults to 1. */
  step?: number | string;
  /** Extra classes for the center input. */
  inputClassName?: string;
}

/**
 * A modern quantity selector: [ - ]  value  [ + ].
 * The center value stays typable (native numeric input); the buttons
 * increment/decrement by `step`, clamped to `min` (default 0) and `max`.
 * Works both controlled (value + onChange) and uncontrolled (name +
 * defaultValue, read via FormData on submit).
 */
export const NumberStepper = React.forwardRef<HTMLInputElement, NumberStepperProps>(
  (
    {
      className,
      inputClassName,
      value,
      defaultValue,
      onChange,
      name,
      min = 0,
      max,
      step = 1,
      disabled,
      placeholder,
      required,
      ...props
    },
    ref
  ) => {
    const innerRef = React.useRef<HTMLInputElement>(null);
    React.useImperativeHandle(ref, () => innerRef.current as HTMLInputElement);

    const stepNum = (typeof step === "string" ? parseFloat(step) : step) || 1;
    const minNum = min === "" || min == null ? undefined : Number(min);
    const maxNum = max === "" || max == null ? undefined : Number(max);
    const decimals = (String(stepNum).split(".")[1] || "").length;

    const isControlled = value !== undefined;

    const format = (n: number) => String(Number(n.toFixed(decimals)));

    const clamp = (n: number) => {
      let x = n;
      if (minNum !== undefined && x < minNum) x = minNum;
      if (maxNum !== undefined && x > maxNum) x = maxNum;
      return x;
    };

    const getCurrent = () => {
      const raw = isControlled ? value : innerRef.current?.value;
      const n = parseFloat(String(raw ?? ""));
      return isNaN(n) ? minNum ?? 0 : n;
    };

    const commit = (next: number) => {
      const s = format(clamp(next));
      onChange?.({ target: { value: s, name } });
      if (!isControlled && innerRef.current) innerRef.current.value = s;
    };

    const decrease = () => commit(getCurrent() - stepNum);
    const increase = () => commit(getCurrent() + stepNum);

    const buttonClasses =
      "flex items-center justify-center w-9 sm:w-10 shrink-0 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white active:bg-slate-200 dark:active:bg-white/15 transition-colors outline-none disabled:pointer-events-none disabled:opacity-40";

    return (
      <div
        className={cn(
          "inline-flex items-stretch h-11 w-full rounded-xl border border-input dark:border-white/10 bg-white dark:bg-[#1f1f1f] overflow-hidden transition-all focus-within:ring-2 focus-within:ring-[#ffad0d] focus-within:border-transparent",
          disabled && "cursor-not-allowed",
          className
        )}
      >
        <button
          type="button"
          tabIndex={-1}
          aria-label="Decrease"
          onClick={decrease}
          disabled={disabled}
          className={cn(buttonClasses, "border-r border-input dark:border-white/10")}
        >
          <Minus className="h-4 w-4" />
        </button>
        <input
          ref={innerRef}
          type="number"
          inputMode="decimal"
          name={name}
          disabled={disabled}
          placeholder={placeholder}
          required={required}
          min={minNum}
          max={maxNum}
          step={stepNum}
          {...(isControlled ? { value } : { defaultValue })}
          onChange={onChange as React.ChangeEventHandler<HTMLInputElement>}
          className={cn(
            "flex-1 min-w-0 w-full bg-transparent text-center text-sm font-medium text-slate-900 dark:text-white outline-none px-1 disabled:cursor-not-allowed",
            "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0",
            inputClassName
          )}
          {...props}
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label="Increase"
          onClick={increase}
          disabled={disabled}
          className={cn(buttonClasses, "border-l border-input dark:border-white/10")}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    );
  }
);
NumberStepper.displayName = "NumberStepper";
