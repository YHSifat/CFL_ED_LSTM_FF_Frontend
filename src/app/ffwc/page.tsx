"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import FfwcComparisonChart from "@/components/FfwcComparisonChart";
import KpiCard from "@/components/KpiCard";
import LoadState from "@/components/LoadState";
import StationSelect from "@/components/StationSelect";
import SelectChevron from "@/components/SelectChevron";
import {
  FFWC_PRODUCT_LABEL,
  buildComparisonPoints,
  useComparisonDetail,
  useComparisonIssues,
  useComparisonSkill,
  useStationStatus,
  type ComparisonIssue,
  type ComparisonPoint,
  type SkillRow,
} from "@/lib/liveData";
import { stations } from "@/lib/stations";

type Scope = "issue" | "station" | "all";

const SCOPE_LABEL: Record<Scope, string> = {
  issue: "This issue",
  station: "All issues",
  all: "All stations",
};

const issueKey = (i: ComparisonIssue) => `${i.issued_on}|${i.ffwc_product}`;

function mean(values: number[]): number | null {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
}

const dhakaDay = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" });

/** Error per lead day for one issue, from its scored points (same shape as comparison_skill). */
function issueSkill(issue: ComparisonIssue, scored: ComparisonPoint[]): SkillRow[] {
  const byLead = new Map<number, ComparisonPoint[]>();
  for (const p of scored) {
    const lead = Math.round((Date.parse(dhakaDay.format(new Date(p.time))) - Date.parse(issue.issued_on)) / 86_400_000);
    byLead.set(lead, [...(byLead.get(lead) ?? []), p]);
  }
  const rmse = (errors: number[]) => Math.sqrt(mean(errors.map((e) => e * e)) ?? 0);
  return [...byLead.entries()]
    .sort(([a], [b]) => a - b)
    .map(([lead, pts]) => {
      const ours = pts.map((p) => p.ours! - p.observed!);
      const ffwc = pts.map((p) => p.ffwc! - p.observed!);
      return {
        ffwc_product: issue.ffwc_product,
        lead_days: lead,
        n: pts.length,
        mae_ours: mean(ours.map(Math.abs))!,
        mae_ffwc: mean(ffwc.map(Math.abs))!,
        rmse_ours: rmse(ours),
        rmse_ffwc: rmse(ffwc),
      };
    });
}

function FfwcContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const stationParam = searchParams.get("station");
  const station = stations.find((s) => s.station_id === stationParam) ?? stations[0];
  const scopeParam = searchParams.get("scope");
  const scope: Scope = scopeParam === "all" || scopeParam === "station" ? scopeParam : "issue";

  function updateParams(next: { station?: string; issue?: string | null; scope?: Scope }) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.station) params.set("station", next.station);
    if (next.issue === null) params.delete("issue");
    else if (next.issue) params.set("issue", next.issue);
    if (next.scope) params.set("scope", next.scope);
    router.push(`/ffwc?${params.toString()}`, { scroll: false });
  }

  const statusMap = useStationStatus();
  const issues = useComparisonIssues(station.station_id);
  const issueList = issues.state === "ready" ? issues.data : [];
  const issue = issueList.find((i) => issueKey(i) === searchParams.get("issue")) ?? issueList[0] ?? null;
  const detail = useComparisonDetail(station.station_id, issue);
  const skill = useComparisonSkill(scope === "all" ? null : station.station_id);

  const live = statusMap.state === "ready" ? statusMap.data.get(station.station_id) : undefined;
  const dangerLevel = live?.danger_level ?? station.danger_level_m;
  const points = detail.state === "ready" ? buildComparisonPoints(detail.data) : [];
  const scored = points.filter((p) => p.observed != null && p.ours != null && p.ffwc != null);
  const maeOurs = mean(scored.map((p) => Math.abs(p.ours! - p.observed!)));
  const maeFfwc = mean(scored.map((p) => Math.abs(p.ffwc! - p.observed!)));
  const thisIssueRows = issue ? issueSkill(issue, scored) : [];

  return (
    <div className="flex flex-col gap-5 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/" className="text-xs font-medium text-text-secondary hover:text-accent">
            ← Map
          </Link>
          <h1 className="mt-1 text-lg font-semibold text-text-primary">
            {station.station_name}{" "}
            <span className="font-mono text-sm font-normal text-text-tertiary">{station.station_id}</span>
          </h1>
          <p className="text-sm text-text-secondary">Our forecast vs. FFWC&apos;s, checked against observed readings</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <StationSelect
            stations={stations}
            value={station.station_id}
            onChange={(id) => updateParams({ station: id, issue: null })}
          />
          {issueList.length > 0 && issue && (
            <div className="relative inline-block shrink-0">
              <select
                value={issueKey(issue)}
                onChange={(e) => updateParams({ issue: e.target.value })}
                className="appearance-none rounded-full border border-border bg-card py-2 pl-4 pr-10 text-sm font-medium text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent/30"
              >
                {issueList.map((i) => (
                  <option key={issueKey(i)} value={issueKey(i)}>
                    Issued {i.issued_on} · {FFWC_PRODUCT_LABEL[i.ffwc_product] ?? i.ffwc_product}
                  </option>
                ))}
              </select>
              <SelectChevron />
            </div>
          )}
        </div>
      </div>

      {issues.state !== "ready" || issueList.length === 0 ? (
        <LoadState result={issues} empty="No issue day has both our forecast and FFWC's for this station yet." />
      ) : (
        <>
          <div className="flex flex-wrap gap-3">
            <KpiCard label="Matched points with a reading" value={`${scored.length}`} sub={issue && <span className="text-xs text-text-tertiary">of {issue.n} FFWC values</span>} />
            <KpiCard label="MAE, ours" value={maeOurs == null ? "–" : maeOurs.toFixed(3)} unit="m" accent />
            <KpiCard label="MAE, FFWC" value={maeFfwc == null ? "–" : maeFfwc.toFixed(3)} unit="m" />
          </div>

          <div className="rounded-[var(--radius-card)] border border-border bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold text-text-primary">
              Forecasts issued {issue?.issued_on} vs. what happened
            </h2>
            {points.length ? (
              <FfwcComparisonChart points={points} dangerLevel={dangerLevel} height={320} />
            ) : (
              <LoadState result={detail} empty="No data for this issue day." height={320} />
            )}
            {scored.length === 0 && detail.state === "ready" && (
              <p className="mt-2 text-xs text-text-tertiary">
                These target times haven&apos;t been observed yet; errors appear once FFWC posts the readings.
              </p>
            )}
          </div>
        </>
      )}

      <div className="rounded-[var(--radius-card)] border border-border bg-card p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-text-primary">
            Performance by lead time
            {scope === "issue" && issue && (
              <span className="ml-1 font-normal text-text-tertiary">· issued {issue.issued_on}</span>
            )}
          </h2>
          <div className="inline-flex gap-1.5">
            {(["issue", "station", "all"] as Scope[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => updateParams({ scope: s })}
                className="rounded-full px-4 py-1.5 text-xs font-medium"
                style={
                  scope === s
                    ? { background: "var(--accent)", color: "#fff" }
                    : { background: "var(--card)", color: "var(--text-secondary)", border: "1px solid var(--border)" }
                }
              >
                {SCOPE_LABEL[s]}
              </button>
            ))}
          </div>
        </div>
        {scope === "issue" ? (
          thisIssueRows.length ? (
            <SkillTables rows={thisIssueRows} />
          ) : (
            <LoadState result={detail} empty="None of this issue's target times have a reading yet." />
          )
        ) : skill.state === "ready" && skill.data.length ? (
          <SkillTables rows={skill.data} />
        ) : (
          <LoadState result={skill} empty="No scored forecasts yet." />
        )}
        <p className="mt-3 text-xs text-text-tertiary">
          Mean absolute error (MAE) in metres, only at times where both forecasts exist and FFWC has posted the
          reading. Lead day = target day − issue day. Our forecasts before 30 Oct 2026 are hindcasts: the model was
          run later, using only data available on the issue day. Source:{" "}
          <a href="https://www.ffwc.gov.bd/" target="_blank" rel="noopener noreferrer" className="underline hover:text-accent">
            Flood Forecasting &amp; Warning Centre (FFWC), BWDB
          </a>
          .
        </p>
      </div>
    </div>
  );
}

function SkillTables({ rows }: { rows: SkillRow[] }) {
  const products = [...new Set(rows.map((r) => r.ffwc_product))];
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {products.map((product) => (
        <div key={product}>
          <h3 className="mb-2 text-xs font-semibold text-text-secondary">vs. {FFWC_PRODUCT_LABEL[product] ?? product}</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-tertiary">
                <th className="py-1 font-medium">Lead</th>
                <th className="py-1 text-right font-medium">Points</th>
                <th className="py-1 text-right font-medium">MAE ours</th>
                <th className="py-1 text-right font-medium">MAE FFWC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-mono">
              {rows
                .filter((r) => r.ffwc_product === product)
                .map((r) => {
                  const oursBetter = r.mae_ours < r.mae_ffwc;
                  return (
                    <tr key={r.lead_days}>
                      <td className="py-1.5 text-text-secondary">Day {r.lead_days}</td>
                      <td className="py-1.5 text-right text-text-tertiary">{r.n}</td>
                      <td className="py-1.5 text-right" style={{ fontWeight: oursBetter ? 600 : 400, color: oursBetter ? "var(--accent)" : undefined }}>
                        {r.mae_ours.toFixed(3)}
                      </td>
                      <td className="py-1.5 text-right" style={{ fontWeight: oursBetter ? 400 : 600 }}>
                        {r.mae_ffwc.toFixed(3)}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

export default function FfwcPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-text-secondary">Loading…</div>}>
      <FfwcContent />
    </Suspense>
  );
}
