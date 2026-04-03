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

/**
 * Entry punctuality:
 * - "On Time"      : arrived within 15-min grace period after shift start
 * - "Came Late"    : late but less than 33% into shift
 * - "Late Came/HD" : more than 33% into shift (Half Day)
 */
function getEntryStatus(shiftStart: string, shiftEnd: string): string {
  const [sh, sm] = shiftStart.split(":").map(Number);
  const [eh, em] = shiftEnd.split(":").map(Number);
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const startMins = sh * 60 + sm;
  const endMins = eh * 60 + em;
  const shiftDuration = endMins - startMins;
  const threshold33 = startMins + Math.floor(shiftDuration * 0.33);
  if (nowMins <= startMins + 15) return "On Time";
  if (nowMins < threshold33) return "Came Late";
  return "Late Came/HD";
}

/**
 * Exit punctuality:
 * - "Early Go/HD" : left more than 33% before shift end (Half Day)
 * - "On Time"     : exited within 15 minutes after shift end
 * - "Go Late"     : stayed more than 15 minutes past shift end
 */
function getExitStatus(shiftStart: string, shiftEnd: string): string {
  const [sh, sm] = shiftStart.split(":").map(Number);
  const [eh, em] = shiftEnd.split(":").map(Number);
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const startMins = sh * 60 + sm;
  const endMins = eh * 60 + em;
  const shiftDuration = endMins - startMins;
  const earlyThreshold = endMins - Math.floor(shiftDuration * 0.33);
  void startMins;
  if (nowMins < earlyThreshold) return "Early Go/HD";
  if (nowMins <= endMins + 15) return "On Time";
  return "Go Late";
}

function formatTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
}

/** Calculate expected working hours (shift duration) as a formatted string */
function calcExpWh(shiftStart: string, shiftEnd: string): string {
  const [sh, sm] = shiftStart.split(":").map(Number);
  const [eh, em] = shiftEnd.split(":").map(Number);
  const totalMins = eh * 60 + em - (sh * 60 + sm);
  if (totalMins <= 0) return "";
  const hrs = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

/** Calculate actual working hours between entry and exit timestamps */
function calcActWh(entryTs: bigint, exitTs: bigint): string {
  if (!entryTs || entryTs === BigInt(0) || !exitTs || exitTs === BigInt(0))
    return "";
  const diffMs = Number(exitTs) - Number(entryTs);
  if (diffMs <= 0) return "";
  const totalMins = Math.floor(diffMs / 60000);
  const hrs = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
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

  const [shiftStart, setShiftStart] = useState(
    loggedInEmployee.shiftStart || "10:30",
  );
  const [shiftEnd, setShiftEnd] = useState(
    loggedInEmployee.shiftEnd || "20:00",
  );

  useEffect(() => {
    getBackend()
      .then(async (b) => {
        const shiftResult = await b.getEmployeeShift(loggedInEmployee.mobile);
        if (shiftResult) {
          setShiftStart(shiftResult.shiftStart || "10:30");
          setShiftEnd(shiftResult.shiftEnd || "20:00");
        }
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
  }, [loggedInEmployee.mobile]);

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

      if (isWeekOff) {
        const dupWO = todayRecords.find(
          (r) => (r.status as string) === "Week Off",
        );
        if (dupWO) {
          toast.error("Week Off already marked for today");
          return;
        }
      } else {
        const dup = todayRecords.find(
          (r) => String(r.logType) === logType || r.logType === logType,
        );
        if (dup) {
          toast.error(
            logType === "entry"
              ? "Entry already marked for today"
              : "Exit already marked for today",
          );
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

      let status: string;
      if (isWeekOff) {
        status = "Week Off";
      } else if (logType === "exit") {
        status = getExitStatus(shiftStart, shiftEnd);
      } else {
        status = getEntryStatus(shiftStart, shiftEnd);
      }

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

            const expWh = calcExpWh(shiftStart, shiftEnd);
            const actWh =
              lt === LogType.exit ? calcActWh(input.entryTimestamp, ts) : "";

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
                expWh,
                actWh,
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

      <div className="rounded-xl bg-blue-50 border border-blue-100 px-6 py-8 text-center mb-4">
        <div className="text-5xl font-bold text-blue-600 tracking-tight tabular-nums">
          {timeStr}
        </div>
        <div className="text-xs text-slate-500 mt-2 tracking-widest font-medium">
          {dateStr}
        </div>
      </div>

      <Card>
        <CardContent className="pt-5 space-y-4">
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

          <div className="flex items-center gap-2 px-3 py-2.5 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
            <Clock className="w-4 h-4 shrink-0" />
            <span>
              Shift: <strong>{formatTime(shiftStart)}</strong> –{" "}
              <strong>{formatTime(shiftEnd)}</strong>
            </span>
          </div>

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

          <Button
            data-ocid="mark.submit_button"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => submitAttendance(false)}
            disabled={loading || weekOffLoading}
          >
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Confirm {logType === "entry" ? "Entry" : "Exit"}
          </Button>

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
