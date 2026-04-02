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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BookOpen,
  Clock,
  Link,
  Loader2,
  Lock,
  MapPin,
  Plus,
  Save,
  Trash2,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { AttendanceRecord, Employee } from "../backend";
import StatusBadge from "../components/StatusBadge";
import { getBackend } from "../lib/getBackend";

const ADMIN_PASSWORD = "Zaira@1234";
const SESSION_KEY = "attend_admin_auth";

export function getEmployeeShift(mobile: string): {
  start: string;
  end: string;
} {
  return {
    start: localStorage.getItem(`shift_start_${mobile}`) || "10:00",
    end: localStorage.getItem(`shift_end_${mobile}`) || "18:00",
  };
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

export default function AdminPanel() {
  const [authed, setAuthed] = useState(
    () => sessionStorage.getItem(SESSION_KEY) === "1",
  );
  const [pwInput, setPwInput] = useState("");
  const [pwError, setPwError] = useState("");

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [empLoading, setEmpLoading] = useState(false);
  const [newName, setNewName] = useState("");
  const [newMobile, setNewMobile] = useState("");
  const [newShiftStart, setNewShiftStart] = useState("10:00");
  const [newShiftEnd, setNewShiftEnd] = useState("18:00");
  const [shiftEdits, setShiftEdits] = useState<
    Record<string, { start: string; end: string }>
  >({});
  const [savingShift, setSavingShift] = useState<string | null>(null);

  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [locationLoading, setLocationLoading] = useState(false);

  const [appsUrl, setAppsUrl] = useState("");
  const [urlLoading, setUrlLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);

  const [logs, setLogs] = useState<AttendanceRecord[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  useEffect(() => {
    if (!authed) return;
    getBackend()
      .then(async (b) => {
        const [emps, loc, url] = await Promise.all([
          b.getEmployees(),
          b.getOfficeLocation(),
          b.getAppsScriptUrl(),
        ]);
        setEmployees(emps);
        const edits: Record<string, { start: string; end: string }> = {};
        for (const emp of emps)
          edits[emp.mobile] = getEmployeeShift(emp.mobile);
        setShiftEdits(edits);
        if (loc) {
          setLat(String(loc.lat));
          setLng(String(loc.lng));
        }
        setAppsUrl(url);
      })
      .catch(console.error);
  }, [authed]);

  function login() {
    if (pwInput === ADMIN_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, "1");
      setAuthed(true);
      setPwError("");
    } else {
      setPwError("Incorrect password");
    }
  }

  function logout() {
    sessionStorage.removeItem(SESSION_KEY);
    setAuthed(false);
    setPwInput("");
  }

  function saveEmployeeShift(mobile: string) {
    setSavingShift(mobile);
    const edit = shiftEdits[mobile];
    if (edit) {
      localStorage.setItem(`shift_start_${mobile}`, edit.start);
      localStorage.setItem(`shift_end_${mobile}`, edit.end);
    }
    setTimeout(() => {
      setSavingShift(null);
      toast.success("Shift saved");
    }, 200);
  }

  function updateShiftEdit(
    mobile: string,
    field: "start" | "end",
    value: string,
  ) {
    setShiftEdits((prev) => ({
      ...prev,
      [mobile]: {
        ...(prev[mobile] || { start: "10:00", end: "18:00" }),
        [field]: value,
      },
    }));
  }

  async function addEmployee() {
    if (!newName.trim() || !newMobile.trim()) {
      toast.error("Enter name and mobile");
      return;
    }
    setEmpLoading(true);
    try {
      const b = await getBackend();
      const res = await b.addEmployee({
        name: newName.trim(),
        mobile: newMobile.trim(),
      });
      if (res.__kind__ === "err") {
        toast.error(res.err);
        return;
      }
      localStorage.setItem(`shift_start_${newMobile.trim()}`, newShiftStart);
      localStorage.setItem(`shift_end_${newMobile.trim()}`, newShiftEnd);
      const emps = await b.getEmployees();
      setEmployees(emps);
      setShiftEdits((prev) => ({
        ...prev,
        [newMobile.trim()]: { start: newShiftStart, end: newShiftEnd },
      }));
      setNewName("");
      setNewMobile("");
      setNewShiftStart("10:00");
      setNewShiftEnd("18:00");
      toast.success("Employee added");
    } catch {
      toast.error("Failed to add employee");
    } finally {
      setEmpLoading(false);
    }
  }

  async function deleteEmployee(mobile: string) {
    if (!confirm(`Delete employee with mobile ${mobile}?`)) return;
    setEmpLoading(true);
    try {
      const b = await getBackend();
      await b.deleteEmployee(mobile);
      localStorage.removeItem(`shift_start_${mobile}`);
      localStorage.removeItem(`shift_end_${mobile}`);
      setEmployees((prev) => prev.filter((e) => e.mobile !== mobile));
      setShiftEdits((prev) => {
        const next = { ...prev };
        delete next[mobile];
        return next;
      });
      toast.success("Employee deleted");
    } catch {
      toast.error("Failed to delete");
    } finally {
      setEmpLoading(false);
    }
  }

  async function saveLocation() {
    const latN = Number.parseFloat(lat);
    const lngN = Number.parseFloat(lng);
    if (Number.isNaN(latN) || Number.isNaN(lngN)) {
      toast.error("Enter valid lat/lng");
      return;
    }
    setLocationLoading(true);
    try {
      const b = await getBackend();
      await b.setOfficeLocation({ lat: latN, lng: lngN });
      toast.success("Office location saved");
    } catch {
      toast.error("Failed to save location");
    } finally {
      setLocationLoading(false);
    }
  }

  async function saveUrl() {
    setUrlLoading(true);
    try {
      const b = await getBackend();
      await b.setAppsScriptUrl(appsUrl.trim());
      toast.success("Apps Script URL saved");
    } catch {
      toast.error("Failed to save URL");
    } finally {
      setUrlLoading(false);
    }
  }

  async function testUrl() {
    if (!appsUrl.trim()) {
      toast.error("Enter an Apps Script URL first");
      return;
    }
    setTestLoading(true);
    try {
      const res = await fetch(appsUrl.trim(), {
        method: "POST",
        body: JSON.stringify({
          name: "Test Employee",
          mobile: "9999999999",
          date: new Date().toISOString().split("T")[0],
          logType: "entry",
          status: "On Time",
          entryTimestamp: Date.now().toString(),
          exitTimestamp: "0",
        }),
      });
      if (res.ok) toast.success("Test POST successful!");
      else toast.error(`Test failed: HTTP ${res.status}`);
    } catch {
      toast.error("Test POST failed (check CORS or URL)");
    } finally {
      setTestLoading(false);
    }
  }

  async function loadLogs() {
    setLogsLoading(true);
    try {
      const b = await getBackend();
      const recs = await b.getAttendance();
      setLogs(recs);
    } catch {
      toast.error("Failed to load logs");
    } finally {
      setLogsLoading(false);
    }
  }

  if (!authed) {
    return (
      <div className="max-w-sm mx-auto mt-16">
        <Card className="border-t-4 border-t-blue-600">
          <div className="flex flex-col items-center pt-8 pb-2">
            <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center mb-3">
              <Lock className="w-6 h-6 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Admin Console</h2>
            <p className="text-sm text-muted-foreground mt-1 text-center px-6">
              Restricted access area. Please authenticate.
            </p>
          </div>
          <div className="px-6 pb-6 pt-4 space-y-3">
            <Input
              data-ocid="admin.password.input"
              type="password"
              placeholder="Enter administrator password..."
              value={pwInput}
              onChange={(e) => setPwInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && login()}
            />
            {pwError && (
              <p
                data-ocid="admin.password.error_state"
                className="text-sm text-destructive"
              >
                {pwError}
              </p>
            )}
            <Button
              data-ocid="admin.login.submit_button"
              className="w-full bg-blue-600 hover:bg-blue-700"
              onClick={login}
            >
              Authenticate
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const scriptCode = `function doPost(e) {
  var sheet = SpreadsheetApp.openById('YOUR_SHEET_ID').getActiveSheet();
  var data = JSON.parse(e.postData.contents);
  sheet.appendRow([data.name, data.mobile, data.date, data.logType, data.status, data.shiftTiming, data.entryTimestamp, data.exitTimestamp]);
  return ContentService.createTextOutput(JSON.stringify({result: 'success'})).setMimeType(ContentService.MimeType.JSON);
}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Admin Console</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage organization settings and records
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 shrink-0"
          onClick={logout}
          data-ocid="admin.logout.button"
        >
          <Lock className="w-4 h-4" />
          Lock Session
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="employees">
        <TabsList className="bg-muted">
          <TabsTrigger
            value="employees"
            data-ocid="admin.employees.tab"
            className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
          >
            <Users className="w-4 h-4 mr-1.5" />
            Employees
          </TabsTrigger>
          <TabsTrigger
            value="logs"
            data-ocid="admin.logs.tab"
            onClick={loadLogs}
            className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
          >
            Logs
          </TabsTrigger>
          <TabsTrigger
            value="location"
            data-ocid="admin.location.tab"
            className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
          >
            <MapPin className="w-4 h-4 mr-1.5" />
            Location
          </TabsTrigger>
          <TabsTrigger
            value="integrations"
            data-ocid="admin.integrations.tab"
            className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
          >
            <Link className="w-4 h-4 mr-1.5" />
            Integrations
          </TabsTrigger>
        </TabsList>

        {/* Employees tab */}
        <TabsContent value="employees" className="mt-4">
          <Card>
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground">
                  Roster Directory
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Manage personnel and shift timings
                </p>
              </div>
              <Button
                data-ocid="admin.emp.add.button"
                className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
                size="sm"
                onClick={() =>
                  document
                    .getElementById("add-emp-form")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
              >
                <Plus className="w-4 h-4" />
                Add Personnel
              </Button>
            </div>
            <CardContent className="pt-4">
              {employees.length === 0 ? (
                <div
                  data-ocid="admin.employees.empty_state"
                  className="text-center text-muted-foreground py-10 text-sm border border-dashed border-border rounded-lg"
                >
                  No employees added yet
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-border mb-6">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="font-semibold">Name</TableHead>
                        <TableHead className="font-semibold">Contact</TableHead>
                        <TableHead className="font-semibold">
                          Shift Timing
                        </TableHead>
                        <TableHead className="font-semibold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employees.map((emp, i) => (
                        <TableRow
                          key={emp.mobile}
                          data-ocid={`admin.employees.item.${i + 1}`}
                          className="hover:bg-muted/30 transition-colors"
                        >
                          <TableCell className="font-medium">
                            {emp.name}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {emp.mobile}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Input
                                type="time"
                                className="w-28 h-8 text-sm"
                                value={shiftEdits[emp.mobile]?.start || "10:00"}
                                onChange={(e) =>
                                  updateShiftEdit(
                                    emp.mobile,
                                    "start",
                                    e.target.value,
                                  )
                                }
                              />
                              <span className="text-muted-foreground text-xs">
                                –
                              </span>
                              <Input
                                type="time"
                                className="w-28 h-8 text-sm"
                                value={shiftEdits[emp.mobile]?.end || "18:00"}
                                onChange={(e) =>
                                  updateShiftEdit(
                                    emp.mobile,
                                    "end",
                                    e.target.value,
                                  )
                                }
                              />
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-blue-600 hover:text-blue-600 hover:bg-blue-50"
                                onClick={() => saveEmployeeShift(emp.mobile)}
                                disabled={savingShift === emp.mobile}
                                title="Save shift"
                              >
                                {savingShift === emp.mobile ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Save className="w-3.5 h-3.5" />
                                )}
                              </Button>
                              <Button
                                data-ocid={`admin.employees.delete_button.${i + 1}`}
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => deleteEmployee(emp.mobile)}
                                title="Delete employee"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Add employee form */}
              <div
                id="add-emp-form"
                className="bg-muted/40 border border-border rounded-lg p-4 space-y-3"
              >
                <p className="text-sm font-semibold text-foreground">
                  Add New Employee
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Name</Label>
                    <Input
                      data-ocid="admin.emp.name.input"
                      placeholder="Employee name"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Mobile</Label>
                    <Input
                      data-ocid="admin.emp.mobile.input"
                      placeholder="Mobile number"
                      value={newMobile}
                      onChange={(e) => setNewMobile(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Shift Start
                    </Label>
                    <Input
                      type="time"
                      value={newShiftStart}
                      onChange={(e) => setNewShiftStart(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Shift End
                    </Label>
                    <Input
                      type="time"
                      value={newShiftEnd}
                      onChange={(e) => setNewShiftEnd(e.target.value)}
                    />
                  </div>
                </div>
                <Button
                  onClick={addEmployee}
                  disabled={empLoading}
                  className="bg-blue-600 hover:bg-blue-700 gap-1.5"
                >
                  {empLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  Add Employee
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logs tab */}
        <TabsContent value="logs" className="mt-4">
          <Card>
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold text-foreground">
                All Attendance Logs
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={loadLogs}
                disabled={logsLoading}
                className="gap-2"
              >
                {logsLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : null}
                Refresh
              </Button>
            </div>
            <CardContent className="pt-4 px-0">
              {logsLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : logs.length === 0 ? (
                <div className="text-center text-muted-foreground py-10 text-sm">
                  No logs yet
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Date</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Mobile</TableHead>
                        <TableHead>Log</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((r, i) => (
                        <TableRow
                          key={String(r.id)}
                          data-ocid={`admin.logs.item.${i + 1}`}
                          className="hover:bg-muted/30"
                        >
                          <TableCell className="text-sm">{r.date}</TableCell>
                          <TableCell className="font-medium">
                            {r.name}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {r.mobile}
                          </TableCell>
                          <TableCell className="capitalize text-sm">
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
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Location tab */}
        <TabsContent value="location" className="mt-4">
          <Card>
            <div className="px-6 py-4 border-b border-border">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-500" /> Office Location
                (Geo-fence)
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Set the GPS coordinates for the office. Employees must be within
                100m to mark attendance.
              </p>
            </div>
            <CardContent className="pt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Latitude</Label>
                  <Input
                    data-ocid="admin.lat.input"
                    placeholder="e.g. 28.6139"
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Longitude</Label>
                  <Input
                    data-ocid="admin.lng.input"
                    placeholder="e.g. 77.2090"
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                  />
                </div>
              </div>
              <Button
                data-ocid="admin.location.save_button"
                onClick={saveLocation}
                disabled={locationLoading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {locationLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                Save Location
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integrations tab */}
        <TabsContent value="integrations" className="mt-4 space-y-4">
          <Card>
            <div className="px-6 py-4 border-b border-border">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Link className="w-4 h-4 text-blue-500" /> Google Apps Script
                URL
              </h3>
            </div>
            <CardContent className="pt-4 space-y-3">
              <Input
                data-ocid="admin.appsurl.input"
                placeholder="https://script.google.com/macros/s/..."
                value={appsUrl}
                onChange={(e) => setAppsUrl(e.target.value)}
              />
              <div className="flex gap-2">
                <Button
                  data-ocid="admin.appsurl.save_button"
                  onClick={saveUrl}
                  disabled={urlLoading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {urlLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  Save URL
                </Button>
                <Button
                  data-ocid="admin.appsurl.test_button"
                  variant="outline"
                  onClick={testUrl}
                  disabled={testLoading}
                >
                  {testLoading ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : null}
                  Test
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <div className="px-6 py-4 border-b border-border">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-500" /> Setup
                Instructions
              </h3>
            </div>
            <CardContent className="pt-4 space-y-3 text-sm">
              <p className="text-muted-foreground">
                1. Open Google Sheets and go to{" "}
                <strong className="text-foreground">
                  Extensions → Apps Script
                </strong>
                .
              </p>
              <p className="text-muted-foreground">2. Paste this code:</p>
              <pre className="bg-muted px-3 py-3 rounded-md text-xs overflow-x-auto whitespace-pre font-mono">
                {scriptCode}
              </pre>
              <p className="text-muted-foreground">
                3. Deploy as a Web App (Execute as: Me, Who has access: Anyone).
                Copy the URL above.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
