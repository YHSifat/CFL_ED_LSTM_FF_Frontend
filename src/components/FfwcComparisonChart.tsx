"use client";

import {
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { FfwcComparisonSeries } from "@/lib/sampleData";

export default function FfwcComparisonChart({
  series,
  height = 320,
}: {
  series: FfwcComparisonSeries;
  height?: number;
}) {
  const dateLabel = series.points[series.dateIndex]?.dateLabel ?? "";

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={series.points} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="dateLabel"
          tick={{ fontSize: 10, fill: "var(--text-tertiary)" }}
          axisLine={{ stroke: "var(--border)" }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "var(--text-tertiary)" }}
          axisLine={false}
          tickLine={false}
          width={36}
          domain={["dataMin - 0.3", "dataMax + 0.3"]}
        />
        <Tooltip contentStyle={{ borderRadius: 10, borderColor: "var(--border)", fontSize: 12 }} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <ReferenceLine
          y={series.dangerLevel}
          stroke="var(--status-danger-fg)"
          strokeDasharray="4 4"
          label={{ value: "Danger level", position: "insideTopRight", fontSize: 10, fill: "var(--status-danger-fg)" }}
        />
        <ReferenceLine x={dateLabel} stroke="var(--text-tertiary)" strokeDasharray="2 3" />
        <Line
          type="monotone"
          dataKey="our"
          name="CFL-EDLSTM (ours)"
          stroke="var(--accent)"
          strokeWidth={2.5}
          dot={false}
          connectNulls
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="ffwcObserved"
          name="FFWC (Observed)"
          stroke="var(--text-primary)"
          strokeWidth={2}
          dot={false}
          connectNulls={false}
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="ffwcForecast"
          name="FFWC (Official forecast)"
          stroke="#B54708"
          strokeWidth={2}
          strokeDasharray="5 3"
          dot={false}
          connectNulls={false}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
