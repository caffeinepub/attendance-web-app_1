import Map "mo:core/Map";
import Array "mo:base/Array";
import Float "mo:base/Float";
import Order "mo:base/Order";
import Text "mo:base/Text";
import Nat "mo:base/Nat";
import Time "mo:base/Time";

actor {
  public type Employee = {
    name : Text;
    mobile : Text;
  };

  type AttendanceRecordV1 = {
    id : Nat;
    name : Text;
    mobile : Text;
    date : Text;
    logType : LogType;
    status : Text;
    entryTimestamp : Time.Time;
    exitTimestamp : Time.Time;
  };

  public type AttendanceRecord = {
    id : Nat;
    name : Text;
    mobile : Text;
    date : Text;
    logType : LogType;
    status : Text;
    entryTimestamp : Time.Time;
    exitTimestamp : Time.Time;
    locationLat : Float;
    locationLng : Float;
    locationType : Text;
  };

  public type OfficeLocation = {
    lat : Float;
    lng : Float;
  };

  public type LogType = {
    #entry;
    #exit;
  };

  type OldStatus = { #present; #absent };
  type OldAttendanceRecord = {
    id : Nat;
    name : Text;
    mobile : Text;
    date : Text;
    logType : LogType;
    status : OldStatus;
    entryTimestamp : Time.Time;
    exitTimestamp : Time.Time;
  };

  type AttendanceInput = {
    name : Text;
    mobile : Text;
    date : Text;
    logType : LogType;
    status : Text;
    entryTimestamp : Time.Time;
    exitTimestamp : Time.Time;
    locationLat : Float;
    locationLng : Float;
    locationType : Text;
  };

  // ── Legacy stub variables ──
  // These MUST remain to satisfy stable-variable compatibility (M0169).
  // They are never read from or written to; all live data is in stableAttendanceV2 / stableEmployees.
  // DO NOT call any methods on these -- only Map.empty() is safe.
  let attendanceRecords = Map.empty<Nat, OldAttendanceRecord>();
  let employees = Map.empty<Text, Employee>();
  var attendanceMap = Map.empty<Nat, AttendanceRecordV1>();

  // ── Stable storage ──
  stable var stableMigrationDone : Bool = false;
  stable var stableEmployees : [Employee] = [];
  stable var stableAttendance : [AttendanceRecordV1] = [];
  stable var nextAttendanceId : Nat = 1;
  stable var officeLocation : ?OfficeLocation = null;
  stable var appsScriptUrl : Text = "";
  stable var stableAttendanceV2 : [AttendanceRecord] = [];
  stable var v2MigrationDone : Bool = false;

  // ── In-memory working state ──
  var empList : [Employee] = [];
  var attList : [AttendanceRecordV1] = [];
  var workList : [AttendanceRecord] = [];

  system func preupgrade() {
    stableEmployees := empList;
    stableAttendance := attList;
    stableAttendanceV2 := workList;
  };

  system func postupgrade() {
    if (not stableMigrationDone) {
      stableMigrationDone := true;
    };

    if (not v2MigrationDone) {
      for (r in stableAttendance.vals()) {
        let v2 : AttendanceRecord = {
          id = r.id;
          name = r.name;
          mobile = r.mobile;
          date = r.date;
          logType = r.logType;
          status = r.status;
          entryTimestamp = r.entryTimestamp;
          exitTimestamp = r.exitTimestamp;
          locationLat = 0.0;
          locationLng = 0.0;
          locationType = "";
        };
        stableAttendanceV2 := Array.append(stableAttendanceV2, [v2]);
        if (r.id >= nextAttendanceId) { nextAttendanceId := r.id + 1 };
      };
      stableAttendance := [];
      attList := [];
      v2MigrationDone := true;
    };

    empList := stableEmployees;
    workList := stableAttendanceV2;
    for (r in workList.vals()) {
      if (r.id >= nextAttendanceId) { nextAttendanceId := r.id + 1 };
    };
  };

  // ── Query endpoints ──

  public query func getEmployees() : async [Employee] {
    Array.sort(empList, func(a : Employee, b : Employee) : Order.Order {
      Text.compare(a.mobile, b.mobile);
    });
  };

  public query func getAttendance() : async [AttendanceRecord] {
    Array.sort(workList, func(a : AttendanceRecord, b : AttendanceRecord) : Order.Order {
      Nat.compare(a.id, b.id);
    });
  };

  public query func getAttendanceByMobile(mobile : Text) : async [AttendanceRecord] {
    Array.filter(workList, func(r : AttendanceRecord) : Bool {
      r.mobile == mobile;
    });
  };

  public query func getOfficeLocation() : async ?OfficeLocation {
    officeLocation;
  };

  public query func getAppsScriptUrl() : async Text {
    appsScriptUrl;
  };

  // ── Update endpoints ──

  public shared func addEmployee(emp : Employee) : async { #ok : (); #err : Text } {
    let exists = Array.find(empList, func(e : Employee) : Bool {
      e.mobile == emp.mobile;
    });
    if (exists != null) {
      return #err("Employee already exists");
    };
    empList := Array.append(empList, [emp]);
    #ok();
  };

  public shared func deleteEmployee(mobile : Text) : async { #ok : (); #err : Text } {
    let before = empList.size();
    empList := Array.filter(empList, func(e : Employee) : Bool {
      e.mobile != mobile;
    });
    if (empList.size() == before) {
      return #err("Employee not found");
    };
    #ok();
  };

  public shared func addAttendance(input : AttendanceInput) : async Nat {
    let id = nextAttendanceId;
    let record : AttendanceRecord = {
      id;
      name = input.name;
      mobile = input.mobile;
      date = input.date;
      logType = input.logType;
      status = input.status;
      entryTimestamp = input.entryTimestamp;
      exitTimestamp = input.exitTimestamp;
      locationLat = input.locationLat;
      locationLng = input.locationLng;
      locationType = input.locationType;
    };
    workList := Array.append(workList, [record]);
    nextAttendanceId += 1;
    id;
  };

  public shared func updateAttendance(id : Nat, input : AttendanceInput) : async { #ok : (); #err : Text } {
    let exists = Array.find(workList, func(r : AttendanceRecord) : Bool {
      r.id == id;
    });
    if (exists == null) {
      return #err("Attendance record not found");
    };
    workList := Array.map(workList, func(r : AttendanceRecord) : AttendanceRecord {
      if (r.id == id) {
        {
          id;
          name = input.name;
          mobile = input.mobile;
          date = input.date;
          logType = input.logType;
          status = input.status;
          entryTimestamp = input.entryTimestamp;
          exitTimestamp = input.exitTimestamp;
          locationLat = input.locationLat;
          locationLng = input.locationLng;
          locationType = input.locationType;
        };
      } else { r };
    });
    #ok();
  };

  public shared func deleteAttendance(id : Nat) : async { #ok : (); #err : Text } {
    let before = workList.size();
    workList := Array.filter(workList, func(r : AttendanceRecord) : Bool {
      r.id != id;
    });
    if (workList.size() == before) {
      return #err("Attendance record not found");
    };
    #ok();
  };

  public shared func setOfficeLocation(location : OfficeLocation) : async () {
    officeLocation := ?location;
  };

  public shared func setAppsScriptUrl(url : Text) : async () {
    appsScriptUrl := url;
  };
};
