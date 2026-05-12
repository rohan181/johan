"use client";

import { useState } from "react";
import Link from "next/link";
import { User, TrendingUp, AlertCircle, CheckCircle, ExternalLink, Plus } from "lucide-react";
import { tenantSlug } from "@/lib/date-utils";
import AddEntryModal from "@/components/AddEntryModal";
import type { HolderSection } from "@/types";

interface Props {
  holders: HolderSection[];
  activeHolder: string | null;
  onSelect: (label: string | null) => void;
  locationName: string;
  locationGid: string;
  onEntryAdded?: () => void;
}

const fmt = (n: number) =>
  n.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });

function HolderCard({
  holder,
  isActive,
  locationGid,
  onClick,
  onAddEntry,
}: {
  holder: HolderSection;
  isActive: boolean;
  locationGid: string;
  onClick: () => void;
  onAddEntry: () => void;
}) {
  const outstanding = holder.totalDue - holder.totalPaid;
  const rate = holder.totalDue > 0 ? Math.round((holder.totalPaid / holder.totalDue) * 100) : 0;
  const tenantUrl = `/tenant/${locationGid}/${tenantSlug(holder.tenantName)}`;

  return (
    <div
      className={`rounded-2xl border p-5 transition-all ${
        isActive
          ? "border-blue-500 bg-blue-50 shadow-md shadow-blue-100"
          : "border-gray-100 bg-white hover:border-blue-300 hover:shadow-sm"
      }`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-4">
        <button onClick={onClick} className="flex items-center gap-3 flex-1 text-left">
          <div className={`p-2 rounded-xl shrink-0 ${isActive ? "bg-blue-600" : "bg-gray-100"}`}>
            <User size={16} className={isActive ? "text-white" : "text-gray-500"} />
          </div>
          <div>
            <p className="font-semibold text-gray-800 text-sm leading-tight">{holder.tenantName}</p>
            <p className="text-xs text-gray-400 mt-0.5">{holder.holderLabel}</p>
          </div>
        </button>

        <div className="flex items-center gap-2 shrink-0">
          {outstanding <= 0 ? (
            <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              <CheckCircle size={11} /> Overpaid
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs font-medium text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
              <AlertCircle size={11} /> Owing
            </span>
          )}
          {/* Add entry */}
          <button
            title="Add new entry"
            onClick={(e) => { e.stopPropagation(); onAddEntry(); }}
            className="p-1.5 rounded-lg bg-gray-100 hover:bg-emerald-100 hover:text-emerald-600 text-gray-500 transition-colors"
          >
            <Plus size={13} />
          </button>
          {/* Dedicated tenant page link */}
          <Link
            href={tenantUrl}
            title={`Open ${holder.tenantName}'s dedicated page`}
            className="p-1.5 rounded-lg bg-gray-100 hover:bg-blue-100 hover:text-blue-600 text-gray-500 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink size={13} />
          </Link>
        </div>
      </div>

      {/* Stats grid */}
      <button onClick={onClick} className="w-full text-left">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-gray-400">Due</p>
            <p className="text-base font-bold text-gray-800">{fmt(holder.totalDue)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Collected</p>
            <p className="text-base font-bold text-emerald-600">{fmt(holder.totalPaid)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">{outstanding > 0 ? "Outstanding" : "Credit"}</p>
            <p className={`text-base font-bold ${outstanding > 0 ? "text-rose-500" : "text-violet-500"}`}>
              {fmt(Math.abs(outstanding))}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Rate</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${Math.min(rate, 100)}%` }}
                />
              </div>
              <span className="text-xs font-semibold text-gray-600">{rate}%</span>
            </div>
          </div>
        </div>

        <p className="text-xs text-gray-400 mt-3">
          {holder.entries.length} entries · {holder.entries.filter((e) => e.isPaid).length} paid
        </p>
      </button>

      {/* View full page link */}
      <Link
        href={tenantUrl}
        className="mt-3 flex items-center justify-center gap-1.5 w-full py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
      >
        <ExternalLink size={11} />
        View Full Ledger
      </Link>
    </div>
  );
}

export default function HolderCards({ holders, activeHolder, onSelect, locationName, locationGid, onEntryAdded }: Props) {
  const [modalTenant, setModalTenant] = useState<string | null>(null);

  if (holders.length === 0) {
    return <p className="text-sm text-gray-400">No tenants found in {locationName}.</p>;
  }

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Tenants — {locationName}
          </h3>
          <button
            onClick={() => onSelect(null)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
              activeHolder === null
                ? "bg-blue-600 text-white border-blue-600"
                : "text-gray-500 border-gray-200 hover:border-blue-400 hover:text-blue-600"
            }`}
          >
            <TrendingUp size={11} className="inline mr-1" />
            All Tenants
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {holders.map((h) => (
            <HolderCard
              key={h.holderLabel}
              holder={h}
              isActive={activeHolder === h.holderLabel}
              locationGid={locationGid}
              onClick={() => onSelect(activeHolder === h.holderLabel ? null : h.holderLabel)}
              onAddEntry={() => setModalTenant(h.tenantName)}
            />
          ))}
        </div>
      </div>

      {modalTenant && (
        <AddEntryModal
          gid={locationGid}
          tenantName={modalTenant}
          onClose={() => setModalTenant(null)}
          onSuccess={() => {
            setModalTenant(null);
            onEntryAdded?.();
          }}
        />
      )}
    </>
  );
}
