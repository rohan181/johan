"use client";

import { useState, useMemo } from "react";
import { Search, ChevronUp, ChevronDown } from "lucide-react";
import type { LedgerEntry } from "@/types";

export interface LedgerRow extends LedgerEntry {
  holderLabel: string;
  tenantName: string;
  locationName: string;
}

interface Props {
  rows: LedgerRow[];
  /** When true, show Location + Holder columns */
  showContext?: boolean;
}

type SortKey = keyof LedgerRow;
type SortDir = "asc" | "desc";

const fmt = (n: number) =>
  n.toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  });

export default function LedgerTable({ rows, showContext = false }: Props) {
  const [search, setSearch] = useState("");
  const [filterPaid, setFilterPaid] = useState<"all" | "paid" | "unpaid">("all");
  const [sortKey, setSortKey] = useState<SortKey>("id");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows
      .filter((r) => {
        const matchSearch =
          !q ||
          r.date.toLowerCase().includes(q) ||
          r.type.toLowerCase().includes(q) ||
          r.startDate.includes(q) ||
          r.endDate.includes(q) ||
          r.tenantName.toLowerCase().includes(q) ||
          r.locationName.toLowerCase().includes(q) ||
          (r.paymentDate ?? "").includes(q) ||
          String(r.amount).includes(q);

        const matchPaid =
          filterPaid === "all" ||
          (filterPaid === "paid" && r.isPaid) ||
          (filterPaid === "unpaid" && !r.isPaid);

        return matchSearch && matchPaid;
      })
      .sort((a, b) => {
        const av = a[sortKey] ?? "";
        const bv = b[sortKey] ?? "";
        const cmp = String(av).localeCompare(String(bv), undefined, {
          numeric: true,
        });
        return sortDir === "asc" ? cmp : -cmp;
      });
  }, [rows, search, filterPaid, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ChevronUp size={13} className="text-gray-300" />;
    return sortDir === "asc" ? (
      <ChevronUp size={13} className="text-blue-500" />
    ) : (
      <ChevronDown size={13} className="text-blue-500" />
    );
  }

  const baseHeaders: { key: SortKey; label: string }[] = [
    { key: "date", label: "Date" },
    { key: "type", label: "Type" },
    { key: "startDate", label: "Period Start" },
    { key: "endDate", label: "Period End" },
    { key: "amount", label: "Due" },
    { key: "paymentAmount", label: "Payment" },
    { key: "paymentDate", label: "Paid On" },
  ];

  const contextHeaders: { key: SortKey; label: string }[] = showContext
    ? [
        { key: "locationName", label: "Location" },
        { key: "tenantName", label: "Tenant" },
      ]
    : [];

  const headers = [...contextHeaders, ...baseHeaders];

  // Totals for footer
  const totalDue = filtered.reduce((s, r) => s + r.amount, 0);
  const totalPaid = filtered.reduce((s, r) => s + (r.paymentAmount ?? 0), 0);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Toolbar */}
      <div className="p-4 border-b border-gray-100 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search by tenant, date, amount…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
          />
        </div>

        {/* Paid / Unpaid toggle */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {(["all", "paid", "unpaid"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilterPaid(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors capitalize ${
                filterPaid === f
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <span className="text-xs text-gray-400 ml-auto">{filtered.length} entries</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
            <tr>
              {headers.map((h) => (
                <th
                  key={h.key}
                  onClick={() => toggleSort(h.key)}
                  className="px-4 py-3 text-left cursor-pointer select-none hover:text-gray-700 whitespace-nowrap"
                >
                  <span className="flex items-center gap-1">
                    {h.label}
                    <SortIcon col={h.key} />
                  </span>
                </th>
              ))}
              <th className="px-4 py-3 text-left">Status</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={headers.length + 1}
                  className="text-center py-14 text-gray-400"
                >
                  No entries match your filters
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr
                  key={`${row.locationName}-${row.holderLabel}-${row.id}`}
                  className="hover:bg-gray-50/70 transition-colors"
                >
                  {showContext && (
                    <>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700">
                          {row.locationName}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700 font-medium whitespace-nowrap">
                        {row.tenantName}
                      </td>
                    </>
                  )}
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{row.date}</td>
                  <td className="px-4 py-3 text-gray-700">{row.type}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{row.startDate}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{row.endDate}</td>
                  <td className="px-4 py-3 font-semibold text-gray-800">{fmt(row.amount)}</td>
                  <td className="px-4 py-3 font-semibold text-emerald-600">
                    {row.paymentAmount ? fmt(row.paymentAmount) : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {row.paymentDate ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        row.isPaid
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-rose-50 text-rose-700"
                      }`}
                    >
                      {row.isPaid ? "Paid" : "Pending"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>

          {/* Totals footer */}
          {filtered.length > 0 && (
            <tfoot className="bg-gray-50 border-t border-gray-200 text-xs font-semibold text-gray-600">
              <tr>
                {showContext && <td className="px-4 py-3" colSpan={2} />}
                <td className="px-4 py-3" colSpan={4}>
                  Subtotal ({filtered.length} entries)
                </td>
                <td className="px-4 py-3 text-gray-800">{fmt(totalDue)}</td>
                <td className="px-4 py-3 text-emerald-600">{fmt(totalPaid)}</td>
                <td className="px-4 py-3" colSpan={2} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
