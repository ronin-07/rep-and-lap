import {DAYS,type Day,type TrackerData,type ScheduleStatus} from './types';
import {PLAN} from './plan';
import {keyOf,weekOf,dateFor,dateInWeek} from './dates';

export type CalendarItem = {week:string;day:Day;date:string;status:'scheduled'|'completed'|ScheduleStatus;name:string};
export function isValidDate(value:string):boolean {
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const d=dateFor(value);return Number.isFinite(d.getTime())&&keyOf(d)===value;
}
export function scheduledDate(data:TrackerData,week:string,day:Day):string {
 const custom=data.weeks[week]?.schedule?.[day];
 if(custom&&isValidDate(custom))return custom;
 const d=dateFor(week);d.setDate(d.getDate()+DAYS.indexOf(day));return keyOf(d);
}
export function statusFor(data:TrackerData,week:string,day:Day):'scheduled'|'completed'|ScheduleStatus {
 if(data.weeks[week]?.done?.[day])return 'completed';
 return data.weeks[week]?.scheduleStatus?.[day]??'scheduled';
}
/** Actual local calendar date, not the timestamp when a historical entry was added.
 * Older records (without completedOn) retain their existing fallback behavior. */
export function completedDate(data:TrackerData,week:string,day:Day):string {
 const record=data.weeks[week];
 const selected=record?.completedOn?.[day];
 if(selected&&isValidDate(selected))return selected;
 const stamp=record?.timing?.[day]?.endedAt||record?.completedAt?.[day];
 if(stamp&&!Number.isNaN(Date.parse(stamp)))return keyOf(new Date(stamp));
 return scheduledDate(data,week,day);
}
/** The immutable original weekday/date of the template, irrespective of reschedules. */
export function originalPlannedDate(week:string,day:Day):string{return dateInWeek(week,day);}

// Display planned sessions by their CURRENT calendar date, not their original weekday.
// Completed sessions move to their actual completion date, even after rescheduling.
export function entriesForDate(data:TrackerData,date:string):CalendarItem[] {
 if(!isValidDate(date))return [];
 const ownWeek=weekOf(dateFor(date));
 const weeks=new Set([ownWeek,...Object.keys(data.weeks)]);
 const result:CalendarItem[]=[];
 for(const week of weeks)for(const day of DAYS){
  const status=statusFor(data,week,day);
  const actualDate=status==='completed'?completedDate(data,week,day):scheduledDate(data,week,day);
  if(actualDate===date)result.push({week,day,date,status,name:PLAN[day].name});
 }
 return result.sort((a,b)=>a.week.localeCompare(b.week)||DAYS.indexOf(a.day)-DAYS.indexOf(b.day));
}
/** Calendar-only history anchors. A workout completed on another date should
 * remain discoverable at its scheduled slot without being counted twice. */
export function completedElsewhereForDate(data:TrackerData,date:string):Array<{week:string;day:Day;actualDate:string}> {
 if(!isValidDate(date))return [];
 const out:Array<{week:string;day:Day;actualDate:string}>=[];
 for(const [week,log] of Object.entries(data.weeks))for(const day of DAYS){
  if(!log.done?.[day]||scheduledDate(data,week,day)!==date)continue;
  const actualDate=completedDate(data,week,day);
  if(actualDate!==date)out.push({week,day,actualDate});
 }
 return out.sort((a,b)=>a.week.localeCompare(b.week)||DAYS.indexOf(a.day)-DAYS.indexOf(b.day));
}
export function isRecoveryDate(data:TrackerData,date:string):boolean {
 const entries=entriesForDate(data,date);
 return !entries.length||entries.every(x=>x.status==='rest');
}
export function weeklyAdherence(data:TrackerData,week:string){
 const entries=DAYS.map(day=>statusFor(data,week,day));
 const eligible=entries.filter(status=>status!=='rest').length;
 const completed=entries.filter(status=>status==='completed').length;
 const rested=entries.filter(status=>status==='rest').length;
 const skipped=entries.filter(status=>status==='skipped').length;
 return {eligible,completed,rested,skipped,rate:eligible?completed/eligible:null};
}
// Rest and dates without a scheduled session are neutral. A skipped or overdue
// scheduled session breaks continuity. Today's unfinished session does not yet break it.
export function trainingStreak(data:TrackerData,today=keyOf(new Date()),windowDays=200){
 let best=0,rolling=0;
 const begin=dateFor(today);
 begin.setDate(begin.getDate()-(windowDays-1));
 for(let i=0;i<windowDays;i++){
  const d=dateFor(keyOf(begin));d.setDate(d.getDate()+i);
  const date=keyOf(d),entries=entriesForDate(data,date);
  if(!entries.length||entries.every(x=>x.status==='rest'))continue;
  if(entries.some(x=>x.status==='completed')){rolling++;best=Math.max(best,rolling);}
  else if(date!==today)rolling=0;
 }
 // Start at today and walk backwards, ignoring today if still scheduled and
 // ignoring recovery days; then count consecutive completed training dates.
 let current=0;
 for(let i=0;i<windowDays;i++){
  const d=dateFor(today);d.setDate(d.getDate()-i);
  const date=keyOf(d),entries=entriesForDate(data,date);
  if(!entries.length||entries.every(x=>x.status==='rest'))continue;
  if(entries.some(x=>x.status==='completed'))current++;
  else if(i===0)continue;
  else break;
 }
 return {current,best};
}
export function moveDate(date:string,offset:number):string{
 const d=dateFor(date);d.setDate(d.getDate()+offset);return keyOf(d);
}
export function monthGrid(month:string):string[] {
 const first=dateFor(`${month}-01`);
 if(!Number.isFinite(first.getTime()))return [];
 first.setDate(first.getDate()-((first.getDay()+6)%7));
 return Array.from({length:42},(_,i)=>moveDate(keyOf(first),i));
}
