'use client';

import {useState} from 'react';
import {ArrowLeft,ArrowRight,CalendarClock,CalendarDays,Leaf,SkipForward} from 'lucide-react';
import type {Trainer} from '@/hooks/useTrainer';
import type {Day} from '@/lib/types';
import type {CalendarItem} from '@/lib/scheduling';
import {isValidDate} from '@/lib/scheduling';
import {homeFocus,homeQueue,todayFocus,type HomeFocus} from '@/lib/home-overview';
import {formatDate} from '@/lib/dates';
import {isGym} from '@/lib/plan';
import {sessionDisplayName,sessionDisplaySubtitle} from '@/lib/swimming';
import DateInput from '@/components/DateInput';

type HeroView='auto'|'active'|'today'|'missed'|'upcoming';

type Props={app:Trainer;today:string;open:(week:string,day:Day)=>void};

export default function HomeHero({app,today,open}:Props){
 const active=homeFocus(app.data,today);
 const hasActive=active.kind==='active'||active.kind==='review';
 const todayEntry=todayFocus(app.data,today);
 const queue=homeQueue(app.data,today);
 const [view,setView]=useState<HeroView>('auto');
 const [missedIndex,setMissedIndex]=useState(0);
 const [upcomingIndex,setUpcomingIndex]=useState(0);
 const [editing,setEditing]=useState(false);
 const [moveDraft,setMoveDraft]=useState(today);
 const effectiveView:Exclude<HeroView,'auto'>=view==='auto'?(hasActive?'active':'today'):
  view==='active'&&!hasActive?'today':
  view==='missed'&&!queue.missed.length?'today':
  view==='upcoming'&&!queue.upcoming.length?'today':view;
 const selectedList=effectiveView==='missed'?queue.missed:effectiveView==='upcoming'?queue.upcoming:[];
 const selectedIndex=effectiveView==='missed'?Math.min(missedIndex,Math.max(0,selectedList.length-1)):
  Math.min(upcomingIndex,Math.max(0,selectedList.length-1));
 const focus:HomeFocus=effectiveView==='active'?active:effectiveView==='today'?todayEntry:{
  kind:effectiveView==='missed'?'overdue':'upcoming',entry:selectedList[selectedIndex],otherTimers:0,
 };
 const entry=focus.entry;
 const activeView=focus.kind==='active'||focus.kind==='review';
 const actionEntry=entry&&entry.status!=='completed'&&!activeView?entry:null;
 const type=entry?(isGym(entry.day)?'gym':'swim'):null;
 const artwork=focus.kind==='recovery'||focus.kind==='idle'?'recovery':type;
 const sessionName=entry?sessionDisplayName(app.data,entry.week,entry.day):'';
 const name=entry&&focus.kind!=='recovery'&&focus.kind!=='skipped'?
  sessionName:
  focus.kind==='skipped'?'Workout skipped':focus.kind==='recovery'?'Recovery day':
  focus.kind==='idle'?'No workout today':'Your training';
 const description=entry&&focus.kind!=='recovery'&&focus.kind!=='skipped'?
  sessionDisplaySubtitle(app.data,entry.week,entry.day):
  focus.kind==='skipped'?`You marked ${sessionName} as skipped. You can restore or reschedule it here.`:
  focus.kind==='recovery'?`You marked ${sessionName} for recovery. Rest is part of progress.`:
  'Nothing is scheduled for today. Browse missed sessions or the next workout without changing today’s plan.';
 const status=focus.kind==='active'?'ACTIVE WORKOUT':focus.kind==='review'?'TIMER REVIEW REQUIRED':
  focus.kind==='scheduled'?"TODAY'S WORKOUT":focus.kind==='overdue'?'MISSED WORKOUT':
  focus.kind==='upcoming'?'NEXT WORKOUT':focus.kind==='completed'?'COMPLETED TODAY':focus.kind==='skipped'?'WORKOUT SKIPPED':
  focus.kind==='recovery'?'PLANNED RECOVERY':'TODAY · NO SESSION';
 const manageLabel=focus.kind==='overdue'?'Manage missed workout':effectiveView==='today'?'Change today’s plan':'Manage this workout';
 const chooseView=(next:HeroView)=>{setView(next);setEditing(false);};
 const selectOther=(direction:number)=>{
  if(effectiveView==='missed')setMissedIndex(i=>Math.max(0,Math.min(queue.missed.length-1,i+direction)));
  if(effectiveView==='upcoming')setUpcomingIndex(i=>Math.max(0,Math.min(queue.upcoming.length-1,i+direction)));
  setEditing(false);
 };
 const updateStatus=(target:CalendarItem,kind:'rest'|'skipped'|null)=>{
  app.setScheduleStatus(target.day,kind,target.week);
  // When a missed workout is resolved, return to today's plan instead of
  // silently jumping to a different missed workout.
  if(effectiveView==='missed'||effectiveView==='upcoming')setView('today');
  setEditing(false);
 };
 const reschedule=()=>{
  if(!actionEntry||!isValidDate(moveDraft))return;
  app.rescheduleSession(actionEntry.day,moveDraft,actionEntry.week);
  if(effectiveView==='missed'||effectiveView==='upcoming')setView('today');
  setEditing(false);
 };
 return <div className="phaseb-hero-section">
  <div className="phaseb-hero-switcher" role="group" aria-label="Choose workout to view">
   {hasActive&&<button type="button" className={effectiveView==='active'?'is-current':''} aria-pressed={effectiveView==='active'} onClick={()=>chooseView('active')}>Active{active.kind==='review'?' · Review':''}</button>}
   <button type="button" className={effectiveView==='today'?'is-current':''} aria-pressed={effectiveView==='today'} onClick={()=>chooseView('today')}>Today <span>{formatDate(today)}</span></button>
   {queue.missed.length>0&&<button type="button" className={effectiveView==='missed'?'is-current':''} aria-pressed={effectiveView==='missed'} onClick={()=>chooseView('missed')}>Missed <b>{queue.missed.length}</b></button>}
   {queue.upcoming.length>0&&<button type="button" className={effectiveView==='upcoming'?'is-current':''} aria-pressed={effectiveView==='upcoming'} onClick={()=>chooseView('upcoming')}>Upcoming <b>{queue.upcoming.length}</b></button>}
  </div>
  <section className={`card phaseb-hero ${artwork?`phaseb-hero--${artwork}`:''} ${focus.kind==='overdue'?'phaseb-hero--overdue':''}`} aria-label={`${status.toLowerCase()}: ${name}`}>
   <div className="phaseb-hero-content">
    <span className="phaseb-kicker"><span className="phaseb-live-dot"/>{status}</span>
    <h2>{name}</h2>
    <p>{description}</p>
    <div className="phaseb-hero-meta"><CalendarDays size={16}/>{entry?formatDate(entry.date):formatDate(today)} {entry&&<>· {type==='gym'?'Gym':'Swimming'}</>}</div>
    {activeView&&focus.otherTimers>0&&<p className="phaseb-secondary-note">+ {focus.otherTimers} more timer(s) available from the timer dock</p>}
    <div className="phaseb-hero-actions">
     {entry&&(entry.status==='scheduled'||entry.status==='completed')&&<button type="button" className="button-primary" onClick={()=>open(entry.week,entry.day)}>{focus.kind==='review'?'Review stopped timer':focus.kind==='active'?'Open active workout':focus.kind==='completed'?'View completed workout':'Open workout'} <ArrowRight size={17}/></button>}
     {!entry&&<button type="button" className="button-secondary" onClick={()=>app.goto('calendar')}>View full calendar <ArrowRight size={17}/></button>}
     {actionEntry&&<button type="button" className="button-secondary" aria-expanded={editing} aria-controls="phaseb-hero-manage" onClick={()=>{setEditing(v=>!v);setMoveDraft(actionEntry.date<today?today:actionEntry.date);}}>{manageLabel} <CalendarClock size={16}/></button>}
    </div>
    {editing&&actionEntry&&<div className="phaseb-hero-management" id="phaseb-hero-manage" role="group" aria-label={`Change plan for ${sessionDisplayName(app.data,actionEntry.week,actionEntry.day)} scheduled ${formatDate(actionEntry.date)}`}>
      <div className="phaseb-hero-management-title"><strong>Update this workout</strong><small>{formatDate(actionEntry.date)} · {actionEntry.day}</small></div>
      <div className="phaseb-hero-management-actions">
       <button type="button" onClick={()=>updateStatus(actionEntry,actionEntry.status==='rest'?null:'rest')}><Leaf size={17}/>{actionEntry.status==='rest'?'Undo recovery':'Mark recovery'}</button>
       <button type="button" onClick={()=>updateStatus(actionEntry,actionEntry.status==='skipped'?null:'skipped')}><SkipForward size={17}/>{actionEntry.status==='skipped'?'Undo skip':'Mark skipped'}</button>
      </div>
      <label className="field"><span>Reschedule this session</span><DateInput value={moveDraft} onChange={e=>setMoveDraft(e.target.value)} ariaLabel="New workout date"/></label>
      <div className="phaseb-hero-management-footer"><button type="button" className="button-secondary" onClick={()=>setEditing(false)}>Cancel</button><button type="button" className="button-primary" disabled={!isValidDate(moveDraft)||moveDraft===actionEntry.date} onClick={reschedule}>Save new date</button></div>
    </div>}
   </div>
   {(effectiveView==='missed'||effectiveView==='upcoming')&&selectedList.length>1&&<div className="phaseb-hero-pager" aria-label={`Browse ${effectiveView} workouts`}>
    <button type="button" aria-label="Previous workout" disabled={selectedIndex===0} onClick={()=>selectOther(-1)}><ArrowLeft size={17}/></button>
    <span>{selectedIndex+1} of {selectedList.length}</span>
    <button type="button" aria-label="Next workout" disabled={selectedIndex===selectedList.length-1} onClick={()=>selectOther(1)}><ArrowRight size={17}/></button>
   </div>}
  </section>
 </div>;
}
