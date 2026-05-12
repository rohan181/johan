import type {
  LedgerEntry,
  HolderSection,
  SheetData,
  MonthlyStats,
  WeeklyStats,
} from "@/types";

const SHEET_ID =
  process.env.NEXT_PUBLIC_SHEET_ID ||
  "1ThpyRBzZHlKDntoO2i32g5IJmQ3Mhk7LtL_mGRnr3Jk";

// ── Date helpers ─────────────────────────────────────────────────────────────

/** DD/MM/YYYY → YYYY-MM-DD. Returns null for non-date strings. */
function toISO(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const m = String(raw).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
}

/** YYYY-MM-DD → DD/MM/YYYY for display */
function toDMY(iso: string | null): string {
  if (!iso) return "";
  const [yyyy, mm, dd] = iso.split("-");
  return `${dd}/${mm}/${yyyy}`;
}

// ── gviz types ───────────────────────────────────────────────────────────────

interface GvizCell {
  v: unknown;
  f?: string;
}

interface GvizRow {
  c: Array<GvizCell | null> | null;
}

interface GvizResponse {
  table: {
    cols: Array<{ id: string; label: string; type: string }>;
    rows: GvizRow[];
  };
}

// ── Core fetcher ─────────────────────────────────────────────────────────────

async function fetchRawRows(gid: string): Promise<GvizRow[]> {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&headers=0&gid=${gid}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`gviz fetch failed for gid=${gid}: HTTP ${res.status}`);

  const text = await res.text();
  const start = text.indexOf("(");
  const end = text.lastIndexOf(")");
  if (start === -1 || end === -1) throw new Error(`Invalid gviz response for gid=${gid}`);

  const data: GvizResponse = JSON.parse(text.slice(start + 1, end));
  return data.table.rows ?? [];
}

// ── Cell helpers ─────────────────────────────────────────────────────────────

function cellStr(cell: GvizCell | null | undefined): string {
  return String(cell?.v ?? "").trim();
}

function cellNum(cell: GvizCell | null | undefined): number {
  const v = cell?.v;
  if (v === null || v === undefined) return 0;
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

// ── Sheet parser ──────────────────────────────────────────────────────────────
//
// New sheet format (columns):
//   A: Date   B: Tenant Name   C: Start Date   D: End Date
//   E: Amount ($)   F: Payment Amount ($)   G: Payment Date
//
// All tenants share one flat table per sheet (one row per tenant per week).
// Rows are grouped by tenant name (column B) to form HolderSection objects.

export async function fetchSheetData(
  gid: string,
  locationName: string
): Promise<SheetData> {
  const rows = await fetchRawRows(gid);

  // phase: skip the location-header row and the column-header row,
  // then accumulate data rows.
  let phase: "scan" | "colheaders" | "data" = "scan";

  // tenantName → ordered list of LedgerEntry
  const tenantMap = new Map<string, LedgerEntry[]>();
  // preserve insertion order (i.e. the order tenants first appear)
  const tenantOrder: string[] = [];
  let entryId = 1;

  for (const row of rows) {
    const cells = row.c ?? [];
    const a = cellStr(cells[0]); // Date / location header
    const b = cellStr(cells[1]); // Tenant Name / "GRAND TOTAL"

    // ── Location header row: "Holder1  —  Weekly Rent Ledger" ────────────
    if (/rent.{0,15}ledger/i.test(a)) {
      phase = "colheaders";
      continue;
    }

    if (phase === "scan") continue;

    // ── Column-header row: "Date | Tenant Name | Start Date | …" ─────────
    if (phase === "colheaders") {
      phase = "data";
      continue;
    }

    // ── Data rows ─────────────────────────────────────────────────────────
    // Skip GRAND TOTAL and any blank rows
    if (/total/i.test(b) || (!a && !b)) continue;

    const tenantName = b || "Unknown";
    if (!tenantMap.has(tenantName)) {
      tenantMap.set(tenantName, []);
      tenantOrder.push(tenantName);
    }

    const payAmt = cellNum(cells[5]);
    const payDateISO = toISO(cellStr(cells[6]));

    tenantMap.get(tenantName)!.push({
      id: entryId++,
      date: toDMY(toISO(a)),
      type: "Week Rent",
      startDate: toDMY(toISO(cellStr(cells[2]))),
      endDate: toDMY(toISO(cellStr(cells[3]))),
      amount: cellNum(cells[4]),
      paymentAmount: payAmt > 0 ? payAmt : null,
      paymentDate: payDateISO ? toDMY(payDateISO) : null,
      isPaid: payAmt > 0,
    });
  }

  // Build HolderSection for each tenant (preserving row order)
  const holders: HolderSection[] = tenantOrder.map((tenantName) => {
    const entries = tenantMap.get(tenantName)!;
    const totalDue = entries.reduce((s, e) => s + e.amount, 0);
    const totalPaid = entries.reduce((s, e) => s + (e.paymentAmount ?? 0), 0);
    return {
      holderLabel: tenantName,
      tenantName,
      entries,
      totalDue,
      totalPaid,
      balance: totalPaid - totalDue,
    };
  });

  const totalDue = holders.reduce((s, h) => s + h.totalDue, 0);
  const totalPaid = holders.reduce((s, h) => s + h.totalPaid, 0);

  return {
    locationName,
    gid,
    holders,
    totalDue,
    totalPaid,
    balance: totalPaid - totalDue,
  };
}

// ── Analytics helpers ─────────────────────────────────────────────────────────

export function buildMonthlyStats(entries: LedgerEntry[]): MonthlyStats[] {
  const map = new Map<string, { due: number; paid: number }>();

  for (const e of entries) {
    const startISO = toISO(e.startDate);
    if (startISO) {
      const key = startISO.slice(0, 7);
      const cur = map.get(key) ?? { due: 0, paid: 0 };
      cur.due += e.amount;
      map.set(key, cur);
    }
    if (e.paymentDate && e.paymentAmount) {
      const pISO = toISO(e.paymentDate);
      if (pISO) {
        const key = pISO.slice(0, 7);
        const cur = map.get(key) ?? { due: 0, paid: 0 };
        cur.paid += e.paymentAmount;
        map.set(key, cur);
      }
    }
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => {
      const [yyyy, mm] = month.split("-");
      const label = new Date(
        parseInt(yyyy),
        parseInt(mm) - 1,
        1
      ).toLocaleString("en-AU", { month: "short", year: "2-digit" });
      return { month, monthLabel: label, ...v };
    });
}

export function buildWeeklyStats(entries: LedgerEntry[]): WeeklyStats[] {
  return entries.map((e) => ({
    week: toISO(e.startDate) ?? e.startDate,
    weekLabel: e.startDate,
    due: e.amount,
    paid: e.paymentAmount ?? 0,
    startDate: e.startDate,
    endDate: e.endDate,
  }));
}
