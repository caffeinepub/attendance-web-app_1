import Map "mo:core/Map";
import Float "mo:core/Float";
import Order "mo:core/Order";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import Time "mo:core/Time";

actor {
  public type Employee = {
    name : Text;
    mobile : Text;
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
  };

  public type OfficeLocation = {
    lat : Float;
    lng : Float;
  };

  public type LogType = {
    #entry;
    #exit;
  };

  // Old types kept to match currently deployed stable storage (for migration)
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
  };

  // Legacy stable Map — same name & compatible type as deployed code.
  // Caffeine's build system will load the existing stable data into this.
  let attendanceRecords = Map.empty<Nat, OldAttendanceRecord>();

  // Unchanged employees Map (type not changed — loads existing data).
  let employees = Map.empty<Text, Employee>();

  // New stable storage: array-based so Text status is type-evolution-safe.
  stable var stableAttendance : [AttendanceRecord] = [];
  // Guard against running the migration more than once across upgrades.
  stable var stableMigrationDone : Bool = false;
  stable var nextAttendanceId : Nat = 1;

  // These were non-stable vars in old code; now explicit stable vars.
  stable var officeLocation : ?OfficeLocation = null;
  stable var appsScriptUrl : Text = "";

  // In-memory working map — rebuilt on every upgrade via postupgrade.
  var attendanceMap = Map.empty<Nat, AttendanceRecord>();

  system func preupgrade() {
    stableAttendance := attendanceMap.values().toArray();
  };

  system func postupgrade() {
    // One-time migration: copy legacy variant-status records into attendanceMap
    if (not stableMigrationDone) {
      for (v in attendanceRecords.values()) {
        let statusText = switch (v.status) {
          case (#present) "present";
          case (#absent) "absent";
        };
        let newRecord : AttendanceRecord = {
          id = v.id;
          name = v.name;
          mobile = v.mobile;
          date = v.date;
          logType = v.logType;
          status = statusText;
          entryTimestamp = v.entryTimestamp;
          exitTimestamp = v.exitTimestamp;
        };
        attendanceMap.add(v.id, newRecord);
        if (v.id >= nextAttendanceId) { nextAttendanceId := v.id + 1 };
      };
      stableMigrationDone := true;
    };

    // Restore from stable array (all upgrades after the first)
    for (r in stableAttendance.vals()) {
      attendanceMap.add(r.id, r);
      if (r.id >= nextAttendanceId) { nextAttendanceId := r.id + 1 };
    };
    stableAttendance := [];
  };

  public query func getEmployees() : async [Employee] {
    employees.values().toArray().sort(
      func(a : Employee, b : Employee) : Order.Order {
        Text.compare(a.mobile, b.mobile);
      }
    );
  };

  public query func getAttendance() : async [AttendanceRecord] {
    attendanceMap.values().toArray().sort(
      func(a : AttendanceRecord, b : AttendanceRecord) : Order.Order {
        Nat.compare(a.id, b.id);
      }
    );
  };

  public query func getAttendanceByMobile(mobile : Text) : async [AttendanceRecord] {
    attendanceMap.values().filter(
      func(r : AttendanceRecord) : Bool { r.mobile == mobile }
    ).toArray();
  };

  public query func getOfficeLocation() : async ?OfficeLocation {
    officeLocation;
  };

  public query func getAppsScriptUrl() : async Text {
    appsScriptUrl;
  };

  public shared func addEmployee(emp : Employee) : async {
    #ok : ();
    #err : Text;
  } {
    if (employees.containsKey(emp.mobile)) {
      return #err("Employee already exists");
    };
    employees.add(emp.mobile, emp);
    #ok();
  };

  public shared func deleteEmployee(mobile : Text) : async {
    #ok : ();
    #err : Text;
  } {
    if (not employees.containsKey(mobile)) {
      return #err("Employee not found");
    };
    employees.remove(mobile);
    #ok();
  };

  public shared func addAttendance(input : AttendanceInput) : async Nat {
    let id = nextAttendanceId;
    let record : AttendanceRecord = { input with id };
    attendanceMap.add(id, record);
    nextAttendanceId += 1;
    id;
  };

  public shared func updateAttendance(id : Nat, input : AttendanceInput) : async {
    #ok : ();
    #err : Text;
  } {
    if (not attendanceMap.containsKey(id)) {
      return #err("Attendance record not found");
    };
    let updated : AttendanceRecord = { input with id };
    attendanceMap.add(id, updated);
    #ok();
  };

  public shared func deleteAttendance(id : Nat) : async {
    #ok : ();
    #err : Text;
  } {
    if (not attendanceMap.containsKey(id)) {
      return #err("Attendance record not found");
    };
    attendanceMap.remove(id);
    #ok();
  };

  public shared func setOfficeLocation(location : OfficeLocation) : async () {
    officeLocation := ?location;
  };

  public shared func setAppsScriptUrl(url : Text) : async () {
    appsScriptUrl := url;
  };
};
