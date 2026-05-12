"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { WeeklyStats } from "@/types";

interface Props {
  data: WeeklyStats[];
}

const fmt = (v: number) => `$${v.toLocaleString()}`;

// Show only every Nth label to avoid crowding
function tickFormatter(value: string, index: number, total: number) {
  if (total <= 8 || index % Math.ceil(total / 8) === 0) return value;
  return "";
}

export default function WeeklyChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center justify-center h-72 text-gray-400 text-sm">
        No weekly data available
      </div>
    );
  }

  const total = data.length;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h3 className="text-base font-semibold text-gray-700 mb-6">Weekly Breakdown</h3>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="dueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="paidFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="weekLabel"
            tickFormatter={(v, i) => tickFormatter(v, i, total)}
            tick={{ fontSize: 11, fill: "#6b7280" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={fmt}
            tick={{ fontSize: 12, fill: "#6b7280" }}
            axisLine={false}
            tickLine={false}
            width={70}
          />
          <Tooltip
            labelFormatter={(label) => `Week of ${label}`}
            formatter={(value) => [`$${Number(value).toLocaleString()}`, ""]}
            contentStyle={{
              borderRadius: "12px",
              border: "1px solid #e5e7eb",
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
            }}
          />
          <Legend wrapperStyle={{ fontSize: "12px" }} />
          <Area
            type="monotone"
            dataKey="due"
            name="Rent Due"
            stroke="#3b82f6"
            strokeWidth={2}
            fill="url(#dueFill)"
          />
          <Area
            type="monotone"
            dataKey="paid"
            name="Collected"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#paidFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
