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
import { MODEL_NAMES, modelSeriesKey, type ModelComparisonSeries } from "@/lib/sampleData";
import { MODEL_COLORS } from "@/lib/modelColors";

export default function ModelComparisonChart({
  series,
  height = 340,
}: {
  series: ModelComparisonSeries;
  height?: number;
}) {
  const nowLabel = series.points[series.nowIndex]?.timeLabel ?? "";

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={series.points} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="timeLabel"
          tick={{ fontSize: 10, fill: "var(--text-tertiary)" }}
          interval={Math.ceil(series.points.length / 8)}
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
        <ReferenceLine x={nowLabel} stroke="var(--text-tertiary)" strokeDasharray="2 3" />
        <Line
          type="monotone"
          dataKey="observed"
          name="Observed"
          stroke="var(--text-primary)"
          strokeWidth={2.5}
          dot={false}
          connectNulls={false}
          isAnimationActive={false}
        />
        {MODEL_NAMES.map((model) => (
          <Line
            key={model}
            type="monotone"
            dataKey={modelSeriesKey(model)}
            name={model}
            stroke={MODEL_COLORS[model]}
            strokeWidth={model === "CFL-EDLSTM" ? 2.5 : 1.5}
            strokeDasharray={model === "CFL-EDLSTM" ? undefined : "5 3"}
            dot={false}
            connectNulls={false}
            isAnimationActive={false}
          />
        ))}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
