"use client";

import { PropertyConfig } from "@/lib/config";

interface PropertyTogglesProps {
  properties: PropertyConfig[];
  toggleStates: Record<string, boolean>;
  onToggle: (propertyId: string) => void;
  colors: Record<string, string>;
  failedProperties?: Map<string, string>; // propertyId → error message
  lastSyncTimestamps?: Record<string, string | null>;
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function PropertyToggles({
  properties,
  toggleStates,
  onToggle,
  colors,
  failedProperties,
  lastSyncTimestamps,
}: PropertyTogglesProps) {
  if (properties.length === 0) return null;

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "0.75rem",
        marginBottom: "1rem",
      }}
    >
      {properties.map((prop) => {
        const isOn = toggleStates[prop.propertyId] !== false;
        const color = colors[prop.propertyId] || "#6b7280";
        const failError = failedProperties?.get(prop.propertyId);
        const lastSync = lastSyncTimestamps?.[prop.propertyId];

        return (
          <div key={prop.propertyId} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.2rem" }}>
            <button
              onClick={() => onToggle(prop.propertyId)}
              title={failError ? `Sync failed: ${failError}` : undefined}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.4rem 0.85rem",
                borderRadius: "20px",
                border: `2px solid ${failError ? "#ef4444" : color}`,
                background: isOn ? (failError ? color : color) : "#fff",
                color: isOn ? "#fff" : color,
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s",
                opacity: isOn ? 1 : 0.6,
              }}
            >
              <span
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  background: isOn ? "#fff" : color,
                  flexShrink: 0,
                }}
              />
              {prop.displayName}
              {failError && (
                <span
                  title={`Sync failed: ${failError}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "16px",
                    height: "16px",
                    borderRadius: "50%",
                    background: "#ef4444",
                    color: "#fff",
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    flexShrink: 0,
                    marginLeft: "0.15rem",
                  }}
                >
                  !
                </span>
              )}
            </button>
            {lastSync && (
              <span style={{ fontSize: "0.6rem", color: "#9ca3af" }}>
                Synced {formatTimestamp(lastSync)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
