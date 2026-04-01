import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CalendarX2,
  Clock,
  Loader2,
  LogIn,
  LogOut,
  MapPin,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LogType, type Status } from "../backend";
import type { Employee } from "../backend";
import { getBackend } from "../lib/getBackend";
import { getEmployeeShift } from "./AdminPanel";

function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getEntryStatus(mobile: string): string {
  const shift = getEmployeeShift(mobile);
  const [sh, sm] = shift.start.split(":").map(Number);
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  const shiftMins = sh * 60 + sm;
  if (mins < shiftMins - 30) return "Early Morning";
  if (mins <= shiftMins) return "On Time";
  return "Half Day";
}

function formatTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function useClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

export default function MarkAttendance() {
  const now = useClock();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedMobile, setSelectedMobile] = useState("");
  const [logType, setLogType] = useState<"entry" | "exit">("entry");
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(true);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [locationConfigured, setLocationConfigured] = useState(false);

  const selectedEmployee = employees.find((e) => e.mobile === selectedMobile);
  const employeeShift = selectedMobile
    ? getEmployeeShift(selectedMobile)
    : null;

  useEffect(() => {
    getBackend()
      .then(async (b) => {
        const [emps, loc] = await Promise.all([
          b.getEmployees(),
          b.getOfficeLocation(),
        ]);
        setEmployees(emps);
        setLocationConfigured(!!loc);
      })
      .catch(console.error);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLat(pos.coords.latitude);
        setUserLng(pos.coords.longitude);
        setGeoLoading(false);
      },
      () => {
        setGeoLoading(false);
      },
    );
  }, []);

  const today = new Date().toISOString().split("T")[0];

  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const dateStr = now
    .toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    })
    .toUpperCase();

  async function submitAttendance(isWeekOff: boolean) {
    if (!selectedMobile || !selectedEmployee) {
      toast.error("Please select an employee");
      return;
    }
    setLoading(true);
    try {
      const b = await getBackend();
      const existing = await b.getAttendanceByMobile(selectedMobile);
      const todayRecords = existing.filter((r) => r.date === today);
      if (!isWeekOff) {
        const dup = todayRecords.find((r) => (r.logType as string) === logType);
        if (dup) {
          toast.error(`Already have an ${logType} record for today`);
          setLoading(false);
          return;
        }
      }

      if (!isWeekOff) {
        const officeLocation = await b.getOfficeLocation();
        if (!officeLocation) {
          toast.error("Office location not set. Contact admin.");
          setLoading(false);
          return;
        }
        if (userLat === null || userLng === null) {
          toast.error("Unable to get your location.");
          setLoading(false);
          return;
        }
        const dist = haversineDistance(
          userLat,
          userLng,
          officeLocation.lat,
          officeLocation.lng,
        );
        if (dist > 100) {
          toast.error(
            `You are ${Math.round(dist)}m from office. Must be within 100m.`,
          );
          setLoading(false);
          return;
        }
      }

      const ts = BigInt(Date.now());
      const displayStatus = isWeekOff
        ? "Week Off"
        : logType === "exit"
          ? "Exit"
          : getEntryStatus(selectedMobile);
      const lt = isWeekOff
        ? LogType.entry
        : logType === "exit"
          ? LogType.exit
          : LogType.entry;

      const input = {
        name: selectedEmployee.name,
        mobile: selectedMobile,
        date: today,
        logType: lt,
        status: displayStatus as unknown as Status,
        entryTimestamp: lt === LogType.entry ? ts : BigInt(0),
        exitTimestamp: lt === LogType.exit ? ts : BigInt(0),
      };

      await b.addAttendance(input);

      b.getAppsScriptUrl()
        .then((url) => {
          if (url) {
            fetch(url, {
              method: "POST",
              body: JSON.stringify({
                name: selectedEmployee.name,
                mobile: selectedMobile,
                date: today,
                logType: lt,
                status: displayStatus,
                entryTimestamp: input.entryTimestamp.toString(),
                exitTimestamp: input.exitTimestamp.toString(),
              }),
            }).catch(() => {});
          }
        })
        .catch(() => {});

      toast.success(`Attendance marked: ${displayStatus}`);
      setSelectedMobile("");
    } catch (e) {
      toast.error("Failed to mark attendance");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Mark Attendance
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Log your daily entry and exit times.
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-border text-muted-foreground bg-card shrink-0">
          <MapPin className="w-3.5 h-3.5" />
          {geoLoading
            ? "Detecting..."
            : locationConfigured
              ? userLat !== null
                ? "Location Ready"
                : "GPS Unavailable"
              : "Location Not Configured"}
        </div>
      </div>

      {/* Clock card */}
      <div className="rounded-xl bg-blue-50 border border-blue-100 px-6 py-8 text-center mb-4">
        <div className="text-5xl font-bold text-blue-600 tracking-tight tabular-nums">
          {timeStr}
        </div>
        <div className="text-xs text-slate-500 mt-2 tracking-widest font-medium">
          {dateStr}
        </div>
      </div>

      {/* Form card */}
      <Card>
        <CardContent className="pt-5 space-y-4">
          {/* Employee selector */}
          <div className="space-y-1.5">
            <Label>Employee</Label>
            <Select value={selectedMobile} onValueChange={setSelectedMobile}>
              <SelectTrigger data-ocid="mark.select">
                <SelectValue placeholder="Select your profile..." />
              </SelectTrigger>
              <SelectContent>
                {employees.map((emp) => (
                  <SelectItem key={emp.mobile} value={emp.mobile}>
                    {emp.name} — {emp.mobile}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Shift time */}
          {selectedEmployee && employeeShift && (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
              <Clock className="w-4 h-4 shrink-0" />
              <span>
                Shift: <strong>{formatTime(employeeShift.start)}</strong> –{" "}
                <strong>{formatTime(employeeShift.end)}</strong>
              </span>
            </div>
          )}

          {/* Log type toggle */}
          <div className="space-y-1.5">
            <Label>Log Type</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                data-ocid="mark.entry.toggle"
                onClick={() => setLogType("entry")}
                className={`flex flex-col items-center gap-2 py-4 rounded-lg border-2 transition-all ${
                  logType === "entry"
                    ? "bg-blue-50 border-blue-500 text-blue-600"
                    : "bg-white border-border text-muted-foreground hover:border-blue-300"
                }`}
              >
                <LogIn className="w-5 h-5" />
                <span className="text-sm font-semibold">Entry</span>
              </button>
              <button
                type="button"
                data-ocid="mark.exit.toggle"
                onClick={() => setLogType("exit")}
                className={`flex flex-col items-center gap-2 py-4 rounded-lg border-2 transition-all ${
                  logType === "exit"
                    ? "bg-blue-50 border-blue-500 text-blue-600"
                    : "bg-white border-border text-muted-foreground hover:border-blue-300"
                }`}
              >
                <LogOut className="w-5 h-5" />
                <span className="text-sm font-semibold">Exit</span>
              </button>
            </div>
          </div>

          {/* Actions - stacked on mobile, side by side on larger screens */}
          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <Button
              data-ocid="mark.submit_button"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => submitAttendance(false)}
              disabled={loading || !selectedMobile}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Confirm {logType === "entry" ? "Entry" : "Exit"}
            </Button>
            <Button
              data-ocid="mark.weekoff.button"
              variant="outline"
              onClick={() => submitAttendance(true)}
              disabled={loading || !selectedMobile}
              className="gap-2 sm:shrink-0"
            >
              <CalendarX2 className="w-4 h-4" />
              Mark Week Off
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
