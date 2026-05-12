import { NextResponse } from "next/server";
import { fetchSheetData } from "@/lib/sheets";
import { discoverSheets } from "@/lib/discover-sheets";

// Always fetch live data — never serve a cached response
export const dynamic = "force-dynamic";

export async function GET() {
  // Step 1: discover every tab in the spreadsheet
  const tabs = await discoverSheets();

  // Step 2: fetch and parse data for all tabs in parallel
  const results = await Promise.allSettled(
    tabs.map(({ name, gid }) => fetchSheetData(gid, name))
  );

  const sheets = results
    .filter((r) => r.status === "fulfilled")
    .map(
      (r) =>
        (
          r as PromiseFulfilledResult<
            Awaited<ReturnType<typeof fetchSheetData>>
          >
        ).value
    );

  const errors = results
    .filter((r) => r.status === "rejected")
    .map((r) => (r as PromiseRejectedResult).reason?.message ?? "Unknown error");

  return NextResponse.json({ sheets, errors });
}
