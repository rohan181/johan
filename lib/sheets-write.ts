import crypto from "crypto";

const SHEET_ID =
  process.env.NEXT_PUBLIC_SHEET_ID ||
  "1ThpyRBzZHlKDntoO2i32g5IJmQ3Mhk7LtL_mGRnr3Jk";

export interface NewEntryData {
  gid: string;
  tenantName: string;
  /** YYYY-MM-DD */
  date: string;
  /** YYYY-MM-DD */
  startDate: string;
  /** YYYY-MM-DD */
  endDate: string;
  amount: number;
  paymentAmount?: number;
  /** YYYY-MM-DD */
  paymentDate?: string;
}

// ── JWT / OAuth2 helpers ─────────────────────────────────────────────────────

function toBase64Url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

async function getAccessToken(): Promise<string> {
  const email = process.env.GOOGLE_CLIENT_EMAIL;
  const rawKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!email || !rawKey) {
    throw new Error(
      "Missing GOOGLE_CLIENT_EMAIL or GOOGLE_PRIVATE_KEY environment variables. " +
        "See .env.local for setup instructions."
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const header = toBase64Url(Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const claim = toBase64Url(
    Buffer.from(
      JSON.stringify({
        iss: email,
        scope: "https://www.googleapis.com/auth/spreadsheets",
        aud: "https://oauth2.googleapis.com/token",
        exp: now + 3600,
        iat: now,
      })
    )
  );

  const signingInput = `${header}.${claim}`;
  const sign = crypto.createSign("RSA-SHA256");
  sign.update(signingInput);
  sign.end();
  const sig = toBase64Url(sign.sign(rawKey));

  const jwt = `${signingInput}.${sig}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const json = (await res.json()) as { access_token?: string; error?: string };
  if (!res.ok || !json.access_token) {
    throw new Error(`OAuth2 token error: ${json.error ?? res.status}`);
  }
  return json.access_token;
}

// ── Date conversion ──────────────────────────────────────────────────────────

/** YYYY-MM-DD → DD/MM/YYYY */
function isoToDMY(iso: string): string {
  const [yyyy, mm, dd] = iso.split("-");
  return `${dd}/${mm}/${yyyy}`;
}

// ── Sheets API helpers ───────────────────────────────────────────────────────

const API = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}`;

async function sheetsGet<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Sheets GET ${path}: HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

async function sheetsPost<T>(path: string, token: string, body: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Sheets POST ${path}: HTTP ${res.status} — ${txt}`);
  }
  return res.json() as Promise<T>;
}

async function sheetsPut<T>(path: string, token: string, body: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Sheets PUT ${path}: HTTP ${res.status} — ${txt}`);
  }
  return res.json() as Promise<T>;
}

// ── Public: append an entry row before GRAND TOTAL ───────────────────────────

export async function appendEntry(entry: NewEntryData): Promise<void> {
  const token = await getAccessToken();

  // Resolve GID → sheet title
  const meta = await sheetsGet<{
    sheets: Array<{ properties: { sheetId: number; title: string } }>;
  }>(`?fields=sheets(properties(sheetId,title))`, token);

  const sheetProp = meta.sheets.find(
    (s) => String(s.properties.sheetId) === entry.gid
  );
  if (!sheetProp) throw new Error(`No sheet with gid=${entry.gid} in spreadsheet`);
  const sheetTitle = sheetProp.properties.title;

  // Read column B to find the GRAND TOTAL row
  const range = encodeURIComponent(`'${sheetTitle}'!B:B`);
  const colData = await sheetsGet<{ values?: string[][] }>(
    `/values/${range}?majorDimension=COLUMNS`,
    token
  );
  const colB: string[] = colData.values?.[0] ?? [];

  const totalIdx = colB.findIndex((v) => /total/i.test(v));
  const insertRowIndex = totalIdx >= 0 ? totalIdx : colB.length;

  // Insert a blank row at that position (pushes GRAND TOTAL down)
  await sheetsPost(`/:batchUpdate`, token, {
    requests: [
      {
        insertDimension: {
          range: {
            sheetId: parseInt(entry.gid, 10),
            dimension: "ROWS",
            startIndex: insertRowIndex,
            endIndex: insertRowIndex + 1,
          },
          inheritFromBefore: true,
        },
      },
    ],
  });

  // Write new row data (A–G) at the inserted row
  const rowNum = insertRowIndex + 1; // 1-based
  const cellRange = encodeURIComponent(`'${sheetTitle}'!A${rowNum}:G${rowNum}`);
  const rowValues = [
    isoToDMY(entry.date),
    entry.tenantName,
    isoToDMY(entry.startDate),
    isoToDMY(entry.endDate),
    entry.amount,
    entry.paymentAmount ?? "",
    entry.paymentDate ? isoToDMY(entry.paymentDate) : "",
  ];

  await sheetsPut(
    `/values/${cellRange}?valueInputOption=USER_ENTERED`,
    token,
    { values: [rowValues] }
  );
}
