import {DAYS,type Day,type TrackerData} from './types';
import {dateFor,keyOf} from './dates';
import {entriesForDate,scheduledDate,type CalendarItem} from './scheduling';
import {sessionClockState} from './session-timing';

export type HomeFocus={kind:'active'|'review'|'scheduled'|'overdue'|'upcoming'|'recovery'|'skipped';entry?:CalendarItem;otherTimers:number};
/** Pure selection: existing active clocks outrank scheduled sessions; no writes or timers are created here. */
export function homeFocus(data:TrackerData,today=keyOf(new Date())):HomeFocus {
 const timers=Object.entries(data.weeks).flatMap(([week,record])=>DAYS.flatMap(day=>{
  const timing=record.timing?.[day],state=sessionClockState(timing);
  return !record.done?.[day]&&(state==='running'||state==='paused'||(state==='stopped'&&timing?.autoStopped))?
   [{week,day,date:scheduledDate(data,week,day),status:'scheduled' as const,name:day,state,at:timing?.startedAt||''}]:[];
 })).sort((a,b)=>Number(a.state==='stopped')-Number(b.state==='stopped')||b.at.localeCompare(a.at));
 if(timers.length){const top=timers[0];return {kind:top.state==='stopped'?'review':'active',entry:top,otherTimers:timers.length-1};}
 const available=(date:string)=>entriesForDate(data,date).filter(e=>e.status==='scheduled');
 const todayEntries=entriesForDate(data,today),todays=todayEntries.filter(e=>e.status==='scheduled');
 if(todays.length)return {kind:'scheduled',entry:todays[0],otherTimers:0};
 // An intentional plan decision today should remain visible on Home rather
 // than being immediately displaced by another overdue session.
 if(todayEntries.some(e=>e.status==='skipped'))return {kind:'skipped',otherTimers:0};
 if(todayEntries.some(e=>e.status==='rest'))return {kind:'recovery',otherTimers:0};
 for(let i=1;i<=14;i++){
  const d=dateFor(today);d.setDate(d.getDate()-i);const missed=available(keyOf(d));
  if(missed.length)return {kind:'overdue',entry:missed[0],otherTimers:0};
 }
 for(let i=1;i<=28;i++){
  const d=dateFor(today);d.setDate(d.getDate()+i);const upcoming=available(keyOf(d));
  if(upcoming.length)return {kind:'upcoming',entry:upcoming[0],otherTimers:0};
 }
 return {kind:'recovery',otherTimers:0};
}
export function dayIndicators(data:TrackerData,date:string){
 return entriesForDate(data,date).map(entry=>({key:`${entry.week}:${entry.day}`,status:entry.status,day:entry.day as Day}));
}
