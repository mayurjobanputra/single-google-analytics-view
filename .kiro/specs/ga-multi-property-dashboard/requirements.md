# Requirements Document

## Introduction

"Single Google Analytics View" is a locally-running web application that aggregates visit/session data from multiple Google Analytics 4 (GA4) properties and displays them as colored lines on a single line chart. Users configure their GA4 property IDs via a JSON config file and authenticate using a Google service account. Data is cached in SQLite to minimize API calls, with an on-demand sync triggered by the user via a button. The app detects config changes (added/removed properties) and only displays data for properties currently listed in the config. The app is built with Next.js for local development and Vercel/VPS deployment, and uses Chart.js or Recharts for visualization.

## Glossary

- **Dashboard**: The main web page displaying the multi-property line chart, toggle controls, and date range selector
- **GA4_Property**: A Google Analytics 4 property identified by a 9-digit numeric ID (e.g., 531170948)
- **Property_Config**: A JSON configuration file (`properties.json`) containing an array of GA4 property IDs and their display names
- **Service_Account**: A Google Cloud service account with credentials stored as a JSON key file, used to authenticate against the GA4 Data API
- **Session_Count**: The number of sessions (visits) recorded for a GA4 property on a given date
- **Cache_Database**: A local SQLite database storing previously fetched session data to avoid redundant API calls
- **Sync_Worker**: A process triggered on-demand by the user that fetches data from the GA4 Data API and updates the Cache_Database with new or missing daily session data
- **Sync_Button**: A UI button that triggers the Sync_Worker; displays "Populate Data" when the Cache_Database contains no data, and "Get New Data" once data exists
- **Line_Chart**: A chart component rendering one colored line per GA4 property, with date on the X-axis and session count on the Y-axis
- **Toggle_Switch**: A UI control associated with each GA4 property that shows or hides its corresponding line on the Line_Chart
- **Date_Range_Selector**: A dropdown UI control allowing the user to choose the time window displayed on the Line_Chart

## Requirements

### Requirement 1: Property Configuration

**User Story:** As a user, I want to define my GA4 properties in a config file, so that the Dashboard knows which properties to fetch and display.

#### Acceptance Criteria

1. THE Dashboard SHALL read GA4 property definitions from a `properties.json` file located in the project root
2. WHEN `properties.json` contains a valid array of objects each with a `propertyId` (string) and `displayName` (string) field, THE Dashboard SHALL load all listed GA4 properties
3. IF `properties.json` is missing or contains invalid JSON, THEN THE Dashboard SHALL display a descriptive error message indicating the configuration problem
4. IF a property entry is missing a `propertyId` or `displayName` field, THEN THE Dashboard SHALL skip that entry and log a warning identifying the incomplete entry

### Requirement 2: Service Account Authentication

**User Story:** As a user, I want to authenticate with Google using a service account, so that the app can access my GA4 data without an interactive login flow.

#### Acceptance Criteria

1. THE Dashboard SHALL authenticate to the GA4 Data API using service account credentials referenced by environment variables in a `.env` file
2. WHEN valid service account credentials are provided, THE Dashboard SHALL establish an authenticated connection to the GA4 Data API
3. IF the service account credentials file is missing or malformed, THEN THE Dashboard SHALL display a clear error message describing the authentication failure
4. IF the service account lacks read access to a configured GA4 property, THEN THE Dashboard SHALL log a warning identifying the inaccessible property and continue loading remaining properties

### Requirement 3: Data Fetching from GA4 API

**User Story:** As a user, I want the app to fetch daily session data from each configured GA4 property, so that I can see visit trends over time.

#### Acceptance Criteria

1. WHEN the user triggers a sync via the Sync_Button, THE Sync_Worker SHALL fetch daily Session_Count data from the GA4 Data API for each configured GA4_Property within the selected date range
2. THE Sync_Worker SHALL request the `sessions` metric grouped by `date` dimension from the GA4 Data API
3. WHEN fetching data for a GA4_Property, THE Sync_Worker SHALL only request dates not already present in the Cache_Database for that property
4. IF the GA4 Data API returns an error for a specific property, THEN THE Sync_Worker SHALL log the error with the property ID and continue fetching data for remaining properties

### Requirement 4: Local Data Caching

**User Story:** As a user, I want fetched GA4 data to be cached locally in SQLite, so that the app loads quickly and avoids redundant API calls.

#### Acceptance Criteria

1. THE Cache_Database SHALL store session data with columns for property ID, date, and session count
2. WHEN the Sync_Worker fetches new data from the GA4 Data API, THE Sync_Worker SHALL insert the fetched records into the Cache_Database
3. WHEN the Dashboard requests data for a date range, THE Dashboard SHALL serve data from the Cache_Database when available
4. THE Cache_Database SHALL enforce a unique constraint on the combination of property ID and date to prevent duplicate records
5. IF a record for a given property ID and date already exists in the Cache_Database, THEN THE Sync_Worker SHALL update the existing session count with the newly fetched value

### Requirement 5: On-Demand Data Sync

**User Story:** As a user, I want to manually trigger data sync via a button, so that I control when API calls are made and the chart updates with fresh data.

#### Acceptance Criteria

1. THE Dashboard SHALL display a Sync_Button that the user clicks to trigger data fetching
2. WHEN the Cache_Database contains no session data for any configured property, THE Sync_Button SHALL display the label "Populate Data"
3. WHEN the Cache_Database contains session data for at least one configured property, THE Sync_Button SHALL display the label "Get New Data"
4. WHEN the user clicks the Sync_Button, THE Sync_Worker SHALL fetch missing daily data for all configured GA4 properties within the selected date range
5. THE Sync_Worker SHALL determine missing dates by comparing the selected date range against dates already stored in the Cache_Database for each property
6. WHEN the Sync_Worker completes a sync cycle, THE Dashboard SHALL refresh the Line_Chart with the updated data without requiring a page reload
7. WHILE the Sync_Worker is fetching data, THE Sync_Button SHALL be disabled and display a loading indicator
8. IF the Sync_Worker encounters a network error during sync, THEN THE Sync_Worker SHALL retry the failed request up to 3 times with exponential backoff before logging the failure

### Requirement 6: Line Chart Visualization

**User Story:** As a user, I want to see a single line chart with one colored line per GA4 property, so that I can compare visit trends across my sites at a glance.

#### Acceptance Criteria

1. THE Line_Chart SHALL display one line per configured GA4_Property, each rendered in a distinct color
2. THE Line_Chart SHALL use date as the X-axis with one data point per day
3. THE Line_Chart SHALL use Session_Count as the Y-axis
4. WHEN data for multiple GA4 properties is loaded, THE Line_Chart SHALL display a legend mapping each line color to the property display name
5. WHEN a GA4_Property has no data for a given date within the selected range, THE Line_Chart SHALL treat that date as having zero sessions for that property
6. THE Line_Chart SHALL render using Chart.js or Recharts within a Next.js page component

### Requirement 7: Property Toggle Controls

**User Story:** As a user, I want toggle switches for each GA4 property, so that I can show or hide individual property lines on the chart.

#### Acceptance Criteria

1. THE Dashboard SHALL display one Toggle_Switch per configured GA4_Property, labeled with the property display name
2. WHEN a Toggle_Switch is turned off, THE Line_Chart SHALL remove the corresponding property line from the chart
3. WHEN a Toggle_Switch is turned on, THE Line_Chart SHALL add the corresponding property line back to the chart
4. WHEN a property line is toggled on or off, THE Line_Chart SHALL recalculate and adjust the Y-axis scale to fit the visible data
5. THE Dashboard SHALL initialize all Toggle_Switches in the "on" position when the page loads

### Requirement 8: Date Range Selection

**User Story:** As a user, I want to select different date ranges, so that I can view visit data over various time periods.

#### Acceptance Criteria

1. THE Dashboard SHALL display a Date_Range_Selector with options for 30 days, 60 days, 90 days, 6 months, and 1 year
2. THE Dashboard SHALL default the Date_Range_Selector to 30 days on initial page load
3. WHEN the user selects a new date range, THE Dashboard SHALL update the Line_Chart to display data for the selected period
4. WHEN the user selects a new date range and the Cache_Database lacks data for dates in the newly selected period, THE Dashboard SHALL indicate that new data is available to fetch and enable the Sync_Button
5. WHILE the Sync_Worker is fetching data for a new date range, THE Dashboard SHALL display a loading indicator on the Line_Chart

### Requirement 9: Error Handling and Graceful Failure

**User Story:** As a user, I want the app to handle errors gracefully and continue showing available data, so that partial failures do not prevent me from viewing cached analytics.

#### Acceptance Criteria

1. IF no GA4 properties are successfully loaded, THEN THE Dashboard SHALL display a setup guide message with instructions for configuring `properties.json` and service account credentials
2. WHEN the Sync_Worker is actively fetching data, THE Dashboard SHALL display a sync status indicator showing the current sync state
3. IF the GA4 Data API returns an authorization error for a specific property, THEN THE Sync_Worker SHALL log a warning identifying the inaccessible property and continue fetching data for remaining properties
4. IF some properties fail during sync while others succeed, THEN THE Dashboard SHALL display the successfully fetched data and show a warning badge next to each failed property's Toggle_Switch
5. IF the Google API connector encounters an authentication failure or network error, THEN THE Dashboard SHALL display a clear error message describing the connectivity issue without crashing
6. WHEN the GA4 Data API is unreachable, THE Dashboard SHALL continue to display previously cached data from the Cache_Database
7. THE Dashboard SHALL display the timestamp of the last successful sync for each property
8. IF all API requests for a property fail after retries, THEN THE Dashboard SHALL display a warning badge next to that property's Toggle_Switch with a tooltip describing the failure reason

### Requirement 10: Deployment Compatibility

**User Story:** As a user, I want the app to work both locally and when deployed to Vercel or a VPS, so that I can choose my preferred hosting approach.

#### Acceptance Criteria

1. THE Dashboard SHALL run as a Next.js application startable via `npm run dev` for local development
2. THE Dashboard SHALL be deployable to Vercel using standard Next.js deployment configuration
3. WHEN deployed to Vercel, THE Dashboard SHALL read service account credentials from environment variables configured in the hosting platform
4. THE Dashboard SHALL include a README file with step-by-step instructions for creating a Google service account, granting GA4 property access, configuring environment variables, and running the application locally

### Requirement 11: Prototype / Proof of Concept

**User Story:** As a user, I want an early visual prototype of the dashboard with mock data, so that I can evaluate the UX before the backend is fully built.

#### Acceptance Criteria

1. THE Dashboard SHALL include a prototype mode that renders the Line_Chart with hardcoded mock data for at least 3 sample properties over 30 days
2. WHEN running in prototype mode, THE Dashboard SHALL display all UI elements including the Line_Chart, Toggle_Switches, Date_Range_Selector, and property legend
3. WHEN running in prototype mode, THE Dashboard SHALL use the same chart component and layout that the production version uses
4. THE Dashboard SHALL activate prototype mode when no `properties.json` file is present or when a `MOCK_MODE=true` environment variable is set

### Requirement 12: Configuration Change Handling

**User Story:** As a user, I want the app to respect changes I make to `properties.json`, so that newly added properties get fetched and removed properties disappear from the chart.

#### Acceptance Criteria

1. WHEN the user triggers a sync via the Sync_Button, THE Sync_Worker SHALL re-read `properties.json` to detect any added or removed GA4 properties
2. WHEN a new GA4_Property is added to `properties.json`, THE Sync_Worker SHALL fetch data for the new property during the next user-triggered sync
3. WHEN a GA4_Property is removed from `properties.json`, THE Line_Chart SHALL exclude that property from the chart even if cached data for the property exists in the Cache_Database
4. THE Line_Chart SHALL only display lines for GA4 properties currently listed in `properties.json`
5. WHEN a GA4_Property is removed from `properties.json`, THE Dashboard SHALL remove the corresponding Toggle_Switch from the UI
