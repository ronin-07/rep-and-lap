'use client';
import {ArrowRight,CheckCircle2,Droplets,Dumbbell,Flame,Medal,Scale,Target,Trophy,CalendarDays,CalendarClock,MoveRight,TrendingUp,Clock3,Moon,SkipForward,AlertCircle} from 'lucide-react';
import type {Trainer} from '@/hooks/useTrainer';
import {DAYS,type Day} from '@/lib/types';
import {PLAN,isGym} from '@/lib/plan';
import {activeDay,keyOf,weekOf,formatDate,shiftWeek} from '@/lib/dates';
import {statusFor,weeklyAdherence} from '@/lib/scheduling';
import {summary,waterGoal,waterTotal,weightEntries,milestones,activeStreak,plannedDate,sessionForDate,strengthInsights,formatDuration,calendarCompleted} from '@/lib/metrics';
import {Rings} from '@/components/Rings';
import {weeklyTrainingTime} from '@/lib/training-intelligence';

export default function Dashboard({app}:{app:Trainer}){
 const now=new Date(),today=keyOf(now),currentWeek=weekOf(now);
 const displayedWeek=currentWeek,weekData=app.data.weeks[displayedWeek];
 const shifted=sessionForDate(app.data,today);
 const todayDay=activeDay(now);
 const defaultDay=DAYS.find(day=>plannedDate(app.data,currentWeek,day)===today&&statusFor(app.data,currentWeek,day)==='scheduled');
 const chosen=shifted??(defaultDay?{week:currentWeek,day:defaultDay}:null);
 const todayPlan=chosen?PLAN[chosen.day]:null,done=chosen?!!app.data.weeks[chosen.week]?.done?.[chosen.day]:false;
 const actual=calendarCompleted(app.data,currentWeek),water=waterTotal(app.data,today),target=waterGoal(today);
 const weights=weightEntries(app.data),latest=weights.at(-1),changes=weights.length>1?Number(latest?.[1]?.kg)-Number(weights.at(-2)?.[1]?.kg):null;
 const streak=activeStreak(app.data),events=milestones(app.data),insights=strengthInsights(app.data);
 const nextWeek=shiftWeek(currentWeek,1);
 const carryOver=Object.entries(app.data.weeks).flatMap(([fromWeek,record])=>
  fromWeek===currentWeek?[]:DAYS.flatMap(day=>{
   const date=record.schedule?.[day];
   return !record.done?.[day]&&!record.scheduleStatus?.[day]&&date&&date>=currentWeek&&date<nextWeek?[{week:fromWeek,day,date}]:[];
  })
 ).sort((a,b)=>a.date.localeCompare(b.date));
 const missed=DAYS.some(day=>statusFor(app.data,displayedWeek,day)==='scheduled'&&plannedDate(app.data,displayedWeek,day)<today);
 const adherence=weeklyAdherence(app.data,displayedWeek);
 const openSession=(week:string,day:Day)=>{app.setWeek(week);if(isGym(day))app.setGymDay(day);else app.setSwimDay(day);app.goto('workout',isGym(day)?'gym':'swim');};
 return <div className="stack-xl">
 <div className="welcome"><div><div className="eyebrow">YOUR SPACE · {formatDate(today)}</div><h1>Strong habits, <em>steady progress.</em></h1><p>Everything you need for today — nothing you don’t.</p></div><div className="welcome-chip"><span className="chip-dot"/> {app.online?'Ready to train':'Offline ready'}</div></div>
 <section className="hero-session card"><div className="session-glow"/><div className="hero-copy"><span className="eyebrow">{shifted?'RESCHEDULED FOR TODAY':todayPlan?'TODAY’S SESSION':'YOUR RECOVERY DAY'}</span><h2>{todayPlan?todayPlan.name:'Recovery day'}</h2><p>{todayPlan?todayPlan.subtitle:'Recharge today. Your next training session is on the schedule below.'}</p><div className="hero-mini"><CalendarDays size={16}/>{todayPlan?(isGym(chosen!.day)?'Gym · ':'Pool · '):'Recovery · '}{chosen?.day||todayDay||'Sunday'}</div><button className="button-primary hero-cta" onClick={()=>{if(chosen)openSession(chosen.week,chosen.day);else app.goto('progress');}}>{todayPlan?(done?'View completed session':'Open today’s workout'):'View your progress'} <ArrowRight size={18}/></button></div><div className="hero-deco"><div className="hero-shape"><Dumbbell size={66} strokeWidth={1.1}/></div></div></section>
 <Rings gym={{label:'Gym',value:`${actual.gym}/3`,progress:actual.gym/3,color:'#ad97ff'}} swim={{label:'Swimming',value:`${actual.swim}/3`,progress:actual.swim/3,color:'#5bdbc9'}} water={{label:'Hydration',value:`${(water/1000).toFixed(2)} / ${(target/1000).toFixed(1)} L`,progress:water/target,color:'#ff9b86'}}/>
 <div className="quick-grid"><article className="card quick-card"><div className="quick-top"><span className="icon-wrap coral"><Droplets size={21}/></span><span className="muted tiny">TODAY</span></div><h3>Hydration</h3><div className="quick-value">{(water/1000).toFixed(2)} <small>L</small></div><div className="progress-track"><span style={{width:`${Math.min(100,water/target*100)}%`,background:'linear-gradient(90deg,#fa9c7e,#ffb79c)'}}/></div><div className="quick-bottom"><span>{Math.max(0,target-water)} mL to goal</span><button className="small-action" onClick={()=>app.addWater(750)}>+750 mL</button></div></article>
 <article className="card quick-card"><div className="quick-top"><span className="icon-wrap aqua"><Scale size={21}/></span><span className="muted tiny">LAST RECORDED</span></div><h3>Body weight</h3><div className="quick-value">{latest?Number(latest[1].kg).toFixed(1):'—'} <small>kg</small></div><div className="quick-secondary">{changes===null?'Add a weigh-in to start':`${changes>0?'+':''}${changes.toFixed(1)} kg since last entry`}</div><div className="quick-bottom"><span>{latest?formatDate(latest[0]):'No entries yet'}</span><button className="small-action" onClick={()=>app.goto('workout','weight')}>Log weight <ArrowRight size={14}/></button></div></article></div>
 <div className="dashboard-insights"><div className="insight-tile card"><span className="icon-wrap violet"><TrendingUp size={19}/></span><div><span className="muted tiny">AVERAGE STRENGTH CHANGE</span><strong>{insights.overallPct===null?'—':`${insights.overallPct>=0?'+':''}${insights.overallPct.toFixed(1)}%`}</strong><small>{insights.matched.length?`${insights.matched.length} comparable lifts`:'Build a two-week baseline'}</small></div></div><div className="insight-tile card"><span className="icon-wrap aqua"><Clock3 size={19}/></span><div><span className="muted tiny">TRAINING TIME THIS WEEK</span><strong>{weeklyTrainingTime(app.data,currentWeek).sessions?formatDuration(weeklyTrainingTime(app.data,currentWeek).minutes):'—'}</strong><small>{weeklyTrainingTime(app.data,currentWeek).sessions?`${weeklyTrainingTime(app.data,currentWeek).sessions} timed session(s) this week`:'Start a session timer to track weekly training'}</small></div></div></div>
 <div className="dashboard-split"><section className="card pane-pad"><div className="section-title"><div><span className="eyebrow">FLEXIBLE WEEKLY PLAN</span><h2>Train at your pace.</h2></div><button className="button-secondary calendar-shortcut" onClick={()=>app.goto('calendar')}><CalendarDays size={16}/> Open calendar</button></div>
 <p className="muted small schedule-intro">An intentional rest day pauses your streak without counting as a workout. Skip records a missed session; Reschedule keeps your logged sets. Open Calendar to manage the month.</p>
 {missed&&<button className="catchup-action" onClick={()=>app.catchUpWeek(displayedWeek)}><CalendarClock size={17}/> Shift remaining sessions forward <ArrowRight size={15}/></button>}
 <div className="schedule-list">{DAYS.map(day=>{
 const plan=PLAN[day],status=statusFor(app.data,displayedWeek,day),checked=status==='completed',date=plannedDate(app.data,displayedWeek,day),late=status==='scheduled'&&date<today,isToday=date===today;
 const label=checked?'Completed':status==='rest'?'Recovery':status==='skipped'?'Skipped':late?'Missed':isToday?'Today':'Planned';
 const StatusIcon=checked?CheckCircle2:status==='rest'?Moon:status==='skipped'?SkipForward:late?AlertCircle:CalendarClock;
 return <div className={`schedule-item status-${status} ${late?'is-late':''} ${isToday?'today':''}`} key={day}>
  <button className="schedule-main" onClick={()=>openSession(displayedWeek,day)} aria-label={`View ${plan.name}: ${label}`}>
   <span className="day-initial">{day.slice(0,3)}</span>
   <span className="schedule-content"><strong>{status==='rest'?'Recovery Day':status==='skipped'?'Workout Skipped':plan.name}</strong><small className="schedule-date">{formatDate(date)}</small><small>{status==='rest'?'Marked for recovery':status==='skipped'?'Intentionally skipped':plan.subtitle}</small>{(status==='rest'||status==='skipped')&&<small className="schedule-original">Originally {plan.name}</small>}</span>
   <span className={`schedule-status-pill ${checked?'is-completed':status==='rest'?'is-rest':status==='skipped'?'is-skipped':late?'is-missed':'is-planned'}`}><StatusIcon size={16} aria-hidden="true"/>{label}</span>
  </button>
  {!checked&&<div className="schedule-actions"><button onClick={()=>app.setScheduleStatus(day,status==='rest'?null:'rest',displayedWeek)}>{status==='rest'?'Undo rest day':'Rest day'}</button><button onClick={()=>app.setScheduleStatus(day,status==='skipped'?null:'skipped',displayedWeek)}>{status==='skipped'?'Undo skip':'Skip'}</button><details className="reschedule-disclosure"><summary><CalendarClock size={14}/> Reschedule</summary><label className="field"><span>New session date</span><input type="date" value={date} onChange={e=>{if(e.target.value)app.rescheduleSession(day,e.target.value,displayedWeek);}}/></label><p className="muted tiny">Existing workout logs and sets stay intact.</p></details></div>}
 </div>})}</div>{carryOver.length>0&&<div className="carryover-area"><strong className="carryover-label">CARRIED OVER TO THIS WEEK</strong>{carryOver.map(x=><button className="carryover-item" key={`${x.week}-${x.day}`} onClick={()=>openSession(x.week,x.day)}><span><strong>{PLAN[x.day].name}</strong><small>{formatDate(x.date)} · from week of {formatDate(x.week)}</small></span><ArrowRight size={17}/></button>)}</div>}</section>
 <div className="stack"><section className="card pane-pad"><div className="section-title"><div><span className="eyebrow">CONSISTENCY</span><h2>Keep your streak alive.</h2></div><span className="icon-wrap violet"><Flame size={21}/></span></div><div className="streak-numbers"><div><strong>{streak.current}</strong><small>Current streak</small></div><div><strong>{streak.best}</strong><small>Best streak</small></div></div><p className="muted small">Scheduled training days count. Sunday is your usual rest day.</p></section>
 <section className="card pane-pad"><div className="section-title"><div><span className="eyebrow">RECENT MILESTONES</span><h2>Worth celebrating.</h2></div><Medal color="#f6ba8a" size={21}/></div><div className="milestone-list">{events.length?events.slice(0,3).map((e,i)=><div className="milestone-row" key={`${e.when}-${i}`}><span className="icon-wrap gold"><Trophy size={17}/></span><div><strong>{e.title}</strong><small>{e.detail}</small></div><span className="muted tiny">{e.when.slice(5)}</span></div>):<div className="empty-milestone"><Target size={25}/><strong>Your next milestone starts here.</strong><span>Log a few sessions to see your achievements.</span></div>}</div></section></div></div>
 </div>;
}
