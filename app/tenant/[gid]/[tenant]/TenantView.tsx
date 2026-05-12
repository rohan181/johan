"use client";

import { useState, useMemo } from "react";
import { ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";

import StatsCards from "@/components/StatsCards";
import LedgerTable, { type LedgerRow } from "@/components/LedgerTable";
import MonthlyChart from "@/components/MonthlyChart";
import WeeklyChart from "@/components/WeeklyChart";
import DateRangeFilter from "@/components/DateRangeFilter";
import ExportPDFButton from "@/components/ExportPDFButton";
import AddEntryModal from "@/components/AddEntryModal";

import { buildMonthlyStats, buildWeeklyStats } from "@/lib/sheets";
import { inDateRange } from "@/lib/date-utils";
import type { HolderSection } from "@/types";

interface Props {
  holder: HolderSection;
  locationName: string;
  gid: string;
}

export default function TenantView({ holder, locationName, gid }: Props) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  const filteredEntries = useMemo(
    () => holder.entries.filter((e) => inDateRange(e.startDate, dateFrom, dateTo)),
    [holder.entries, dateFrom, dateTo]
  );

  const rows = useMemo<LedgerRow[]>(
    () =>
      filteredEntries.map((e) => ({
        ...e,
        holderLabel: holder.holderLabel,
        tenantName: holder.tenantName,
        locationName,
      })),
    [filteredEntries, holder, locationName]
  );

  const statsData = useMemo(() => ({
    totalDue: filteredEntries.reduce((s, e) => s + e.amount, 0),
    totalPaid: filteredEntries.reduce((s, e) => s + (e.paymentAmount ?? 0), 0),
    balance: filteredEntries.reduce((s, e) => s + (e.paymentAmount ?? 0) - e.amount, 0),
    entryCount: filteredEntries.length,
    paymentCount: filteredEntries.filter((e) => e.paymentDate).length,
  }), [filteredEntries]);

  const monthly = useMemo(() => buildMonthlyStats(filteredEntries), [filteredEntries]);
  const weekly = useMemo(() => buildWeeklyStats(filteredEntries), [filteredEntries]);

  return (
    <>
    {showAddModal && (
      <AddEntryModal
        gid={gid}
        tenantName={holder.tenantName}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => {
          setShowAddModal(false);
          // Reload the page so updated sheet data is fetched
          window.location.reload();
        }}
      />
    )}
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft size={18} className="text-gray-600" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-800">{holder.tenantName}</h1>
              <p className="text-xs text-gray-400">
                {locationName} · {holder.holderLabel}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
            >
              <Plus size={14} />
              Add Entry
            </button>
            <ExportPDFButton
              title={holder.tenantName}
              subtitle={`Location: ${locationName}`}
              dateFrom={dateFrom || undefined}
              dateTo={dateTo || undefined}
              rows={rows}
              stats={statsData}
            />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Quick bio */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex flex-wrap gap-6">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Tenant</p>
              <p className="text-xl font-bold text-gray-800 mt-0.5">{holder.tenantName}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Location</p>
              <p className="text-xl font-bold text-gray-800 mt-0.5">{locationName}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Section</p>
              <p className="text-xl font-bold text-gray-800 mt-0.5">{holder.holderLabel}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Tenant URL</p>
              <p className="text-sm font-mono text-blue-600 mt-0.5 break-all">
                /tenant/{gid}/{encodeURIComponent(holder.tenantName)}
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <StatsCards data={statsData} />

        {/* Date filter + export bar */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex flex-wrap items-center gap-4 justify-between">
          <DateRangeFilter
            from={dateFrom}
            to={dateTo}
            onChange={(f, t) => { setDateFrom(f); setDateTo(t); }}
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MonthlyChart data={monthly} />
          <WeeklyChart data={weekly} />
        </div>

        {/* Table */}
        <div>
          <h3 className="text-base font-semibold text-gray-700 mb-3">Ledger Entries</h3>
          <LedgerTable rows={rows} showContext={false} />
        </div>
      </main>
    </div>
    </>
  );
}
