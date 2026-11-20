import {DAYS,type TrackerData,type Day,type GymDay,type GymSet, type WeekLog} from './types';
import {GYM_DAYS,SWIM_DAYS,PLAN} from './plan';
import {weekOf,daysAgo,keyOf,dateFor} from './dates';
import {exercisesFor} from './routines';
import {scheduledDate,completedDate,entriesForDate,trainingStreak} from './scheduling';
export const num=(v:unknown)=>Number.isFinite(Number(v))?Number(v):0;
export const hasVal=(v:unknown)=>v!==undefined&&v!==null&&v!==''&&Number.isFinite(Number(v));
export const validSet=(s?:GymSet)=>!!s&&hasVal(s.kg)&&hasVal(s.reps)&&num(s.kg)>=0&&num(s.reps)>0;
export const loggedSet=(s?:GymSet)=>validSet(s)&&s?.done!==false&&s?.deleted!==true;
export function weekLog(data:TrackerData,w:string):WeekLog{return data.weeks[w]??{done:{},gym:{},swim:{}};}
export function setCount(data:TrackerData,week:string,day:GymDay,name:string):number {
  const base=exercisesFor(data,week,day).find(e=>e.name===name)?.sets||3;
  const entry=weekLog(data,week).gym[day]?.[name];
  return Math.max(1,Math.min(10,Number(entry?.setCount??data.setOverrides[`${day}|${name}`]??base)));
}
export function gymStats(data:TrackerData,w:string,day:GymDay){
 let total=0,logged=0,volume=0;
 for(const ex of exercisesFor(data,w,day)){const count=setCount(data,w,day,ex.name),entry=weekLog(data,w).gym[day]?.[ex.name];total+=count;
  (entry?.sets||[]).slice(0,count).forEach(s=>{if(loggedSet(s)){logged++;volume+=num(s.kg)*num(s.reps);}});
 }
 return {total,logged,volume};
}
export function summary(data:TrackerData,w:string){const item=weekLog(data,w);
 const gym=GYM_DAYS.filter(d=>item.done[d]).length,swim=SWIM_DAYS.filter(d=>item.done[d]).length;
 const volume=GYM_DAYS.reduce((s,d)=>s+gymStats(data,w,d).volume,0);
 const meters=SWIM_DAYS.reduce((s,d)=>s+num(item.swim[d]?.distance),0);
 return {gym,swim,completed:gym+swim,volume,meters};
}
export function waterGoal(date:string){const day=dateFor(date).getDay();return day===0?2000:day<=3?2500:2400;}
export function waterEntries(data:TrackerData,date:string){return Object.entries(data.waterLogs).filter(([,v])=>!v.deleted&&v.date===date&&v.ml>0).sort((a,b)=>b[1].at.localeCompare(a[1].at));}
export function waterTotal(data:TrackerData,date:string){return waterEntries(data,date).reduce((n,[,v])=>n+v.ml,0);}
export function weightEntries(data:TrackerData){return Object.entries(data.weights).filter(([,v])=>!v.deleted&&num(v.kg)>0).sort(([a],[b])=>a.localeCompare(b));}
export function weightTrend(data:TrackerData){
 const entries=weightEntries(data);
 return entries.map(([date,w],i)=>{
   const cutoff=dateFor(date);cutoff.setDate(cutoff.getDate()-6);
   const window=entries.slice(0,i+1).filter(([d])=>dateFor(d)>=cutoff);
   return {date,kg:num(w.kg),avg:window.reduce((sum,[,x])=>sum+num(x.kg),0)/window.length};
 });
}
export function history(data:TrackerData,day:GymDay,name:string){return Object.entries(data.weeks).sort(([a],[b])=>a.localeCompare(b)).flatMap(([wk,item])=>{
 const ex=item.gym?.[day]?.[name];const sets=(ex?.sets||[]).filter(loggedSet);
 return sets.length?[{week:wk,sets,best:Math.max(...sets.map(s=>num(s.kg))),volume:sets.reduce((s,x)=>s+num(x.kg)*num(x.reps),0)}]:[];
});}
export function bestSwim(data:TrackerData){return Math.max(25,...Object.values(data.weeks).flatMap(w=>SWIM_DAYS.map(d=>num(w.swim?.[d]?.longest))));}
export function activeStreak(data:TrackerData){return trainingStreak(data);}
export interface Milestone {title:string;detail:string;when:string;icon:'trophy'|'waves'|'check'}
export function milestones(data:TrackerData):Milestone[]{
 const items:Milestone[]=[];
 for(const day of GYM_DAYS){const names=new Set<string>(exercisesFor(data,weekOf(new Date()),day).map(ex=>ex.name));for(const w of Object.values(data.weeks))for(const name of Object.keys(w.gym?.[day]||{}))names.add(name);
  for(const name of names){const h=history(data,day,name);let best=0;for(const entry of h){if(best>0&&entry.best>best)items.push({title:'New lifting record',detail:`${name} · ${entry.best} kg`,when:entry.week,icon:'trophy'});best=Math.max(best,entry.best);}}}
 const swimBest=SWIM_DAYS.flatMap(d=>Object.entries(data.weeks).map(([week,w])=>({week,val:num(w.swim?.[d]?.longest)}))).sort((a,b)=>a.week.localeCompare(b.week));
 let best=25;for(const x of swimBest){if(x.val>best){best=x.val;items.push({title:'Freestyle milestone',detail:`${best} m without stopping`,when:x.week,icon:'waves'});}}
 for(const [week,w] of Object.entries(data.weeks)){if(DAYS.every(day=>w.done?.[day]))items.push({title:'Perfect training week',detail:'All six workouts completed',when:week,icon:'check'});}
 return items.sort((a,b)=>b.when.localeCompare(a.when)).slice(0,5);
}
export function weeklyChart(data:TrackerData,metric:'volume'|'meters'|'completed',count=8){const now=weekOf(new Date());return Array.from({length:count},(_,i)=>{const date=dateFor(now);date.setDate(date.getDate()+(i-count+1)*7);const w=keyOf(date);return {date:w,value:metric==='volume'?summary(data,w).volume:metric==='meters'?summary(data,w).meters:calendarCompleted(data,w).completed};});}
export function hydrationChart(data:TrackerData,n=7){return Array.from({length:n},(_,i)=>{const date=daysAgo(n-i-1);return {date,value:waterTotal(data,date),target:waterGoal(date)};});}

// Session dates belong to the original training-plan week, even if a missed
// session is subsequently moved to another calendar day. This preserves records.
export const plannedDate=scheduledDate;
export function sessionMinutes(timing?:{startedAt?:string;endedAt?:string},now?:number):number|null{
 if(!timing?.startedAt)return null;
 const start=Date.parse(timing.startedAt),end=timing.endedAt?Date.parse(timing.endedAt):now;
 if(!Number.isFinite(start)||end===undefined||!Number.isFinite(end)||end<start)return null;
 return Math.floor((end-start)/60000);
}
export function formatDuration(minutes:number|null):string{
 if(minutes===null)return 'Not tracked';
 if(minutes<60)return `${minutes} min`;
 return `${Math.floor(minutes/60)}h ${String(minutes%60).padStart(2,'0')}m`;
}
// Epley estimated one-rep max. Rep sets outside 1–12 reps are excluded;
// bodyweight-only (0 kg) sets cannot be meaningfully estimated this way.
export function estimatedOneRepMax(kg:number,reps:number):number|null{
 if(!Number.isFinite(kg)||!Number.isInteger(reps)||kg<=0||reps<1||reps>12)return null;
 return reps===1?kg:kg*(1+reps/30);
}
export function exerciseStrength(data:TrackerData,day:GymDay,name:string){
 return history(data,day,name).map(entry=>{
  const estimates=entry.sets.map(s=>estimatedOneRepMax(num(s.kg),num(s.reps))).filter((v):v is number=>v!==null);
  return {...entry,e1rm:estimates.length?Math.max(...estimates):null};
 });
}
export function strengthInsights(data:TrackerData){
 const all=GYM_DAYS.flatMap(day=>{const names=new Set<string>(PLAN[day].kind==='gym'?PLAN[day].exercises.map(ex=>ex.name):[]);
  for(const week of Object.values(data.weeks))for(const name of Object.keys(week.gym?.[day]||{}))names.add(name);
  return [...names].map(name=>({day,name}));});
 const matched=all.map(ex=>{
  const entries=exerciseStrength(data,ex.day,ex.name).filter(x=>x.e1rm!==null);
  const first=entries[0],last=entries.at(-1);
  if(!first||!last||entries.length<2||first.week===last.week||!first.e1rm||!last.e1rm)return null;
  return {name:ex.name,day:ex.day,first:first.e1rm,last:last.e1rm,changePct:(last.e1rm/first.e1rm-1)*100,entries:entries.length};
 }).filter((x):x is NonNullable<typeof x>=>x!==null);
 const overallPct=matched.length?(Math.exp(matched.reduce((sum,x)=>sum+Math.log(x.last/x.first),0)/matched.length)-1)*100:null;
 let lifetimeVolume=0,totalSets=0,totalMinutes=0,timedSessions=0,completedSessions=0;
 for(const [week,log] of Object.entries(data.weeks)){
  for(const day of DAYS){if(log.done?.[day])completedSessions++;
   const minutes=sessionMinutes(log.timing?.[day]);if(minutes!==null){totalMinutes+=minutes;timedSessions++;}
   if(PLAN[day].kind==='gym'){
    const result=gymStats(data,week,day as GymDay);lifetimeVolume+=result.volume;totalSets+=result.logged;
   }
  }
 }
 return {matched,overallPct,lifetimeVolume,totalSets,totalMinutes,timedSessions,completedSessions,
  biggestGain:[...matched].sort((a,b)=>b.changePct-a.changePct)[0]||null};
}
export function sessionForDate(data:TrackerData,date:string):{week:string;day:Day}|null {
 const item=entriesForDate(data,date).find(x=>x.status==='scheduled');return item?{week:item.week,day:item.day}:null;
}
export const completionDate=completedDate;
export function recentSessions(data:TrackerData,limit=6){
 return Object.entries(data.weeks).flatMap(([week,log])=>DAYS.filter(day=>log.done?.[day]).map(day=>({
  week,day,name:PLAN[day].name,date:completionDate(data,week,day),
  startedAt:log.timing?.[day]?.startedAt,endedAt:log.timing?.[day]?.endedAt,
  minutes:sessionMinutes(log.timing?.[day]),
 }))).sort((a,b)=>b.date.localeCompare(a.date)||b.week.localeCompare(a.week)).slice(0,limit);
}

// Unlike the plan-week summary, this answers "how many sessions did I
// actually complete this calendar week?" and respects rescheduled sessions.
export function calendarCompleted(data:TrackerData,week:string){
 const next=dateFor(week);next.setDate(next.getDate()+7);const until=keyOf(next);
 let gym=0,swim=0;
 for(const [w,log] of Object.entries(data.weeks))for(const day of DAYS){
  if(!log.done?.[day])continue;
  const actual=completionDate(data,w,day);
  if(actual>=week&&actual<until){if(GYM_DAYS.includes(day as GymDay))gym++;else swim++;}
 }
 return {gym,swim,completed:gym+swim};
}
