'use client';
import {useState} from 'react';
import {ArrowRight,CalendarDays,CheckCircle2,Droplets,Flame,Leaf,Moon,Scale,Settings2,SkipForward,Timer} from 'lucide-react';
import type {Trainer} from '@/hooks/useTrainer';
import type {Day} from '@/lib/types';
import {isGym} from '@/lib/plan';
import {dateFor,keyOf,weekOf,formatDate} from '@/lib/dates';
import {entriesForDate,weeklyAdherence} from '@/lib/scheduling';
import {dayIndicators} from '@/lib/home-overview';
import {waterGoal,waterTotal,weightEntries,activeStreak,formatDuration} from '@/lib/metrics';
import {weeklyTrainingTime} from '@/lib/training-intelligence';
import {sessionDisplayName} from '@/lib/swimming';
import DateInput from '@/components/DateInput';
import HomeHero from './HomeHero';

const abbreviations=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
export default function Dashboard({app}:{app:Trainer}){
 const now=new Date(),today=keyOf(now),week=weekOf(now);
 const [selected,setSelected]=useState(today);
 const [goalEditing,setGoalEditing]=useState(false);
 const [weightEditing,setWeightEditing]=useState(false);
 const [weightDraft,setWeightDraft]=useState('');
 const [goalDraft,setGoalDraft]=useState('');
 const progress=weeklyAdherence(app.data,week),timed=weeklyTrainingTime(app.data,week),streak=activeStreak(app.data);
 const water=waterTotal(app.data,today),goal=waterGoal(today,app.data),latest=weightEntries(app.data).at(-1);
 const selectedItems=entriesForDate(app.data,selected);
 const open=(sourceWeek:string,day:Day)=>{
  const kind=isGym(day)?'gym':'swim';app.setWeek(sourceWeek);app.setTrackingTab(kind);
  if(kind==='gym')app.setGymDay(day as 'Monday'|'Tuesday'|'Wednesday');else app.setSwimDay(day as 'Thursday'|'Friday'|'Saturday');
  app.goto('workout',kind);
 };
 return <div className="phaseb-home stack-xl">
  <header className="phaseb-welcome"><div><span className="eyebrow">{formatDate(today).toUpperCase()} · YOUR SPACE</span><h1>Your training space<span className="phaseb-dot">.</span></h1><p>One workout at a time. Consistency adds up.</p></div></header>
  <div className="phaseb-home-layout">
   <div className="phaseb-home-primary stack">
    <HomeHero app={app} today={today} open={open}/>
    <section className="card phaseb-card phaseb-week-plan"><div className="phaseb-card-heading"><div><span className="eyebrow">AT A GLANCE</span><h2>This week’s plan</h2></div><button className="text-btn" onClick={()=>app.goto('calendar')}>Full calendar <ArrowRight size={16}/></button></div>
     <div className="phaseb-week-days">{Array.from({length:7},(_,i)=>{const d=dateFor(week);d.setDate(d.getDate()+i);const date=keyOf(d),entries=dayIndicators(app.data,date);const state=entries.some(x=>x.status==='completed')?'completed':entries.some(x=>x.status==='scheduled')?'scheduled':entries.some(x=>x.status==='skipped')?'skipped':entries.some(x=>x.status==='rest')?'rest':'free';return <button key={date} type="button" className={`phaseb-week-day phaseb-${state} ${date===selected?'is-selected':''} ${date===today?'is-today':''}`} aria-pressed={date===selected} title={`${formatDate(date)} · ${entries.length} sessions`} onClick={()=>setSelected(date)}><small>{abbreviations[i]}</small><strong>{d.getDate()}</strong><span className="phaseb-day-icons">{entries.length?entries.slice(0,3).map(e=><span key={e.key} className={`phaseb-status-dot is-${e.status}`} title={`${e.day}: ${e.status}`}/>):<Moon size={15}/>}</span></button>})}</div>
     <div id="phaseb-day-details" className="phaseb-day-details"><div className="phaseb-card-heading"><strong>{selected===today?"Today's plan":formatDate(selected)}</strong><span className="muted tiny">{selectedItems.length?`${selectedItems.length} session${selectedItems.length>1?'s':''}`:'Rest / unscheduled'}</span></div>
       {selectedItems.length?selectedItems.map(item=><div className="phaseb-plan-item" key={`${item.week}-${item.day}`}><div><strong>{sessionDisplayName(app.data,item.week,item.day)}</strong><small>{item.day} · {item.status==='completed'?'Completed':item.status==='rest'?'Recovery':item.status==='skipped'?'Skipped':item.date<today?'Overdue':'Planned'}</small></div><div className="phaseb-plan-actions"><button className="button-secondary" onClick={()=>open(item.week,item.day)}>Open</button>{item.status!=='completed'&&<details className="phaseb-plan-menu"><summary className="button-secondary">Change plan</summary><div className="phaseb-plan-popover"><button onClick={()=>app.setScheduleStatus(item.day,item.status==='rest'?null:'rest',item.week)}><Leaf size={15}/>{item.status==='rest'?'Undo recovery':'Recovery day'}</button><button onClick={()=>app.setScheduleStatus(item.day,item.status==='skipped'?null:'skipped',item.week)}><SkipForward size={15}/>{item.status==='skipped'?'Undo skip':'Skip workout'}</button><label className="field"><span>Reschedule this workout</span><DateInput value={item.date} onChange={e=>{if(e.target.value)app.rescheduleSession(item.day,e.target.value,item.week);}}/></label></div></details>}</div></div>):<p className="muted small">No workout scheduled for this date. Select another day or open Calendar to plan ahead.</p>}
     </div>
    </section>
   </div>
   <aside className="phaseb-home-aside stack">
    <section className="card phaseb-card"><div className="phaseb-card-heading"><h2><CalendarDays size={19}/> Your week</h2><small className="muted">Mon – Sun</small></div><div className="phaseb-week-stats"><div><CheckCircle2 size={22}/><strong>{progress.completed}/{progress.eligible}</strong><small>Plan completed</small></div><div><Timer size={22}/><strong>{timed.sessions?formatDuration(timed.minutes):'Not tracked'}</strong><small>{timed.sessions?`Timed sessions: ${timed.sessions}`:'No recorded duration'}</small></div><div><Flame size={22}/><strong>{streak.current} days</strong><small>Streak</small></div></div><p className="phaseb-secondary-note">Rest days are excluded from your planned-session target. Training time counts only sessions with recorded timers.</p></section>
    <section className="card phaseb-card phaseb-hydration-card"><div className="phaseb-card-heading"><h2><Droplets size={19}/> Hydration</h2><button className="phaseb-icon-button" aria-label="Change default daily water goal" onClick={()=>{setGoalDraft(String(goal));setGoalEditing(x=>!x)}}><Settings2 size={17}/></button></div><div className="phaseb-hydration-number"><strong>{(water/1000).toFixed(2)} <small>/ {(goal/1000).toFixed(2)} L</small></strong><span>{Math.round(water/goal*100)}%</span></div><div className="progress-track"><span style={{width:`${Math.min(100,water/goal*100)}%`,background:'var(--aqua)'}}/></div><div className="phaseb-quick-actions">{[250,500,750].map(ml=><button key={ml} className="button-secondary" onClick={()=>app.addWater(ml)}>+{ml} mL</button>)}</div>
     {goalEditing&&<div className="phaseb-goal-editor"><label className="field"><span>Default daily water goal (mL)</span><input inputMode="numeric" type="number" min="500" max="6000" step="50" value={goalDraft} onChange={e=>setGoalDraft(e.target.value)}/></label><button className="button-primary" disabled={!Number.isInteger(Number(goalDraft))||Number(goalDraft)<500||Number(goalDraft)>6000} onClick={()=>{app.setDefaultWaterGoal(Number(goalDraft));setGoalEditing(false);}}>Save goal</button><p className="muted tiny">Your new default applies from today; older daily goals remain in history.</p></div>}
    </section>
    <section className="card phaseb-card"><div className="phaseb-card-heading"><h2><Scale size={19}/> Body weight</h2><button className="text-btn" onClick={()=>{setWeightDraft(String(app.data.weights[today]?.kg||latest?.[1].kg||''));setWeightEditing(x=>!x)}}>{app.data.weights[today]?.kg?'Edit today':'Log weight'} <ArrowRight size={16}/></button></div><strong className="phaseb-weight">{latest?Number(latest[1].kg).toFixed(1):'—'} <small>kg</small></strong><p className="muted tiny">{latest?`Last recorded ${formatDate(latest[0])}`:'No weigh-ins recorded yet'}</p>
     {weightEditing&&<div className="phaseb-goal-editor"><label className="field"><span>Weight for {formatDate(today)} (kg)</span><input type="number" inputMode="decimal" min="20" max="400" step="0.1" value={weightDraft} onChange={e=>setWeightDraft(e.target.value)}/></label><div className="row-actions"><button className="button-primary" disabled={!Number.isFinite(Number(weightDraft))||Number(weightDraft)<20||Number(weightDraft)>400} onClick={()=>{app.saveWeight(today,Number(weightDraft),app.data.weights[today]?.note||'');setWeightEditing(false)}}>Save weigh-in</button><button className="button-secondary" onClick={()=>setWeightEditing(false)}>Cancel</button></div><p className="muted tiny">Editing today’s entry updates that date instead of adding a duplicate.</p></div>}</section>
   </aside>
  </div>
 </div>;
}
