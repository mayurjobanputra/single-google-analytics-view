import { loadProperties } from "@/lib/config";
import { createGa4Client, fetchSessionData } from "@/lib/ga4";
import { getMissingDates, upsertSessionData } from "@/lib/db";

interface SyncPropertyResult {
  propertyId: string;
  displayName: string;
  status: "success" | "error";
  recordsFetched: number;
  error?: string;
}

interface SyncResponse {
  results: SyncPropertyResult[];
}

const VALID_RANGES = new Set([30, 60, 90, 180, 365]);

function formatDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export async function POST(request: Request) {
  // 1. Parse request body
  let dateRange: number;
  try {
    const body = await request.json();
    dateRange = body.dateRange;
  } catch {
    return Response.json(
      { error: "Invalid request body — expected JSON with { dateRange: number }" },
      { status: 400 }
    );
  }

  if (!VALID_RANGES.has(dateRange)) {
    return Response.json(
      { error: `Invalid dateRange: ${dateRange}. Must be one of: 30, 60, 90, 180, 365` },
      { status: 400 }
    );
  }

  // 2. Re-read config (Req 12.1 — detect added/removed properties)
  const config = await loadProperties();

  // 3. Mock mode — sync not available
  if (config.mode === "mock") {
    return Response.json(
      { error: "Sync is not available in mock mode. Configure properties.json and disable MOCK_MODE to use live sync." },
      { status: 400 }
    );
  }

  if (config.properties.length === 0) {
    return Response.json(
      { error: "No valid properties configured. Check properties.json for errors.", details: config.errors },
      { status: 400 }
    );
  }

  // 4. Create GA4 client
  let client;
  try {
    client = createGa4Client();
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to create GA4 client — check service account credentials." },
      { status: 500 }
    );
  }

  // 5. Compute date range
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDateObj = new Date(today);
  startDateObj.setDate(today.getDate() - dateRange);

  const startDate = formatDate(startDateObj);
  const endDate = formatDate(today);

  // 6. Fetch per property with partial failure handling
  const results: SyncPropertyResult[] = [];

  for (const prop of config.properties) {
    try {
      const missingDates = getMissingDates(prop.propertyId, startDate, endDate);

      if (missingDates.length === 0) {
        results.push({
          propertyId: prop.propertyId,
          displayName: prop.displayName,
          status: "success",
          recordsFetched: 0,
        });
        continue;
      }

      // Find min/max of missing dates to minimize the API request range
      const sortedMissing = [...missingDates].sort();
      const minDate = sortedMissing[0];
      const maxDate = sortedMissing[sortedMissing.length - 1];

      const records = await fetchSessionData(client, prop.propertyId, minDate, maxDate);
      upsertSessionData(records);

      results.push({
        propertyId: prop.propertyId,
        displayName: prop.displayName,
        status: "success",
        recordsFetched: records.length,
      });
    } catch (err) {
      console.error(`Sync failed for property ${prop.propertyId} (${prop.displayName}):`, err);
      results.push({
        propertyId: prop.propertyId,
        displayName: prop.displayName,
        status: "error",
        recordsFetched: 0,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // 7. Return results
  const response: SyncResponse = { results };
  return Response.json(response);
}
