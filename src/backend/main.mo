import Map "mo:core/Map";
import Float "mo:core/Float";
import Order "mo:core/Order";
import List "mo:core/List";
import Text "mo:core/Text";
import Runtime "mo:core/Runtime";
import Iter "mo:core/Iter";
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
    status : Status;
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

  public type Status = {
    #present;
    #absent;
  };

  type AttendanceInput = {
    name : Text;
    mobile : Text;
    date : Text;
    logType : LogType;
    status : Status;
    entryTimestamp : Time.Time;
    exitTimestamp : Time.Time;
  };

  module AttendanceRecord {
    public func compare(a : AttendanceRecord, b : AttendanceRecord) : Order.Order {
      Nat.compare(a.id, b.id);
    };
  };

  module Employee {
    public func compare(a : Employee, b : Employee) : Order.Order {
      Text.compare(a.mobile, b.mobile);
    };
  };

  // Persistent state
  let employees = Map.empty<Text, Employee>();
  let attendanceRecords = Map.empty<Nat, AttendanceRecord>();
  var officeLocation : ?OfficeLocation = null;
  var appsScriptUrl : Text = "";
  var nextAttendanceId = 1;

  public query ({ caller }) func getEmployees() : async [Employee] {
    employees.values().toArray().sort();
  };

  public query ({ caller }) func getAttendance() : async [AttendanceRecord] {
    attendanceRecords.values().toArray().sort();
  };

  public query ({ caller }) func getAttendanceByMobile(mobile : Text) : async [AttendanceRecord] {
    let filtered = attendanceRecords.values().filter(func(record) { record.mobile == mobile });
    filtered.toArray();
  };

  public query ({ caller }) func getOfficeLocation() : async ?OfficeLocation {
    officeLocation;
  };

  public query ({ caller }) func getAppsScriptUrl() : async Text {
    appsScriptUrl;
  };

  public shared ({ caller }) func addEmployee(emp : Employee) : async {
    #ok : ();
    #err : Text;
  } {
    if (employees.containsKey(emp.mobile)) { return #err("Employee already exists") };
    employees.add(emp.mobile, emp);
    #ok();
  };

  public shared ({ caller }) func deleteEmployee(mobile : Text) : async {
    #ok : ();
    #err : Text;
  } {
    if (not employees.containsKey(mobile)) { return #err("Employee not found") };
    employees.remove(mobile);
    #ok();
  };

  public shared ({ caller }) func addAttendance(input : AttendanceInput) : async Nat {
    let id = nextAttendanceId;
    let record : AttendanceRecord = {
      input with id;
    };
    attendanceRecords.add(id, record);
    nextAttendanceId += 1;
    id;
  };

  public shared ({ caller }) func updateAttendance(id : Nat, input : AttendanceInput) : async {
    #ok : ();
    #err : Text;
  } {
    if (not attendanceRecords.containsKey(id)) { return #err("Attendance record not found") };
    let updatedRecord : AttendanceRecord = {
      input with id;
    };
    attendanceRecords.add(id, updatedRecord);
    #ok();
  };

  public shared ({ caller }) func deleteAttendance(id : Nat) : async {
    #ok : ();
    #err : Text;
  } {
    if (not attendanceRecords.containsKey(id)) { return #err("Attendance record not found") };
    attendanceRecords.remove(id);
    #ok();
  };

  public shared ({ caller }) func setOfficeLocation(location : OfficeLocation) : async () {
    officeLocation := ?location;
  };

  public shared ({ caller }) func setAppsScriptUrl(url : Text) : async () {
    appsScriptUrl := url;
  };
};
