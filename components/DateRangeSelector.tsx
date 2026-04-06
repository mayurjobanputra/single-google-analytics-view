"use client";

interface DateRangeSelectorProps {
  value: number;
  onChange: (range: number) => void;
}

const DATE_RANGE_OPTIONS = [
  { label: "30 days", value: 30 },
  { label: "60 days", value: 60 },
  { label: "90 days", value: 90 },
  { label: "6 months", value: 180 },
  { label: "1 year", value: 365 },
];

export default function DateRangeSelector({
  value,
  onChange,
}: DateRangeSelectorProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
      <label
        htmlFor="date-range"
        style={{
          fontSize: "0.875rem",
          fontWeight: 500,
          color: "#374151",
        }}
      >
        Date Range:
      </label>
      <select
        id="date-range"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          padding: "0.4rem 0.75rem",
          borderRadius: "6px",
          border: "1px solid #d1d5db",
          fontSize: "0.875rem",
          color: "#1f2937",
          background: "#fff",
          cursor: "pointer",
          outline: "none",
        }}
      >
        {DATE_RANGE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
