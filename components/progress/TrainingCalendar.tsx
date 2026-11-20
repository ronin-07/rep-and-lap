'use client';
import {useState} from 'react';
import {CalendarDays,ChevronLeft,ChevronRight,ArrowRight, Moon, CheckCircle2, SkipForward} from 'lucide-react';
import type {Trainer} from '@/hooks/useTrainer';
import type {Day} from '@/lib/types';
import {PLAN,isGym} from '@/lib/plan';
import {keyOf,dateFor,formatDate,weekOf} from '@/lib/dates';
import {monthGrid,moveDate,entriesForDate,weeklyAdherence} from '@/lib/scheduling';

function monthTitle(month:string){return dateFor(`${month}-01`).toLocaleDateString('en-GB',{month:'long',year:'numeric'});}
function shiftMonth(month:string,offset:number){const d=dateFor(`${month}-01`);d.setMonth(d.getMonth()+offset);return keyOf(d).slice(0,7);}
export default function TrainingCalendar({app}:{app:Trainer}){
 const today=keyOf(new Date());
 const [month,setMonth]=useState(today.slice(0,7));
 const [selected,setSelected]=useState(today);
 const cells=monthGrid(month),items=entriesForDate(app.data,selected);
 const adherence=weeklyAdherence(app.data,weekOf(dateFor(selected)));
 const openSession=(week:string,day:Day)=>{app.setWeek(week);if(isGym(day))app.setGymDay(day);else app.setSwimDay(day);app.goto('workout',isGym(day)?'gym':'swim');};
 return <div className="stack calendar-page">
  <section className="card pane-pad stack">
   <div className="section-title"><div><span className="eyebrow">TRAINING CALENDAR</span><h2>Your training, on your terms.</h2></div><span className="icon-wrap violet"><CalendarDays size={21}/></span></div>
   <p className="muted small">Completed sessions use their actual completion date. Moving a session keeps its original workout history. Recovery days do not break your streak.</p>
   <div className="calendar-toolbar"><button className="icon-btn" aria-label="Previous month" onClick={()=>setMonth(shiftMonth(month,-1))}><ChevronLeft size={19}/></button><strong>{monthTitle(month)}</strong><button className="icon-btn" aria-label="Next month" onClick={()=>setMonth(shiftMonth(month,1))}><ChevronRight size={19}/></button><button className="button-secondary calendar-today" onClick={()=>{setMonth(today.slice(0,7));setSelected(today);}}>Today</button></div>
   <div className="calendar-weekdays" aria-hidden="true">{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(day=><span key={day}>{day}</span>)}</div>
   <div className="training-calendar-grid">{cells.map(date=>{
    const entries=entriesForDate(app.data,date),completed=entries.some(x=>x.status==='completed'),rest=entries.length===0||entries.every(x=>x.status==='rest'),skipped=entries.some(x=>x.status==='skipped'),planned=entries.some(x=>x.status==='scheduled');
    const outside=date.slice(0,7)!==month;
    return <button type="button" key={date} className={`calendar-cell ${selected===date?'selected':''} ${date===today?'is-today':''} ${outside?'outside':''}`} onClick={()=>{setSelected(date);if(outside)setMonth(date.slice(0,7));}} aria-pressed={date===selected} aria-label={`${formatDate(date)}: ${completed?'completed training':skipped?'skipped session':planned?'planned workout':'recovery day'}`}>
     <span className="calendar-day-number">{Number(date.slice(-2))}</span>
     <span className={`calendar-indicator ${completed?'completed':skipped?'skipped':planned?'planned':rest?'rest':''}`} aria-hidden="true"/>
    </button>;
   })}</div>
   <div className="calendar-key"><span><i className="completed"/>Complete</span><span><i className="planned"/>Planned</span><span><i className="rest"/>Rest</span><span><i className="skipped"/>Skipped</span></div>
  </section>
  <section className="card pane-pad stack"><div className="section-title"><div><span className="eyebrow">SELECTED DAY</span><h2>{formatDate(selected)}</h2></div><span className="mini-label">{adherence.completed}/{adherence.eligible} sessions in plan week</span></div>
   {items.length===0?<div className="calendar-empty"><Moon size={22}/><strong>Recovery day</strong><p>No planned session. Rest is part of your training.</p></div>:<div className="calendar-session-list">{items.map(entry=><div className="calendar-session" key={`${entry.week}-${entry.day}`}>
    <div className="calendar-session-heading"><div><strong>{entry.name}</strong><small>{entry.day} · original week {entry.week}</small></div><span className={`calendar-status status-${entry.status}`}>{entry.status==='completed'?<CheckCircle2 size={14}/>:entry.status==='rest'?<Moon size={14}/>:entry.status==='skipped'?<SkipForward size={14}/>:null}{entry.status}</span></div>
    <div className="calendar-session-actions"><button className="button-secondary" onClick={()=>openSession(entry.week,entry.day)}>View workout <ArrowRight size={14}/></button>
     {entry.status!=='completed'&&<><button className="button-secondary" onClick={()=>app.setScheduleStatus(entry.day,entry.status==='rest'?null:'rest',entry.week)}>{entry.status==='rest'?'Undo rest':'Rest day'}</button><button className="button-secondary" onClick={()=>app.setScheduleStatus(entry.day,entry.status==='skipped'?null:'skipped',entry.week)}>{entry.status==='skipped'?'Undo skip':'Skip'}</button><label className="field calendar-move"><span>Move to</span><input type="date" value={entry.date} onChange={e=>{if(e.target.value)app.rescheduleSession(entry.day,e.target.value,entry.week);}}/></label></>}
    </div>
   </div>)}</div>}
  </section>
 </div>;
}
