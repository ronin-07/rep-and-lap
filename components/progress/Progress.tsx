'use client';
import * as React from 'react';
import {Activity,CheckCircle2,Dumbbell,Flame,Medal,Waves as Swim,Trophy} from 'lucide-react';
import type {Trainer} from '@/hooks/useTrainer';
import {GYM_DAYS,SWIM_DAYS} from '@/lib/plan';
import {weekOf,keyOf,daysAgo} from '@/lib/dates';
import {summary,weeklyChart,weightTrend,history,bestSwim,milestones,activeStreak,strengthInsights,exerciseStrength,formatDuration,recentSessions,completionDate} from '@/lib/metrics';
import {LineChart} from '@/components/Charts';
import {weeklyTrainingTime,trainingTimeWeeks,swimmingInsights,paceLabel,progressionAdvice} from '@/lib/training-intelligence';
import {weeklyAdherence} from '@/lib/scheduling';
import {strokeInsights,SWIM_STROKES,SWIM_ACTIVITY_LABELS,SWIM_CHECKLIST,SWIM_TARGET_DEFAULTS,swimTechniqueEvidence,swimTechniqueStage} from '@/lib/swimming';
import type {SwimStroke} from '@/lib/types';
import Insights from './Insights';
import HydrationHistory from './HydrationHistory';
import {exercisesFor} from '@/lib/routines';
export default function Progress({app}:{app:Trainer}){
 const adherence=weeklyAdherence(app.data,weekOf(new Date())),streak=activeStreak(app.data),events=milestones(app.data);
 return <div className="stack-xl"><div className="page-header"><div><span className="eyebrow">LONG-TERM VIEW</span><h1>Progress you can see.</h1><p>Trends, milestones and consistency in one place.</p></div></div>
 <div className="progress-tabs">{(['overview','strength','swimming','weight','hydration','insights'] as const).map(t=><button key={t} className={`${app.progressTab===t?'active':''} ${t==='insights'?'progress-insights-desktop':''}`.trim()} onClick={()=>app.setProgressTab(t)}>{t==='overview'?'Overview':t==='strength'?'Strength':t==='swimming'?'Swimming':t==='weight'?'Body weight':t==='hydration'?'Hydration':'Insights'}</button>)}</div>
 {app.progressTab==='overview'?<div className="stack phaseb-progress-overview">
  <section className="phaseb-overview-banner"><div><span className="eyebrow">YOUR TRAINING, YOUR PACE</span><h2>Every improvement counts.</h2><p>Choose an area to see the history behind your progress.</p></div><button className="button-secondary" onClick={()=>app.goto('insights')}>Explore insights</button></section>
  <div className="phaseb-progress-cards">{([
   {key:'strength',title:'Strength',description:'Volume, exercises, estimated maxes and personal records',icon:<Dumbbell size={27}/>,value:`${Math.round(summary(app.data,weekOf(new Date())).volume).toLocaleString()} kg this week`},
   {key:'swimming',title:'Swimming',description:'Distance, strokes, technique and continuous records',icon:<Swim size={27}/>,value:`${bestSwim(app.data)} m freestyle best`},
   {key:'weight',title:'Body weight',description:'Weigh-ins, moving averages and weight goals',icon:<Activity size={27}/>,value:weightTrend(app.data).at(-1)?.kg?`${weightTrend(app.data).at(-1)!.kg.toFixed(1)} kg`:'No weigh-in yet'},
   {key:'hydration',title:'Hydration',description:'Daily totals, goals and historical consistency',icon:<CheckCircle2 size={27}/>,value:'View water history'},
  ] as const).map(card=><button key={card.key} className={`phaseb-progress-card phaseb-category-${card.key}`} onClick={()=>app.setProgressTab(card.key)}><span className="phaseb-progress-card-icon">{card.icon}</span><strong>{card.title}</strong><span>{card.value}</span><small>{card.description}</small><span className="phaseb-progress-card-arrow">View details →</span></button>)}</div>
  <details className="phaseb-legacy-details"><summary>More training history and recent highlights</summary><div className="stats-grid"><MiniStat label="Plan adherence" value={`${adherence.completed}/${adherence.eligible}`}  icon={<CheckCircle2/>}/><MiniStat label="Training streak" value={`${streak.current} days`} icon={<Flame/>}/><MiniStat label="Freestyle best" value={`${bestSwim(app.data)} m`} icon={<Swim/>}/><MiniStat label="Training time · this week" value={weeklyTrainingTime(app.data,weekOf(new Date())).sessions?formatDuration(weeklyTrainingTime(app.data,weekOf(new Date())).minutes):'—'} icon={<Activity/>}/></div><div className="dashboard-split"><section className="card pane-pad"><div className="section-title"><div><span className="eyebrow">CONSISTENCY</span><h2>Weekly sessions</h2></div></div><LineChart points={weeklyChart(app.data,'completed').map(p=>({date:p.date.slice(5),value:p.value}))} unit="sessions" stroke="#a995ff"/></section><section className="card pane-pad"><span className="eyebrow">RECENT HIGHLIGHTS</span><h2>Recent milestones</h2>{events.length?events.map((m,i)=><div className="milestone-row" key={i}><span className="icon-wrap gold"><Trophy size={18}/></span><div><strong>{m.title}</strong><small>{m.detail}</small></div><span className="tiny muted">{m.when}</span></div>):<p className="muted">Records and training weeks will appear as you log more sessions.</p>}</section></div><section className="card pane-pad"><div className="section-title"><div><span className="eyebrow">SCHEDULE</span><h2>Recovery and training days.</h2></div><button className="button-secondary" onClick={()=>app.goto('calendar')}>Open calendar</button></div><p className="muted small">Review your rest days, missed sessions and rescheduled workouts in a dedicated calendar.</p></section><section className="card pane-pad"><span className="eyebrow">ACTIVITY HISTORY</span><h2>Last 28 days</h2><ActivityHeatmap app={app}/></section><section className="card pane-pad"><span className="eyebrow">WEEKLY TRAINING TIME</span><h2>Time invested, not just workouts completed.</h2><LineChart points={trainingTimeWeeks(app.data).map(x=>({date:x.week.slice(5),value:x.minutes}))} unit="min" stroke="#5bdbc9"/><p className="muted small">Completed workouts with start and end timestamps only; rest between sets is included.</p></section><section className="card pane-pad"><div className="section-title"><div><span className="eyebrow">NEW · TRAINING INSIGHTS</span><h2>Make every logged set count.</h2></div><button className="button-secondary" onClick={()=>app.setProgressTab('insights')}>Explore insights</button></div><p className="muted small">Muscle coverage, your monthly recap, and achievements—all calculated from your saved training history.</p></section><section className="card pane-pad"><div className="section-title"><div><span className="eyebrow">TRAINING JOURNAL</span><h2>Recent workout time.</h2></div></div>{recentSessions(app.data).length?<div className="recent-session-list">{recentSessions(app.data).map(x=><div className="recent-session-row" key={`${x.week}-${x.day}`}><span className="icon-wrap violet"><Activity size={17}/></span><div><strong>{x.name}</strong><small>{x.date}{x.startedAt?` · ${new Date(x.startedAt).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}–${x.endedAt?new Date(x.endedAt).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}):'…'}`:''}</small></div><strong>{formatDuration(x.minutes)}</strong></div>)}</div>:<p className="muted small">Finish a workout to build your session history. New timed workouts will show start, finish and duration.</p>}</section></details></div>:null}
 
 {app.progressTab==='strength'?<StrengthProgress app={app}/>:null}
 {app.progressTab==='insights'?<Insights app={app}/>:null}
 {app.progressTab==='swimming'?<SwimmingProgress app={app}/>:null}
 {app.progressTab==='weight'?<div className="stack"><section className="card pane-pad"><span className="eyebrow">WEIGHT TREND</span><h2>Weigh-ins + moving average</h2><LineChart points={weightTrend(app.data).map(p=>({date:p.date.slice(5),value:p.kg}))} compare={weightTrend(app.data).map(p=>({date:p.date.slice(5),value:p.avg}))} unit="kg" stroke="#5bdbc9"/><p className="muted small">Smoothed using the measurements from the previous seven calendar days.</p></section></div>:null}
 {app.progressTab==='hydration'?<div className="stack"><section className="card pane-pad"><span className="eyebrow">HYDRATION</span><h2>Last two weeks</h2><HydrationHistory data={app.data} days={14}/></section></div>:null}
 </div>;
}
function MiniStat({label,value,icon}:{label:string;value:string;icon:React.ReactNode}){return <div className="card mini-stat"><div className="muted mini-stat-head">{label}<span className="icon-wrap violet">{icon}</span></div><strong>{value}</strong></div>}
function StrengthProgress({app}:{app:Trainer}){
 const all=GYM_DAYS.flatMap(day=>{const names=new Set<string>(exercisesFor(app.data,weekOf(new Date()),day).map(ex=>ex.name));
  for(const week of Object.values(app.data.weeks))for(const name of Object.keys(week.gym?.[day]||{}))names.add(name);
  return [...names].map(name=>({day,name}));});
 const [choice,setChoice]=React.useState(all[0]?.name||'Barbell bench press');
 const matched=all.find(x=>x.name===choice)||all[0],hist=matched?exerciseStrength(app.data,matched.day,matched.name):[],estimated=hist.filter(x=>x.e1rm!==null);
 const first=estimated[0],latest=estimated.at(-1),delta=first?.e1rm&&latest?.e1rm&&first.week!==latest.week?(latest.e1rm/first.e1rm-1)*100:null;
 const insights=strengthInsights(app.data);
 const advice=matched?progressionAdvice(app.data,weekOf(new Date()),matched.day,matched.name):null;
 const allPr=all.flatMap(x=>{const h=history(app.data,x.day,x.name);return h.length?[{name:x.name,kg:Math.max(...h.map(z=>z.best))}]:[];}).sort((a,b)=>b.kg-a.kg).slice(0,6);
 return <div className="stack">
  <div className="stats-grid strength-stats"><MiniStat label="Overall strength trend" value={insights.overallPct===null?'—':`${insights.overallPct>=0?'+':''}${insights.overallPct.toFixed(1)}%`} icon={<Activity/>}/><MiniStat label="Volume this week" value={`${Math.round(summary(app.data,weekOf(new Date())).volume).toLocaleString()} kg`} icon={<Dumbbell/>}/><MiniStat label="Lifetime volume" value={`${(insights.lifetimeVolume/1000).toFixed(1)} t`} icon={<Trophy/>}/><MiniStat label="Logged sets" value={insights.totalSets.toLocaleString()} icon={<Medal/>}/></div>
  <section className="card pane-pad stack"><div className="section-title"><div><span className="eyebrow">MEASURABLE PROGRESS</span><h2>Estimated strength, week by week.</h2></div></div>
   <label className="field"><span>Choose an exercise</span><select value={choice} onChange={e=>setChoice(e.target.value)}>{all.map(x=><option value={x.name} key={x.name}>{x.name}</option>)}</select></label>
   <div className="strength-feature"><div><span className="eyebrow">ESTIMATED 1-REP MAX</span><strong>{latest?.e1rm?`${latest.e1rm.toFixed(1)} kg`:'—'}</strong><small>{latest?`Most recent estimate · week of ${latest.week}`:'Log sets with 1–12 reps to get an estimate'}</small></div><span className={`strength-delta ${delta!==null&&delta>=0?'positive':''}`}>{delta===null?'Need two weeks':`${delta>=0?'+':''}${delta.toFixed(1)}% since first`}</span></div>
   {advice&&<div className="progression-advice"><div className="eyebrow">YOUR NEXT TARGET · OPTIONAL</div><strong>{advice.targetKg} kg × {advice.targetReps} reps</strong><span>{advice.explanation}</span><small>Based on your session from week of {advice.sourceWeek}. Never increase weight at the expense of technique.</small></div>}
   {estimated.length?<LineChart points={estimated.map(x=>({date:x.week.slice(5),value:x.e1rm!}))} unit="kg" title="Estimated 1RM (Epley)" stroke="#a995ff"/>:<div className="empty-milestone"><Activity size={24}/><span>No usable lifting sets yet.</span></div>}
   <p className="muted small">Estimated 1RM = weight × (1 + reps ÷ 30), using your strongest logged set per week. For 1 rep, actual weight is used. This is a training estimate, not a tested max; sets over 12 reps and 0 kg are excluded.</p>
  </section>
  <section className="card pane-pad stack"><div className="section-title"><div><span className="eyebrow">THE BIG PICTURE</span><h2>Are you getting stronger?</h2></div></div>
   <p className="muted small">{insights.matched.length?`Across ${insights.matched.length} exercises with at least two weeks of comparable sets, your average estimated strength change is ${Number(insights.overallPct)>=0?'+':''}${Number(insights.overallPct).toFixed(1)}%.`: 'Log the same exercises in at least two different weeks to unlock your overall improvement score.'}</p>
   {insights.matched.length?<div className="strength-leaders">{[...insights.matched].sort((a,b)=>b.changePct-a.changePct).slice(0,5).map(x=><div className="leader-row" key={x.name}><div><strong>{x.name}</strong><small>{x.first.toFixed(1)} → {x.last.toFixed(1)} kg estimated 1RM</small></div><span className={x.changePct>=0?'positive':''}>{x.changePct>=0?'+':''}{x.changePct.toFixed(1)}%</span></div>)}</div>:null}
   <p className="muted tiny">Overall change is the geometric mean of first-to-latest estimated 1RM changes for comparable exercises. It is not a measure of whole-body strength or a promise of future results.</p>
  </section>
  <section className="card pane-pad stack"><div className="section-title"><div><span className="eyebrow">TRAINING VOLUME</span><h2>The work adds up.</h2></div></div><LineChart points={weeklyChart(app.data,'volume').map(x=>({date:x.date.slice(5),value:x.value}))} unit="kg" title="Weekly lifted volume (weight × reps)" stroke="#65daca"/><div className="fun-stats"><div><strong>{insights.completedSessions}</strong><small>Completed sessions</small></div><div><strong>{insights.timedSessions?formatDuration(insights.totalMinutes):'—'}</strong><small>Workout time tracked</small></div><div><strong>{allPr.length}</strong><small>Exercises with records</small></div></div></section>
  <section className="card pane-pad"><div className="section-title"><div><span className="eyebrow">PERSONAL RECORDS</span><h2>Your strongest logged lifts.</h2></div></div>{allPr.map(x=><div className="milestone-row" key={x.name}><span className="icon-wrap gold"><Trophy size={17}/></span><div><strong>{x.name}</strong><small>Heaviest logged set</small></div><strong>{x.kg} kg</strong></div>)}{!allPr.length&&<p className="muted">Log your first workout to set a baseline.</p>}</section>
 </div>;
}
function ActivityHeatmap({app}:{app:Trainer}){
 const active=new Set<string>();for(const [week,log] of Object.entries(app.data.weeks))for(const day of ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'])if(log.done?.[day as keyof typeof log.done]){const d=new Date(`${completionDate(app.data,week,day as keyof typeof log.done)}T12:00:00`);active.add(keyOf(d));}
 return <div className="heatmap" role="img" aria-label="Workout completion for the past 28 days">{Array.from({length:28},(_,i)=>{const k=daysAgo(27-i);return <div className={`heat-day ${active.has(k)?'on':''}`} key={k} title={`${k}${active.has(k)?' completed':''}`}/>})}</div>;
}

function SwimmingProgress({app}:{app:Trainer}){
 const [selected,setSelected]=React.useState<SwimStroke>('freestyle');
 const totals=swimmingInsights(app.data);
 const stroke=strokeInsights(app.data,selected);
 const target=app.data.swimTargets?.[selected]??SWIM_TARGET_DEFAULTS[selected];
 const draftKey=`${selected}:${target}`;
 const [draft,setDraft]=React.useState({key:draftKey,value:String(target)});
 const targetDraft=draft.key===draftKey?draft.value:String(target);
 const setTargetDraft=(value:string)=>setDraft({key:draftKey,value});
 const bestTimes=Object.entries(stroke.bestTimes).sort(([a],[b])=>Number(a)-Number(b));
 const technique=SWIM_CHECKLIST[selected];
 const evidence=swimTechniqueEvidence(app.data,selected);
 const practiced=technique.filter(step=>(evidence.byStep[step]||0)>=1).length;
 const mastered=technique.filter(step=>swimTechniqueStage(evidence.byStep[step]||0,!!app.data.swimTechniqueMastery?.[selected]?.[step])==='mastered').length;
 const completedRatings=Object.entries(app.data.weeks).flatMap(([week,record])=>SWIM_DAYS.flatMap(day=>record.done?.[day]?(record.swim?.[day]?.segments||[]).filter(segment=>segment.activity===selected&&segment.skillLevel).map(segment=>({at:record.completedAt?.[day]||week,skill:segment.skillLevel!})):[])).sort((a,b)=>b.at.localeCompare(a.at));
 const progress=Math.min(100,Math.round(stroke.bestContinuous/Math.max(1,target)*100));
 return <div className="stack">
 <section className="card pane-pad stack"><span className="eyebrow">SWIMMING BY STROKE</span><h2>Every stroke has its own journey.</h2>
  <p className="muted small">Select a stroke to see its distance, longest uninterrupted swim, practice time, technique steps and timed personal records.</p>
  <div className="swim-stroke-tabs" role="group" aria-label="Choose swimming stroke">{SWIM_STROKES.map(key=><button type="button" key={key} className={selected===key?'selected':''} aria-pressed={selected===key} onClick={()=>setSelected(key)}>{SWIM_ACTIVITY_LABELS[key]}</button>)}</div>
 </section>
 <div className="stats-grid"><MiniStat label={`${SWIM_ACTIVITY_LABELS[selected]} continuous`} value={stroke.bestContinuous?`${stroke.bestContinuous} m`:'—'} icon={<Swim/>}/><MiniStat label="Distance logged" value={`${stroke.totalMeters.toLocaleString()} m`} icon={<Activity/>}/><MiniStat label="Practice time" value={`${Math.round(stroke.practiceMinutes)} min`} icon={<CheckCircle2/>}/><MiniStat label="Best timed pace" value={paceLabel(stroke.bestPace)} icon={<Swim/>}/></div>
 <section className="card pane-pad stack"><div className="section-title"><div><span className="eyebrow">PERSONAL SWIM GOAL</span><h2>{SWIM_ACTIVITY_LABELS[selected]} — {target} m continuous</h2></div></div>
 <div className="progress-track tall"><span style={{width:`${progress}%`,background:'linear-gradient(90deg,#53d4c1,#a995ff)'}}/></div>
 <div className="swim-goal-summary"><span>{stroke.bestContinuous} / {target} m</span><strong>{stroke.goalReached?'Goal achieved!':`${progress}% completed`}</strong></div>
 <div className="swim-field-row"><label className="field swim-goal-input"><span>Change your continuous-distance target (m)</span><input type="number" inputMode="numeric" min="25" max="10000" step="25" value={targetDraft} onChange={e=>setTargetDraft(e.target.value)}/></label><button className="button-secondary" disabled={Number(targetDraft)===target} onClick={()=>{const value=Number(targetDraft);if(Number.isInteger(value)&&value>=25&&value<=10000)app.editSwimPreference({swimTargets:{...app.data.swimTargets,[selected]:value}});else app.notify('Select a goal between 25 and 10,000 metres.');}}>Save goal</button></div>
 <p className="muted small">Total distance from interval sets counts toward volume, but does not automatically count as a continuous-swimming record.</p></section>
 <section className="card pane-pad stack"><span className="eyebrow">STROKE TECHNIQUE</span><h2>Practice the fundamentals.</h2>
 <div className="swim-goal-summary"><span>{practiced} of {technique.length} techniques practiced in completed sessions</span><strong>{mastered} mastered</strong></div>
 <div className="swim-learning-level">Completed stroke sessions: <strong>{evidence.sessions}</strong> · Self-rated level: <strong>{completedRatings[0]?.skill||'Not recorded'}</strong></div>
 <div className="swim-technique-evidence-list">{technique.map(step=>{
  const count=evidence.byStep[step]||0,stage=swimTechniqueStage(count,!!app.data.swimTechniqueMastery?.[selected]?.[step]);
  return <div className="swim-technique-evidence-row" key={step}>
   <div className="swim-technique-evidence-text"><strong>{step}</strong><small>{stage==='not-practiced'?'Not practiced':stage==='practicing'?`Practicing · ${count}/3 sessions`:stage==='improving'?`Improving · ${count} completed sessions`:`Mastered · ${count} completed sessions`}</small></div>
   {count>=3?<button type="button" className={stage==='mastered'?'button-secondary':'button-primary'} onClick={()=>{if(stage==='mastered')app.setSwimTechniqueMastered(selected,step,false);else if(confirm(`Confirm you can consistently perform "${step}"? You have practiced it in ${count} completed sessions.`))app.setSwimTechniqueMastered(selected,step,true);}}>{stage==='mastered'?'Undo mastery':'Mark mastered'}</button>:<span className="muted tiny">{count?`${3-count} more sessions`:'Not started'}</span>}
  </div>;
 })}</div>
 <p className="muted tiny">Only completed sessions count; checking a step twice in one workout counts once. Mastery needs three completed sessions and your explicit confirmation. Self-ratings are separate from demonstrated proficiency.</p></section>
 <section className="card pane-pad stack"><span className="eyebrow">CONTINUOUS DISTANCE PROGRESSION</span><h2>Going the distance.</h2>
 {stroke.sessions.length?<LineChart points={stroke.sessions.map(x=>({date:x.date.slice(5),value:x.continuous}))} unit="m" stroke="#50d7bf"/>:<p className="muted small">Log your first {SWIM_ACTIVITY_LABELS[selected].toLowerCase()} swim to see a progression chart.</p>}
 <p className="muted tiny">The chart uses manually logged uninterrupted distance, not summed interval repetitions.</p></section>
 <section className="card pane-pad stack"><span className="eyebrow">TIMED PERSONAL RECORDS</span><h2>Fastest effort by distance.</h2>
 {bestTimes.length?bestTimes.map(([distance,seconds])=><div className="recent-session-row" key={distance}><div><strong>{distance} m {SWIM_ACTIVITY_LABELS[selected]}</strong><small>Best timed attempt</small></div><strong>{Number(seconds).toFixed(1)}s</strong></div>):<p className="muted small">Advanced swim logs with a timed effort will appear here. Timed intervals that report only an average pace are not treated as personal-best attempts.</p>}
 </section>
 <section className="card pane-pad stack"><span className="eyebrow">SESSION HISTORY</span><h2>Recent {SWIM_ACTIVITY_LABELS[selected].toLowerCase()} sessions.</h2>
 {stroke.sessions.length?stroke.sessions.slice(-8).reverse().map((entry,i)=><div key={`${entry.week}:${entry.day}:${i}`} className="recent-session-row"><div><strong>{entry.date} · {entry.day}</strong><small>{entry.meters} m total · {entry.continuous} m continuous · {entry.minutes} min practice</small></div><strong>{entry.pacePer100!==null?paceLabel(entry.pacePer100):'—'}</strong></div>):<p className="muted small">No recorded sessions for this stroke yet.</p>}
 </section>
 <section className="card pane-pad stack"><span className="eyebrow">ALL SWIMMING</span><h2>Combined volume</h2><div className="stats-grid"><MiniStat label="All strokes + drills" value={`${totals.totalMeters.toLocaleString()} m`} icon={<Activity/>}/><MiniStat label="Sessions with data" value={String(totals.sessions.length)} icon={<CheckCircle2/>}/></div>
 <p className="muted tiny">Combined volume includes recorded drill lengths. The stroke selector above keeps swimming speed and continuous-distance records separate for each stroke.</p></section>
 </div>;
}
