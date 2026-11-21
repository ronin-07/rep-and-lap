export const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'] as const;
export type Day = typeof DAYS[number];
export type GymDay = 'Monday'|'Tuesday'|'Wednesday';
export type SwimDay = 'Thursday'|'Friday'|'Saturday';
export type View = 'home'|'workout'|'progress'|'profile'|'settings'|'conflicts'|'calendar'|'insights'|'achievements';
export type TrackingTab = 'gym'|'swim'|'water'|'weight';
export type ProgressTab = 'overview'|'strength'|'swimming'|'weight'|'hydration'|'insights';
export type ScheduleStatus = 'rest'|'skipped';
export interface RoutineExercise {name:string;sets:number;reps:string;muscles:string}
export type InputNumber = number|string;
export type SyncMode = 'saved-local'|'syncing'|'synced'|'needs-attention'|'checking';
export interface GymSet {id?:string;kg?:InputNumber;reps?:InputNumber;done?:boolean;deleted?:boolean;rir?:number;rpe?:number}
// Individual gym sets sync independently; a session's older gym payload remains a read-only fallback.
export interface SetDocument {
  key:string; sessionKey:string; setId:string; exercise:string; index:number;
  value:GymSet; revision:number; updatedMs:number; updatedBy:string;
}
export interface PendingSetWrite {
  key:string; sessionKey:string; setId:string; exercise:string; index:number;
  value:GymSet; baseRevision:number; updatedMs:number;
}
export interface SetConflict {local:PendingSetWrite; remote:SetDocument|null}

export interface ExerciseLog {sets:GymSet[];setCount?:number;notes?:string}
export type SwimStroke = 'freestyle'|'breaststroke'|'backstroke'|'butterfly';
export type SwimDrill = 'sculling'|'kickboard'|'streamline'|'side-kicking'|'breathing'|'floating'|'treading'|'catch-up'|'single-arm'|'cooldown';
export type SwimActivity = SwimStroke|SwimDrill;
export type SwimMode = 'learning'|'advanced';
export type SwimDifficulty = ''|'Easy'|'Moderate'|'Difficult';
export type SwimSkillLevel = 'Not started'|'Learning'|'Basic'|'Comfortable'|'Confident';
export interface SwimInterval {repeats:number; lengths:number;rest:number;pool:number} // Legacy interval, retained for historical sessions.
export interface SwimIntervalSet {id:string;repeats:number;lengths:number;restSeconds:number;secondsPerRepeat?:InputNumber}
export interface SwimSegment {
 id:string;activity:SwimActivity;mode:SwimMode;minutes?:InputNumber;lengths?:InputNumber;
 longestContinuous?:InputNumber;timedMeters?:InputNumber;timedSeconds?:InputNumber;
 intervals?:SwimIntervalSet[];technique?:Record<string,boolean>;
 difficulty?:SwimDifficulty;skillLevel?:SwimSkillLevel;notes?:string;
}
export interface SwimSegmentTemplate {activity:SwimActivity;mode?:SwimMode;plannedMinutes?:number}
export interface SwimRoutine {name:string;description:string;activities:SwimSegmentTemplate[]}

export interface SwimLog {
  duration?:InputNumber;distance?:InputNumber;longest?:InputNumber;rest?:InputNumber;rpe?:InputNumber;
  sculling?:InputNumber;treading?:InputNumber;poolLength?:InputNumber;lengths?:InputNumber;
  breaststroke?:string;notes?:string;drills?:Record<string,boolean>;intervals?:SwimInterval[];
  segments?:SwimSegment[]; // v5: separate strokes/drills, no changes to old measurements
}
export interface SessionTiming {startedAt?:string; endedAt?:string; pausedAt?:string; pausedDurationMs?:number}
export interface SessionNotes {fatigue?:string;discomfort?:string;technique?:string;general?:string;soreness?:string;sessionRpe?:number}
export interface WeekLog {
  done:Partial<Record<Day,boolean>>;
  gym:Partial<Record<GymDay,Record<string,ExerciseLog>>>;
  swim:Partial<Record<SwimDay,SwimLog>>;
  sessionNotes?:Partial<Record<Day,SessionNotes>>;
  timing?:Partial<Record<Day,SessionTiming>>;
  schedule?:Partial<Record<Day,string>>;
  completedAt?:Partial<Record<Day,string>>;
  /** Actual local date of training, independent of when a user tapped Complete. */
  completedOn?:Partial<Record<Day,string>>;
  scheduleStatus?:Partial<Record<Day,ScheduleStatus>>;
  routineOverrides?:Partial<Record<GymDay,RoutineExercise[]>>;
  swimRoutineOverrides?:Partial<Record<SwimDay,SwimRoutine>>;
}
export interface WeighIn {kg?:InputNumber;note?:string;deleted?:boolean}
export interface WaterEntry {date:string;ml:number;at:string;deleted?:boolean}
export interface Preferences {swimTemplates:Partial<Record<SwimDay,SwimRoutine>>;swimPoolDefault:number;swimTargets:Partial<Record<SwimStroke,number>>;swimModes:Partial<Record<SwimStroke,SwimMode>>;swimTechniqueMastery:Partial<Record<SwimStroke,Record<string,boolean>>>;routineTemplates:Partial<Record<GymDay,RoutineExercise[]>>;setOverrides:Record<string,number>;targetWeight:InputNumber;restSeconds:number;effortMode:'off'|'rir'|'rpe';reminders:{enabled:boolean;time:string}}
import type {SyncItemDocument,PendingSyncItem,SyncItemConflict} from './item-sync';
export interface TrackerData extends Preferences {
  version:number;weeks:Record<string,WeekLog>;weights:Record<string,WeighIn>;
  waterLogs:Record<string,WaterEntry>;recordUpdates:Record<string,number>;pendingSync:Record<string,number>;
  setRecords:Record<string,SetDocument>;pendingSets:Record<string,PendingSetWrite>;setConflicts:Record<string,SetConflict>;
  syncItems:Record<string,SyncItemDocument>;pendingItems:Record<string,PendingSyncItem>;itemConflicts:Record<string,SyncItemConflict>;
}
export interface UserInfo {uid:string;name:string;email:string;photoURL:string|null}
