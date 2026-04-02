import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Pencil, RefreshCw, Search, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { LogType } from "../backend";
import type { AttendanceRecord } from "../backend";
import StatusBadge from "../components/StatusBadge";
import { getBackend } from "../lib/getBackend";

interface AttendanceRecordExt extends AttendanceRecord {
  locationLat: number;
  locationLng: number;
  locationType: string;
}

function formatTs(ts: bigint): string {
  if (!ts || ts === BigInt(0)) return "—";
  return new Date(Number(ts)).toLocaleString("en-IN");
}

export default function AdminDashboard() {
  const [records, setRecords] = useState<AttendanceRecordExt[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [editRecord, setEditRecord] = useState<AttendanceRecordExt | null>(
    null,
  );
  const [editName, setEditName] = useState("");
  const [editMobile, setEditMobile] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editLogType, setEditLogType] = useState<"entry" | "exit">("entry");
  const [editStatus, setEditStatus] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const [deleteId, setDeleteId] = useState<bigint | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const b = await getBackend();
      const recs = await b.getAttendance();
      setRecords(recs as AttendanceRecordExt[]);
    } catch {
      toast.error("Failed to load records");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openEdit(r: AttendanceRecordExt) {
    setEditRecord(r);
    setEditName(r.name);
    setEditMobile(r.mobile);
    setEditDate(r.date);
    setEditLogType(r.logType as string as "entry" | "exit");
    setEditStatus(r.status as string);
  }

  async function saveEdit() {
    if (!editRecord) return;
    setEditSaving(true);
    try {
      const b = await getBackend();
      const lt = editLogType === "exit" ? LogType.exit : LogType.entry;
      const input = {
        name: editName,
        mobile: editMobile,
        date: editDate,
        logType: lt,
        status: editStatus,
        entryTimestamp: editRecord.entryTimestamp,
        exitTimestamp: editRecord.exitTimestamp,
        locationLat: editRecord.locationLat ?? 0,
        locationLng: editRecord.locationLng ?? 0,
        locationType: editRecord.locationType ?? "",
      };
      const res = await b.updateAttendance(editRecord.id, input);
      if (res.__kind__ === "err") {
        toast.error(res.err);
        return;
      }
      toast.success("Record updated");
      setEditRecord(null);
      load();
    } catch {
      toast.error("Failed to update");
    } finally {
      setEditSaving(false);
    }
  }

  async function confirmDelete() {
    if (deleteId === null) return;
    setDeleting(true);
    try {
      const b = await getBackend();
      const res = await b.deleteAttendance(deleteId);
      if (res.__kind__ === "err") {
        toast.error(res.err);
        return;
      }
      toast.success("Record deleted");
      setDeleteId(null);
      load();
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeleting(false);
    }
  }

  const filtered = records.filter((r) => {
    const q = searchQuery.toLowerCase();
    return (
      !q ||
      r.name.toLowerCase().includes(q) ||
      r.date.includes(q) ||
      r.mobile.includes(q)
    );
  });

  const statusOptions = [
    "Early Entry",
    "On Time",
    "On Time Exit",
    "Half Day",
    "Late Exit",
    "Absent",
    "Week Off",
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground text-sm">
            {records.length} total records
          </p>
        </div>
        <Button
          data-ocid="admin_dashboard.refresh.button"
          variant="outline"
          size="sm"
          onClick={load}
          disabled={loading}
          className="shrink-0"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-1.5" />
          )}
          Refresh
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
        <Input
          data-ocid="admin_dashboard.search_input"
          className="pl-9"
          placeholder="Search by name, mobile or date..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <Card>
        <CardContent className="pt-4">
          {loading ? (
            <div
              data-ocid="admin_dashboard.loading_state"
              className="flex justify-center py-14"
            >
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div
              data-ocid="admin_dashboard.records.empty_state"
              className="text-center text-muted-foreground py-12 text-sm border border-dashed border-border rounded-lg"
            >
              No records found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Name</TableHead>
                    <TableHead className="font-semibold">Mobile</TableHead>
                    <TableHead className="font-semibold">Date</TableHead>
                    <TableHead className="font-semibold">Log Type</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Entry Time</TableHead>
                    <TableHead className="font-semibold">Exit Time</TableHead>
                    <TableHead className="font-semibold">Location</TableHead>
                    <TableHead className="font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r, i) => (
                    <TableRow
                      key={String(r.id)}
                      data-ocid={`admin_dashboard.records.item.${i + 1}`}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {r.mobile}
                      </TableCell>
                      <TableCell>{r.date}</TableCell>
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
                        {r.locationType ? (
                          <span>
                            {r.locationType}
                            {r.locationLat !== 0 && (
                              <span className="block text-xs opacity-70">
                                {r.locationLat.toFixed(4)},{" "}
                                {r.locationLng.toFixed(4)}
                              </span>
                            )}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            data-ocid={`admin_dashboard.records.edit_button.${i + 1}`}
                            variant="ghost"
                            size="sm"
                            onClick={() => openEdit(r)}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            data-ocid={`admin_dashboard.records.delete_button.${i + 1}`}
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleteId(r.id)}
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
        </CardContent>
      </Card>

      <Dialog
        open={!!editRecord}
        onOpenChange={(open) => !open && setEditRecord(null)}
      >
        <DialogContent data-ocid="admin_dashboard.edit.dialog">
          <DialogHeader>
            <DialogTitle>Edit Attendance Record</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input
                  data-ocid="admin_dashboard.edit.name.input"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Mobile</Label>
                <Input
                  data-ocid="admin_dashboard.edit.mobile.input"
                  value={editMobile}
                  onChange={(e) => setEditMobile(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input
                data-ocid="admin_dashboard.edit.date.input"
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Log Type</Label>
                <Select
                  value={editLogType}
                  onValueChange={(v) => setEditLogType(v as "entry" | "exit")}
                >
                  <SelectTrigger data-ocid="admin_dashboard.edit.logtype.select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entry">Entry</SelectItem>
                    <SelectItem value="exit">Exit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger data-ocid="admin_dashboard.edit.status.select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              data-ocid="admin_dashboard.edit.cancel_button"
              onClick={() => setEditRecord(null)}
            >
              Cancel
            </Button>
            <Button
              data-ocid="admin_dashboard.edit.save_button"
              onClick={saveEdit}
              disabled={editSaving}
            >
              {editSaving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent data-ocid="admin_dashboard.delete.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Record</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              data-ocid="admin_dashboard.delete.cancel_button"
              onClick={() => setDeleteId(null)}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              data-ocid="admin_dashboard.delete.confirm_button"
              onClick={confirmDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
