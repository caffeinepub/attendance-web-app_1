# AttendTrack - TrackerPro Design Redesign

## Current State
The app has 5 pages (Mark Attendance, Dashboard, My Attendance, Admin Panel, Admin Dashboard) with a light/white sidebar using AttendTrack branding. The sidebar uses light colors and the nav items use a blue highlight. All functionality (geo-fencing, per-employee shift times, Google Sheets sync, password protection) is in place.

## Requested Changes (Diff)

### Add
- Dark navy sidebar (deep dark navy #0f1929 or similar) with white/light text
- "TrackerPro" branding with a clock icon and "HR ATTENDANCE SYSTEM" subtitle below the logo
- Sidebar footer showing today's date ("TODAY / Wednesday, April 1") and version number ("TrackerPro System v1.0.0")
- Large live clock display on Mark Attendance (large blue time + date below)
- KPI cards on Dashboard with colored left borders: blue=Total, green=Present, red=Absent, orange=Late, purple=Week Off
- Colored icons on KPI cards matching their border color
- "Overview" title on Dashboard with "Real-time attendance pulse for today" subtitle and Refresh Data button
- Today's Logs (with green dot) and Yesterday's Logs side by side on Dashboard
- "Identity Verification" card section on My Attendance with search icon in input
- "Location Not Configured" badge on Mark Attendance top right (when no location set)
- Admin Console password lock screen: key icon card, centered, blue top border on card
- Admin Panel "Lock Session" button top right after auth
- "Roster Directory" section title with "Manage personnel and shift timings" subtitle and "+ Add Personnel" button

### Modify
- Sidebar background: change from white/light to dark navy
- Active nav item: blue pill highlight (same as current but on dark background)
- Nav items text: white/light gray on dark background
- "AttendTrack" name → "TrackerPro" in the sidebar
- Dashboard title from current → "Overview" with subtitle
- Admin Panel tabs: Employees / Logs / Location / Integrations (keep existing functionality)
- Mark Attendance layout: clock card at top, then employee/log type below

### Remove
- Light/white sidebar styling
- "AttendTrack" branding text

## Implementation Plan
1. Update index.css: dark sidebar CSS variables (--sidebar: dark navy, --sidebar-foreground: white)
2. Rewrite Nav.tsx: TrackerPro logo + clock icon, HR ATTENDANCE SYSTEM subtitle, dark nav items, date+version footer
3. Update MarkAttendance.tsx: large live clock at top, Location Not Configured badge, keep all existing logic
4. Update Dashboard.tsx: Overview title, colored left-border KPI cards, Today's/Yesterday's Logs side by side
5. Update MyAttendance.tsx: Identity Verification card with search icon input
6. Update AdminPanel.tsx: Admin Console lock screen with key icon card + blue top border; after auth show Lock Session button, Employees/Logs/Location/Integrations tabs, Roster Directory section
7. Keep all backend logic and functionality intact
