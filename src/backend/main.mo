import Array "mo:base/Array";
import Float "mo:base/Float";
import Order "mo:base/Order";
import Text "mo:base/Text";
import Nat "mo:base/Nat";
import Time "mo:base/Time";
import Map "mo:core/Map";

actor {
  public type Employee = {
    name : Text;
    mobile : Text;
  };

  public type EmployeeV2 = {
    name : Text;
    mobile : Text;
    password : Text;
    shiftStart : Text;
    shiftEnd : Text;
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

  // ── Legacy stub stable vars ──
  stable var attendanceRecords : Map.Map<Nat, OldAttendanceRecord> = Map.empty();
  stable var employees : Map.Map<Text, Employee> = Map.empty();
  stable var attendanceMap : Map.Map<Nat, AttendanceRecordV1> = Map.empty();

  // ── Stable storage ──
  stable var stableMigrationDone : Bool = false;
  stable var stableEmployees : [Employee] = [];
  stable var stableAttendance : [AttendanceRecordV1] = [];
  stable var nextAttendanceId : Nat = 1;
  stable var officeLocation : ?OfficeLocation = null;
  stable var appsScriptUrl : Text = "";
  stable var stableAttendanceV2 : [AttendanceRecord] = [];
  stable var v2MigrationDone : Bool = false;
  stable var stableEmployeesV2 : [EmployeeV2] = [];
  stable var v3MigrationDone : Bool = false;

  // ── In-memory working state ──
  var empList : [Employee] = [];
  var attList : [AttendanceRecordV1] = [];
  var workList : [AttendanceRecord] = [];
  var empV2List : [EmployeeV2] = [];

  system func preupgrade() {
    stableEmployees := empList;
    stableAttendance := attList;
    stableAttendanceV2 := workList;
    stableEmployeesV2 := empV2List;
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

    // v3 migration: migrate old employees (no password) to EmployeeV2
    if (not v3MigrationDone) {
      for (e in stableEmployees.vals()) {
        // Check if already in v2 list
        let exists = Array.find(stableEmployeesV2, func(ev2 : EmployeeV2) : Bool {
          ev2.mobile == e.mobile
        });
        if (exists == null) {
          let ev2 : EmployeeV2 = {
            name = e.name;
            mobile = e.mobile;
            password = "";
            shiftStart = "10:30";
            shiftEnd = "20:00";
          };
          stableEmployeesV2 := Array.append(stableEmployeesV2, [ev2]);
        };
      };
      stableEmployees := [];
      empList := [];
      v3MigrationDone := true;
    };

    empV2List := stableEmployeesV2;
    workList := stableAttendanceV2;
    for (r in workList.vals()) {
      if (r.id >= nextAttendanceId) { nextAttendanceId := r.id + 1 };
    };
  };

  // ── Query endpoints ──

  public query func getEmployees() : async [Employee] {
    let v2sorted = Array.sort(empV2List, func(a : EmployeeV2, b : EmployeeV2) : Order.Order {
      Text.compare(a.mobile, b.mobile)
    });
    Array.map(v2sorted, func(e : EmployeeV2) : Employee { { name = e.name; mobile = e.mobile } });
  };

  public query func getEmployeesV2() : async [EmployeeV2] {
    Array.sort(empV2List, func(a : EmployeeV2, b : EmployeeV2) : Order.Order {
      Text.compare(a.mobile, b.mobile)
    });
  };

  public query func getEmployeeShift(mobile : Text) : async ?{ shiftStart : Text; shiftEnd : Text } {
    switch (Array.find(empV2List, func(e : EmployeeV2) : Bool { e.mobile == mobile })) {
      case null { null };
      case (?e) { ?{ shiftStart = e.shiftStart; shiftEnd = e.shiftEnd } };
    };
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

  // ── Auth endpoint ──

  public shared func loginEmployee(mobile : Text, password : Text) : async { #ok : EmployeeV2; #err : Text } {
    switch (Array.find(empV2List, func(e : EmployeeV2) : Bool { e.mobile == mobile })) {
      case null { #err("Employee not found") };
      case (?e) {
        if (e.password == "" or e.password == password) {
          #ok(e)
        } else {
          #err("Incorrect password")
        }
      };
    };
  };

  // ── Update endpoints ──

  public shared func addEmployee(emp : Employee) : async { #ok : (); #err : Text } {
    let exists = Array.find(empV2List, func(e : EmployeeV2) : Bool {
      e.mobile == emp.mobile;
    });
    if (exists != null) {
      return #err("Employee already exists");
    };
    let ev2 : EmployeeV2 = {
      name = emp.name;
      mobile = emp.mobile;
      password = "";
      shiftStart = "10:30";
      shiftEnd = "20:00";
    };
    empV2List := Array.append(empV2List, [ev2]);
    #ok();
  };

  public shared func addEmployeeV2(emp : EmployeeV2) : async { #ok : (); #err : Text } {
    let exists = Array.find(empV2List, func(e : EmployeeV2) : Bool {
      e.mobile == emp.mobile;
    });
    if (exists != null) {
      return #err("Employee already exists");
    };
    empV2List := Array.append(empV2List, [emp]);
    #ok();
  };

  public shared func updateEmployee(mobile : Text, newName : Text) : async { #ok : (); #err : Text } {
    let exists = Array.find(empV2List, func(e : EmployeeV2) : Bool {
      e.mobile == mobile;
    });
    if (exists == null) {
      return #err("Employee not found");
    };
    empV2List := Array.map(empV2List, func(e : EmployeeV2) : EmployeeV2 {
      if (e.mobile == mobile) { { name = newName; mobile = e.mobile; password = e.password; shiftStart = e.shiftStart; shiftEnd = e.shiftEnd } } else { e };
    });
    #ok();
  };

  public shared func updateEmployeePassword(mobile : Text, password : Text) : async { #ok : (); #err : Text } {
    let exists = Array.find(empV2List, func(e : EmployeeV2) : Bool {
      e.mobile == mobile;
    });
    if (exists == null) {
      return #err("Employee not found");
    };
    empV2List := Array.map(empV2List, func(e : EmployeeV2) : EmployeeV2 {
      if (e.mobile == mobile) { { name = e.name; mobile = e.mobile; password = password; shiftStart = e.shiftStart; shiftEnd = e.shiftEnd } } else { e };
    });
    #ok();
  };

  public shared func updateEmployeeShift(mobile : Text, shiftStart : Text, shiftEnd : Text) : async { #ok : (); #err : Text } {
    let exists = Array.find(empV2List, func(e : EmployeeV2) : Bool {
      e.mobile == mobile;
    });
    if (exists == null) {
      return #err("Employee not found");
    };
    empV2List := Array.map(empV2List, func(e : EmployeeV2) : EmployeeV2 {
      if (e.mobile == mobile) { { name = e.name; mobile = e.mobile; password = e.password; shiftStart = shiftStart; shiftEnd = shiftEnd } } else { e };
    });
    #ok();
  };

  public shared func deleteEmployee(mobile : Text) : async { #ok : (); #err : Text } {
    let before = empV2List.size();
    empV2List := Array.filter(empV2List, func(e : EmployeeV2) : Bool {
      e.mobile != mobile;
    });
    if (empV2List.size() == before) {
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
