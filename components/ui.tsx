"use client";

import { ArrowDownIcon, ArrowUpIcon, CheckIcon, InfoIcon, WarningIcon, XIcon } from "@phosphor-icons/react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import type { Status } from "@/lib/metrics";
import { STATUS_LABEL, type Delta } from "@/lib/format";

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

// ── Status ──────────────────────────────────────────────────────────────────
// Pills are flat and fully rounded. Secondary colours carry meaning only.

const PILL: Record<Status, string> = {
  exceeded: "bg-green-500 text-white",
  "on-plan": "bg-green-500/15 text-green-600 dark:text-green-400",
  close: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  behind: "bg-red-500/15 text-red-600 dark:text-red-400",
  "no-target": "bg-surface-2 text-ink-2",
  "no-data": "bg-surface-2 text-muted",
};

export function StatusPill({ status }: { status: Status }) {
  const Icon = status === "exceeded" ? ArrowUpIcon : status === "on-plan" ? CheckIcon : status === "behind" ? XIcon : WarningIcon;
  return (
    <span
      className={cx(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-xs leading-none font-medium whitespace-nowrap",
        PILL[status],
      )}
    >
      {status !== "no-data" && status !== "no-target" && (
        <Icon aria-hidden className="size-3" weight={status === "close" ? "fill" : "bold"} />
      )}
      {STATUS_LABEL[status]}
    </span>
  );
}

/** A tinted pill only when a metric is behind or close; quiet otherwise. */
export function ProgressPill({ ratio }: { ratio: number | null }) {
  if (ratio === null || ratio >= 1) return null;
  const tone =
    ratio >= 0.9
      ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
      : "bg-red-500/15 text-red-600 dark:text-red-400";
  return (
    <span className={cx("rounded-full px-2 py-1 text-xs leading-none font-medium whitespace-nowrap", tone)}>
      {Math.round(ratio * 100)}% of target
    </span>
  );
}

export function DeltaText({ delta, compact }: { delta: Delta | null; compact?: boolean }) {
  if (!delta) return <span className="text-muted">—</span>;
  const tone = delta.direction === "up" ? "text-good" : delta.direction === "down" ? "text-bad" : "text-muted";
  const Icon = delta.direction === "up" ? ArrowUpIcon : ArrowDownIcon;
  return (
    <span className={cx("inline-flex items-center gap-1 whitespace-nowrap", tone)}>
      {delta.direction !== "flat" && <Icon aria-hidden weight="bold" className="size-4" />}
      <span className={compact ? "text-sm font-medium" : "text-base font-medium"}>{delta.text}</span>
      {delta.detail && <span className="text-xs opacity-80">{delta.detail}</span>}
    </span>
  );
}

export function Bar({ fill, muted }: { fill: number; muted?: boolean }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2" aria-hidden>
      <div
        className={cx("h-full rounded-full", muted ? "bg-bar-partial" : "bg-bar")}
        style={{ width: `${Math.max(0, Math.min(1, fill)) * 100}%` }}
      />
    </div>
  );
}

export function Illustrative({ className }: { className?: string }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full bg-surface-2 px-2 py-1 text-[10px] leading-none font-medium tracking-wide text-ink-2 uppercase",
        className,
      )}
    >
      Illustrative data
    </span>
  );
}

// Every tooltip, hover card and popover on the page: black, like the chart's.
export const TOOLTIP =
  "rounded-lg bg-zinc-800 px-3 py-2 text-sm leading-snug text-zinc-200 shadow-md dark:bg-zinc-750 [&_.text-ink]:text-white [&_.text-ink-2]:text-zinc-200 [&_.text-muted]:text-zinc-400";
const FLOATING = TOOLTIP;

// ── Hover card: opens on hover and on keyboard focus ────────────────────────

export function HoverCard({
  label,
  children,
  align = "start",
  width = 300,
}: {
  label: string;
  children: ReactNode;
  align?: "start" | "end" | "center";
  width?: number;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const timer = useRef<number | undefined>(undefined);
  const show = () => {
    window.clearTimeout(timer.current);
    setOpen(true);
  };
  const hide = () => {
    timer.current = window.setTimeout(() => setOpen(false), 80);
  };

  return (
    <span className="relative inline-flex" onMouseEnter={show} onMouseLeave={hide}>
      <button
        type="button"
        aria-label={label}
        aria-describedby={open ? id : undefined}
        onFocus={show}
        onBlur={hide}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        className="inline-flex items-center text-muted transition-colors duration-150 ease-in-out hover:text-ink"
      >
        <InfoIcon aria-hidden weight="fill" className="size-4" />
      </button>
      {open && (
        <span
          role="tooltip"
          id={id}
          style={{ width }}
          className={cx(
            "absolute top-full z-30 mt-2 block text-left font-normal",
            FLOATING,
            align === "start" && "left-0",
            align === "end" && "right-0",
            align === "center" && "left-1/2 -translate-x-1/2",
          )}
        >
          {children}
        </span>
      )}
    </span>
  );
}

// ── Popover: click to open; Escape or a click outside closes it and returns focus ─

export function Popover({ label, children, title }: { label: string; title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const close = () => {
      setOpen(false);
      button.current?.focus();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!panel.current?.contains(t) && !button.current?.contains(t)) close();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    panel.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open]);

  return (
    <span className="relative inline-block">
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="text-xs font-medium text-ink transition-colors duration-150 ease-in-out hover:text-ink-2"
      >
        {label}
      </button>
      {open && (
        <div
          ref={panel}
          id={id}
          role="dialog"
          aria-label={title}
          tabIndex={-1}
          className={cx("absolute top-full left-0 z-30 mt-2 max-h-72 w-72 overflow-auto outline-none", FLOATING)}
        >
          <p className="mb-2 font-medium text-ink">{title}</p>
          {children}
        </div>
      )}
    </span>
  );
}

// ── Segmented control: an everyday toggle, so a zinc highlight ──────────────

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-xl bg-surface p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            "rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-150 ease-in-out",
            value === o.value ? "bg-panel text-ink dark:bg-zinc-750" : "text-muted hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
