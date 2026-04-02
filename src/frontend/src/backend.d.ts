import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export type Time = bigint;
export interface OfficeLocation {
    lat: number;
    lng: number;
}
export interface AttendanceInput {
    status: string;
    entryTimestamp: Time;
    date: string;
    name: string;
    logType: LogType;
    exitTimestamp: Time;
    mobile: string;
    locationLat: number;
    locationLng: number;
    locationType: string;
}
export interface Employee {
    name: string;
    mobile: string;
}
export interface AttendanceRecord {
    id: bigint;
    status: string;
    entryTimestamp: Time;
    date: string;
    name: string;
    logType: LogType;
    exitTimestamp: Time;
    mobile: string;
    locationLat: number;
    locationLng: number;
    locationType: string;
}
export enum LogType {
    exit = "exit",
    entry = "entry"
}
export interface backendInterface {
    addAttendance(input: AttendanceInput): Promise<bigint>;
    addEmployee(emp: Employee): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    deleteAttendance(id: bigint): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    deleteEmployee(mobile: string): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    getAppsScriptUrl(): Promise<string>;
    getAttendance(): Promise<Array<AttendanceRecord>>;
    getAttendanceByMobile(mobile: string): Promise<Array<AttendanceRecord>>;
    getEmployees(): Promise<Array<Employee>>;
    getOfficeLocation(): Promise<OfficeLocation | null>;
    setAppsScriptUrl(url: string): Promise<void>;
    setOfficeLocation(location: OfficeLocation): Promise<void>;
    updateAttendance(id: bigint, input: AttendanceInput): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
}
