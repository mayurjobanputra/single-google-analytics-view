"use client";

interface SyncButtonProps {
  hasData: boolean;
  isSyncing: boolean;
  hidden: boolean;
  onClick: () => void;
}

export default function SyncButton({
  hasData,
  isSyncing,
  hidden,
  onClick,
}: SyncButtonProps) {
  if (hidden) return null;

  const label = isSyncing
    ? "Syncing…"
    : hasData
      ? "Get New Data"
      : "Populate Data";

  return (
    <button
      onClick={onClick}
      disabled={isSyncing}
      style={{
        padding: "0.5rem 1.25rem",
        borderRadius: "6px",
        border: "none",
        background: isSyncing ? "#9ca3af" : "#2563eb",
        color: "#fff",
        fontSize: "0.875rem",
        fontWeight: 600,
        cursor: isSyncing ? "not-allowed" : "pointer",
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        transition: "background 0.15s",
      }}
    >
      {isSyncing && (
        <span
          style={{
            display: "inline-block",
            width: "14px",
            height: "14px",
            border: "2px solid rgba(255,255,255,0.3)",
            borderTopColor: "#fff",
            borderRadius: "50%",
            animation: "spin 0.6s linear infinite",
          }}
        />
      )}
      {label}
    </button>
  );
}
