import { PropertyConfig } from "@/lib/config";
import { SessionRecord } from "@/lib/mock";

const LINE_COLORS = [
  "#2563eb", // blue
  "#dc2626", // red
  "#16a34a", // green
  "#9333ea", // purple
  "#ea580c", // orange
  "#0891b2", // cyan
  "#db2777", // pink
  "#ca8a04", // yellow
  "#4f46e5", // indigo
  "#059669", // emerald
];

/**
 * Assigns a distinct color to each property, cycling through the palette.
 */
export function assignColors(
  properties: PropertyConfig[]
): Record<string, string> {
  const map: Record<string, string> = {};
  properties.forEach((p, i) => {
    map[p.propertyId] = LINE_COLORS[i % LINE_COLORS.length];
  });
  return map;
}

/**
 * Generates every YYYY-MM-DD date string in [startDate, endDate] inclusive.
 */
function generateDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");

  const current = new Date(start);
  while (current <= end) {
    const yyyy = current.getFullYear();
    const mm = String(current.getMonth() + 1).padStart(2, "0");
    const dd = String(current.getDate()).padStart(2, "0");
    dates.push(`${yyyy}-${mm}-${dd}`);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

/**
 * Gap-fills session data so every property has an entry for every date
 * in [startDate, endDate], with zero for missing dates.
 */
export function gapFillData(
  data: SessionRecord[],
  properties: PropertyConfig[],
  startDate: string,
  endDate: string
): SessionRecord[] {
  const allDates = generateDateRange(startDate, endDate);

  // Build lookup: propertyId -> date -> sessionCount
  const lookup = new Map<string, Map<string, number>>();
  for (const rec of data) {
    if (!lookup.has(rec.propertyId)) {
      lookup.set(rec.propertyId, new Map());
    }
    lookup.get(rec.propertyId)!.set(rec.date, rec.sessionCount);
  }

  const result: SessionRecord[] = [];
  for (const prop of properties) {
    const propData = lookup.get(prop.propertyId);
    for (const date of allDates) {
      result.push({
        propertyId: prop.propertyId,
        date,
        sessionCount: propData?.get(date) ?? 0,
      });
    }
  }
  return result;
}

/**
 * Calculates the Y-axis domain [0, max] based on visible properties.
 * Returns [0, 10] as default when no data is visible.
 */
export function calculateYAxisDomain(
  data: SessionRecord[],
  visiblePropertyIds: Set<string>
): [number, number] {
  let max = 0;
  for (const rec of data) {
    if (visiblePropertyIds.has(rec.propertyId) && rec.sessionCount > max) {
      max = rec.sessionCount;
    }
  }
  return max > 0 ? [0, max] : [0, 10];
}

/**
 * Transforms raw SessionRecord[] into the Recharts-friendly format:
 * [{ date: "2024-01-01", "Demo Blog": 100, "Demo Store": 200 }, ...]
 * Fills missing dates with zero (only for dates present in the data).
 */
export function buildChartData(
  data: SessionRecord[],
  properties: PropertyConfig[],
  toggleStates: Record<string, boolean>
): Record<string, string | number>[] {
  // Collect all unique dates from data
  const dateSet = new Set<string>();
  for (const rec of data) {
    dateSet.add(rec.date);
  }

  // Sort dates ascending
  const allDates = Array.from(dateSet).sort();
  if (allDates.length === 0) return [];

  // Build a lookup: propertyId -> date -> sessionCount
  const lookup = new Map<string, Map<string, number>>();
  for (const rec of data) {
    if (!lookup.has(rec.propertyId)) {
      lookup.set(rec.propertyId, new Map());
    }
    lookup.get(rec.propertyId)!.set(rec.date, rec.sessionCount);
  }

  // Build the display-name map for visible properties
  const visibleProps = properties.filter(
    (p) => toggleStates[p.propertyId] !== false
  );

  // Create chart data points
  return allDates.map((date) => {
    const point: Record<string, string | number> = { date };
    for (const prop of visibleProps) {
      const propData = lookup.get(prop.propertyId);
      point[prop.displayName] = propData?.get(date) ?? 0;
    }
    return point;
  });
}
