import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClipboardList, Loader2, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { AttendanceRecord } from "../backend";
import StatusBadge from "../components/StatusBadge";
import { getBackend } from "../lib/getBackend";

function formatTs(ts: bigint): string {
  if (!ts || ts === BigInt(0)) return "—";
  return new Date(Number(ts)).toLocaleString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MyAttendance() {
  const [mobile, setMobile] = useState("");
  const [records, setRecords] = useState<AttendanceRecord[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function search() {
    if (!mobile.trim()) {
      toast.error("Enter a mobile number");
      return;
    }
    setLoading(true);
    try {
      const b = await getBackend();
      const recs = await b.getAttendanceByMobile(mobile.trim());
      setRecords(recs);
      if (recs.length === 0)
        toast.info("No records found for this mobile number");
    } catch {
      toast.error("Failed to fetch records");
    } finally {
      setLoading(false);
    }
  }

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

      {/* Identity verification card */}
      <Card className="overflow-hidden">
        <CardContent className="pt-6 pb-6">
          <div className="relative">
            {/* Decorative background icon */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-5 pointer-events-none">
              <ClipboardList className="w-32 h-32 text-foreground" />
            </div>
            <div className="relative">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
                Identity Verification
              </p>
              <div className="flex gap-3 items-center">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    data-ocid="my.search_input"
                    placeholder="Enter registered mobile number..."
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && search()}
                    className="pl-9"
                  />
                </div>
                <Button
                  data-ocid="my.fetch_button"
                  onClick={search}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 text-white shrink-0"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  ) : null}
                  Fetch Record
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
