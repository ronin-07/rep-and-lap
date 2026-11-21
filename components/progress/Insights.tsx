'use client';
import * as React from 'react';
import {ArrowLeft,ArrowRight,CalendarDays,CheckCircle2,Clock3,Droplets,Dumbbell,Flame,LockKeyhole,Sparkles,Trophy,Waves} from 'lucide-react';
import type {Trainer} from '@/hooks/useTrainer';
import {LineChart} from '@/components/Charts';
import {trainingTimeWeeks} from '@/lib/training-intelligence';
import {keyOf,shiftWeek,weekOf} from '@/lib/dates';
import {formatDuration} from '@/lib/metrics';
import {monthLabel,monthlyRecap,muscleCoverage,nextMonth,previousMonth} from '@/lib/insights';
import type {Achievement} from '@/lib/insights';

const ICONS={trophy:Trophy,water:Droplets,swim:Waves,dumbbell:Dumbbell,calendar:CalendarDays,sparkles:Sparkles};
export function AchievementTile({achievement}:{achievement:Achievement}){
 const Icon=ICONS[achievement.icon];
 const ratio=Math.min(100,Math.round(100*achievement.value/achievement.target));
 const displayed=achievement.unit==='m'?achievement.value.toLocaleString():String(achievement.value);
 return <article className={`achievement-tile ${achievement.unlocked?'is-unlocked':'is-locked'}`}>
  <div className="achievement-top"><span className="achievement-icon"><Icon size={21} aria-hidden="true"/></span>
   <span className="achievement-state">{achievement.unlocked?<><CheckCircle2 size={14} aria-hidden="true"/> Unlocked</>:<><LockKeyhole size={14} aria-hidden="true"/> In progress</>}</span></div>
  <strong>{achievement.name}</strong><p>{achievement.description}</p>
  <div className="achievement-track" role="progressbar" aria-label={`${achievement.name} progress`} aria-valuemin={0} aria-valuemax={achievement.target} aria-valuenow={Math.min(achievement.value,achievement.target)}><span style={{width:`${ratio}%`}}/></div>
  <small>{displayed} / {achievement.target.toLocaleString()} {achievement.unit}</small>
 </article>;
}
export default function Insights({app}:{app:Trainer}){
 const currentMonth=keyOf(new Date()).slice(0,7);
 const [month,setMonth]=React.useState(currentMonth);
 const [offset,setOffset]=React.useState(0);
 const week=shiftWeek(weekOf(new Date()),offset);
 const coverage=muscleCoverage(app.data,week);
 const maxSets=Math.max(1,...coverage.groups.map(g=>g.weightedSets));
 const recap=monthlyRecap(app.data,month);
 const previous=monthlyRecap(app.data,previousMonth(month));
 const hasMonthlyData=recap.completedSessions>0||recap.workingSets>0||recap.swimMeters>0||recap.hydrationLoggedDays>0;
 const compare=previous.completedSessions>0
  ?`${recap.completedSessions>previous.completedSessions?'+':''}${recap.completedSessions-previous.completedSessions} sessions compared with ${monthLabel(previous.month)}`
  : 'Your month takes shape as you log workouts and swims.';
 const trainingWeeks=trainingTimeWeeks(app.data).slice(-8);
 return <div className="stack insight-page phaseb-insights-page">
  <section className="card pane-pad phaseb-insights-lead" aria-label="Training insights summary">
   <div className="phaseb-card-heading"><div><span className="eyebrow">TRAINING INTELLIGENCE</span><h2>Understand your momentum.</h2></div><span className="muted tiny">Real recorded sessions, not estimates</span></div>
   <div className="phaseb-insights-columns"><div><h3>Weekly training time</h3><LineChart points={trainingWeeks.map(x=>({date:x.week.slice(5),value:x.minutes}))} unit="min" stroke="#5bdbc9"/><p className="muted tiny">Only completed sessions with a valid clock are included.</p></div>
    <div className="phaseb-insights-findings"><h3>{monthLabel(month)} at a glance</h3><div><strong>{recap.completedSessions}</strong><span>Completed sessions</span></div><div><strong>{recap.swimMeters.toLocaleString()} m</strong><span>Swimming distance logged</span></div><div><strong>{recap.hydrationGoalDays}</strong><span>Days meeting their saved water goals</span></div></div></div>
  </section>
  <section className="card pane-pad insight-section" aria-labelledby="muscle-heading">
   <div className="section-title insight-title"><div><span className="eyebrow">MUSCLE COVERAGE</span><h2 id="muscle-heading">Where you put in the work.</h2><p className="muted small">Weekly estimated logged-set distribution, based on the muscles assigned to each logged exercise.</p></div></div>
   <div className="insight-week-picker" role="group" aria-label="Choose training week">
    <button className="button-secondary" onClick={()=>setOffset(n=>Math.max(-52,n-1))} disabled={offset<=-52} aria-label="Previous training week"><ArrowLeft size={16}/></button>
    <strong>{offset===0?'This week':offset===-1?'Last week':`Week of ${week}`}</strong>
    <button className="button-secondary" onClick={()=>setOffset(n=>Math.min(0,n+1))} disabled={offset===0} aria-label="Next training week"><ArrowRight size={16}/></button>
   </div>
   {coverage.countedSets===0?<div className="insight-empty"><Dumbbell size={24}/><strong>No categorized sets for this week yet.</strong><span>Log your gym sets to reveal the muscles you&apos;ve trained. Custom exercises need a muscle label to appear here.</span></div>
   :<><div className="muscle-summary-line"><span><strong>{coverage.countedSets}</strong> categorized sets logged</span><span>Primary sets = 1 · secondary = ½</span></div>
    <div className="muscle-grid" aria-label={`Muscle coverage for week of ${week}`}>
     {coverage.groups.map(group=>{
      const pct=group.weightedSets/maxSets*100;
      return <div className={`muscle-tile ${group.weightedSets?'is-trained':'is-empty'}`} key={group.group} title={`${group.group}: ${group.primarySets} primary sets, ${group.secondarySets} secondary sets`}>
       <div className="muscle-tile-heading"><strong>{group.group}</strong><span>{group.weightedSets.toLocaleString(undefined,{maximumFractionDigits:1})}</span></div>
       <div className="muscle-bar" role="progressbar" aria-label={`${group.group}, weighted sets relative to most trained muscle`} aria-valuemin={0} aria-valuemax={maxSets} aria-valuenow={group.weightedSets}><span style={{width:`${pct}%`}}/></div>
       <small>{group.primarySets} primary · {group.secondarySets} secondary</small>
      </div>;
     })}
    </div></>}
   {coverage.uncategorizedSets>0&&<p className="muted small">{coverage.uncategorizedSets} set(s) from custom exercises aren&apos;t mapped to a muscle group yet.</p>}
   <p className="muted tiny">For illustration of workout distribution only. The weights describe exercise tags, not measured muscle activation, recovery, or a recommended training dose.</p>
  </section>
  <section className="card pane-pad insight-section" aria-labelledby="recap-heading">
   <div className="section-title insight-title"><div><span className="eyebrow">MONTHLY RECAP</span><h2 id="recap-heading">Your month, in motion.</h2><p className="muted small">Completed workouts and the training you logged—not estimates of activity you didn&apos;t record.</p></div></div>
   <div className="month-pager" role="group" aria-label="Choose recap month"><button className="button-secondary" onClick={()=>setMonth(previousMonth)} aria-label="Previous month"><ArrowLeft size={17}/></button><strong aria-live="polite">{monthLabel(month)}</strong><button className="button-secondary" onClick={()=>setMonth(nextMonth)} disabled={month>=currentMonth} aria-label="Next month"><ArrowRight size={17}/></button></div>
   {hasMonthlyData?<div className="recap-feature"><div className="recap-feature-icon"><Sparkles size={24} aria-hidden="true"/></div><div><strong>{recap.completedSessions} sessions completed this month</strong><p>{compare}</p></div></div>
    :<div className="insight-empty"><CalendarDays size={24}/><strong>No training logged in {monthLabel(month)}.</strong><span>Your recap will update automatically when you log sessions, water or sets for this month.</span></div>}
   <div className="recap-grid">
    <div className="recap-metric"><span><CalendarDays size={16}/> Sessions</span><strong>{recap.completedSessions}</strong><small>{recap.gymSessions} gym · {recap.swimSessions} pool</small></div>
    <div className="recap-metric"><span><Clock3 size={16}/> Training time</span><strong>{recap.timedSessions?formatDuration(recap.trainingMinutes):'—'}</strong><small>{recap.timedSessions} timed completed sessions</small></div>
    <div className="recap-metric"><span><Flame size={16}/> Active days</span><strong>{recap.activeDays}</strong><small>Dates with completed sessions</small></div>
    <div className="recap-metric"><span><Dumbbell size={16}/> Lifting volume</span><strong>{Math.round(recap.liftedVolumeKg).toLocaleString()} <em>kg</em></strong><small>{recap.workingSets} logged sets</small></div>
    <div className="recap-metric"><span><Waves size={16}/> Swimming</span><strong>{recap.swimMeters.toLocaleString()} <em>m</em></strong><small>Longest nonstop: {recap.continuousBestMeters||'—'} m</small></div>
    <div className="recap-metric"><span><CalendarDays size={16}/> Weight trend</span><strong>{recap.weightChangeKg===null?'—':`${recap.weightChangeKg>0?'+':''}${recap.weightChangeKg.toFixed(1)}`} {recap.weightChangeKg===null?'':<em>kg</em>}</strong><small>{recap.weightChangeKg===null?'Needs two weigh-ins this month':'First to last weigh-in this month'}</small></div>
    <div className="recap-metric"><span><Droplets size={16}/> Hydration goals</span><strong>{recap.hydrationGoalDays} <em>days</em></strong><small>Out of {recap.hydrationLoggedDays} days with water logs</small></div>
    <div className="recap-metric"><span><Trophy size={16}/> New load records</span><strong>{recap.newWeightRecords}</strong><small>Heavier than a prior logged baseline</small></div>
   </div>
   <p className="muted tiny">Session duration includes rests and is shown only for workouts with a completed timer. Lifting volume excludes deleted and unfinished sets. Load records compare the same exercise over time.</p>
  </section>
  <button type="button" className="button-secondary insight-achievements-link" onClick={()=>app.goto('achievements')}><Trophy size={18}/> Open Achievements <ArrowRight size={18}/></button>
 </div>;
}
