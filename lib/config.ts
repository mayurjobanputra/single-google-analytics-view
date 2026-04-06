import { readFile } from "fs/promises";
import path from "path";

export interface PropertyConfig {
  propertyId: string;
  displayName: string;
}

export interface ConfigResult {
  properties: PropertyConfig[];
  errors: string[];
  mode: "live" | "mock" | "auto-discover";
}

const MOCK_PROPERTIES: PropertyConfig[] = [
  { propertyId: "100000001", displayName: "Demo Blog" },
  { propertyId: "100000002", displayName: "Demo Store" },
  { propertyId: "100000003", displayName: "Demo Portfolio" },
];

export async function loadProperties(): Promise<ConfigResult> {
  const isMockMode = process.env.MOCK_MODE === "true";

  if (isMockMode) {
    return { properties: MOCK_PROPERTIES, errors: [], mode: "mock" };
  }

  // Auto-discover mode: pull all properties from the GA4 Admin API
  const isAutoDiscover = process.env.AUTO_DISCOVER === "true";

  if (isAutoDiscover) {
    try {
      // Dynamic import to avoid loading admin SDK when not needed
      const { discoverProperties } = await import("@/lib/ga4");
      const properties = await discoverProperties();

      if (properties.length === 0) {
        return {
          properties: [],
          errors: ["Auto-discover found no GA4 properties. Check that the service account has access to at least one GA4 property."],
          mode: "auto-discover",
        };
      }

      return { properties, errors: [], mode: "auto-discover" };
    } catch (err) {
      return {
        properties: [],
        errors: [`Auto-discover failed: ${err instanceof Error ? err.message : String(err)}`],
        mode: "auto-discover",
      };
    }
  }

  const configPath = path.join(process.cwd(), "properties.json");
  let raw: string;

  try {
    raw = await readFile(configPath, "utf-8");
  } catch (err: unknown) {
    if (err instanceof Error && "code" in err && (err as NodeJS.ErrnoException).code === "ENOENT") {
      return {
        properties: MOCK_PROPERTIES,
        errors: ["properties.json not found — using mock properties"],
        mode: "mock",
      };
    }
    return {
      properties: [],
      errors: [`Failed to read properties.json: ${err instanceof Error ? err.message : String(err)}`],
      mode: "live",
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      properties: [],
      errors: [`properties.json contains invalid JSON — please check the file syntax`],
      mode: "live",
    };
  }

  if (!Array.isArray(parsed)) {
    return {
      properties: [],
      errors: [`properties.json must contain a JSON array, got ${typeof parsed}`],
      mode: "live",
    };
  }

  const properties: PropertyConfig[] = [];
  const errors: string[] = [];

  for (let i = 0; i < parsed.length; i++) {
    const entry = parsed[i];
    const missing: string[] = [];

    if (!entry || typeof entry !== "object") {
      errors.push(`Entry ${i}: not an object — skipped`);
      continue;
    }

    if (typeof entry.propertyId !== "string" || entry.propertyId.trim() === "") {
      missing.push("propertyId");
    }
    if (typeof entry.displayName !== "string" || entry.displayName.trim() === "") {
      missing.push("displayName");
    }

    if (missing.length > 0) {
      errors.push(`Entry ${i}: missing ${missing.join(", ")} — skipped`);
      continue;
    }

    properties.push({
      propertyId: entry.propertyId,
      displayName: entry.displayName,
    });
  }

  return { properties, errors, mode: "live" };
}
