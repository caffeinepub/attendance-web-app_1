import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Calendar,
  Clock,
  Loader2,
  RefreshCw,
  UserCheck,
  UserX,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { AttendanceRecord, Employee } from "../backend";
import StatusBadge from "../components/StatusBadge";
import { getBackend } from "../lib/getBackend";
import { reverseGeocode } from "../lib/reverseGeocode";

interface AttendanceRecordExt extends AttendanceRecord {
  locationLat: number;
  locationLng: number;
  locationType: string;
}

function getDateStr(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().split("T")[0];
}

function formatTs(ts: bigint): string {
  if (!ts || ts === BigInt(0)) return "—";
  const d = new Date(Number(ts));
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  const hh = String(hours).padStart(2, "0");
  return `${dd}-${mm}-${yyyy} ${hh}:${minutes} ${ampm}`;
}

type DisplayRow = AttendanceRecordExt & { isAbsent: boolean };

function ReverseGeoCell({ lat, lng }: { lat: number; lng: number }) {
  const [label, setLabel] = useState<string>(() =>
    lat === 0 && lng === 0 ? "" : `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
  );
  useEffect(() => {
    if (lat === 0 && lng === 0) {
      setLabel("");
      return;
    }
    let cancelled = false;
    reverseGeocode(lat, lng).then((v) => {
      if (!cancelled) setLabel(v);
    });
    return () => {
      cancelled = true;
    };
  }, [lat, lng]);
  return <span>{label || "—"}</span>;
}

function LogsPanel({
  title,
  rows,
  loading,
  dot,
}: {
  title: string;
  rows: DisplayRow[];
  loading: boolean;
  dot?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          {dot && <span className={`w-2 h-2 rounded-full ${dot} shrink-0`} />}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <div
            data-ocid="dashboard.loading_state"
            className="flex justify-center py-10"
          >
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : rows.length === 0 ? (
          <div
            data-ocid="dashboard.table.empty_state"
            className="text-center py-10 text-sm text-muted-foreground"
          >
            <Clock className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
            <p>No records logged today yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Name</TableHead>
                  <TableHead className="font-semibold">Log</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Time</TableHead>
                  <TableHead className="font-semibold">Work Location</TableHead>
                  <TableHead className="font-semibold">Geo Location</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow
                    key={`${r.mobile}-${r.date}-${r.logType as string}-${i}`}
                    data-ocid={`dashboard.table.item.${i + 1}`}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="capitalize text-muted-foreground text-sm">
                      {r.logType as string}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={r.status as string} />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {(r.logType as string) === "exit"
                        ? formatTs(r.exitTimestamp)
                        : formatTs(r.entryTimestamp)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {r.locationType || "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground font-mono">
                      <ReverseGeoCell lat={r.locationLat} lng={r.locationLng} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const [records, setRecords] = useState<AttendanceRecordExt[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const b = await getBackend();
      const [recs, emps] = await Promise.all([
        b.getAttendance(),
        b.getEmployees(),
      ]);
      setRecords(recs as AttendanceRecordExt[]);
      setEmployees(emps);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const today = getDateStr(0);
  const yesterday = getDateStr(-1);
  const isAfter4PM = new Date().getHours() >= 16;

  const todayRecords = records.filter((r) => r.date === today);
  const yesterdayRecords = records.filter((r) => r.date === yesterday);

  const presentMobiles = new Set(
    todayRecords
      .filter((r) => (r.logType as string) === "entry")
      .map((r) => r.mobile),
  );
  const totalCount = employees.length;
  const totalPresent = presentMobiles.size;
  const lateCount = todayRecords.filter(
    (r) => (r.status as string) === "Half Day",
  ).length;
  const weekOffCount = todayRecords.filter(
    (r) => (r.status as string) === "weekOff",
  ).length;
  const absentEmployees = isAfter4PM
    ? employees.filter((e) => !presentMobiles.has(e.mobile))
    : [];
  const absentCount = absentEmployees.length;

  const absentRows: DisplayRow[] = absentEmployees.map((e) => ({
    id: BigInt(0),
    name: e.name,
    mobile: e.mobile,
    date: today,
    logType: "entry" as any,
    status: "Absent" as any,
    entryTimestamp: BigInt(0),
    exitTimestamp: BigInt(0),
    locationLat: 0,
    locationLng: 0,
    locationType: "",
    isAbsent: true,
  }));

  const todayRows: DisplayRow[] = [
    ...todayRecords.map((r) => ({ ...r, isAbsent: false })),
    ...absentRows,
  ];

  const kpis = [
    {
      label: "TOTAL",
      value: loading ? "—" : totalCount,
      icon: <Users className="w-5 h-5 text-blue-500" />,
      border: "border-l-blue-500",
      iconBg: "bg-blue-50",
    },
    {
      label: "PRESENT",
      value: loading ? "—" : totalPresent,
      icon: <UserCheck className="w-5 h-5 text-green-500" />,
      border: "border-l-green-500",
      iconBg: "bg-green-50",
    },
    {
      label: "ABSENT",
      value: loading ? "—" : absentCount,
      icon: <UserX className="w-5 h-5 text-red-500" />,
      border: "border-l-red-500",
      iconBg: "bg-red-50",
    },
    {
      label: "LATE",
      value: loading ? "—" : lateCount,
      icon: <Clock className="w-5 h-5 text-orange-500" />,
      border: "border-l-orange-500",
      iconBg: "bg-orange-50",
    },
    {
      label: "WEEK OFF",
      value: loading ? "—" : weekOffCount,
      icon: <Calendar className="w-5 h-5 text-purple-500" />,
      border: "border-l-purple-500",
      iconBg: "bg-purple-50",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Overview</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Real-time attendance pulse for today
          </p>
        </div>
        <Button
          data-ocid="dashboard.refresh.button"
          variant="outline"
          size="sm"
          onClick={load}
          disabled={loading}
          className="shrink-0 gap-2"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          Refresh Data
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className={`border-l-4 ${kpi.border}`}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    {kpi.label}
                  </p>
                  <div className="text-3xl font-bold text-foreground">
                    {kpi.value}
                  </div>
                </div>
                <div
                  className={`w-9 h-9 rounded-lg ${kpi.iconBg} flex items-center justify-center`}
                >
                  {kpi.icon}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Logs */}
      <div className="grid md:grid-cols-2 gap-4">
        <LogsPanel
          title="Today's Logs"
          rows={todayRows}
          loading={loading}
          dot="bg-green-500"
        />
        <LogsPanel
          title="Yesterday's Logs"
          rows={yesterdayRecords.map((r) => ({ ...r, isAbsent: false }))}
          loading={loading}
        />
      </div>
    </div>
  );
}
