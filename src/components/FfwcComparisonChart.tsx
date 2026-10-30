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
import type { ComparisonPoint } from "@/lib/liveData";

/** Observed readings vs our forecast vs FFWC's, on one issue day's forecast span. */
export default function FfwcComparisonChart({
  points,
  dangerLevel,
  height = 320,
}: {
  points: ComparisonPoint[];
  dangerLevel: number;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={points} margin={{ top: 8, right: 28, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: "var(--text-tertiary)" }}
          // Show only as many labels as fit without overlapping, always the first and last.
          interval="preserveStartEnd"
          minTickGap={28}
          tickMargin={6}
          padding={{ left: 10, right: 10 }}
          axisLine={{ stroke: "var(--border)" }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "var(--text-tertiary)" }}
          axisLine={false}
          tickLine={false}
          width={44}
          tickFormatter={(v: number) => v.toFixed(2)}
          domain={["dataMin - 0.3", "dataMax + 0.3"]}
        />
        <Tooltip contentStyle={{ borderRadius: 10, borderColor: "var(--border)", fontSize: 12 }} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <ReferenceLine
          y={dangerLevel}
          stroke="var(--status-danger-fg)"
          strokeDasharray="4 4"
          label={{ value: "Danger level", position: "insideTopRight", fontSize: 10, fill: "var(--status-danger-fg)" }}
        />
        <Line
          type="monotone"
          dataKey="observed"
          name="Observed"
          stroke="var(--text-primary)"
          strokeWidth={2}
          dot={false}
          connectNulls
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="ours"
          name="CFL-EDLSTM (ours)"
          stroke="var(--accent)"
          strokeWidth={2.5}
          strokeDasharray="5 3"
          dot={false}
          connectNulls
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="ffwc"
          name="FFWC forecast"
          stroke="#B54708"
          strokeWidth={2}
          dot={{ r: 2.5 }}
          connectNulls
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
