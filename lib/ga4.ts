import { BetaAnalyticsDataClient } from "@google-analytics/data";

export interface SessionRecord {
  propertyId: string;
  date: string; // YYYY-MM-DD
  sessionCount: number;
}

/**
 * Creates an authenticated GA4 Data API client using service account credentials.
 *
 * Supports two authentication methods:
 * 1. GOOGLE_APPLICATION_CREDENTIALS env var pointing to a JSON key file
 * 2. Inline credentials via GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_PRIVATE_KEY env vars
 *
 * Throws a descriptive error if no credentials are configured.
 */
export function createGa4Client(): BetaAnalyticsDataClient {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;

  // Inline credentials take priority when both email and key are provided
  if (email && privateKey) {
    return new BetaAnalyticsDataClient({
      credentials: {
        client_email: email,
        private_key: privateKey.replace(/\\n/g, "\n"),
      },
    });
  }

  // Fall back to GOOGLE_APPLICATION_CREDENTIALS (key file path)
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return new BetaAnalyticsDataClient({
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    });
  }

  throw new Error(
    "No Google service account credentials configured. " +
      "Set GOOGLE_APPLICATION_CREDENTIALS to a JSON key file path, " +
      "or set both GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY."
  );
}

/**
 * Converts a GA4 date string (YYYYMMDD) to YYYY-MM-DD format.
 */
function formatGa4Date(raw: string): string {
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
}

/**
 * Delays execution for the given number of milliseconds.
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Backoff delays in ms for each retry attempt: immediate, 1s, 4s */
const BACKOFF_DELAYS = [0, 1000, 4000];
const MAX_ATTEMPTS = 3;

/**
 * Fetches daily session data from the GA4 Data API for a single property.
 *
 * Calls `client.runReport()` requesting the `sessions` metric grouped by `date`.
 * Implements retry logic with 3 attempts and exponential backoff (immediate, 1s, 4s).
 * On final failure, throws the error for the caller to handle.
 */
export async function fetchSessionData(
  client: BetaAnalyticsDataClient,
  propertyId: string,
  startDate: string,
  endDate: string
): Promise<SessionRecord[]> {
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) {
      await delay(BACKOFF_DELAYS[attempt]);
    }

    try {
      const [response] = await client.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate, endDate }],
        metrics: [{ name: "sessions" }],
        dimensions: [{ name: "date" }],
      });

      const records: SessionRecord[] = [];

      if (response.rows) {
        for (const row of response.rows) {
          const rawDate = row.dimensionValues?.[0]?.value ?? "";
          const sessions = row.metricValues?.[0]?.value ?? "0";

          records.push({
            propertyId,
            date: formatGa4Date(rawDate),
            sessionCount: parseInt(sessions, 10) || 0,
          });
        }
      }

      return records;
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError;
}
