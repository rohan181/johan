import { notFound } from "next/navigation";
import { fetchSheetData } from "@/lib/sheets";
import { slugToTenant } from "@/lib/date-utils";
import TenantView from "./TenantView";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ gid: string; tenant: string }>;
}

export default async function TenantPage({ params }: Props) {
  const { gid, tenant } = await params;
  const tenantName = slugToTenant(tenant);

  let sheetData;
  try {
    sheetData = await fetchSheetData(gid, "");
  } catch {
    notFound();
  }

  const holder = sheetData.holders.find(
    (h) => h.tenantName === tenantName
  );

  if (!holder) notFound();

  // locationName comes from the tab name — re-use what the scraper found
  const locationName = sheetData.locationName || gid;

  return (
    <TenantView
      holder={holder}
      locationName={locationName}
      gid={gid}
    />
  );
}
