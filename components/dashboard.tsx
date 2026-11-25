"use client";

import {
  BookOpenIcon,
  CaretDownIcon,
  CaretLeftIcon,
  CaretRightIcon,
  ChartLineIcon,
  CheckIcon,
  CopyIcon,
  HouseIcon,
  ImageIcon,
  SquaresFourIcon,
} from "@phosphor-icons/react";
import { useState } from "react";
import { BRAND } from "@/lib/brand";
import type { DashboardData } from "@/lib/dashboard-data";
import { DEFINITIONS_VERSION } from "@/lib/definitions";
import type { PeriodKind } from "@/lib/periods";
import { updateText } from "@/lib/update-text";
import { LadderTable } from "./ladder";
import { OutcomeTiles } from "./outcomes";
import { Staircase } from "./staircase";
import { Trends } from "./trends";
import { HoverCard, Illustrative, Segmented, cx } from "./ui";

function Tabs() {
  const tabs = [
    { label: "Overview", icon: HouseIcon, active: true },
    { label: "Landing", icon: ImageIcon },
    { label: "Features", icon: SquaresFourIcon },
  ];
  return (
    <div className="inline-flex rounded-xl bg-surface p-1" role="tablist" aria-label="Growth Analytics sections">
      {tabs.map(({ label, icon: Icon, active }) => (
        <button
          key={label}
          type="button"
          role="tab"
          aria-selected={!!active}
          aria-disabled={!active}
          title={active ? undefined : "Not part of this demo"}
          className={cx(
            "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium",
            active ? "bg-stargate text-white" : "cursor-not-allowed text-muted",
          )}
        >
          <Icon aria-hidden weight="fill" className="size-4" />
          {label}
          {!active && <span className="sr-only">(not part of this demo)</span>}
        </button>
      ))}
    </div>
  );
}

function MeasurePanel() {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl bg-surface">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="measure-body"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-6 py-4 text-left text-base font-medium text-ink"
      >
        <BookOpenIcon aria-hidden weight="fill" className="size-4 text-stargate" />
        What we measure &amp; why
        <CaretDownIcon
          aria-hidden
          weight="bold"
          className={cx("ml-auto size-4 text-muted transition-transform duration-150 ease-in-out", open && "rotate-180")}
        />
      </button>
      {open && (
        <div id="measure-body" className="max-w-4xl space-y-4 px-6 pb-6 leading-relaxed text-ink-2">
          <div>
            <h3 className="font-medium text-ink">Overview: the plan, week by week and month by month</h3>
            <p className="mt-1">
              Every number is read from the product’s own tables through one shared query layer, so the tiles, the
              table, the staircase and the trends always agree. Staff and test accounts, sample content and bot-like
              sessions are left out everywhere by one rule. When a number can’t be read, the page shows a dash and
              says why. Nothing is filled in by hand.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-ink">The six numbers</h3>
            <p className="mt-1">
              The measurement layer under the revenue goal: 01 Visits, 02 Sign-up start, 03 Mobile sign-up, 04
              Activation 48h, 05 Retention 4wk, 06 Free to paid. Three are collapse points: if any stays low, the
              funnel below it can’t reach its targets. The table flags the driver to work on first.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-ink">Status and targets</h3>
            <p className="mt-1">
              Exceeded is 25% or more above target; On plan is at or above it; Close is within 10% below; Behind is
              further. Weeks are complete UK weeks. Months are calendar months, and the month in progress is read to
              the last full day against the plan to that day. Revenue, paying customers and workspaces follow a
              straight line between the plan’s month ends; visits and sign-ups are worked back from the
              paying-customer plan.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-ink">Lagging numbers</h3>
            <p className="mt-1">
              Retention and free-to-paid read earlier sign-up groups, so a group’s measurement window is complete
              before it counts.
            </p>
          </div>
          <p className="text-xs text-muted">Definitions {DEFINITIONS_VERSION}. {BRAND.disclaimer}</p>
        </div>
      )}
    </div>
  );
}

function CopyUpdate({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy the update:", text);
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-2 rounded-md bg-button px-4 py-2 text-sm font-medium text-button-ink transition-opacity duration-150 ease-in-out hover:opacity-90"
    >
      {copied ? <CheckIcon aria-hidden weight="bold" className="size-4" /> : <CopyIcon aria-hidden weight="fill" className="size-4" />}
      <span aria-live="polite">{copied ? "Copied" : "Copy update"}</span>
    </button>
  );
}

export function Dashboard({ data }: { data: DashboardData }) {
  const [kind, setKind] = useState<PeriodKind>("week");
  const [index, setIndex] = useState({ week: data.weeks.length - 1, month: data.months.length - 1 });
  const list = kind === "week" ? data.weeks : data.months;
  const i = index[kind];
  const view = list[i];
  const go = (d: number) => setIndex((s) => ({ ...s, [kind]: Math.max(0, Math.min(list.length - 1, s[kind] + d)) }));

  return (
    <div className="mx-auto max-w-[1280px] px-4 pt-20 pb-10 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold text-ink sm:text-2xl">
            <ChartLineIcon aria-hidden weight="fill" className="size-6 text-stargate" />
            Growth Analytics
          </h1>
          <p className="mt-2 text-ink-2">
            The weekly read: where we stand against the plan, and which number to work on first
          </p>
        </div>
      </div>

      <div className="mt-6">
        <Tabs />
      </div>
      <div className="mt-6">
        <MeasurePanel />
      </div>

      {/* The update */}
      <div className="mt-10 flex flex-wrap items-center justify-between gap-4 px-1">
        <h2 className="flex items-center gap-2 text-base font-medium text-ink">
          {kind === "week" ? "Weekly update" : "Monthly update"}
          <HoverCard label="About the update">
            One screen for the Monday read: where we stand against the plan, which driver to work on first, and whether
            last {kind}’s changes moved anything. “Copy update” turns the same numbers into text for the team chat.
          </HoverCard>
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => go(-1)}
              disabled={i === 0}
              aria-label={`Previous ${kind}`}
              className="grid size-8 place-items-center rounded-lg text-muted transition-colors duration-150 ease-in-out hover:bg-hover disabled:opacity-30"
            >
              <CaretLeftIcon aria-hidden weight="bold" className="size-4" />
            </button>
            <p aria-live="polite" className="min-w-[15ch] text-center text-xl font-semibold text-ink">
              {view.period.label}
            </p>
            <button
              type="button"
              onClick={() => go(1)}
              disabled={i === list.length - 1}
              aria-label={`Next ${kind}`}
              className="grid size-8 place-items-center rounded-lg text-muted transition-colors duration-150 ease-in-out hover:bg-hover disabled:opacity-30"
            >
              <CaretRightIcon aria-hidden weight="bold" className="size-4" />
            </button>
          </div>
          <Segmented
            label="Period"
            value={kind}
            onChange={setKind}
            options={[
              { value: "week", label: "Weeks" },
              { value: "month", label: "Months" },
            ]}
          />
          <CopyUpdate text={updateText(view, BRAND.disclaimer)} />
        </div>
      </div>

      <section aria-labelledby="outcomes-title" className="mt-8">
        <h2 id="outcomes-title" className="mb-3 flex items-center gap-2 px-1 text-xs font-medium text-ink-2">
          Outcomes <Illustrative />
        </h2>
        <OutcomeTiles view={view} />
      </section>

      <section aria-label="The six numbers" className="mt-10">
        <div className="mb-3 px-1">
          <Illustrative />
        </div>
        <LadderTable view={view} />
      </section>

      <div className="mt-16">
        <Staircase steps={data.staircase} planEnd={data.planEndLabel} />
      </div>

      <div className="mt-16">
        <Trends data={data} />
      </div>


      <footer className="mt-16 text-xs text-muted">
        {BRAND.disclaimer} Designed and built by Alina Kabanets; this public version is rebuilt from scratch on
        generated example data.
      </footer>
    </div>
  );
}
