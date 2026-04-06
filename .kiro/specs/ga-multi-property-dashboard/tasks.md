# Implementation Plan: GA Multi-Property Dashboard

## Overview

Build a Next.js dashboard that aggregates GA4 session data from multiple properties into a single line chart. Implementation starts with a mock-mode prototype for early UX validation, then layers in SQLite caching, GA4 API integration, on-demand sync, and error handling. TypeScript throughout, Recharts for visualization, better-sqlite3 for caching.

## Tasks

- [x] 1. Project scaffolding and mock-mode prototype
  - [x] 1.1 Initialize Next.js project with App Router, install dependencies (`recharts`, `better-sqlite3`, `google-auth-library`, `@google-analytics/data`, `fast-check`), create base directory structure (`lib/`, `app/api/`, `components/`), add `.env.example` and `tsconfig.json` adjustments
    - _Requirements: 10.1, 10.2_

  - [x] 1.2 Create `properties.json.example` with sample entries and implement `lib/config.ts` with `loadProperties()` that reads/validates the config file, returns `{ properties, errors }`, and falls back to mock properties when `MOCK_MODE=true` or file is missing
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 11.4_

  - [x] 1.3 Implement `lib/mock.ts` with `generateMockData(properties, days)` that produces realistic session data with daily variance for the given properties and day count
    - _Requirements: 11.1_

  - [x] 1.4 Implement `GET /api/config` route that returns `ConfigResponse` with mode, properties, and errors
    - _Requirements: 1.1, 1.2, 1.3, 11.4_

  - [x] 1.5 Implement `GET /api/data` route that in mock mode returns generated mock data, accepting `range` and `properties` query params
    - _Requirements: 11.1, 11.2_

  - [x] 1.6 Build the full dashboard UI prototype: `DashboardPage`, `LineChartPanel` (Recharts), `PropertyToggles`, `DateRangeSelector`, `SyncButton` (hidden in mock mode), `ErrorBanner`. Wire to `/api/config` and `/api/data`. All UI elements visible and functional with mock data.
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 7.1, 7.2, 7.3, 7.4, 7.5, 8.1, 8.2, 8.3, 11.1, 11.2, 11.3_

- [x] 2. Checkpoint - Prototype review
  - Ensure the mock-mode prototype renders correctly with all UI elements. Ask the user to review the UX before proceeding with backend wiring.

- [x] 3. Config parsing and validation
  - [x] 3.1 Add robust validation to `loadProperties()`: handle missing file (ENOENT → mock mode), invalid JSON (descriptive error), entries missing fields (skip + warning), empty array
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [ ]* 3.2 Write property test for config parsing (Property 1: Config parsing preserves valid entries)
    - **Property 1: Config parsing preserves valid entries**
    - Generate random arrays of objects with optional `propertyId`/`displayName` fields, verify only complete entries are returned in order
    - **Validates: Requirements 1.1, 1.2, 1.4**

  - [ ]* 3.3 Write property test for invalid config (Property 2: Invalid config produces descriptive error)
    - **Property 2: Invalid config produces descriptive error**
    - Generate random non-JSON strings and non-array JSON values, verify error result with descriptive message
    - **Validates: Requirements 1.3**

- [x] 4. SQLite data layer
  - [x] 4.1 Implement `lib/db.ts`: `initDb()` creates sessions table with `PRIMARY KEY (property_id, date)` and index; `upsertSessionData(records)` using `INSERT ... ON CONFLICT DO UPDATE`; `getSessionData(propertyIds, startDate, endDate)`; `getMissingDates(propertyId, startDate, endDate)`; `getLastSyncTimestamp(propertyId)`; `hasAnyData()`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.5_

  - [ ]* 4.2 Write property test for missing date computation (Property 3: Missing date computation is the set difference)
    - **Property 3: Missing date computation is the set difference**
    - Generate random date ranges + random subsets of cached dates, verify `getMissingDates()` returns exactly the set difference
    - **Validates: Requirements 3.3, 5.5**

  - [ ]* 4.3 Write property test for session data round-trip (Property 4: Session data insert round-trip)
    - **Property 4: Session data insert round-trip**
    - Generate random `(propertyId, date, sessionCount)` tuples, upsert then query, verify matching results
    - **Validates: Requirements 4.2**

  - [ ]* 4.4 Write property test for upsert overwrite (Property 5: Upsert overwrites with latest value)
    - **Property 5: Upsert overwrites with latest value**
    - Generate random `(propertyId, date)` + two different counts, upsert both sequentially, verify only latest count returned
    - **Validates: Requirements 4.4, 4.5**

- [x] 5. GA4 API integration
  - [x] 5.1 Implement `lib/ga4.ts`: `createGa4Client()` authenticating via service account credentials from env vars; `fetchSessionData(client, propertyId, startDate, endDate)` calling GA4 Data API for sessions by date with retry logic (3 attempts, exponential backoff)
    - _Requirements: 2.1, 2.2, 3.1, 3.2, 5.8_

  - [ ]* 5.2 Write unit tests for GA4 client: mock `@google-analytics/data`, verify request format, response parsing, retry behavior on failure, and exponential backoff timing
    - _Requirements: 2.1, 2.2, 3.2, 5.8_

- [x] 6. Sync API route and live data flow
  - [x] 6.1 Implement `POST /api/sync` route: re-read config, compute missing dates per property via `getMissingDates()`, fetch from GA4 API, upsert into SQLite, return per-property `SyncPropertyResult[]`. Handle partial failures (continue on per-property errors).
    - _Requirements: 3.1, 3.3, 3.4, 5.4, 5.5, 9.3, 9.4, 12.1, 12.2_

  - [x] 6.2 Update `GET /api/data` route to serve from SQLite in live mode: query `getSessionData()` filtered by current config properties, include `lastSyncTimestamps`
    - _Requirements: 4.3, 9.6, 9.7, 12.3, 12.4_

  - [ ]* 6.3 Write property test for config-driven data filtering (Property 10: Config-driven data filtering)
    - **Property 10: Config-driven data filtering**
    - Generate random cached records for N properties + random config subset of M properties, verify query returns only M properties' data
    - **Validates: Requirements 12.3, 12.4**

- [x] 7. Wire dashboard UI to live backend
  - [x] 7.1 Connect `SyncButton` to `POST /api/sync`: show loading state while syncing, disable button, refresh chart data on completion. Show "Populate Data" vs "Get New Data" based on `hasAnyData()`. Display per-property sync results.
    - _Requirements: 5.1, 5.2, 5.3, 5.6, 5.7_

  - [x] 7.2 Wire error handling into UI: `ErrorBanner` for auth/network/config errors, warning badges on failed property toggles with tooltip, setup guide when no properties loaded, last sync timestamps per property
    - _Requirements: 9.1, 9.2, 9.4, 9.5, 9.6, 9.7, 9.8_

  - [x] 7.3 Implement date range change behavior: update chart on selection, indicate when cached data is missing for new range, enable sync button accordingly
    - _Requirements: 8.3, 8.4, 8.5_

- [x] 8. Checkpoint - Live mode integration
  - Ensure all tests pass, verify mock mode and live mode both work. Ask the user if questions arise.

- [x] 9. Chart data transformations and remaining properties
  - [x] 9.1 Implement chart data transformation utilities: gap-fill function (zero for missing dates), color assignment (distinct color per property), Y-axis domain calculation (based on visible properties)
    - _Requirements: 6.1, 6.5, 7.4_

  - [ ]* 9.2 Write property test for chart series colors (Property 6: Chart data produces one series per property with distinct colors)
    - **Property 6: Chart data produces one series per property with distinct colors**
    - Generate random `PropertyConfig[]` arrays, verify one series per property with no duplicate colors
    - **Validates: Requirements 6.1**

  - [ ]* 9.3 Write property test for date gap filling (Property 7: Date gap filling produces zero for missing dates)
    - **Property 7: Date gap filling produces zero for missing dates**
    - Generate random date ranges + sparse session data, verify complete series with zero for gaps
    - **Validates: Requirements 6.5**

  - [ ]* 9.4 Write property test for Y-axis domain (Property 8: Y-axis domain matches visible data)
    - **Property 8: Y-axis domain matches visible data**
    - Generate random session data + random visibility booleans, verify Y-axis max equals max visible session count
    - **Validates: Requirements 7.4**

  - [ ]* 9.5 Write property test for mock data generator (Property 9: Mock data generator produces correct structure)
    - **Property 9: Mock data generator produces correct structure**
    - Generate random property counts (1–10) and day counts (1–365), verify `generateMockData()` returns `propertyCount × dayCount` records with correct structure
    - **Validates: Requirements 11.1**

- [x] 10. Configuration change handling
  - [x] 10.1 Ensure config re-read on sync: `POST /api/sync` re-reads `properties.json` each time. New properties get fetched, removed properties excluded from chart and toggles even if cached data exists.
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

  - [ ]* 10.2 Write unit tests for config change scenarios: add property → appears on next sync, remove property → line and toggle disappear, cached data for removed property not shown
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [x] 11. README and deployment setup
  - [x] 11.1 Create comprehensive README.md with: project overview, prerequisites, step-by-step Google service account setup, granting GA4 property access, `properties.json` configuration, `.env` setup, running locally (`npm run dev`), mock mode usage, Vercel deployment instructions, troubleshooting section
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [x] 12. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, verify mock mode and live mode both function correctly, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- The prototype (task 1.6) is intentionally early so you can review the UX before backend work begins
- Each task references specific requirements for traceability
- Property tests use `fast-check` as specified in the design document
- Checkpoints ensure incremental validation and user feedback opportunities
