import { NextRequest, NextResponse } from "next/server";
import { appendEntry, type NewEntryData } from "@/lib/sheets-write";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as NewEntryData;

    // Basic validation
    if (!body.gid || !body.tenantName || !body.date || !body.startDate || !body.endDate || !body.amount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await appendEntry(body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("add-entry error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
