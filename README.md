# Single Google Analytics View

A multi-property Google Analytics 4 dashboard that displays daily session data from all your GA4 properties on a single line chart. Toggle properties on/off, pick a date range, and sync on demand — all from one page.

![Dashboard Screenshot](mock.png)

## Features

- 📊 Single line chart with one colored line per GA4 property
- 🔀 Toggle individual properties on/off
- 📅 Date range selector (30, 60, 90 days, 6 months, 1 year)
- 💾 SQLite caching to minimize API calls
- 🔄 On-demand sync — you control when data is fetched
- 🎭 Mock mode with demo data for instant preview
- ⚡ Built with Next.js, deploys to Vercel or any VPS

## Prerequisites

- **Node.js 18+** (check with `node -v`)
- A **Google Cloud project** (only needed for live GA4 data)
- One or more **GA4 properties** you want to track

## Quick Start (Mock Mode)

Want to see the UI right away? No Google setup needed.

```bash
git clone https://github.com/mayurjobanputra/single-google-analytics-view.git
cd single-google-analytics-view
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The app starts in mock mode automatically with demo data for three sample properties. You can toggle properties, change date ranges, and explore the full UI.

## Setting Up Live GA4 Data

Follow these steps to connect your real Google Analytics properties.

### 1. Create a Google Service Account

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create a new one)
3. Navigate to **IAM & Admin → Service Accounts**
4. Click **+ Create Service Account**
5. Give it any name (e.g., "GA4 Dashboard Reader") and click **Create and Continue**
6. You can skip the optional permissions and access steps — click **Done**
7. Click on the service account you just created
8. Go to the **Keys** tab → **Add Key** → **Create new key**
9. Choose **JSON** and click **Create**
10. A JSON key file will download — save it in the project root as `service-account-key.json`

### 2. Enable Google APIs

1. In the Google Cloud Console, go to **APIs & Services → Library**
2. Search for **"Google Analytics Data API"** → click **Enable**
3. Search for **"Google Analytics Admin API"** → click **Enable** (needed for auto-discover mode)

### 3. Grant GA4 Access

You have two options — account-level access (easiest) or per-property access.

**Option A: Account-level access (recommended)**

This grants the service account access to all properties under a GA account at once.

1. Go to [Google Analytics](https://analytics.google.com/)
2. Navigate to **Admin** (gear icon at the bottom left)
3. Under **Account**, go to **Account Access Management**
4. Click the **+** button → **Add users**
5. Enter the service account email (find it in your JSON key file as the `client_email` field)
6. Set the role to **Viewer**
7. Click **Add**

This covers all properties under that account. If you have properties across multiple GA accounts, repeat for each account.

**Option B: Per-property access**

If you only want to grant access to specific properties:

1. Go to [Google Analytics](https://analytics.google.com/)
2. Navigate to **Admin** (gear icon at the bottom left)
3. Select the property you want to add
4. Go to **Property Access Management**
5. Click the **+** button → **Add users**
6. Enter the service account email (find it in your JSON key file as the `client_email` field)
7. Set the role to **Viewer**
8. Click **Add**

Repeat for each GA4 property you want to display on the dashboard.

### 4. Configure Properties

You have two options — manual config or auto-discover.

**Option A: Auto-discover (recommended if you granted account-level access)**

Skip `properties.json` entirely. The app will automatically find all GA4 properties the service account can access. Just set `AUTO_DISCOVER=true` in your `.env` (see step 5).

**Option B: Manual config**

Copy the example config and add your GA4 property IDs:

```bash
cp properties.json.example properties.json
```

Edit `properties.json` with your property details:

```json
[
  { "propertyId": "531170948", "displayName": "My Blog" },
  { "propertyId": "412938571", "displayName": "Portfolio Site" },
  { "propertyId": "298374615", "displayName": "SaaS App" }
]
```

You can find your GA4 Property ID in Google Analytics under **Admin → Property Settings → Property ID**. It's a 9-digit number.

### 5. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env`:

```env
GOOGLE_APPLICATION_CREDENTIALS=./service-account-key.json
MOCK_MODE=false
AUTO_DISCOVER=true
```

> ⚠️ **Important:** The `.env.example` file ships with `MOCK_MODE=true` by default. You **must** change this to `MOCK_MODE=false` to use live GA4 data. If you still see demo data with the "Mock Mode" badge after setup, this is likely the reason.

Set `AUTO_DISCOVER=true` if you want the app to automatically find all GA4 properties your service account has access to (no `properties.json` needed). Set it to `false` if you prefer to manually list properties in `properties.json`.

**Alternative: Inline credentials** (useful for deployment or if you don't want to store the key file):

```env
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour_Private_Key_Here\n-----END PRIVATE KEY-----\n"
MOCK_MODE=false
```

You can find both values in the JSON key file you downloaded — `client_email` and `private_key`.

### 6. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Click **"Populate Data"** to fetch session data from your GA4 properties. Once data is loaded, the button changes to **"Get New Data"** for subsequent syncs.

## Deploy to Vercel

1. Push your repo to GitHub
2. Go to [vercel.com](https://vercel.com) and import your repository
3. In the Vercel project settings, add these **Environment Variables**:

   | Variable | Value |
   |---|---|
   | `GOOGLE_SERVICE_ACCOUNT_EMAIL` | The `client_email` from your JSON key file |
   | `GOOGLE_PRIVATE_KEY` | The `private_key` from your JSON key file (include the full key with `-----BEGIN/END-----` markers) |
   | `MOCK_MODE` | `false` |

4. Add your `properties.json` content to the project (commit it to the repo)
5. Deploy

> **Note:** On Vercel, use the inline credential environment variables (`GOOGLE_SERVICE_ACCOUNT_EMAIL` and `GOOGLE_PRIVATE_KEY`) instead of the key file path. The `GOOGLE_APPLICATION_CREDENTIALS` file path approach won't work in Vercel's serverless environment.

> **Limitation:** SQLite uses a local file, which won't persist across Vercel's serverless function invocations. Each cold start creates a fresh database. For production use with persistent data, consider using a hosted database (e.g., Turso, PlanetScale, or Vercel Postgres).

## Troubleshooting

| Problem | Solution |
|---|---|
| "No Google service account credentials configured" | Check your `.env` file exists and has valid `GOOGLE_APPLICATION_CREDENTIALS` or inline credential variables set |
| Property shows a warning badge after sync | The service account doesn't have Viewer access to that GA4 property. Go to GA Admin → Property Access Management and add the service account email |
| No data appears after syncing | Make sure the date range covers a period when the GA4 property had traffic. Try a wider range (90 days or 6 months) |
| Mock mode showing instead of live data | Set `MOCK_MODE=false` in `.env` and make sure `properties.json` exists in the project root |
| "Google Analytics Data API has not been enabled" | Go to Google Cloud Console → APIs & Services → Library → search "Google Analytics Data API" → Enable |
| Sync fails with authentication error | Verify the JSON key file is valid and the path in `GOOGLE_APPLICATION_CREDENTIALS` is correct. Try using inline credentials instead |

## Tech Stack

- [Next.js](https://nextjs.org/) — React framework with API routes
- [Recharts](https://recharts.org/) — Composable charting library
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) — Fast, synchronous SQLite for Node.js
- [Google Analytics Data API](https://developers.google.com/analytics/devguides/reporting/data/v1) — GA4 reporting API
- [google-auth-library](https://github.com/googleapis/google-auth-library-nodejs) — Google service account authentication

## License

MIT
