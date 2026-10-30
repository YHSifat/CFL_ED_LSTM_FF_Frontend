"use client";

import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ObservedPredictedSeries } from "@/lib/sampleData";

export default function ObservedPredictedChart({
  series,
  height = 220,
  compact = false,
}: {
  series: ObservedPredictedSeries;
  height?: number;
  compact?: boolean;
}) {
  const nowLabel = series.points[series.nowIndex]?.timeLabel ?? "";

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={series.points} margin={{ top: 8, right: compact ? 4 : 28, left: compact ? -20 : 0, bottom: 0 }}>
        {!compact && <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />}
        <XAxis
          dataKey="timeLabel"
          hide={compact}
          tick={{ fontSize: 10, fill: "var(--text-tertiary)" }}
          // Show only as many labels as fit without overlapping, always the first and last.
          interval="preserveStartEnd"
          minTickGap={compact ? 16 : 28}
          tickMargin={6}
          padding={{ left: 10, right: 10 }}
          axisLine={{ stroke: "var(--border)" }}
          tickLine={false}
        />
        <YAxis
          hide={compact}
          tick={{ fontSize: 10, fill: "var(--text-tertiary)" }}
          axisLine={false}
          tickLine={false}
          width={44}
          tickFormatter={(v: number) => v.toFixed(2)}
          domain={["dataMin - 0.3", "dataMax + 0.3"]}
        />
        {!compact && (
          <Tooltip
            contentStyle={{
              borderRadius: 10,
              borderColor: "var(--border)",
              fontSize: 12,
            }}
          />
        )}
        <ReferenceLine
          y={series.dangerLevel}
          stroke="var(--status-danger-fg)"
          strokeDasharray="4 4"
          label={
            compact
              ? undefined
              : { value: "Danger level", position: "insideTopRight", fontSize: 10, fill: "var(--status-danger-fg)" }
          }
        />
        {nowLabel && <ReferenceLine x={nowLabel} stroke="var(--text-tertiary)" strokeDasharray="2 3" />}
        <Line
          type="monotone"
          dataKey="observed"
          stroke="var(--text-primary)"
          strokeWidth={2}
          dot={false}
          connectNulls={false}
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="predicted"
          stroke="var(--accent)"
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
