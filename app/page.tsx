"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { RefreshCw, Building2 } from "lucide-react";

import LocationFilter from "@/components/LocationFilter";
import HolderCards from "@/components/HolderCards";
import StatsCards from "@/components/StatsCards";
import LedgerTable, { type LedgerRow } from "@/components/LedgerTable";
import MonthlyChart from "@/components/MonthlyChart";
import WeeklyChart from "@/components/WeeklyChart";
import DateRangeFilter from "@/components/DateRangeFilter";
import ExportPDFButton from "@/components/ExportPDFButton";

import { buildMonthlyStats, buildWeeklyStats } from "@/lib/sheets";
import { inDateRange } from "@/lib/date-utils";
import type { SheetData, LedgerEntry, HolderSection } from "@/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function holderToRows(h: HolderSection, locationName: string, gid: string): LedgerRow[] {
  return h.entries.map((e) => ({
    ...e,
    id: parseInt(`${gid.slice(-4)}${h.holderLabel.replace(/\D/g, "0")}${e.id}`, 10) || e.id,
    holderLabel: h.holderLabel,
    tenantName: h.tenantName,
    locationName,
  }));
}

function calcStats(entries: LedgerEntry[]) {
  return {
    totalDue: entries.reduce((s, e) => s + e.amount, 0),
    totalPaid: entries.reduce((s, e) => s + (e.paymentAmount ?? 0), 0),
    balance: entries.reduce((s, e) => s + (e.paymentAmount ?? 0) - e.amount, 0),
    entryCount: entries.length,
    paymentCount: entries.filter((e) => e.paymentDate).length,
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [sheets, setSheets] = useState<SheetData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Filters
  const [activeLocation, setActiveLocation] = useState<string | null>(null);
  const [activeHolder, setActiveHolder] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/sheets");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setSheets(json.sheets ?? []);
      setLastUpdated(new Date());
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleLocationChange = (gid: string | null) => {
    setActiveLocation(gid);
    setActiveHolder(null);
  };

  // ── Derived data ──────────────────────────────────────────────────────────

  const visibleSheets = useMemo(
    () => (activeLocation === null ? sheets : sheets.filter((s) => s.gid === activeLocation)),
    [sheets, activeLocation]
  );

  const activeSheet = useMemo(
    () => (activeLocation ? sheets.find((s) => s.gid === activeLocation) ?? null : null),
    [sheets, activeLocation]
  );

  const visibleHolders = useMemo(
    () => visibleSheets.flatMap((s) => s.holders),
    [visibleSheets]
  );

  /** All entries for selected location + holder, BEFORE date filter */
  const baseEntries = useMemo(() => {
    const holders =
      activeHolder === null
        ? visibleHolders
        : visibleHolders.filter((h) => h.holderLabel === activeHolder);
    return holders.flatMap((h) => h.entries);
  }, [visibleHolders, activeHolder]);

  /** Entries after date range filter — drives stats + charts */
  const filteredEntries = useMemo(
    () => baseEntries.filter((e) => inDateRange(e.startDate, dateFrom, dateTo)),
    [baseEntries, dateFrom, dateTo]
  );

  /** Table rows */
  const tableRows = useMemo<LedgerRow[]>(() => {
    const sheets = visibleSheets;
    const rows: LedgerRow[] = [];
    for (const s of sheets) {
      for (const h of s.holders) {
        if (activeHolder !== null && h.holderLabel !== activeHolder) continue;
        for (const e of h.entries) {
          if (!inDateRange(e.startDate, dateFrom, dateTo)) continue;
          rows.push({
            ...e,
            holderLabel: h.holderLabel,
            tenantName: h.tenantName,
            locationName: s.locationName,
          });
        }
      }
    }
    return rows;
  }, [visibleSheets, activeHolder, dateFrom, dateTo]);

  const showContext = activeLocation === null || activeHolder === null;

  const statsLabel = useMemo(() => {
    if (activeHolder) {
      const h = visibleHolders.find((h) => h.holderLabel === activeHolder);
      return h ? `${h.tenantName}` : activeHolder;
    }
    if (activeSheet) return activeSheet.locationName;
    return "All Locations";
  }, [activeHolder, activeSheet, visibleHolders]);

  const statsData = useMemo(() => calcStats(filteredEntries), [filteredEntries]);
  const monthly = useMemo(() => buildMonthlyStats(filteredEntries), [filteredEntries]);
  const weekly = useMemo(() => buildWeeklyStats(filteredEntries), [filteredEntries]);

  const pdfTitle = useMemo(() => {
    if (activeHolder) return visibleHolders.find((h) => h.holderLabel === activeHolder)?.tenantName ?? activeHolder;
    if (activeSheet) return activeSheet.locationName;
    return "Rent Ledger — All Locations";
  }, [activeHolder, activeSheet, visibleHolders]);

  // ── Location overview cards ───────────────────────────────────────────────

  const LocationOverview = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {sheets.map((s) => {
        const outstanding = s.totalDue - s.totalPaid;
        const rate = s.totalDue > 0 ? Math.round((s.totalPaid / s.totalDue) * 100) : 0;
        const fmtc = (n: number) =>
          n.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });
        return (
          <button
            key={s.gid}
            onClick={() => handleLocationChange(s.gid)}
            className="text-left bg-white rounded-2xl border border-gray-100 p-5 hover:border-blue-300 hover:shadow-sm transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold text-gray-800">{s.locationName}</p>
              <span className="text-xs text-gray-400">
                {s.holders.length} tenant{s.holders.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-xs text-gray-400">Due</p>
                <p className="text-sm font-bold text-gray-800">{fmtc(s.totalDue)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Collected</p>
                <p className="text-sm font-bold text-emerald-600">{fmtc(s.totalPaid)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">{outstanding > 0 ? "Owing" : "Credit"}</p>
                <p className={`text-sm font-bold ${outstanding > 0 ? "text-rose-500" : "text-violet-500"}`}>
                  {fmtc(Math.abs(outstanding))}
                </p>
              </div>
            </div>
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Collection</span>
                <span>{rate}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${Math.min(rate, 100)}%` }} />
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-xl">
              <Building2 size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-800">Rent Ledger</h1>
              <p className="text-xs text-gray-400">Multi-Location Collection Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="text-xs text-gray-400 hidden sm:block">
                Updated {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={load}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && sheets.length === 0 && (
          <div className="space-y-6 animate-pulse">
            <div className="flex gap-2">{[...Array(4)].map((_, i) => <div key={i} className="h-10 w-32 bg-gray-200 rounded-xl" />)}</div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-white rounded-2xl border border-gray-100" />)}</div>
            <div className="h-72 bg-white rounded-2xl border border-gray-100" />
          </div>
        )}

        {sheets.length > 0 && (
          <>
            {/* Location filter */}
            <LocationFilter sheets={sheets} active={activeLocation} onChange={handleLocationChange} />

            {/* All-locations overview */}
            {activeLocation === null && sheets.length > 1 && (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Locations</h2>
                <LocationOverview />
              </div>
            )}

            {/* Holder cards */}
            {activeSheet && (
              <HolderCards
                holders={activeSheet.holders}
                activeHolder={activeHolder}
                onSelect={setActiveHolder}
                locationName={activeSheet.locationName}
                locationGid={activeSheet.gid}
                onEntryAdded={load}
              />
            )}

            {/* Stats */}
            <StatsCards data={statsData} label={statsLabel} />

            {/* Date range filter + PDF export toolbar */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex flex-wrap items-center gap-4 justify-between">
              <DateRangeFilter from={dateFrom} to={dateTo} onChange={(f, t) => { setDateFrom(f); setDateTo(t); }} />
              <ExportPDFButton
                title={pdfTitle}
                subtitle={activeSheet ? `Location: ${activeSheet.locationName}` : undefined}
                dateFrom={dateFrom || undefined}
                dateTo={dateTo || undefined}
                rows={tableRows}
                stats={statsData}
              />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <MonthlyChart data={monthly} />
              <WeeklyChart data={weekly} />
            </div>

            {/* Ledger table */}
            <div>
              <h3 className="text-base font-semibold text-gray-700 mb-3">
                Ledger Entries
                {activeHolder && (
                  <span className="ml-2 text-sm text-gray-400 font-normal">
                    — {visibleHolders.find((h) => h.holderLabel === activeHolder)?.tenantName}
                  </span>
                )}
              </h3>
              <LedgerTable rows={tableRows} showContext={showContext} />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
