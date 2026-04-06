"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { PropertyConfig } from "@/lib/config";
import { SessionRecord } from "@/lib/mock";
import { buildChartData } from "@/lib/chart-utils";

interface LineChartPanelProps {
  data: SessionRecord[];
  properties: PropertyConfig[];
  toggleStates: Record<string, boolean>;
  colors: Record<string, string>;
}

function formatDate(value: string | number): string {
  const d = new Date(String(value) + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatTooltipLabel(label: React.ReactNode): string {
  const d = new Date(String(label) + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function LineChartPanel({
  data,
  properties,
  toggleStates,
  colors,
}: LineChartPanelProps) {
  const chartData = buildChartData(data, properties, toggleStates);
  const visibleProps = properties.filter(
    (p) => toggleStates[p.propertyId] !== false
  );

  if (chartData.length === 0) {
    return (
      <div
        style={{
          height: 400,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f9fafb",
          borderRadius: "8px",
          border: "1px solid #e5e7eb",
          color: "#6b7280",
          fontSize: "0.95rem",
        }}
      >
        No data to display. Select a date range or sync data.
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: 420 }}>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="date"
            tickFormatter={(value: string | number) => formatDate(value)}
            tick={{ fontSize: 12, fill: "#6b7280" }}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 12, fill: "#6b7280" }}
            allowDecimals={false}
            domain={[0, "auto"]}
          />
          <Tooltip
            labelFormatter={formatTooltipLabel}
            contentStyle={{
              borderRadius: "8px",
              border: "1px solid #e5e7eb",
              fontSize: "0.85rem",
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: "0.85rem", paddingTop: "0.5rem" }}
          />
          {visibleProps.map((prop) => (
            <Line
              key={prop.propertyId}
              type="monotone"
              dataKey={prop.displayName}
              stroke={colors[prop.propertyId] || "#6b7280"}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
