'use client';
import {Clock3,ArrowRight,PauseCircle,PlayCircle} from 'lucide-react';
import type {Trainer} from '@/hooks/useTrainer';
import type {GymDay,SwimDay} from '@/lib/types';
import {DAYS} from '@/lib/types';
import {formatSessionClock,sessionClockState} from '@/lib/session-timing';

/** Shows a running or paused clock even after navigating away from Log. */
export default function ActiveTimerDock({app}:{app:Trainer}) {
 const active=Object.entries(app.data.weeks).flatMap(([week,record])=>DAYS.flatMap(day=>{
  const timing=record.timing?.[day],state=sessionClockState(timing);
  return (state==='running'||state==='paused')&&!record.done?.[day]? [{week,day,timing:timing!,state}]:[];
 })).sort((a,b)=>(b.timing.startedAt||'').localeCompare(a.timing.startedAt||''));
 const first=active[0];if(!first)return null;
 const swimming=['Thursday','Friday','Saturday'].includes(first.day);
 const same=app.view==='workout'&&app.week===first.week&&app.trackingTab===(swimming?'swim':'gym')&&(swimming?app.swimDay:app.gymDay)===first.day;
 if(same)return null;
 const open=()=>{
  app.setWeek(first.week);
  app.setTrackingTab(swimming?'swim':'gym');
  if(swimming)app.setSwimDay(first.day as SwimDay);else app.setGymDay(first.day as GymDay);
  app.goto('workout');
 };
 return <section className="active-timer-dock" role="status" aria-label="Active workout timer">
  <span className="active-timer-icon">{first.state==='paused'?<PauseCircle size={22}/>:<PlayCircle size={22}/>}</span>
  <div className="active-timer-details"><strong>{first.day} {swimming?'swim':'gym'} · {first.state==='paused'?'Paused':'Running'}</strong><small>{formatSessionClock(first.timing,Math.max(app.clock,Date.parse(first.timing.startedAt!)))}{active.length>1?` · ${active.length-1} more active`:''}</small></div>
  <button type="button" className="button-primary" onClick={open}><Clock3 size={16}/> Open timer <ArrowRight size={15}/></button>
 </section>;
}
