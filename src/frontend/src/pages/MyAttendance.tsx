import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClipboardList, Loader2, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { AttendanceRecord } from "../backend";
import StatusBadge from "../components/StatusBadge";
import { getBackend } from "../lib/getBackend";
import { reverseGeocode } from "../lib/reverseGeocode";

interface AttendanceRecordExt extends AttendanceRecord {
  locationLat: number;
  locationLng: number;
  locationType: string;
  expWh?: string;
  actWh?: string;
}

function getDefaultDateRange() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
  return {
    from: `${year}-${month}-01`,
    to: `${year}-${month}-${String(lastDay).padStart(2, "0")}`,
  };
}

function parseDateStr(dateStr: string): Date | null {
  if (!dateStr) return null;
  if (dateStr.includes("-")) {
    const parts = dateStr.split("-");
    if (parts[0].length === 4) {
      // yyyy-mm-dd
      return new Date(`${parts[0]}-${parts[1]}-${parts[2]}`);
    }
    // dd-mm-yyyy
    return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
  }
  return null;
}

function formatTs(ts: bigint): string {
  if (!ts || ts === BigInt(0)) return "\u2014";
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
  return <span>{label || "\u2014"}</span>;
}

interface MyAttendanceProps {
  mobile?: string;
}

export default function MyAttendance({
  mobile: mobileProp,
}: MyAttendanceProps) {
  const defaultRange = getDefaultDateRange();
  const [dateFrom, setDateFrom] = useState(defaultRange.from);
  const [dateTo, setDateTo] = useState(defaultRange.to);
  const [records, setRecords] = useState<AttendanceRecordExt[] | null>(null);
  const [loading, setLoading] = useState(false);

  const mobile = mobileProp ?? "";

  async function fetchRecords(fromDate: string, toDate: string) {
    if (!mobile.trim()) {
      toast.error("No employee session found. Please log in again.");
      return;
    }
    if (!fromDate || !toDate) {
      toast.error("Please select both from and to dates");
      return;
    }
    setLoading(true);
    try {
      const b = await getBackend();
      const recs = await b.getAttendanceByMobile(mobile.trim());
      const from = parseDateStr(fromDate);
      const to = parseDateStr(toDate);
      const filtered = (recs as AttendanceRecordExt[]).filter((r) => {
        const recDate = parseDateStr(r.date);
        if (!recDate || !from || !to) return true;
        return recDate >= from && recDate <= to;
      });
      setRecords(filtered);
      if (filtered.length === 0)
        toast.info("No records found for the selected date range");
    } catch {
      toast.error("Failed to fetch records");
    } finally {
      setLoading(false);
    }
  }

  // Auto-fetch on mount with default range
  const didMount = useRef(false);
  useEffect(() => {
    if (!didMount.current && mobile) {
      didMount.current = true;
      fetchRecords(defaultRange.from, defaultRange.to);
    }
  });

  const summary = records
    ? {
        present: records.filter((r) =>
          ["On Time", "Early Morning", "Half Day", "present"].includes(
            r.status as string,
          ),
        ).length,
        onTime: records.filter((r) => (r.status as string) === "On Time")
          .length,
        earlyMorning: records.filter(
          (r) => (r.status as string) === "Early Morning",
        ).length,
        halfDay: records.filter((r) => (r.status as string) === "Half Day")
          .length,
        weekOff: records.filter((r) => (r.status as string) === "Week Off")
          .length,
        exit: records.filter((r) => (r.status as string) === "Exit").length,
      }
    : null;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Attendance</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Verify your historical logs and aggregate data
        </p>
      </div>

      {/* Date range filter card */}
      <Card className="overflow-hidden">
        <CardContent className="pt-6 pb-6">
          <div className="relative">
            <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-5 pointer-events-none">
              <ClipboardList className="w-32 h-32 text-foreground" />
            </div>
            <div className="relative">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
                Date Range Filter
              </p>
              <div className="flex flex-col sm:flex-row gap-3 items-end">
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground mb-1 block">
                    From
                  </Label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground mb-1 block">
                    To
                  </Label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
                <Button
                  data-ocid="my.fetch_button"
                  onClick={() => fetchRecords(dateFrom, dateTo)}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 text-white shrink-0"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4 mr-1.5" />
                  )}
                  Fetch Records
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary stats */}
      {summary && (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {[
            {
              label: "Present",
              value: summary.present,
              cls: "text-blue-600",
              bg: "bg-blue-50",
            },
            {
              label: "On Time",
              value: summary.onTime,
              cls: "text-green-700",
              bg: "bg-green-50",
            },
            {
              label: "Early",
              value: summary.earlyMorning,
              cls: "text-yellow-700",
              bg: "bg-yellow-50",
            },
            {
              label: "Half Day",
              value: summary.halfDay,
              cls: "text-orange-600",
              bg: "bg-orange-50",
            },
            {
              label: "Week Off",
              value: summary.weekOff,
              cls: "text-muted-foreground",
              bg: "bg-muted",
            },
            {
              label: "Exit",
              value: summary.exit,
              cls: "text-blue-600",
              bg: "bg-blue-50",
            },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="py-3 px-3 text-center">
                <div className={`text-2xl font-bold ${s.cls}`}>{s.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {s.label}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Records table */}
      {records !== null && (
        <Card>
          <div className="px-6 py-4 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">
              Attendance History
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                ({records.length} records)
              </span>
            </h3>
          </div>
          <CardContent className="pt-0 px-0">
            {records.length === 0 ? (
              <div
                data-ocid="my.records.empty_state"
                className="text-center text-muted-foreground py-12 text-sm"
              >
                <ClipboardList className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
                No records found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">Date</TableHead>
                      <TableHead className="font-semibold">Log Type</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">
                        Entry Time
                      </TableHead>
                      <TableHead className="font-semibold">Exit Time</TableHead>
                      <TableHead className="font-semibold">EXP WH</TableHead>
                      <TableHead className="font-semibold">ACT WH</TableHead>
                      <TableHead className="font-semibold">
                        Work Location
                      </TableHead>
                      <TableHead className="font-semibold">
                        Geo Location
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((r, i) => (
                      <TableRow
                        key={`${r.date}-${r.logType as string}-${String(r.id)}`}
                        data-ocid={`my.records.item.${i + 1}`}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        <TableCell className="font-medium">{r.date}</TableCell>
                        <TableCell className="capitalize text-muted-foreground">
                          {r.logType as string}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={r.status as string} />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatTs(r.entryTimestamp)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatTs(r.exitTimestamp)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {r.expWh || "\u2014"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {r.actWh || "\u2014"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {r.locationType || "\u2014"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground font-mono">
                          <ReverseGeoCell
                            lat={r.locationLat}
                            lng={r.locationLng}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
