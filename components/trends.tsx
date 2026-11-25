"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { addDays, dayMonth } from "@/lib/dates";
import { DEFINITIONS } from "@/lib/definitions";
import { formatValue } from "@/lib/format";
import { LABELS, OUTCOMES, SIX, isRate, type MetricKey } from "@/lib/metrics";
import type { PeriodKind } from "@/lib/periods";
import type { DashboardData, TrendPoint } from "@/lib/dashboard-data";
import { HoverCard, Illustrative, ProgressPill, Segmented, TOOLTIP, cx } from "./ui";

const H = 600;
const M = { top: 32, right: 20, bottom: 40, left: 52 };

function niceStep(raw: number) {
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * pow;
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(720);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

function latest(points: TrendPoint[]) {
  return [...points].reverse().find((p) => !p.future)!;
}

function ratio(p: TrendPoint, key: MetricKey) {
  const v = p.values[key];
  const t = p.targets[key];
  return v == null || t == null || t === 0 ? null : v / t;
}

function eventIndex(points: TrendPoint[], kind: PeriodKind, date: string) {
  return points.findIndex((p) =>
    kind === "week" ? p.key <= date && date <= addDays(p.key, 6) : p.key === date.slice(0, 7),
  );
}

function Tooltip({
  point,
  metric,
  kind,
  gapReason,
  event,
  left,
  top,
  width,
}: {
  point: TrendPoint;
  metric: MetricKey;
  kind: PeriodKind;
  gapReason: string;
  event?: DashboardData["events"][number];
  left: number;
  top: number;
  width: number;
}) {
  const v = point.values[metric];
  const t = point.targets[metric];
  const W = 280;
  const flip = left + 14 + W > width;
  return (
    <div
      role="status"
      className={`pointer-events-none absolute z-10 ${TOOLTIP}`}
      style={{
        width: event ? W : undefined,
        minWidth: 150,
        left: flip ? undefined : left + 14,
        right: flip ? width - left + 14 : undefined,
        top: Math.max(0, top - 96),
      }}
    >
      <p className="font-semibold">
        {kind === "week" ? `Week of ${dayMonth(point.key)}` : point.label}
        {point.partial ? " so far" : ""}
      </p>
      {!point.future && <p>Actual {v == null ? `— ${gapReason}` : formatValue(metric, v)}</p>}
      <p>Target {t == null ? "— none yet" : formatValue(metric, t)}</p>
      {v != null && t != null && t !== 0 && <p>{Math.round((v / t) * 100)}% of target</p>}
      {point.future && <p className="opacity-70">Still ahead: plan only</p>}
      {event && <p className="mt-2 opacity-75">{event.note}</p>}
    </div>
  );
}

function Chart({
  points,
  metric,
  kind,
  events,
  gapReason,
}: {
  points: TrendPoint[];
  metric: MetricKey;
  kind: PeriodKind;
  events: DashboardData["events"];
  gapReason: string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const innerW = Math.max(200, width - M.left - M.right);
  const innerH = H - M.top - M.bottom;
  const n = points.length;
  // Whole pixels keep lines and dots sharp.
  const x = (i: number) => Math.round(M.left + (n === 1 ? innerW / 2 : (i * innerW) / (n - 1)));

  const { ticks, top } = useMemo(() => {
    const all = points.flatMap((p) => [p.values[metric], p.targets[metric]]).filter((v): v is number => v != null);
    const max = Math.max(...all, isRate(metric) ? 0.05 : 1);
    const step = niceStep(max / 4);
    const top = Math.ceil((max * 1.05) / step) * step;
    const ticks: number[] = [];
    for (let v = 0; v <= top + 1e-9; v += step) ticks.push(v);
    return { ticks, top };
  }, [points, metric]);
  const y = (v: number) => Math.round(M.top + innerH - (v / top) * innerH);

  // Actual: solid, broken wherever a reading is missing.
  const segments: string[] = [];
  let current: string[] = [];
  points.forEach((p, i) => {
    const v = p.values[metric];
    if (v == null) {
      if (current.length) segments.push(current.join(" "));
      current = [];
    } else current.push(`${current.length ? "L" : "M"}${x(i)},${y(v)}`);
  });
  if (current.length) segments.push(current.join(" "));

  const targetPath = points
    .map((p, i) => (p.targets[metric] == null ? null : `${x(i)},${y(p.targets[metric]!)}`))
    .reduce<string[]>((acc, pt) => (pt ? [...acc, `${acc.length ? "L" : "M"}${pt}`] : acc), [])
    .join(" ");

  const gaps = points
    .map((p, i) => ({ i, missing: !p.future && p.values[metric] == null }))
    .filter((g) => g.missing);

  const labelEvery = kind === "week" ? 4 : 1;
  const fmt = (v: number) => formatValue(metric, v, { short: true });

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * width;
    const i = Math.round(((px - M.left) / innerW) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, i)));
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") setHover((h) => Math.min(n - 1, (h ?? -1) + 1));
    else if (e.key === "ArrowLeft") setHover((h) => Math.max(0, (h ?? n) - 1));
    else if (e.key === "Escape") setHover(null);
    else return;
    e.preventDefault();
  };

  const hp = hover !== null ? points[hover] : null;

  return (
    <div ref={ref} className="relative">
      <svg
        width={width}
        height={H}
        role="img"
        aria-label={`${LABELS[metric]} over time: actual as a solid line, target as a dashed line. Use the arrow keys to read each period.`}
        tabIndex={0}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
        onKeyDown={onKey}
        onBlur={() => setHover(null)}
        className="block overflow-visible outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
      >
        {/* Missing readings: a band behind the grid, kept inside the plot so it never covers the axis labels. */}
        {gaps.map((g) => {
          const half = innerW / (n - 1) / 2;
          const left = Math.max(M.left, x(g.i) - half);
          const right = Math.min(M.left + innerW, x(g.i) + half);
          return (
            <g key={g.i}>
              <rect x={left} width={right - left} y={M.top} height={innerH} className="fill-surface" />
              <text x={(left + right) / 2} y={M.top + 16} textAnchor="middle" className="fill-muted text-[10px]">
                No reading
              </text>
            </g>
          );
        })}

        {ticks.map((t) => (
          <g key={t}>
            <line x1={M.left} x2={M.left + innerW} y1={y(t) + 0.5} y2={y(t) + 0.5} shapeRendering="crispEdges" className="stroke-line" />
            <text x={M.left - 10} y={y(t)} dy="0.32em" textAnchor="end" className="fill-muted text-xs">
              {fmt(t)}
            </text>
          </g>
        ))}


        {events.map((ev) => {
          const i = eventIndex(points, kind, ev.date);
          if (i < 0) return null;
          return (
            <g key={ev.label}>
              <line x1={x(i) + 0.5} x2={x(i) + 0.5} y1={M.top - 6} y2={M.top + innerH} strokeDasharray="2 3" shapeRendering="crispEdges" className="stroke-faint" />
              <text x={x(i) + 4} y={M.top - 10} className="fill-ink-2 text-xs">
                {ev.label}
              </text>
            </g>
          );
        })}

        <path d={targetPath} fill="none" strokeWidth={1.5} strokeDasharray="5 4" strokeLinecap="round" className="stroke-faint" />
        {segments.map((d) => (
          <path key={d} d={d} fill="none" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" className="stroke-bar" />
        ))}
        {points.map((p, i) => {
          const v = p.values[metric];
          if (v == null) return null;
          return (
            <circle
              key={p.key}
              cx={x(i)}
              cy={y(v)}
              r={p.partial ? 4 : 3.5}
              strokeWidth={p.partial ? 2 : 0}
              className={p.partial ? "fill-page stroke-bar" : "fill-bar stroke-bar"}
            />
          );
        })}

        {points.map((p, i) =>
          i % labelEvery === 0 || i === n - 1 ? (
            <text key={p.key} x={x(i)} y={H - 10} textAnchor="middle" className="fill-muted text-xs">
              {p.label}
            </text>
          ) : null,
        )}

        {hp && hover !== null && (
          <line x1={x(hover) + 0.5} x2={x(hover) + 0.5} y1={M.top} y2={M.top + innerH} shapeRendering="crispEdges" className="stroke-faint" strokeWidth={1} />
        )}
      </svg>

      {hp && hover !== null && (
        <Tooltip
          point={hp}
          metric={metric}
          kind={kind}
          gapReason={gapReason}
          event={events.find((ev) => eventIndex(points, kind, ev.date) === hover)}
          left={x(hover)}
          top={y(hp.values[metric] ?? hp.targets[metric] ?? 0)}
          width={width}
        />
      )}
    </div>
  );
}

export function Trends({ data }: { data: DashboardData }) {
  const [kind, setKind] = useState<PeriodKind>("month");
  const [metric, setMetric] = useState<MetricKey>("workspaces");
  const points = data.trends[kind];
  const last = latest(points);
  const first = points[0];
  const lastLabel = kind === "week" ? `Week of ${dayMonth(last.key)}` : `${last.label}${last.partial ? " so far" : ""}`;

  const Item = ({ k, n, sub }: { k: MetricKey; n?: string; sub?: string }) => (
    <li>
      <button
        type="button"
        aria-pressed={metric === k}
        onClick={() => setMetric(k)}
        className={cx(
          "flex w-full items-start justify-between gap-2 rounded-xl px-3 py-2 text-left transition-colors duration-150 ease-in-out",
          metric === k ? "bg-panel dark:bg-zinc-750" : "hover:bg-hover",
        )}
      >
        <span>
          <span className="text-ink">
            {n && <span className="mr-2 text-xs text-muted">{n}</span>}
            {LABELS[k]}
          </span>
          {sub && <span className="block text-xs text-muted">{sub}</span>}
        </span>
        <ProgressPill ratio={ratio(last, k)} />
      </button>
    </li>
  );

  return (
    <section aria-labelledby="trends-title">
      <h2 id="trends-title" className="flex items-center gap-2 text-base font-medium text-ink">
        Trends <Illustrative />
      </h2>
      <div className="mt-6 grid gap-10 xl:grid-cols-[1fr_310px]">
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-4">
            <h3 className="flex items-center gap-2 font-medium text-ink">
              {LABELS[metric]}
              <HoverCard label={`What ${LABELS[metric]} means`}>
                <span className="block font-medium text-ink">{DEFINITIONS[metric].what}</span>
                <span className="mt-1 block">{DEFINITIONS[metric].read}</span>
              </HoverCard>
            </h3>
            <dl className="flex gap-6 text-right">
              <div>
                <dt className="text-xs text-muted">{lastLabel}</dt>
                <dd className="text-xl font-semibold text-ink">{formatValue(metric, last.values[metric] ?? null)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Target</dt>
                <dd className="text-xl font-semibold text-muted">{formatValue(metric, last.targets[metric] ?? null)}</dd>
              </div>
            </dl>
          </div>
          <div className="mt-4">
            <Chart
              points={points}
              metric={metric}
              kind={kind}
              events={data.events}
              gapReason={data.gaps[0]?.reason ?? "no reading"}
            />
          </div>
          <ul className="mt-3 flex gap-5 text-xs text-muted">
            <li className="flex items-center gap-2">
              <svg width="18" height="4" aria-hidden>
                <line x1="0" x2="18" y1="2" y2="2" strokeWidth="2" className="stroke-bar" />
              </svg>
              Actual
            </li>
            <li className="flex items-center gap-2">
              <svg width="18" height="4" aria-hidden>
                <line x1="0" x2="18" y1="2" y2="2" strokeWidth="1.5" strokeDasharray="4 3" className="stroke-faint" />
              </svg>
              Target
            </li>
            <li className="flex items-center gap-2">
              <span aria-hidden className="size-3 rounded-sm bg-surface" /> No reading: a gap, never a zero
            </li>
          </ul>
        </div>

        <aside className="rounded-2xl bg-surface p-4" aria-label="Pick a metric">
          <p className="text-xs font-medium text-ink-2">Timeline</p>
          <div className="mt-2">
            <Segmented
              label="Timeline"
              value={kind}
              onChange={setKind}
              options={[
                { value: "week", label: "Weeks" },
                { value: "month", label: "Months" },
              ]}
            />
          </div>
          <p className="mt-3 text-xs text-muted">
            {first.label} – {points.at(-1)!.label}
            {kind === "month" ? ", with the plan ahead" : ""}
          </p>
          <p className="mt-1 text-xs text-muted">Flags judge the latest {kind}: {lastLabel}.</p>

          <p className="mt-5 px-3 text-xs font-medium text-ink-2">The six numbers</p>
          <ul className="mt-1">
            {SIX.map((m) => (
              <Item key={m.key} k={m.key} n={m.n} sub={m.what} />
            ))}
          </ul>
          <p className="mt-4 px-3 text-xs font-medium text-ink-2">Outcomes they move</p>
          <ul className="mt-1">
            {OUTCOMES.map((m) => (
              <Item key={m.key} k={m.key} />
            ))}
          </ul>
        </aside>
      </div>
    </section>
  );
}
