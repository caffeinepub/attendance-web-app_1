# TrackerPro - Rename ACT Hour / Worked Hour Columns

## Current State
The app has attendance records displaying two working-hours columns:
- **ACT Hour** -- shift duration (expected working hours)
- **Worked Hour** -- actual hours worked (Entry to Exit)

These column names appear in:
- `MarkAttendance.tsx` -- Google Sheets payload keys: `actHour`, `workedHour`
- `AdminDashboard.tsx` -- table header `<TableHead>` cells
- `MyAttendance.tsx` -- table header `<TableHead>` cells
- `AdminPanel.tsx` -- Apps Script code sample string and header row description

## Requested Changes (Diff)

### Add
- Nothing new added

### Modify
- Rename display label "ACT Hour" → "EXP WH" everywhere (table headers, payload labels, instructions)
- Rename display label "Worked Hour" → "ACT WH" everywhere (table headers, payload labels, instructions)
- In `MarkAttendance.tsx` Google Sheets fetch payload: rename key `actHour` → `expWh` and `workedHour` → `actWh`
- In `AdminPanel.tsx` Apps Script code sample: update `data.actHour` → `data.expWh`, `data.workedHour` → `data.actWh` and update header row text

### Remove
- Nothing removed

## Implementation Plan
1. In `AdminDashboard.tsx`: rename `<TableHead>ACT Hour</TableHead>` → `<TableHead>EXP WH</TableHead>` and `<TableHead>Worked Hour</TableHead>` → `<TableHead>ACT WH</TableHead>`
2. In `MyAttendance.tsx`: same header renames
3. In `MarkAttendance.tsx`: rename Google Sheets payload keys `actHour` → `expWh`, `workedHour` → `actWh`
4. In `AdminPanel.tsx`: update Apps Script code sample string (`data.actHour` → `data.expWh`, `data.workedHour` → `data.actWh`) and update the header row display text
