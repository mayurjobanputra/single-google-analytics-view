"use client";

import { useEffect, useState, useCallback } from "react";
import LineChartPanel from "@/components/LineChartPanel";
import PropertyToggles from "@/components/PropertyToggles";
import DateRangeSelector from "@/components/DateRangeSelector";
import SyncButton from "@/components/SyncButton";
import ErrorBanner from "@/components/ErrorBanner";
import { PropertyConfig } from "@/lib/config";
import { SessionRecord } from "@/lib/mock";
import { assignColors } from "@/lib/chart-utils";

interface SyncPropertyResult {
  propertyId: string;
  displayName: string;
  status: "success" | "error";
  recordsFetched: number;
  error?: string;
}

export default function DashboardPage() {
  const [mode, setMode] = useState<"live" | "mock" | "auto-discover">("mock");
  const [properties, setProperties] = useState<PropertyConfig[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [chartData, setChartData] = useState<SessionRecord[]>([]);
  const [selectedRange, setSelectedRange] = useState(30);
  const [toggleStates, setToggleStates] = useState<Record<string, boolean>>({});
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasData, setHasData] = useState(false);
  const [loading, setLoading] = useState(true);
  const [colors, setColors] = useState<Record<string, string>>({});

  // Task 7.1: Per-property sync results message
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  // Task 7.2: Failed properties from last sync (propertyId → error)
  const [failedProperties, setFailedProperties] = useState<Map<string, string>>(new Map());
  // Task 7.2: Last sync timestamps per property
  const [lastSyncTimestamps, setLastSyncTimestamps] = useState<Record<string, string | null>>({});
  // Task 7.3: Properties with no data for current range (need sync)
  const [propertiesNeedingSync, setPropertiesNeedingSync] = useState<Set<string>>(new Set());

  const fetchData = useCallback(
    async (range: number, props: PropertyConfig[]) => {
      try {
        const ids = props.map((p) => p.propertyId).join(",");
        const res = await fetch(
          `/api/data?range=${range}&properties=${ids}`
        );
        const json = await res.json();
        setChartData(json.data ?? []);
        // Task 7.1: Use hasData from API response instead of data.length
        setHasData(json.hasData ?? false);
        // Task 7.2: Store last sync timestamps
        if (json.lastSyncTimestamps) {
          setLastSyncTimestamps(json.lastSyncTimestamps);
        }
        // Task 7.3: Detect properties with no data for this range
        const dataPropertyIds = new Set((json.data ?? []).map((r: SessionRecord) => r.propertyId));
        const needSync = new Set<string>();
        for (const p of props) {
          if (!dataPropertyIds.has(p.propertyId)) {
            needSync.add(p.propertyId);
          }
        }
        setPropertiesNeedingSync(needSync);
      } catch {
        setErrors((prev) => [...prev, "Failed to fetch chart data"]);
      }
    },
    []
  );

  useEffect(() => {
    async function init() {
      try {
        const configRes = await fetch("/api/config");
        const config = await configRes.json();

        setMode(config.mode);
        setProperties(config.properties ?? []);
        setErrors(config.errors ?? []);
        setColors(assignColors(config.properties ?? []));

        // Initialize all toggles to "on"
        const initialToggles: Record<string, boolean> = {};
        for (const p of config.properties ?? []) {
          initialToggles[p.propertyId] = true;
        }
        setToggleStates(initialToggles);

        // Fetch initial data
        if ((config.properties ?? []).length > 0) {
          await fetchData(30, config.properties);
        }
      } catch {
        setErrors(["Failed to load configuration"]);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [fetchData]);

  const handleRangeChange = async (range: number) => {
    setSelectedRange(range);
    setSyncMessage(null);
    await fetchData(range, properties);
  };

  const handleToggle = (propertyId: string) => {
    setToggleStates((prev) => ({
      ...prev,
      [propertyId]: !prev[propertyId],
    }));
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    setFailedProperties(new Map());
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dateRange: selectedRange }),
      });
      const json = await res.json();

      // Task 7.2: Handle top-level auth/config errors from sync
      if (json.error) {
        setErrors((prev) => [...prev, json.error]);
        return;
      }

      // Task 7.1: Build sync results summary
      const results: SyncPropertyResult[] = json.results ?? [];
      const succeeded = results.filter((r) => r.status === "success");
      const failed = results.filter((r) => r.status === "error");
      const totalRecords = succeeded.reduce((sum, r) => sum + r.recordsFetched, 0);

      let msg = `Synced ${succeeded.length}/${results.length} properties`;
      if (totalRecords > 0) msg += ` (${totalRecords} records fetched)`;
      if (failed.length > 0) {
        msg += `. ${failed.length} failed: ${failed.map((f) => f.displayName).join(", ")}`;
      }
      setSyncMessage(msg);

      // Task 7.2: Track failed properties for warning badges
      const newFailed = new Map<string, string>();
      for (const r of failed) {
        newFailed.set(r.propertyId, r.error ?? "Unknown error");
      }
      setFailedProperties(newFailed);

      // Task 7.1: Refresh chart data after sync
      await fetchData(selectedRange, properties);
    } catch {
      setErrors((prev) => [...prev, "Sync failed — check your network connection"]);
    } finally {
      setIsSyncing(false);
    }
  };

  // Auto-dismiss sync message after 8 seconds
  useEffect(() => {
    if (!syncMessage) return;
    const timer = setTimeout(() => setSyncMessage(null), 8000);
    return () => clearTimeout(timer);
  }, [syncMessage]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, -apple-system, sans-serif",
          color: "#6b7280",
          fontSize: "1rem",
        }}
      >
        Loading dashboard…
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f3f4f6",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Header */}
      <header
        style={{
          background: "#111827",
          color: "#fff",
          padding: "1rem 2rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <h1 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700 }}>
            GA Multi-Property Dashboard
          </h1>
          {mode === "mock" && (
            <span
              style={{
                background: "#fbbf24",
                color: "#78350f",
                fontSize: "0.7rem",
                fontWeight: 700,
                padding: "0.15rem 0.5rem",
                borderRadius: "4px",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Mock Mode
            </span>
          )}
          {mode === "auto-discover" && (
            <span
              style={{
                background: "#34d399",
                color: "#064e3b",
                fontSize: "0.7rem",
                fontWeight: 700,
                padding: "0.15rem 0.5rem",
                borderRadius: "4px",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Auto-Discover
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <DateRangeSelector
            value={selectedRange}
            onChange={handleRangeChange}
          />
          <SyncButton
            hasData={hasData}
            isSyncing={isSyncing}
            hidden={mode === "mock"}
            onClick={handleSync}
          />
        </div>
      </header>

      {/* Main content */}
      <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "1.5rem 2rem" }}>
        <ErrorBanner errors={errors} hasProperties={properties.length > 0} />

        {/* Task 7.1: Sync results message */}
        {syncMessage && (
          <div
            style={{
              background: failedProperties.size > 0 ? "#fffbeb" : "#f0fdf4",
              border: `1px solid ${failedProperties.size > 0 ? "#fcd34d" : "#86efac"}`,
              borderRadius: "8px",
              padding: "0.75rem 1rem",
              marginBottom: "1rem",
              fontSize: "0.85rem",
              color: failedProperties.size > 0 ? "#92400e" : "#166534",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span>{syncMessage}</span>
            <button
              onClick={() => setSyncMessage(null)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "inherit",
                fontSize: "1rem",
                padding: "0 0.25rem",
              }}
            >
              ×
            </button>
          </div>
        )}

        {/* Task 7.3: Indicator when properties need sync for current range */}
        {propertiesNeedingSync.size > 0 && mode !== "mock" && (
          <div
            style={{
              background: "#eff6ff",
              border: "1px solid #93c5fd",
              borderRadius: "8px",
              padding: "0.6rem 1rem",
              marginBottom: "1rem",
              fontSize: "0.8rem",
              color: "#1e40af",
            }}
          >
            💡 {propertiesNeedingSync.size === properties.length
              ? "No cached data for this date range."
              : `${propertiesNeedingSync.size} propert${propertiesNeedingSync.size === 1 ? "y has" : "ies have"} no data for this range.`
            } Click &quot;{hasData ? "Get New Data" : "Populate Data"}&quot; to sync.
          </div>
        )}

        <PropertyToggles
          properties={properties}
          toggleStates={toggleStates}
          onToggle={handleToggle}
          colors={colors}
          failedProperties={failedProperties}
          lastSyncTimestamps={lastSyncTimestamps}
        />

        <div
          style={{
            background: "#fff",
            borderRadius: "12px",
            padding: "1.5rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            border: "1px solid #e5e7eb",
          }}
        >
          <LineChartPanel
            data={chartData}
            properties={properties}
            toggleStates={toggleStates}
            colors={colors}
          />
        </div>
      </main>

      {/* Spinner keyframes injected via style tag */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
