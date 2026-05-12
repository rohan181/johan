"use client";

import { useState } from "react";
import { FileDown } from "lucide-react";
import type { LedgerRow } from "@/components/LedgerTable";

interface StatsSnapshot {
  totalDue: number;
  totalPaid: number;
  entryCount: number;
  paymentCount: number;
}

interface Props {
  title: string;
  subtitle?: string;
  dateFrom?: string;
  dateTo?: string;
  rows: LedgerRow[];
  stats: StatsSnapshot;
}

const fmt = (n: number) =>
  n.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });

export default function ExportPDFButton({ title, subtitle, dateFrom, dateTo, rows, stats }: Props) {
  const [busy, setBusy] = useState(false);

  async function handleExport() {
    setBusy(true);
    try {
      // Dynamic import — runs only in the browser, never during SSR
      const jsPDFModule = await import("jspdf");
      const jsPDF = jsPDFModule.default;
      const autoTableModule = await import("jspdf-autotable");
      const autoTable = autoTableModule.default;

      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      const now = new Date().toLocaleString("en-AU");

      // ── Title block ──────────────────────────────────────────────────────
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text(title, 14, 18);

      if (subtitle) {
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100);
        doc.text(subtitle, 14, 26);
      }

      let yStart = subtitle ? 30 : 24;

      if (dateFrom || dateTo) {
        doc.setFontSize(10);
        doc.setTextColor(80);
        const period = `Period: ${dateFrom || "start"} → ${dateTo || "now"}`;
        doc.text(period, 14, yStart);
        yStart += 6;
      }

      doc.setFontSize(9);
      doc.setTextColor(140);
      doc.text(`Generated: ${now}`, 14, yStart);
      doc.text(`${rows.length} entries`, pageW - 14, yStart, { align: "right" });

      // ── Stats summary ────────────────────────────────────────────────────
      const outstanding = stats.totalDue - stats.totalPaid;
      const rate = stats.totalDue > 0 ? Math.round((stats.totalPaid / stats.totalDue) * 100) : 0;

      autoTable(doc, {
        startY: yStart + 6,
        head: [["Total Due", "Total Collected", outstanding > 0 ? "Outstanding" : "Overpaid", "Collection Rate", "Entries", "Payments"]],
        body: [[
          fmt(stats.totalDue),
          fmt(stats.totalPaid),
          fmt(Math.abs(outstanding)),
          `${rate}%`,
          String(stats.entryCount),
          String(stats.paymentCount),
        ]],
        headStyles: { fillColor: [37, 99, 235], fontSize: 9 },
        bodyStyles: { fontSize: 9, fontStyle: "bold" },
        columnStyles: {
          0: { textColor: [37, 99, 235] },
          1: { textColor: [5, 150, 105] },
          2: { textColor: outstanding > 0 ? [220, 38, 38] : [124, 58, 237] },
          3: { textColor: [180, 100, 0] },
        },
        margin: { left: 14, right: 14 },
      });

      // ── Ledger table ─────────────────────────────────────────────────────
      const hasContext = rows.some((r) => r.locationName);

      const head: string[][] = [[]];
      if (hasContext) head[0].push("Location", "Tenant");
      head[0].push("Date", "Period Start", "Period End", "Amount Due", "Payment", "Paid On", "Status");

      const body = rows.map((r) => {
        const cols: string[] = [];
        if (hasContext) cols.push(r.locationName, r.tenantName);
        cols.push(
          r.date,
          r.startDate,
          r.endDate,
          fmt(r.amount),
          r.paymentAmount ? fmt(r.paymentAmount) : "—",
          r.paymentDate ?? "—",
          r.isPaid ? "Paid" : "Pending",
        );
        return cols;
      });

      // Subtotal row
      const totalDue = rows.reduce((s, r) => s + r.amount, 0);
      const totalPaid = rows.reduce((s, r) => s + (r.paymentAmount ?? 0), 0);
      const subtotal: string[] = [];
      if (hasContext) subtotal.push("", "");
      subtotal.push(`Subtotal (${rows.length})`, "", "", fmt(totalDue), fmt(totalPaid), "", "");

      const lastY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY ?? yStart + 24;

      autoTable(doc, {
        startY: lastY + 6,
        head,
        body: [...body, subtotal],
        headStyles: { fillColor: [55, 65, 81], fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        didParseCell(data) {
          // Status column colouring
          const statusColIdx = head[0].length - 1;
          if (data.section === "body" && data.column.index === statusColIdx) {
            if (data.cell.raw === "Paid") data.cell.styles.textColor = [5, 150, 105];
            if (data.cell.raw === "Pending") data.cell.styles.textColor = [220, 38, 38];
          }
          // Subtotal row bold
          if (data.section === "body" && data.row.index === body.length) {
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.fillColor = [239, 246, 255];
          }
        },
        margin: { left: 14, right: 14 },
      });

      // ── Save ─────────────────────────────────────────────────────────────
      const fileName = `${title.replace(/[^a-z0-9]/gi, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`;
      doc.save(fileName);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={busy || rows.length === 0}
      className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-lg transition-colors"
    >
      <FileDown size={14} className={busy ? "animate-bounce" : ""} />
      {busy ? "Generating…" : "Export PDF"}
    </button>
  );
}
