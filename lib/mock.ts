import { PropertyConfig } from "@/lib/config";

export interface SessionRecord {
  propertyId: string;
  date: string; // YYYY-MM-DD
  sessionCount: number;
}

/**
 * Generates realistic-looking mock session data for the given properties and day count.
 * Each property gets a unique base traffic level with daily variance including
 * weekday/weekend patterns. All session counts are non-negative integers.
 */
export function generateMockData(
  properties: PropertyConfig[],
  days: number
): SessionRecord[] {
  const records: SessionRecord[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Seed-like base traffic levels per property index for variety
  const baseTrafficLevels = [350, 1200, 80, 500, 2000, 150, 750, 3000, 45, 600];

  for (const property of properties) {
    const propIndex = properties.indexOf(property);
    const baseTraffic =
      baseTrafficLevels[propIndex % baseTrafficLevels.length];

    for (let d = 0; d < days; d++) {
      const date = new Date(today);
      date.setDate(today.getDate() - d);

      const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      // Weekend traffic is typically 60-80% of weekday traffic
      const weekendFactor = isWeekend ? 0.6 + Math.random() * 0.2 : 1.0;

      // Daily variance: ±30% random fluctuation
      const variance = 0.7 + Math.random() * 0.6;

      // Slight trend: newer days can have slightly more traffic (growth)
      const trendFactor = 1 + (days - d) * 0.001;

      const sessionCount = Math.max(
        0,
        Math.round(baseTraffic * weekendFactor * variance * trendFactor)
      );

      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");

      records.push({
        propertyId: property.propertyId,
        date: `${yyyy}-${mm}-${dd}`,
        sessionCount,
      });
    }
  }

  return records;
}
