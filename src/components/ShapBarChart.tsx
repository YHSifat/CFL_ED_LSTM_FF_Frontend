"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ShapFeature } from "@/lib/sampleData";

export default function ShapBarChart({ shares, height = 220 }: { shares: ShapFeature[]; height?: number }) {
  const data = shares.map((s) => ({ feature: s.feature, value: Math.round(s.share * 1000) / 1000 }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" horizontal={false} />
        <XAxis
          type="number"
          domain={[0, "dataMax"]}
          tickFormatter={(v: number) => v.toFixed(2)}
          tick={{ fontSize: 10, fill: "var(--text-tertiary)" }}
          axisLine={{ stroke: "var(--border)" }}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="feature"
          width={100}
          tick={{ fontSize: 12, fill: "var(--text-primary)" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: "var(--background)" }}
          contentStyle={{ borderRadius: 10, borderColor: "var(--border)", fontSize: 12 }}
          formatter={(value) => [Number(value).toFixed(3), "Relative importance"]}
        />
        <Bar dataKey="value" radius={[0, 6, 6, 0]} isAnimationActive={false}>
          {data.map((d, i) => (
            <Cell key={d.feature} fill="var(--accent)" fillOpacity={1 - i * 0.15} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
