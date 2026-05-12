/**
 * Discovers all sheet tabs in the configured Google Spreadsheet.
 *
 * Discovery order (first one that returns results wins):
 *  1. GOOGLE_SHEETS_API_KEY set → Sheets API v4 (cleanest, instant)
 *  2. No key            → scrape the /htmlview page for embedded GIDs
 *  3. NEXT_PUBLIC_LOCATIONS set → manual "Name:GID" env-var config
 *  4. Last resort       → single entry for gid=0
 */

export interface SheetTab {
  name: string;
  gid: string;
}

const SHEET_ID =
  process.env.NEXT_PUBLIC_SHEET_ID ||
  "1ThpyRBzZHlKDntoO2i32g5IJmQ3Mhk7LtL_mGRnr3Jk";

// ── 1. Google Sheets API v4 ──────────────────────────────────────────────────

interface SheetsV4Response {
  sheets?: Array<{ properties: { sheetId: number; title: string; sheetType: string } }>;
  error?: { message: string };
}

async function fetchViaApiKey(apiKey: string): Promise<SheetTab[] | null> {
  const url =
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}` +
    `?key=${apiKey}&fields=sheets.properties(sheetId,title,sheetType)`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const data: SheetsV4Response = await res.json();
    if (data.error || !data.sheets) return null;
    return data.sheets
      .filter((s) => s.properties.sheetType === "GRID")
      .map((s) => ({ name: s.properties.title, gid: String(s.properties.sheetId) }));
  } catch {
    return null;
  }
}

// ── 2. HTML scraping ─────────────────────────────────────────────────────────
// Google Sheets embeds all sheet metadata inside the /htmlview page as JSON
// inside a <script> block. We try several regex patterns because the exact
// format varies with Google's internal builds.

function deduped(tabs: SheetTab[]): SheetTab[] {
  const seen = new Set<string>();
  return tabs.filter((t) => {
    if (seen.has(t.gid)) return false;
    seen.add(t.gid);
    return true;
  });
}

async function fetchViaHtmlScrape(): Promise<SheetTab[] | null> {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/htmlview`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const html = await res.text();

    // Pattern A – items.push() navigation list (confirmed format in /htmlview)
    // e.g.  items.push({name: "Walpole", pageUrl: "...&gid=1299513193", gid: "1299513193",...});
    {
      const re = /name\s*:\s*"([^"]*)",\s*pageUrl\s*:\s*"[^"]*",\s*gid\s*:\s*"(\d+)"/g;
      const hits = [...html.matchAll(re)];
      if (hits.length > 0)
        return deduped(hits.map((m) => ({ name: m[1], gid: m[2] })));
    }

    // Pattern B – "sheetId":N,"title":"Name" (Sheets API v4-style embedded JSON)
    {
      const re = /"sheetId"\s*:\s*(\d+)\s*,\s*"title"\s*:\s*"([^"]+)"/g;
      const hits = [...html.matchAll(re)];
      if (hits.length > 0)
        return deduped(hits.map((m) => ({ gid: m[1], name: m[2] })));
    }

    // Pattern C – href anchor links with gid= and visible tab label
    // e.g.  href="...&gid=1234567890">Tab Name</a>
    {
      const re = /gid=(\d+)[^"]*"[^>]*>\s*([^<]{1,80?})\s*<\/a>/g;
      const hits = [...html.matchAll(re)];
      if (hits.length > 0)
        return deduped(hits.map((m) => ({ gid: m[1], name: m[2].trim() })));
    }

    return null;
  } catch {
    return null;
  }
}

// ── 3. Manual env-var config ─────────────────────────────────────────────────

function fromEnvLocations(): SheetTab[] | null {
  const raw = process.env.NEXT_PUBLIC_LOCATIONS ?? "";
  if (!raw.trim()) return null;
  return raw.split(",").map((part) => {
    const idx = part.lastIndexOf(":");
    if (idx === -1) return { name: part.trim(), gid: "0" };
    return { name: part.slice(0, idx).trim(), gid: part.slice(idx + 1).trim() };
  });
}

// ── Public entry point ───────────────────────────────────────────────────────

export async function discoverSheets(): Promise<SheetTab[]> {
  const apiKey = process.env.GOOGLE_SHEETS_API_KEY?.trim();

  if (apiKey) {
    const tabs = await fetchViaApiKey(apiKey);
    if (tabs && tabs.length > 0) {
      console.log(`[discover-sheets] API key: found ${tabs.length} sheet(s)`);
      return tabs;
    }
  }

  const scraped = await fetchViaHtmlScrape();
  if (scraped && scraped.length > 0) {
    console.log(`[discover-sheets] HTML scrape: found ${scraped.length} sheet(s)`);
    return scraped;
  }

  const manual = fromEnvLocations();
  if (manual && manual.length > 0) {
    console.log(`[discover-sheets] Manual config: ${manual.length} sheet(s)`);
    return manual;
  }

  console.warn("[discover-sheets] Fallback: using gid=0 only");
  return [{ name: "Main", gid: "0" }];
}
