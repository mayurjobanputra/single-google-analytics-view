import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

let db: Database.Database | null = null;

/**
 * Returns the singleton SQLite database connection, creating the database
 * and sessions table if they don't already exist.
 */
export function initDb(): Database.Database {
  if (db) return db;

  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = path.join(dataDir, "analytics.db");
  db = new Database(dbPath);

  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      property_id TEXT NOT NULL,
      date TEXT NOT NULL,
      session_count INTEGER NOT NULL DEFAULT 0,
      synced_at TEXT NOT NULL,
      PRIMARY KEY (property_id, date)
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_property_date
      ON sessions (property_id, date);
  `);

  return db;
}

/**
 * Upserts session records into the cache. On conflict (same property_id + date),
 * the session_count and synced_at are updated to the new values.
 */
export function upsertSessionData(
  records: { propertyId: string; date: string; sessionCount: number }[]
): void {
  const database = initDb();
  const stmt = database.prepare(`
    INSERT INTO sessions (property_id, date, session_count, synced_at)
    VALUES (@propertyId, @date, @sessionCount, @syncedAt)
    ON CONFLICT (property_id, date) DO UPDATE SET
      session_count = excluded.session_count,
      synced_at = excluded.synced_at
  `);

  const syncedAt = new Date().toISOString();

  const upsertMany = database.transaction(
    (recs: { propertyId: string; date: string; sessionCount: number }[]) => {
      for (const rec of recs) {
        stmt.run({
          propertyId: rec.propertyId,
          date: rec.date,
          sessionCount: rec.sessionCount,
          syncedAt,
        });
      }
    }
  );

  upsertMany(records);
}

/**
 * Queries cached session data for the given property IDs within a date range.
 * Returns records sorted by property_id then date.
 */
export function getSessionData(
  propertyIds: string[],
  startDate: string,
  endDate: string
): { propertyId: string; date: string; sessionCount: number }[] {
  if (propertyIds.length === 0) return [];

  const database = initDb();
  const placeholders = propertyIds.map(() => "?").join(", ");
  const stmt = database.prepare(`
    SELECT property_id, date, session_count
    FROM sessions
    WHERE property_id IN (${placeholders})
      AND date >= ?
      AND date <= ?
    ORDER BY property_id, date
  `);

  const rows = stmt.all(...propertyIds, startDate, endDate) as {
    property_id: string;
    date: string;
    session_count: number;
  }[];

  return rows.map((row) => ({
    propertyId: row.property_id,
    date: row.date,
    sessionCount: row.session_count,
  }));
}

/**
 * Returns an array of YYYY-MM-DD date strings within [startDate, endDate]
 * that are NOT cached for the given property.
 */
export function getMissingDates(
  propertyId: string,
  startDate: string,
  endDate: string
): string[] {
  const database = initDb();

  const stmt = database.prepare(`
    SELECT date FROM sessions
    WHERE property_id = ?
      AND date >= ?
      AND date <= ?
  `);

  const rows = stmt.all(propertyId, startDate, endDate) as { date: string }[];
  const cachedDates = new Set(rows.map((r) => r.date));

  const allDates = generateDateRange(startDate, endDate);
  return allDates.filter((d) => !cachedDates.has(d));
}

/**
 * Returns the most recent synced_at timestamp for the given property,
 * or null if no data exists.
 */
export function getLastSyncTimestamp(propertyId: string): string | null {
  const database = initDb();
  const stmt = database.prepare(`
    SELECT synced_at FROM sessions
    WHERE property_id = ?
    ORDER BY synced_at DESC
    LIMIT 1
  `);

  const row = stmt.get(propertyId) as { synced_at: string } | undefined;
  return row ? row.synced_at : null;
}

/**
 * Returns true if there is at least one row in the sessions table.
 */
export function hasAnyData(): boolean {
  const database = initDb();
  const stmt = database.prepare(`SELECT 1 FROM sessions LIMIT 1`);
  const row = stmt.get();
  return row !== undefined;
}

/**
 * Generates an array of YYYY-MM-DD strings for every day from startDate
 * to endDate (inclusive).
 */
export function generateDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const current = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");

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
 * Closes the database connection and resets the singleton.
 * Useful for testing.
 */
export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
