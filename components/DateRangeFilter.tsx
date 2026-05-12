"use client";

import { Calendar, X } from "lucide-react";

interface Props {
  from: string;   // YYYY-MM-DD or ""
  to: string;
  onChange: (from: string, to: string) => void;
}

export default function DateRangeFilter({ from, to, onChange }: Props) {
  const hasFilter = from || to;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Calendar size={15} className="text-gray-400 shrink-0" />

      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-gray-500 whitespace-nowrap">From</label>
          <input
            type="date"
            value={from}
            max={to || undefined}
            onChange={(e) => onChange(e.target.value, to)}
            className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 text-gray-700"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <label className="text-xs text-gray-500 whitespace-nowrap">To</label>
          <input
            type="date"
            value={to}
            min={from || undefined}
            onChange={(e) => onChange(from, e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 text-gray-700"
          />
        </div>

        {hasFilter && (
          <button
            onClick={() => onChange("", "")}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-rose-500 transition-colors px-2 py-1.5 rounded-lg border border-gray-200 hover:border-rose-300"
          >
            <X size={12} />
            Clear
          </button>
        )}
      </div>

      {hasFilter && (
        <span className="text-xs bg-blue-50 text-blue-600 font-medium px-2 py-0.5 rounded-full border border-blue-100">
          Date filtered
        </span>
      )}
    </div>
  );
}
