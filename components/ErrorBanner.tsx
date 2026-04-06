"use client";

interface ErrorBannerProps {
  errors: string[];
  hasProperties: boolean;
}

export default function ErrorBanner({ errors, hasProperties }: ErrorBannerProps) {
  if (errors.length === 0 && hasProperties) return null;

  return (
    <div style={{ marginBottom: "1.5rem" }}>
      {errors.length > 0 && (
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #fca5a5",
            borderRadius: "8px",
            padding: "1rem 1.25rem",
            marginBottom: "1rem",
          }}
        >
          <div
            style={{
              fontWeight: 600,
              color: "#991b1b",
              marginBottom: "0.5rem",
              fontSize: "0.95rem",
            }}
          >
            ⚠️ Configuration Issues
          </div>
          <ul
            style={{
              margin: 0,
              paddingLeft: "1.25rem",
              color: "#b91c1c",
              fontSize: "0.875rem",
              lineHeight: 1.6,
            }}
          >
            {errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {!hasProperties && (
        <div
          style={{
            background: "#eff6ff",
            border: "1px solid #93c5fd",
            borderRadius: "8px",
            padding: "1.25rem",
          }}
        >
          <div
            style={{
              fontWeight: 600,
              color: "#1e40af",
              marginBottom: "0.75rem",
              fontSize: "0.95rem",
            }}
          >
            📋 Setup Guide
          </div>
          <ol
            style={{
              margin: 0,
              paddingLeft: "1.25rem",
              color: "#1e3a5f",
              fontSize: "0.875rem",
              lineHeight: 1.8,
            }}
          >
            <li>
              Create a <code>properties.json</code> file in the project root
            </li>
            <li>
              Add your GA4 properties:{" "}
              <code>
                {"["}
                {' { "propertyId": "123456789", "displayName": "My Site" }'}
                {"]"}
              </code>
            </li>
            <li>
              Set up a Google service account and save the key file
            </li>
            <li>
              Create a <code>.env</code> file with{" "}
              <code>GOOGLE_APPLICATION_CREDENTIALS=./service-account-key.json</code>
            </li>
            <li>
              Restart the app and click &quot;Populate Data&quot; to fetch your analytics
            </li>
          </ol>
        </div>
      )}
    </div>
  );
}
