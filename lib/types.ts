export const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'] as const;
export type Day = typeof DAYS[number];
export type GymDay = 'Monday'|'Tuesday'|'Wednesday';
export type SwimDay = 'Thursday'|'Friday'|'Saturday';
export type View = 'home'|'workout'|'progress'|'profile'|'settings';
export type TrackingTab = 'gym'|'swim'|'water'|'weight';
export type ProgressTab = 'overview'|'strength'|'swimming'|'weight'|'hydration';
export type InputNumber = number|string;
export type SyncMode = 'saved-local'|'syncing'|'synced'|'needs-attention'|'checking';
export interface GymSet {kg?:InputNumber;reps?:InputNumber;done?:boolean}
export interface ExerciseLog {sets:GymSet[];setCount?:number;notes?:string}
export interface SwimInterval {repeats:number; lengths:number;rest:number;pool:number}
export interface SwimLog {
  duration?:InputNumber;distance?:InputNumber;longest?:InputNumber;rest?:InputNumber;rpe?:InputNumber;
  sculling?:InputNumber;treading?:InputNumber;poolLength?:InputNumber;lengths?:InputNumber;
  breaststroke?:string;notes?:string;drills?:Record<string,boolean>;intervals?:SwimInterval[];
}
export interface SessionNotes {fatigue?:string;discomfort?:string;technique?:string;general?:string}
export interface WeekLog {
  done:Partial<Record<Day,boolean>>;
  gym:Partial<Record<GymDay,Record<string,ExerciseLog>>>;
  swim:Partial<Record<SwimDay,SwimLog>>;
  sessionNotes?:Partial<Record<Day,SessionNotes>>;
}
export interface WeighIn {kg?:InputNumber;note?:string;deleted?:boolean}
export interface WaterEntry {date:string;ml:number;at:string;deleted?:boolean}
export interface Preferences {setOverrides:Record<string,number>;targetWeight:InputNumber;restSeconds:number;reminders:{enabled:boolean;time:string}}
export interface TrackerData extends Preferences {
  version:number;weeks:Record<string,WeekLog>;weights:Record<string,WeighIn>;
  waterLogs:Record<string,WaterEntry>;recordUpdates:Record<string,number>;pendingSync:Record<string,number>;
}
export interface UserInfo {uid:string;name:string;email:string;photoURL:string|null}
