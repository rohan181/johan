export interface LedgerEntry {
  id: number;
  date: string;
  type: string;
  startDate: string;
  endDate: string;
  amount: number;
  paymentAmount: number | null;
  paymentDate: string | null;
  isPaid: boolean;
}

/** One tenant section (HolderN block) inside a sheet */
export interface HolderSection {
  holderLabel: string;   // "Holder1", "Holder2", …
  tenantName: string;    // "John Smith"
  entries: LedgerEntry[];
  totalDue: number;
  totalPaid: number;
  balance: number;       // positive = overpaid, negative = still owes
}

/** One Google Sheet tab = one location */
export interface SheetData {
  locationName: string;  // human-readable name from env config
  gid: string;
  holders: HolderSection[];
  totalDue: number;
  totalPaid: number;
  balance: number;
}

export interface MonthlyStats {
  month: string;
  monthLabel: string;
  due: number;
  paid: number;
}

export interface WeeklyStats {
  week: string;
  weekLabel: string;
  due: number;
  paid: number;
  startDate: string;
  endDate: string;
}
