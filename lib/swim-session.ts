/** Swim timing deliberately separates stopping the clock from finishing the log.
 * The session remains editable and incomplete until the swimmer saves it. */
import type {SessionTiming,SwimDay,WeekLog} from './types';
import {keyOf} from './dates';
import {elapsedSessionMs,stopSessionTiming} from './session-timing';

export function stoppedSwimTiming(timing:SessionTiming|undefined,endedAt:string):SessionTiming|null {
 return stopSessionTiming(timing,endedAt);
}

/** Use the clock's stop date, never the date when the swim was logged later. */
export function completeStoppedSwim(record:WeekLog,day:SwimDay,savedAt:string):boolean {
 const timing=record.timing?.[day];
 if(record.done[day]||!timing?.startedAt||!timing.endedAt)return false;
 const start=Date.parse(timing.startedAt),end=Date.parse(timing.endedAt),saved=Date.parse(savedAt);
 if(!Number.isFinite(start)||!Number.isFinite(end)||end<start||!Number.isFinite(saved)||elapsedSessionMs(timing)===null)return false;
 record.done[day]=true;
 if(record.scheduleStatus)delete record.scheduleStatus[day];
 record.completedAt??={};record.completedAt[day]=savedAt;
 record.completedOn??={};record.completedOn[day]=keyOf(new Date(end));
 return true;
}
