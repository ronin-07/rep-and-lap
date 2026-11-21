'use client';
import {useState} from 'react';
import {CalendarDays,ChevronLeft,ChevronRight,ArrowRight,Moon,CheckCircle2,SkipForward,CalendarClock} from 'lucide-react';
import type {Trainer} from '@/hooks/useTrainer';
import type {Day} from '@/lib/types';
import {PLAN,isGym} from '@/lib/plan';
import {keyOf,dateFor,formatDate,weekOf} from '@/lib/dates';
import {monthGrid,entriesForDate,weeklyAdherence,scheduledDate,originalPlannedDate,completedDate,completedElsewhereForDate} from '@/lib/scheduling';
import type {CalendarItem} from '@/lib/scheduling';
import DateInput from '@/components/DateInput';
import {sessionDisplayName} from '@/lib/swimming';
function monthTitle(month:string){return dateFor(`${month}-01`).toLocaleDateString('en-GB',{month:'long',year:'numeric'});}
function shiftMonth(month:string,offset:number){const d=dateFor(`${month}-01`);d.setMonth(d.getMonth()+offset);return keyOf(d).slice(0,7);}
function statusLabel(status:CalendarItem['status']){return status==='rest'?'Recovery Day':status==='skipped'?'Workout Skipped':status==='completed'?'Workout Completed':'Workout Scheduled';}
function statusIcon(status:CalendarItem['status']){return status==='rest'?<Moon size={20}/>:status==='skipped'?<SkipForward size={20}/>:status==='completed'?<CheckCircle2 size={20}/>:<CalendarClock size={20}/>;}
export default function TrainingCalendar({app}:{app:Trainer}){
 const today=keyOf(new Date());const [month,setMonth]=useState(today.slice(0,7)),[selected,setSelected]=useState(today);
 const cells=monthGrid(month),items=entriesForDate(app.data,selected),historyAnchors=completedElsewhereForDate(app.data,selected),adherence=weeklyAdherence(app.data,weekOf(dateFor(selected)));
 const openSession=(week:string,day:Day)=>{app.setWeek(week);if(isGym(day))app.setGymDay(day);else app.setSwimDay(day);app.goto('workout',isGym(day)?'gym':'swim');};
 return <div className="stack calendar-page">
  <section className="card pane-pad stack"><div className="section-title"><div><span className="eyebrow">TRAINING CALENDAR</span><h2>Plan around your life.</h2></div><span className="icon-wrap violet"><CalendarDays size={21}/></span></div>
   <p className="muted small">View completed workouts, recovery days and missed sessions. Select a day for its full details. Completed sessions appear on the date you actually trained. Their original planned dates remain in the details and adherence history.</p>
   <div className="calendar-toolbar"><button className="icon-btn" aria-label="Previous month" onClick={()=>setMonth(shiftMonth(month,-1))}><ChevronLeft size={19}/></button><strong>{monthTitle(month)}</strong><button className="icon-btn" aria-label="Next month" onClick={()=>setMonth(shiftMonth(month,1))}><ChevronRight size={19}/></button><button className="button-secondary calendar-today" onClick={()=>{setMonth(today.slice(0,7));setSelected(today);}}>Today</button></div>
   <div className="calendar-weekdays" aria-hidden="true">{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(day=><span key={day}>{day}</span>)}</div>
   <div className="training-calendar-grid">{cells.map(date=>{
    const entries=entriesForDate(app.data,date);const completed=entries.some(x=>x.status==='completed'),skipped=entries.some(x=>x.status==='skipped'),planned=entries.some(x=>x.status==='scheduled'),rest=entries.some(x=>x.status==='rest'),trainedLater=completedElsewhereForDate(app.data,date).length>0;
    const icon=completed?<CheckCircle2 size={14}/>:skipped?<SkipForward size={14}/>:rest?<Moon size={14}/>:planned||trainedLater?<CalendarClock size={14}/>:null;
    const state=completed?'completed':skipped?'skipped':rest?'rest':planned||trainedLater?'planned':'free';
    const label=completed?'completed workout':skipped?'skipped session':rest?'marked recovery day':trainedLater?'planned here; completed on another date':planned?'planned workout':'no scheduled session';
    const outside=date.slice(0,7)!==month;
    return <button type="button" title={`${formatDate(date)} — ${label}`} key={date} data-calendar-status={state} className={`calendar-cell ${selected===date?'selected':''} ${date===today?'is-today':''} ${outside?'outside':''} status-cell-${state}`} onClick={()=>{setSelected(date);if(outside)setMonth(date.slice(0,7));}} aria-pressed={date===selected} aria-label={`${formatDate(date)}: ${label}`}>
     <span className="calendar-day-number">{Number(date.slice(-2))}</span><span className="calendar-cell-icon" aria-hidden="true">{icon}</span>
    </button>;
   })}</div>
   <div className="calendar-key" aria-label="Calendar legend"><span><CheckCircle2 className="legend-completed" size={17}/> Completed</span><span><CalendarClock className="legend-planned" size={17}/> Planned</span><span><Moon className="legend-rest" size={17}/> Recovery</span><span><SkipForward className="legend-skipped" size={17}/> Skipped</span></div>
  </section>
  <section className="card pane-pad stack"><div className="section-title calendar-selected-heading"><div><span className="eyebrow">SELECTED DAY</span><h2>{formatDate(selected)}</h2></div><span className="mini-label">{adherence.completed}/{adherence.eligible} completed this plan week</span></div>
   {items.length===0&&historyAnchors.length===0?<div className="calendar-empty"><Moon size={24}/><strong>Unscheduled day</strong><p>No workout is planned for this date. Rest can be part of training.</p></div>:
   <div className="calendar-session-list">{historyAnchors.map(item=><div className="calendar-history-anchor" key={`anchor-${item.week}-${item.day}`}><CalendarClock size={20}/><div><strong>{sessionDisplayName(app.data,item.week,item.day)} was planned here</strong><p>Completed on {formatDate(item.actualDate)}. This plan date stays in history, but the session counts only on the date you trained.</p></div><button className="button-secondary" onClick={()=>{setSelected(item.actualDate);setMonth(item.actualDate.slice(0,7));}}>View completion <ArrowRight size={15}/></button></div>)}{items.map(entry=><div className={`calendar-session session-${entry.status}`} key={`${entry.week}-${entry.day}`}>
    <div className="calendar-primary-status"><span className={`calendar-status-icon status-${entry.status}`}>{statusIcon(entry.status)}</span><div><span className="eyebrow">{entry.status==='rest'?'MARKED FOR RECOVERY':entry.status==='skipped'?'MARKED AS SKIPPED':entry.status==='completed'?'TRAINING RECORDED':'READY WHEN YOU ARE'}</span><h3>{statusLabel(entry.status)}</h3><p>{entry.status==='rest'||entry.status==='skipped'?`Originally scheduled: ${sessionDisplayName(app.data,entry.week,entry.day)}`:sessionDisplayName(app.data,entry.week,entry.day)}</p></div></div>
    <div className="calendar-session-meta"><span>{entry.day}</span>
     {entry.status==='completed'?<><span>Completed: {formatDate(completedDate(app.data,entry.week,entry.day))}</span>
       {scheduledDate(app.data,entry.week,entry.day)!==completedDate(app.data,entry.week,entry.day)&&<span>Scheduled for: {formatDate(scheduledDate(app.data,entry.week,entry.day))}</span>}</>:
       <span>Scheduled for: {formatDate(scheduledDate(app.data,entry.week,entry.day))}</span>}
     {originalPlannedDate(entry.week,entry.day)!==scheduledDate(app.data,entry.week,entry.day)&&<span>Originally planned: {formatDate(originalPlannedDate(entry.week,entry.day))}</span>}
    </div>
    <div className="calendar-session-actions"><button className="button-secondary" onClick={()=>openSession(entry.week,entry.day)}>View workout <ArrowRight size={16}/></button>
     {entry.status==='completed'?<button className="button-secondary" onClick={()=>app.requestCompletion(entry.week,entry.day,'edit')}><CalendarDays size={16}/> Edit completion date</button>:<button className="button-secondary" onClick={()=>app.requestCompletion(entry.week,entry.day)}><CheckCircle2 size={16}/> Mark completed</button>}
     {entry.status!=='completed'&&<>{entry.status==='rest'||entry.status==='skipped'?<button className="button-primary" onClick={()=>app.setScheduleStatus(entry.day,null,entry.week)}>Undo {entry.status==='rest'?'rest day':'skip'}</button>:<><button className="button-secondary" onClick={()=>app.setScheduleStatus(entry.day,'rest',entry.week)}><Moon size={15}/> Rest day</button><button className="button-secondary" onClick={()=>app.setScheduleStatus(entry.day,'skipped',entry.week)}><SkipForward size={15}/> Skip</button></>}
      <details className="calendar-reschedule"><summary><CalendarClock size={16}/> Reschedule</summary><label className="field"><span>Choose new session date</span><DateInput value={entry.date} onChange={e=>{if(e.target.value)app.rescheduleSession(entry.day,e.target.value,entry.week);}}/></label><p className="muted tiny">Existing sets stay in your history.</p></details></>}
    </div></div>)}</div>}
  </section>
 </div>;
}
