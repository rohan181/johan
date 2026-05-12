"use client";

import { DollarSign, TrendingUp, TrendingDown, AlertCircle } from "lucide-react";

interface StatsData {
  totalDue: number;
  totalPaid: number;
  balance: number;
  entryCount: number;
  paymentCount: number;
}

interface Props {
  data: StatsData;
  label?: string;
}

const fmt = (n: number) =>
  n.toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  });

function Card({
  title,
  value,
  icon: Icon,
  color,
  sub,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  color: string;
  sub?: string;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-start gap-4">
      <div className={`p-3 rounded-xl ${color} shrink-0`}>
        <Icon size={20} className="text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide truncate">
          {title}
        </p>
        <p className="text-2xl font-bold text-gray-800 mt-0.5 leading-tight">
          {value}
        </p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

export default function StatsCards({ data, label }: Props) {
  const { totalDue, totalPaid, balance, entryCount, paymentCount } = data;
  const outstanding = totalDue - totalPaid;
  const rate = totalDue > 0 ? Math.round((totalPaid / totalDue) * 100) : 0;

  return (
    <div className="space-y-2">
      {label && (
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">
          {label}
        </p>
      )}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card
          title="Total Due"
          value={fmt(totalDue)}
          icon={DollarSign}
          color="bg-blue-500"
          sub={`${entryCount} weekly entries`}
        />
        <Card
          title="Total Collected"
          value={fmt(totalPaid)}
          icon={TrendingUp}
          color="bg-emerald-500"
          sub={`${paymentCount} payments`}
        />
        <Card
          title={outstanding > 0 ? "Outstanding" : "Overpaid"}
          value={fmt(Math.abs(outstanding > 0 ? outstanding : balance))}
          icon={outstanding > 0 ? AlertCircle : TrendingDown}
          color={outstanding > 0 ? "bg-rose-500" : "bg-violet-500"}
          sub={outstanding > 0 ? "Rent not yet received" : "Credit on account"}
        />
        <Card
          title="Collection Rate"
          value={`${rate}%`}
          icon={TrendingUp}
          color="bg-amber-500"
          sub={`${fmt(totalPaid)} of ${fmt(totalDue)}`}
        />
      </div>
    </div>
  );
}
