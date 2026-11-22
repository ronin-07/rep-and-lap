import {DAYS,type Day,type TrackerData} from './types';
import {dateFor,keyOf} from './dates';
import {entriesForDate,scheduledDate,type CalendarItem} from './scheduling';
import {sessionClockState} from './session-timing';

export type HomeFocus={kind:'active'|'review'|'scheduled'|'overdue'|'upcoming'|'recovery'|'skipped'|'idle'|'completed';entry?:CalendarItem;otherTimers:number};
export type HomeQueue={missed:CalendarItem[];upcoming:CalendarItem[]};

/** Today's state never gets replaced by an older missed workout. A rest/skip
 * entry is retained for the in-hero Undo action, but is not actionable to start. */
export function todayFocus(data:TrackerData,today=keyOf(new Date())):HomeFocus {
 const entries=entriesForDate(data,today);
 const scheduled=entries.find(entry=>entry.status==='scheduled');
 if(scheduled)return {kind:'scheduled',entry:scheduled,otherTimers:0};
 const completed=entries.find(entry=>entry.status==='completed');
 if(completed)return {kind:'completed',entry:completed,otherTimers:0};
 const skipped=entries.find(entry=>entry.status==='skipped');
 if(skipped)return {kind:'skipped',entry:skipped,otherTimers:0};
 const resting=entries.find(entry=>entry.status==='rest');
 if(resting)return {kind:'recovery',entry:resting,otherTimers:0};
 return {kind:'idle',otherTimers:0};
}

/** Manual navigation queue: no auto-advancing slides and no writes. The
 * original session week/day travels with each item for safe scheduling edits. */
export function homeQueue(data:TrackerData,today=keyOf(new Date()),lookbackDays=30,lookaheadDays=30):HomeQueue {
 const missed:CalendarItem[]=[],upcoming:CalendarItem[]=[];
 for(let i=1;i<=lookbackDays;i++){
  const date=dateFor(today);date.setDate(date.getDate()-i);
  missed.push(...entriesForDate(data,keyOf(date)).filter(entry=>entry.status==='scheduled'));
 }
 for(let i=1;i<=lookaheadDays;i++){
  const date=dateFor(today);date.setDate(date.getDate()+i);
  upcoming.push(...entriesForDate(data,keyOf(date)).filter(entry=>entry.status==='scheduled'));
 }
 return {missed,upcoming};
}

/** Active/review-required timers outrank scheduled sessions. A separate Today
 * view is always available even when one of these timers exists. */
export function homeFocus(data:TrackerData,today=keyOf(new Date())):HomeFocus {
 const timers=Object.entries(data.weeks).flatMap(([week,record])=>DAYS.flatMap(day=>{
  const timing=record.timing?.[day],state=sessionClockState(timing);
  return !record.done?.[day]&&(state==='running'||state==='paused'||(state==='stopped'&&timing?.autoStopped))?
   [{week,day,date:scheduledDate(data,week,day),status:'scheduled' as const,name:day,state,at:timing?.startedAt||''}]:[];
 })).sort((a,b)=>Number(a.state==='stopped')-Number(b.state==='stopped')||b.at.localeCompare(a.at));
 if(timers.length){const top=timers[0];return {kind:top.state==='stopped'?'review':'active',entry:top,otherTimers:timers.length-1};}
 const todayView=todayFocus(data,today);
 // Retain the existing homeFocus contract: rest and skip are not workouts to start.
 return todayView.kind==='skipped'||todayView.kind==='recovery'?{kind:todayView.kind,otherTimers:0}:todayView;
}
export function dayIndicators(data:TrackerData,date:string){
 return entriesForDate(data,date).map(entry=>({key:`${entry.week}:${entry.day}`,status:entry.status,day:entry.day as Day}));
}
