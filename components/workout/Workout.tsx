'use client';
import {useEffect,useRef,useState} from 'react';
import {nextSetGuidance} from '@/lib/next-set-guidance';
import {Check,CheckCircle2,ChevronDown,ChevronLeft,ChevronRight,Clock,Play,Pause,RotateCcw,MoreHorizontal,Square,Pencil,Droplets,Minus,Plus,Timer,Scale as Weight,Waves as Swim,Target,Dumbbell} from 'lucide-react';
import type {Trainer} from '@/hooks/useTrainer';
import type {GymDay,SwimDay,Day} from '@/lib/types';
import {PLAN,GYM_DAYS,SWIM_DAYS} from '@/lib/plan';
import {stableSetId} from '@/lib/set-sync';
import {previousCompletedSet} from '@/lib/workout-flow';
import {labelWeek,shiftWeek,keyOf,dateFor} from '@/lib/dates';
import {setCount,gymStats,weekLog,num,loggedSet,waterGoal,waterEntries,waterTotal,weightEntries,weightTrend} from '@/lib/metrics';
import SessionNotes from './SessionNotes';
import RoutineEditor from './RoutineEditor';
import {exercisesFor} from '@/lib/routines';
import {statusFor} from '@/lib/scheduling';
import {elapsedSessionMs,formatSessionClock,sessionClockState,timerWarningRemainingMs} from '@/lib/session-timing';
import {LineChart,MiniBars} from '@/components/Charts';
import DateInput from '@/components/DateInput';
import SwimLogger from '@/components/swimming/SwimLogger';
import ActiveTimerDock from './ActiveTimerDock';
import RestDock from './RestDock';
import {swimTotals,swimRoutine,effectivePool,segmentDistance,SWIM_ACTIVITY_LABELS} from '@/lib/swimming';

function WeekChooser({app}:{app:Trainer}){return <div className="week-chooser"><button className="icon-btn" aria-label="Previous week" onClick={()=>app.setWeek(shiftWeek(app.week,-1))}><ChevronLeft size={19}/></button><strong>{labelWeek(app.week)}</strong><button className="icon-btn" aria-label="Next week" onClick={()=>app.setWeek(shiftWeek(app.week,1))}><ChevronRight size={19}/></button></div>}
function Segmented<T extends string>({values,value,onChange}:{values:readonly T[];value:T;onChange:(value:T)=>void}){return <div className="segmented">{values.map(x=><button key={x} className={value===x?'selected':''} onClick={()=>onChange(x)}>{x}</button>)}</div>}
function SelectDay({days,value,onChange}:{days:Day[];value:Day;onChange:(value:Day)=>void}){return <div className="day-tabs">{days.map(d=><button key={d} className={value===d?'active':''} onClick={()=>onChange(d)}><small>{d.slice(0,3)}</small><strong>{PLAN[d].name}</strong></button>)}</div>}
/** Keep the day selector in the same position for planned, active, and completed
 * workouts. Rendering it inside the editors made the whole layout jump when a
 * workout was completed. */
function WorkoutDayTabs({app}:{app:Trainer}){
 if(app.trackingTab==='gym')return <SelectDay days={GYM_DAYS} value={app.gymDay} onChange={v=>app.setGymDay(v as GymDay)}/>;
 if(app.trackingTab==='swim'){
  const record=weekLog(app.data,app.week);
  return <div className="day-tabs" role="group" aria-label="Choose swimming day">{SWIM_DAYS.map(day=><button type="button" key={day} className={app.swimDay===day?'active':''} onClick={()=>app.setSwimDay(day)}><small>{day.slice(0,3)}{record.timing?.[day]?.endedAt&&!record.done?.[day]?' · Log pending':''}</small><strong>{swimRoutine(app.data,app.week,day).name}</strong></button>)}</div>;
 }
 return null;
}

export default function Workout({app}:{app:Trainer}){
 const [editingCompleted,setEditingCompleted]=useState<string|null>(null);
 const day=app.trackingTab==='gym'?app.gymDay:app.swimDay;
 const key=`${app.week}:${day}`;
 const completed=!!weekLog(app.data,app.week).done?.[day];
 const editing=completed&&editingCompleted===key;
 return <div className="stack-xl"><div className="page-header"><div><span className="eyebrow">YOUR TRAINING LOG</span><h1>Keep moving.</h1><p>Choose a workout, log a drink or record your body weight.</p></div><WeekChooser app={app}/></div>
 <div className="tracking-tabs">{(['gym','swim','water','weight'] as const).map(tab=><button key={tab} className={app.trackingTab===tab?'active':''} onClick={()=>app.setTrackingTab(tab)}>{tab==='gym'?<Dumbbell size={18}/>:tab==='swim'?<Swim size={18}/>:tab==='water'?<Droplets size={18}/>:<Weight size={18}/>}<span>{tab==='gym'?'Gym':tab==='swim'?'Swimming':tab==='water'?'Water':'Body weight'}</span></button>)}</div>
 {(app.trackingTab==='gym'||app.trackingTab==='swim')&&<WorkoutDayTabs app={app}/>}
 {(app.trackingTab==='gym'||app.trackingTab==='swim')&&completed&&<CompletedSessionSummary key={key} app={app} day={day} editing={editing} onEdit={()=>setEditingCompleted(key)} onDoneEditing={()=>setEditingCompleted(null)}/>}
 <ActiveTimerDock app={app} inline/>
 {(app.trackingTab==='gym'||app.trackingTab==='swim')&&completed&&!editing?<CompletedWorkoutDetails app={app} day={day}/>:app.trackingTab==='gym'?<Gym app={app} editable={editing}/>:app.trackingTab==='swim'?<Swimming app={app} editable={editing}/>:app.trackingTab==='water'?<Water app={app}/>:<BodyWeight app={app}/>}
 {(app.trackingTab==='gym'||app.trackingTab==='swim')&&!completed&&<WorkoutControlBar key={key} app={app}/>}
 </div>;
}
/** Completed workouts are summaries, not interactive stopwatches. Historical
 * data remains available in the log below without reopening the workout. */
function CompletedSessionSummary({app,day,editing,onEdit,onDoneEditing}:{app:Trainer;day:Day;editing:boolean;onEdit:()=>void;onDoneEditing:()=>void}){
 const record=weekLog(app.data,app.week),timing=record.timing?.[day];
 const duration=elapsedSessionMs(timing),isSwim=PLAN[day].kind==='swim';
 const gym=gymStats(app.data,app.week,day as GymDay);
 const swim=swimTotals(record.swim?.[day as SwimDay],app.data.swimPoolDefault);
 const workoutName=isSwim?swimRoutine(app.data,app.week,day as SwimDay).name:PLAN[day].name;
 const [menuOpen,setMenuOpen]=useState(false),[reopenOpen,setReopenOpen]=useState(false);
 return <section className="card pane-pad completed-session-summary" aria-label="Completed workout summary">
  <div className="completed-session-heading"><div><span className="eyebrow"><CheckCircle2 size={15}/> WORKOUT COMPLETED</span><h2>{workoutName}</h2><small className="muted">Trained {record.completedOn?.[day]||'on a saved date'} · {day}</small></div>
   <div className="completed-menu-wrap"><button type="button" className="icon-btn" aria-label="More completed workout options" aria-expanded={menuOpen} onClick={()=>setMenuOpen(v=>!v)}>•••</button>
    {menuOpen&&<div className="completed-menu"><button type="button" onClick={()=>setReopenOpen(true)}>Reopen workout…</button><details><summary>Recorded timestamps</summary><small>Started: {timing?.startedAt?new Date(timing.startedAt).toLocaleString():'Not tracked'}</small><small>Stopped: {timing?.endedAt?new Date(timing.endedAt).toLocaleString():'Not tracked'}</small><small>Completed: {record.completedAt?.[day]?new Date(record.completedAt[day]).toLocaleString():'Not recorded'}</small></details></div>}
   </div></div>
  <div className="completed-session-metrics"><div><small>Duration</small><strong>{duration!==null?formatSessionClock(timing):'Not tracked'}</strong></div><div><small>{isSwim?'Distance':'Sets logged'}</small><strong>{isSwim?`${swim.meters} m`:`${gym.logged} / ${gym.total}`}</strong></div></div>
  <div className="completed-summary-actions">{editing?<button type="button" className="button-primary" onClick={onDoneEditing}><Check size={17}/> Done editing</button>:<button type="button" className="button-secondary" onClick={onEdit}><Pencil size={17}/> Edit completed workout</button>}
   <span className="muted tiny">{editing?'Changes autosave; completion date and duration stay unchanged.':'Workout details remain viewable below.'}</span></div>
  {reopenOpen&&<div className="overlay" role="presentation" onClick={()=>setReopenOpen(false)}><div className="card confirm-delete" role="alertdialog" aria-modal="true" aria-labelledby="reopen-workout-heading" aria-describedby="reopen-workout-detail" onClick={e=>e.stopPropagation()}><h2 id="reopen-workout-heading">Reopen completed workout?</h2><p id="reopen-workout-detail">This removes the completed status and recorded completion date, which can change statistics and technique progress. Existing sets, laps and timer history are preserved. To correct logged details, use Edit completed workout instead.</p><div className="row-actions"><button type="button" className="button-secondary" autoFocus onClick={()=>setReopenOpen(false)}>Keep completed</button><button type="button" className="button-danger" onClick={()=>{setReopenOpen(false);setMenuOpen(false);app.toggleDone(day);}}>Reopen workout</button></div></div></div>}
 </section>;
}
/** One persistent action surface for the selected active gym or swim session.
 * The rest countdown lives in this bar instead of another fixed overlay. */
function WorkoutControlBar({app}:{app:Trainer}){
 const barRef=useRef<HTMLElement|null>(null);
 useEffect(()=>{
  const bar=barRef.current,main=bar?.closest<HTMLElement>('.app-main');
  if(!bar||!main)return;
  const measure=()=>main.style.setProperty('--workout-control-height',`${Math.ceil(bar.getBoundingClientRect().height)}px`);
  measure();
  const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(measure):null;
  observer?.observe(bar);
  return ()=>{observer?.disconnect();main.style.removeProperty('--workout-control-height');};
 },[]);
 const day=app.trackingTab==='gym'?app.gymDay:app.swimDay;
 const record=weekLog(app.data,app.week),timing=record.timing?.[day],state=sessionClockState(timing);
 const now=state==='running'||state==='paused'?Math.max(app.clock,Date.parse(timing!.startedAt!)):undefined;
 const sessionKey=`session:${app.week}:${day}`;
 const pending=!!app.data.pendingSync[sessionKey]||Object.keys(app.data.pendingItems).some(key=>key.startsWith(`${sessionKey}~`));
 const conflict=Object.keys(app.data.itemConflicts).some(key=>key.startsWith(`${sessionKey}~`));
 const isSwim=app.trackingTab==='swim';
 const workoutName=isSwim?swimRoutine(app.data,app.week,day as SwimDay).name:PLAN[day].name;
 const timerLabel=state==='ready'?'Start timer':state==='running'?'Pause':state==='paused'?'Resume':timing?.autoStopped?'Restart timer':'Continue';
 const toggleTimer=state==='ready'?()=>app.startSession(day):state==='running'?()=>app.pauseSession(day):timing?.autoStopped?()=>app.restartSession(day):()=>app.resumeSession(day);
 const warningRemaining=timerWarningRemainingMs(timing,app.clock);
 return <section ref={barRef} className="quick-save-bar workout-control-bar" role="region" aria-label={`${isSwim?'Swimming':'Gym'} workout controls`}>
  <div className="workout-control-main">
   <div className="quick-save-info"><strong>{workoutName} · {day}</strong>
    <span className="workout-bar-clock"><Clock size={15}/><span role="timer" aria-live="off">{timing?.startedAt?formatSessionClock(timing,now):'00:00'}</span><span className={`workout-bar-status ${state}`}>{state==='ready'?'Ready':state==='stopped'?(timing?.autoStopped?'Auto-stopped':'Stopped'):state==='paused'?'Paused':'Running'}</span></span>
    <small>{conflict?'Sync conflict · resolve to continue':pending?'Saved locally · cloud sync pending':app.user?'Autosaved · cloud available':'Autosaved on this device'}</small>
   </div>
   <div className="workout-bar-actions">
    <button type="button" className="button-secondary workout-bar-timer-action" disabled={conflict} onClick={toggleTimer}>{state==='running'?<Pause size={17}/>:<Play size={17}/>}<span>{timerLabel}</span></button>
    {(state==='running'||state==='paused')&&<button type="button" className="button-secondary workout-bar-stop-action" disabled={conflict} onClick={()=>app.stopWorkoutTimer(day)}><Square size={16}/><span>Stop timer</span></button>}
    <button type="button" className="button-primary workout-bar-finish-action" disabled={conflict} onClick={()=>app.saveWorkout(day)}><Check size={17}/><span className="finish-label-full">Finish workout</span><span className="finish-label-short">Finish</span></button>
    {state==='stopped'&&<details className="workout-timer-menu"><summary aria-label="More timer actions" title="More timer actions"><MoreHorizontal size={20}/></summary><div className="workout-timer-popover"><button type="button" disabled={conflict} onClick={event=>{event.currentTarget.closest('details')?.removeAttribute('open');app.restartSession(day);}}><RotateCcw size={16}/> Restart timer</button></div></details>}
   </div>
  </div>
  {warningRemaining!==null&&<p className="workout-timer-warning" role="alert">Timer will stop automatically in {Math.ceil(warningRemaining/60_000)} min. Your workout log stays saved.</p>}
  {timing?.autoStopped&&<p className="workout-timer-warning" role="status">Timer stopped automatically at 2 hours. Review the duration before finishing; logged sets and laps are unchanged.</p>}
  {!isSwim&&<RestDock app={app} embedded/>}
 </section>;
}

/** Historical data is always inspectable without entering edit mode. The
 * read-only details have no write handlers, so view-only expansion is safe. */
function CompletedWorkoutDetails({app,day}:{app:Trainer;day:Day}){
 const record=weekLog(app.data,app.week),isSwim=PLAN[day].kind==='swim';
 const note=record.sessionNotes?.[day];
 if(isSwim){
  const log=record.swim?.[day as SwimDay],pool=effectivePool(log,app.data.swimPoolDefault);
  return <section className="card pane-pad completed-log-details" aria-label="Saved swimming details">
   <div className="section-title"><div><span className="eyebrow">SAVED SWIM</span><h3>Swimming activities</h3></div><span className="muted small">{pool} m pool</span></div>
   {log?.segments?.length?<div className="completed-activity-list">{log.segments.map(segment=><details className="completed-activity" key={segment.id}>
    <summary><span><strong>{SWIM_ACTIVITY_LABELS[segment.activity]||segment.activity}</strong><small>{segmentDistance(segment,pool)} m · {segment.minutes||0} min practice</small></span><ChevronDown size={18}/></summary>
    <div className="completed-activity-body"><p>Lengths outside intervals: {segment.lengths||0} · Difficulty: {segment.difficulty||'Not rated'} · Mode: {segment.mode||'Learning'} · Learning level: {segment.skillLevel||'Not rated'}</p>
     {segment.longestContinuous? <p>Longest recorded nonstop effort: {segment.longestContinuous} m</p>:null}
     {segment.timedMeters&&segment.timedSeconds?<p>Timed: {segment.timedMeters} m in {segment.timedSeconds} s</p>:null}
     {!!segment.intervals?.length&&<div><strong>Intervals</strong><ul>{segment.intervals.map(interval=><li key={interval.id}>{interval.repeats} × {interval.lengths*pool} m · {interval.restSeconds} s rest</li>)}</ul></div>}
     {!!Object.values(segment.technique||{}).filter(Boolean).length&&<div><strong>Techniques practiced</strong><ul>{Object.entries(segment.technique||{}).filter(([,yes])=>yes).map(([step])=><li key={step}>{step}</li>)}</ul></div>}
     {segment.notes?.trim()&&<p>Notes: {segment.notes}</p>}
    </div></details>)}</div>:<p className="muted">No stroke segments recorded. Historical totals are shown above when available.</p>}
   {log&&(log.distance!==undefined||log.longest!==undefined||log.duration!==undefined||log.intervals?.length||Object.keys(log.drills||{}).length||log.sculling!==undefined||log.treading!==undefined||log.breaststroke)&&<details className="completed-activity legacy-swim-readonly"><summary><span><strong>Earlier swim measurements</strong><small>Legacy logging format · retained for history</small></span><ChevronDown size={18}/></summary><div className="completed-activity-body">
    {log.distance!==undefined&&<p>Earlier distance: {log.distance} m</p>}
    {log.longest!==undefined&&<p>Earlier longest continuous swim: {log.longest} m</p>}
    {log.duration!==undefined&&<p>Earlier practice minutes: {log.duration}</p>}
    {log.sculling!==undefined&&<p>Sculling: {log.sculling} s</p>}
    {log.treading!==undefined&&<p>Treading: {log.treading} s</p>}
    {log.breaststroke&&<p>Breaststroke learning level: {log.breaststroke}</p>}
    {!!log.intervals?.length&&<div>Earlier interval sets<ul>{log.intervals.map((x,i)=><li key={i}>{x.repeats} × {x.lengths*x.pool} m · {x.rest} s rest</li>)}</ul></div>}
    {!!Object.keys(log.drills||{}).length&&<div>Earlier drills<ul>{Object.entries(log.drills||{}).filter(([,done])=>done).map(([name])=><li key={name}>Drill {name}</li>)}</ul></div>}
   </div></details>}
   {log?.notes&&<p className="muted small">Swim notes: {log.notes}</p>}
   <CompletedSessionNotes note={note}/>

  </section>;
 }
 const entries=record.gym?.[day as GymDay]||{};
 const names=[...new Set([...exercisesFor(app.data,app.week,day as GymDay).map(ex=>ex.name),...Object.keys(entries)])];
 return <section className="card pane-pad completed-log-details" aria-label="Saved gym details"><div className="section-title"><div><span className="eyebrow">SAVED GYM WORKOUT</span><h3>Logged exercises</h3></div></div>
  <div className="completed-activity-list">{names.map(name=>{const entry=entries[name],sets=entry?.sets||[];return <details className="completed-activity" key={name}>
   <summary><span><strong>{name}</strong><small>{sets.filter(loggedSet).length} logged sets</small></span><ChevronDown size={18}/></summary>
   <div className="completed-activity-body"><div className="completed-set-list">{sets.map((set,index)=><div key={index}><span>Set {index+1}</span><strong>{set.kg??'—'} kg × {set.reps??'—'} reps</strong><span>{loggedSet(set)?'Logged':'Not logged'}{set.rpe!==undefined?` · RPE ${set.rpe}`:set.rir!==undefined?` · ${set.rir} RIR`:''}</span></div>)}</div>
    {entry?.notes?.trim()&&<p>Exercise notes: {entry.notes}</p>}</div>
  </details>})}</div><CompletedSessionNotes note={note}/>
 </section>;
}
function CompletedSessionNotes({note}:{note:import('@/lib/types').SessionNotes|undefined}){
 if(!note||!Object.values(note).some(value=>value!==undefined&&value!==''))return null;
 return <details className="completed-activity"><summary><span><strong>Session notes and feedback</strong><small>Recorded after training</small></span><ChevronDown size={18}/></summary><div className="completed-activity-body">
  {note.general&&<p>Notes: {note.general}</p>}
  {note.technique&&<p>Technique: {note.technique}</p>}
  {note.fatigue&&<p>Fatigue: {note.fatigue}</p>}
  {note.discomfort&&<p>Discomfort: {note.discomfort}</p>}
  {note.soreness&&<p>Recovery: {note.soreness}</p>}
  {note.sessionRpe!==undefined&&<p>Overall effort (RPE): {note.sessionRpe} / 10</p>}
 </div></details>;
}
function Gym({app,editable}:{app:Trainer;editable:boolean}){
 const day=app.gymDay,plan=PLAN[day];if(plan.kind!=='gym')return null;
 const stats=gymStats(app.data,app.week,day),w=weekLog(app.data,app.week),done=!!w.done?.[day],status=statusFor(app.data,app.week,day);
 const activeExercises=exercisesFor(app.data,app.week,day);
 return <div className="stack"><div className="workout-banner card"><div><span className="eyebrow">{day.toUpperCase()} · STRENGTH</span><h2>{plan.name}</h2><p>{plan.subtitle}</p></div><div className="workout-banner-pill">{stats.logged} / {stats.total} sets</div></div>
 <fieldset className="workout-edit-fieldset" disabled={done&&!editable}><RoutineEditor app={app} day={day}/>{(status==='rest'||status==='skipped')&&<div className="schedule-notice card"><strong>{status==='rest'?'Recovery day':'Skipped workout'}</strong><span>This session is {status}. It does not count as completed training.</span><button className="button-secondary" onClick={()=>app.setScheduleStatus(day,null)}>Restore workout</button></div>}
 <div className="workout-columns"><div className="stack">{activeExercises.map(ex=>{
 const count=setCount(app.data,app.week,day,ex.name),entry=w.gym?.[day]?.[ex.name];
 const volume=(entry?.sets||[]).slice(0,count).filter(loggedSet).reduce((s,x)=>s+num(x.kg)*num(x.reps),0);
 const guide=nextSetGuidance(app.data,app.week,day,ex.name,count);
 return <article className="card exercise-card" key={ex.name}><div className="exercise-header"><div><h3>{ex.name}</h3><p>{ex.muscles} · {ex.reps} reps</p></div><div className="counter exercise-count-label"><span>{count} sets</span></div></div>
 <div className="exercise-progression" role="status"><Target size={16}/><span><strong>{guide.nextIndex===null?'All planned sets logged':`Next set ${guide.nextIndex+1} · suggested target`}</strong>{guide.nextIndex!==null&&<><b className="exercise-target-weight">{guide.targetKg!==null?`${guide.targetKg} kg × ${guide.targetReps} reps`:'Choose a starting weight · '+ex.reps+' reps'}</b><small>{guide.source} · Optional guidance; inputs never change automatically</small></>}</span></div>
 <div className="set-list">{Array.from({length:count},(_,i)=>{const s=entry?.sets?.[i]||{},last=previousCompletedSet(app.data,app.week,day,ex.name,i);return <div className={`set-item ${s.done?'set-logged':''}`} key={`${ex.name}-${i}`}><span className="set-index">{i+1}</span><label className="field"><span>kg</span><input id={`set-kg-${stableSetId(ex.name,i)}`} type="number" inputMode="decimal" min="0" step="0.5" aria-label={`${ex.name} set ${i+1} kilograms`} value={s.kg??''} onChange={e=>app.gymField(day,ex.name,i,'kg',e.target.value)} placeholder="kg"/></label><label className="field"><span>reps</span><input type="number" inputMode="numeric" min="0" max="100" step="1" aria-label={`${ex.name} set ${i+1} reps`} value={s.reps??''} onChange={e=>app.gymField(day,ex.name,i,'reps',e.target.value)} placeholder="reps"/></label><div className="set-right"><small>{last?`Prev ${last.kg}×${last.reps}`:'First session'}</small><div className="set-action-row">{s.done&&<DeleteLoggedSetButton app={app} day={day} exercise={ex.name} index={i} kg={String(s.kg??'')} reps={String(s.reps??'')}/>} {last&&!s.done&&<button className="text-btn" onClick={()=>app.usePrevious(day,ex.name,i)}>Copy previous</button>}<button className={`log-set ${s.done?'is-done':''}`} onClick={()=>app.logSet(day,ex.name,i)}>{s.done?<Check size={16}/>:<Plus size={16}/>} {s.done?'Logged':'Log set'}</button></div></div>{app.data.effortMode!=='off'&&<details className="set-optional-effort"><summary>Effort details</summary><label className="field set-effort"><span>{app.data.effortMode==='rir'?'Reps in reserve':'Effort (RPE)'}</span><select aria-label={`${ex.name} set ${i+1} effort`} value={app.data.effortMode==='rir'?(s.rir??''):(s.rpe??'')} onChange={e=>app.setEffort(day,ex.name,i,app.data.effortMode as 'rir'|'rpe',e.target.value)}><option value="">Optional</option>{(app.data.effortMode==='rir'?[0,1,2,3,4]:[6,6.5,7,7.5,8,8.5,9,9.5,10]).map(v=><option key={v} value={v}>{v}{app.data.effortMode==='rir'&&v===4?'+':''}</option>)}</select></label></details>}</div>})}</div>

 <div className="exercise-footer compact-exercise-footer"><div className="exercise-set-management"><button type="button" className="button-secondary exercise-add-set" disabled={count>=10} onClick={()=>app.changeSetCount(day,ex.name,1)}><Plus size={17}/> Add set</button><button type="button" className="text-btn exercise-remove-set" disabled={count<=1} onClick={()=>app.changeSetCount(day,ex.name,-1)}><Minus size={15}/> Remove last</button></div><details className="exercise-extra-details"><summary>More details</summary><label className="field"><span>Exercise notes</span><input value={entry?.notes||''} placeholder="Technique, setup, etc." onChange={e=>app.gymNotes(day,ex.name,e.target.value)}/></label><small className="muted">{Math.round(volume).toLocaleString()} kg volume</small></details></div></article>
 })}
 <details className="card pane-pad secondary-workout-details"><summary>Session notes <span className="muted tiny">Optional energy, soreness and feedback</span></summary><SessionNotes app={app} day={day}/></details></div>
 <div className="stack"><section className="card pane-pad session-progress-card"><div className="section-title"><div><span className="eyebrow">SESSION PROGRESS</span><h2>Your sets, at a glance.</h2></div></div><div className="set-progress-total"><strong>{stats.logged}</strong><div><span>of {stats.total} sets logged</span><small>{stats.total?Math.round(stats.logged/stats.total*100):0}% complete</small></div></div><div className="progress-track tall"><span style={{width:`${stats.total?stats.logged/stats.total*100:0}%`}}/></div><p className="muted small progress-help">Log set marks a finished set. Your weights and reps save automatically.</p><p className="muted tiny">{done?'Completed · see the summary above to edit or reopen.':'Use the workout controls to start or finish your session.'}</p></section>
 <details className="card pane-pad secondary-workout-details"><summary>Rest timer settings</summary><span className="eyebrow">REST SETTINGS</span><div className="muted small rest-help">Logging a set starts a rest timer, displayed at the bottom of the workout screen. It counts elapsed time even when your phone is locked.</div><div className="rest-choices">{[60,90,120,180].map(v=><button key={v} className={app.data.restSeconds===v?'selected':''} onClick={()=>app.updatePreferences({restSeconds:v})}>{v===90?'1.5':v/60} min</button>)}</div><div className="row-actions"><button className="button-secondary" onClick={()=>app.startRest()}><Timer size={16}/> Start</button><button className="button-secondary" onClick={()=>app.extendRest()}>+30s</button><button className="button-secondary" onClick={app.stopRest}>Stop</button></div></details></div></div>
 </fieldset></div>;
}
function DeleteLoggedSetButton({app,day,exercise,index,kg,reps}:{app:Trainer;day:GymDay;exercise:string;index:number;kg:string;reps:string}){
 const [confirmOpen,setConfirmOpen]=useState(false);
 return <><button type="button" className="text-btn delete-set-action" onClick={()=>setConfirmOpen(true)} aria-label={`Delete logged set ${index+1} for ${exercise}`}>Delete</button>
 {confirmOpen&&<div className="overlay" role="presentation" onClick={()=>setConfirmOpen(false)}><div className="card confirm-delete" role="alertdialog" aria-modal="true" aria-labelledby="confirm-set-heading" aria-describedby="confirm-set-detail" onClick={e=>e.stopPropagation()}><h2 id="confirm-set-heading">Delete logged set?</h2><p id="confirm-set-detail">Remove set {index+1} of {exercise} ({kg} kg × {reps} reps)? The recorded set will be deleted from this workout. The empty set slot remains available.</p><div className="row-actions"><button className="button-secondary" autoFocus onClick={()=>setConfirmOpen(false)}>Cancel</button><button className="button-danger" onClick={()=>{app.deleteLoggedSet(day,exercise,index);setConfirmOpen(false);}}>Delete logged set</button></div></div></div>}
 </>;
}
function Swimming({app,editable}:{app:Trainer;editable:boolean}){return <SwimLogger app={app} editable={editable}/>;}
function Water({app}:{app:Trainer}){
 const [date,setDate]=useState(keyOf(new Date())),[custom,setCustom]=useState('330');
 const total=waterTotal(app.data,date),goal=waterGoal(date),items=waterEntries(app.data,date);
 const history=Array.from({length:7},(_,i)=>{const d=dateFor(date);d.setDate(d.getDate()-6+i);return {date:keyOf(d),value:waterTotal(app.data,keyOf(d))};});
 return <div className="stack"><div className="page-header compact"><div><span className="eyebrow">HYDRATION</span><h2>A little, often.</h2><p>Every drink adds up. Goal adjusts to your scheduled activity.</p></div><label className="field"><span>Day</span><DateInput value={date} onChange={e=>setDate(e.target.value)}/></label></div>
 <div className="dashboard-split"><section className="card pane-pad stack"><div className="water-stats"><div><span className="eyebrow">DRINKS TODAY</span><div className="panel-number">{(total/1000).toFixed(2)} <span>/ {(goal/1000).toFixed(1)} L</span></div><p className="muted small">{Math.max(0,goal-total)} mL remaining</p></div><span className="icon-wrap coral"><Droplets size={24}/></span></div><div className="progress-track tall"><span style={{width:`${Math.min(100,total/goal*100)}%`,background:'linear-gradient(90deg,#fa947f,#ffd2b3)'}}/></div><h3>Quick add</h3><div className="quick-water-actions">{[250,500,750].map(m=><button key={m} className={m===750?'button-primary':'button-secondary'} onClick={()=>app.addWater(m,date)}>+{m} mL</button>)}</div><form className="custom-water-form" onSubmit={e=>{e.preventDefault();app.addWater(Number(custom),date);}}><label className="field flex"><span>Custom amount (mL)</span><input type="number" min="25" max="2000" value={custom} onChange={e=>setCustom(e.target.value)}/></label><button className="button-secondary"><Plus size={17}/> Add drink</button></form><h3>Drinks logged</h3>{items.length?<div className="stack-xs">{items.map(([id,x])=><div className="water-entry" key={id}><Droplets color="#ff9b86" size={18}/><strong>{x.ml} mL</strong><small>{new Date(x.at).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}</small><button className="icon-btn" onClick={()=>app.deleteWater(id)} aria-label="Remove drink"><Minus size={16}/></button></div>)}</div>:<p className="muted small">No drinks logged for this day.</p>}</section>
 <section className="card pane-pad"><div className="section-title"><div><span className="eyebrow">LAST 7 DAYS</span><h2>Hydration trend</h2></div></div><MiniBars values={history}/><p className="muted small">Suggested targets: 2.5 L on gym days, 2.4 L on swimming days and 2.0 L on rest days. Adjust intake to thirst and activity.</p></section></div></div>;
}
function BodyWeight({app}:{app:Trainer}){
 const [date,setDate]=useState(keyOf(new Date())),[kg,setKg]=useState(''),[note,setNote]=useState('');
 const entries=weightEntries(app.data),trend=weightTrend(app.data),latest=trend.at(-1);
 return <div className="stack"><div className="page-header compact"><div><span className="eyebrow">BODY WEIGHT</span><h2>See the longer trend.</h2><p>Use repeated weigh-ins and the seven-entry average instead of single-day swings.</p></div></div>
 <div className="dashboard-split"><section className="card pane-pad stack"><span className="eyebrow">ADD A WEIGH-IN</span><form className="stack" onSubmit={e=>{e.preventDefault();app.saveWeight(date,Number(kg),note);setKg('');setNote('');}}><div className="form-grid"><label className="field weigh-date-field"><span>Date</span><DateInput value={date} onChange={e=>setDate(e.target.value)}/></label><label className="field"><span>Weight (kg)</span><input type="number" min="20" max="400" step="0.1" inputMode="decimal" placeholder="81.2" value={kg} onChange={e=>setKg(e.target.value)} required/></label></div><label className="field"><span>Notes (optional)</span><input value={note} onChange={e=>setNote(e.target.value)} placeholder="Morning, after training…"/></label><button className="button-primary">Save weigh-in <Check size={16}/></button></form><div className="divider"/><span className="eyebrow">RECENT WEIGH-INS</span>{entries.slice(-8).reverse().map(([d,x])=><div className="water-entry" key={d}><Weight size={18} color="#5bdbc9"/><strong>{Number(x.kg).toFixed(1)} kg</strong><small>{d}</small><button className="icon-btn" aria-label={`Delete weight ${d}`} onClick={()=>app.deleteWeight(d)}><Minus size={16}/></button></div>)}{!entries.length&&<p className="muted">Your first weigh-in will appear here.</p>}</section>
 <section className="card pane-pad stack"><span className="eyebrow">YOUR TREND</span><div className="panel-number">{latest?latest.kg.toFixed(1):'—'}<span> kg</span></div><p className="muted small">Seven-day moving average: {latest?`${latest.avg.toFixed(1)} kg`:'—'}</p><LineChart points={trend.map(x=>({date:x.date.slice(5),value:x.kg}))} compare={trend.map(x=>({date:x.date.slice(5),value:x.avg}))} unit="kg" title="Body weight and moving average" stroke="#5bdbc9"/><label className="field"><span>Target weight (kg)</span><input type="number" inputMode="decimal" step="0.1" min="20" max="400" value={app.data.targetWeight} onChange={e=>app.updatePreferences({targetWeight:e.target.value})} placeholder="Optional"/></label></section></div></div>;
}
