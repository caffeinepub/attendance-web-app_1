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
  User,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LogType } from "../backend";
import type { AttendanceInput } from "../backend";
import { getBackend } from "../lib/getBackend";
import { reverseGeocode } from "../lib/reverseGeocode";
import type { EmpSession } from "./LoginPage";

function fmtTsStr(ts: bigint): string {
  if (!ts || ts === BigInt(0)) return "";
  const d = new Date(Number(ts));
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  let h = d.getHours();
  const min = String(d.getMinutes()).padStart(2, "0");
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${dd}-${mm}-${yyyy} ${String(h).padStart(2, "0")}:${min} ${ap}`;
}

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

function getEntryStatus(shiftStart: string): string {
  const [sh, sm] = shiftStart.split(":").map(Number);
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  const shiftStartMins = sh * 60 + sm;
  if (mins < shiftStartMins) return "Early Entry";
  if (mins <= shiftStartMins + 15) return "On Time";
  return "Half Day";
}

function getExitStatus(shiftEnd: string): string {
  const [eh, em] = shiftEnd.split(":").map(Number);
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  const shiftEndMins = eh * 60 + em;
  if (mins < shiftEndMins) return "Early Exit";
  if (mins <= shiftEndMins + 15) return "On Time Exit";
  return "Late Exit";
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

interface MarkAttendanceProps {
  loggedInEmployee: EmpSession;
  onLogout?: () => void;
}

export default function MarkAttendance({
  loggedInEmployee,
}: MarkAttendanceProps) {
  const now = useClock();
  const [locationType, setLocationType] = useState<"In Showroom" | "In Kitty">(
    "In Showroom",
  );
  const [logType, setLogType] = useState<"entry" | "exit">("entry");
  const [loading, setLoading] = useState(false);
  const [weekOffLoading, setWeekOffLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(true);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [locationConfigured, setLocationConfigured] = useState(false);

  const shiftStart = loggedInEmployee.shiftStart || "10:30";
  const shiftEnd = loggedInEmployee.shiftEnd || "20:00";

  useEffect(() => {
    getBackend()
      .then(async (b) => {
        const loc = await b.getOfficeLocation();
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
    if (isWeekOff) {
      setWeekOffLoading(true);
    } else {
      setLoading(true);
    }

    try {
      const b = await getBackend();
      const existing = await b.getAttendanceByMobile(loggedInEmployee.mobile);
      const todayRecords = existing.filter((r) => r.date === today);

      if (!isWeekOff) {
        const dup = todayRecords.find(
          (r) => String(r.logType) === logType || r.logType === logType,
        );
        if (dup) {
          toast.error(`Already have an ${logType} record for today`);
          return;
        }
      }

      let finalLat = 0;
      let finalLng = 0;

      if (!isWeekOff) {
        if (locationType === "In Showroom") {
          const officeLocation = await b.getOfficeLocation();
          if (!officeLocation) {
            toast.error("Office location not set. Contact admin.");
            return;
          }
          if (userLat === null || userLng === null) {
            toast.error("GPS unavailable. Please allow location access.");
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
              `You are ${Math.round(dist)}m away from office. Must be within 100m for In Showroom.`,
            );
            return;
          }
          finalLat = userLat;
          finalLng = userLng;
        } else {
          finalLat = userLat ?? 0;
          finalLng = userLng ?? 0;
        }
      }

      const ts = BigInt(Date.now());
      const status: string = isWeekOff
        ? "Week Off"
        : logType === "exit"
          ? getExitStatus(shiftEnd)
          : getEntryStatus(shiftStart);

      const lt: LogType = isWeekOff
        ? LogType.entry
        : logType === "exit"
          ? LogType.exit
          : LogType.entry;

      const shiftTiming = `${formatTime(shiftStart)} - ${formatTime(shiftEnd)}`;

      const input: AttendanceInput = {
        name: loggedInEmployee.name,
        mobile: loggedInEmployee.mobile,
        date: today,
        logType: lt,
        status,
        entryTimestamp: lt === LogType.entry ? ts : BigInt(0),
        exitTimestamp: lt === LogType.exit ? ts : BigInt(0),
        locationLat: finalLat,
        locationLng: finalLng,
        locationType: isWeekOff ? "" : locationType,
      };

      await b.addAttendance(input);

      // Sync to Google Sheets (fire-and-forget)
      b.getAppsScriptUrl()
        .then(async (url) => {
          if (url) {
            const workLocation = isWeekOff
              ? "Week Off"
              : input.locationType || "";
            let geoLocation = "";
            if (
              !isWeekOff &&
              (input.locationLat !== 0 || input.locationLng !== 0)
            ) {
              geoLocation = await reverseGeocode(
                input.locationLat,
                input.locationLng,
              );
            } else if (!isWeekOff) {
              geoLocation = "0.000000, 0.000000";
            }
            fetch(url, {
              method: "POST",
              mode: "no-cors" as RequestMode,
              body: JSON.stringify({
                name: loggedInEmployee.name,
                mobile: loggedInEmployee.mobile,
                date: today,
                logType: String(lt),
                status,
                shiftTiming,
                entryTimestamp: fmtTsStr(input.entryTimestamp),
                exitTimestamp: fmtTsStr(input.exitTimestamp),
                workLocation,
                geoLocation,
              }),
            }).catch(() => {});
          }
        })
        .catch(() => {});

      toast.success(`Attendance marked: ${status}`);
      setLocationType("In Showroom");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`Failed to mark attendance: ${msg.slice(0, 80)}`);
      console.error("Attendance error:", e);
    } finally {
      setLoading(false);
      setWeekOffLoading(false);
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
          {/* Logged-in employee display */}
          <div className="flex items-center gap-3 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">
                {loggedInEmployee.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {loggedInEmployee.mobile}
              </p>
            </div>
            <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 shrink-0">
              Logged in
            </span>
          </div>

          {/* Work Location dropdown */}
          <div className="space-y-1.5">
            <Label>Work Location</Label>
            <Select
              value={locationType}
              onValueChange={(v) =>
                setLocationType(v as "In Showroom" | "In Kitty")
              }
            >
              <SelectTrigger data-ocid="mark.location.select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="In Showroom">In Showroom</SelectItem>
                <SelectItem value="In Kitty">In Kitty</SelectItem>
              </SelectContent>
            </Select>
            {locationType === "In Kitty" && (
              <p className="text-xs text-muted-foreground">
                Geo-fence bypassed. Your GPS coordinates will still be recorded
                for verification.
              </p>
            )}
          </div>

          {/* Shift time */}
          <div className="flex items-center gap-2 px-3 py-2.5 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
            <Clock className="w-4 h-4 shrink-0" />
            <span>
              Shift: <strong>{formatTime(shiftStart)}</strong> –{" "}
              <strong>{formatTime(shiftEnd)}</strong>
            </span>
          </div>

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

          {/* Confirm Entry/Exit button */}
          <Button
            data-ocid="mark.submit_button"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => submitAttendance(false)}
            disabled={loading || weekOffLoading}
          >
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Confirm {logType === "entry" ? "Entry" : "Exit"}
          </Button>

          {/* Mark Week Off button — always on its own row to prevent accidental taps */}
          <Button
            data-ocid="mark.weekoff.button"
            variant="outline"
            onClick={() => submitAttendance(true)}
            disabled={loading || weekOffLoading}
            className="w-full gap-2"
          >
            {weekOffLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CalendarX2 className="w-4 h-4" />
            )}
            Mark Week Off
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
