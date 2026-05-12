"use client";

import { MapPin } from "lucide-react";
import type { SheetData } from "@/types";

interface Props {
  sheets: SheetData[];
  active: string | null; // gid, or null = "All"
  onChange: (gid: string | null) => void;
}

export default function LocationFilter({ sheets, active, onChange }: Props) {
  const tabs = [{ gid: null, label: "All Locations" }, ...sheets.map((s) => ({ gid: s.gid, label: s.locationName }))];

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <MapPin size={15} className="text-gray-400 shrink-0" />
      {tabs.map((tab) => {
        const isActive = active === tab.gid;
        return (
          <button
            key={String(tab.gid)}
            onClick={() => onChange(tab.gid)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
              isActive
                ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-100"
                : "bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
