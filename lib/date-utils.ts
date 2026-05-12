/** DD/MM/YYYY → YYYY-MM-DD. Returns null if the string is not a date. */
export function parseDMY(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const m = String(raw).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
}

/** Returns true if the entry's startDate falls within [from, to] (inclusive). */
export function inDateRange(
  startDateDMY: string,
  from: string,   // YYYY-MM-DD or ""
  to: string      // YYYY-MM-DD or ""
): boolean {
  if (!from && !to) return true;
  const iso = parseDMY(startDateDMY);
  if (!iso) return true;
  if (from && iso < from) return false;
  if (to && iso > to) return false;
  return true;
}

/** Tenant name → URL-safe slug (kept readable, not hashed). */
export function tenantSlug(name: string): string {
  return encodeURIComponent(name.trim());
}

export function slugToTenant(slug: string): string {
  return decodeURIComponent(slug);
}
