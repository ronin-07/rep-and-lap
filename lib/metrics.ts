import {DAYS,type TrackerData,type Day,type GymDay,type GymSet, type WeekLog} from './types';
import {GYM_DAYS,SWIM_DAYS,PLAN} from './plan';
import {weekOf,daysAgo,keyOf,dateFor} from './dates';
export const num=(v:unknown)=>Number.isFinite(Number(v))?Number(v):0;
export const hasVal=(v:unknown)=>v!==undefined&&v!==null&&v!==''&&Number.isFinite(Number(v));
export const validSet=(s?:GymSet)=>!!s&&hasVal(s.kg)&&hasVal(s.reps)&&num(s.kg)>=0&&num(s.reps)>0;
export const loggedSet=(s?:GymSet)=>validSet(s)&&s?.done!==false;
export function weekLog(data:TrackerData,w:string):WeekLog{return data.weeks[w]??{done:{},gym:{},swim:{}};}
export function setCount(data:TrackerData,week:string,day:GymDay,name:string):number {
  const plan=PLAN[day];if(plan.kind!=='gym')return 3;
  const base=plan.exercises.find(e=>e.name===name)?.sets||3;
  const entry=weekLog(data,week).gym[day]?.[name];
  return Math.max(1,Math.min(10,Number(entry?.setCount??data.setOverrides[`${day}|${name}`]??base)));
}
export function gymStats(data:TrackerData,w:string,day:GymDay){
 let total=0,logged=0,volume=0;const plan=PLAN[day];if(plan.kind!=='gym')return {total,logged,volume};
 for(const ex of plan.exercises){const count=setCount(data,w,day,ex.name),entry=weekLog(data,w).gym[day]?.[ex.name];total+=count;
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
export function activeStreak(data:TrackerData){
 const dates:string[]=[];for(const [w,entry] of Object.entries(data.weeks))for(const [idx,day] of DAYS.entries())if(entry.done?.[day]){const d=dateFor(w);d.setDate(d.getDate()+idx);dates.push(keyOf(d));}
 const unique=new Set(dates);let best=0,streak=0;
 // Only scheduled training days count. Sunday neither increases nor breaks streak.
 for(let i=200;i>=0;i--){const date=daysAgo(i),day=dateFor(date).getDay();if(day===0)continue;if(unique.has(date)){streak++;best=Math.max(best,streak);}else streak=0;}
 let current=0;for(let i=0;i<200;i++){const date=daysAgo(i),d=dateFor(date).getDay();if(d===0)continue;if(unique.has(date))current++;else if(i===0)continue;else break;}
 return {current,best};
}
export interface Milestone {title:string;detail:string;when:string;icon:'trophy'|'waves'|'check'}
export function milestones(data:TrackerData):Milestone[]{
 const items:Milestone[]=[];
 for(const day of GYM_DAYS){const p=PLAN[day];if(p.kind!=='gym')continue;for(const ex of p.exercises){const h=history(data,day,ex.name);let best=0;for(const entry of h){if(best>0&&entry.best>best)items.push({title:'New lifting record',detail:`${ex.name} · ${entry.best} kg`,when:entry.week,icon:'trophy'});best=Math.max(best,entry.best);}}}
 const swimBest=SWIM_DAYS.flatMap(d=>Object.entries(data.weeks).map(([week,w])=>({week,val:num(w.swim?.[d]?.longest)}))).sort((a,b)=>a.week.localeCompare(b.week));
 let best=25;for(const x of swimBest){if(x.val>best){best=x.val;items.push({title:'Freestyle milestone',detail:`${best} m without stopping`,when:x.week,icon:'waves'});}}
 for(const [week,w] of Object.entries(data.weeks)){if(DAYS.every(day=>w.done?.[day]))items.push({title:'Perfect training week',detail:'All six workouts completed',when:week,icon:'check'});}
 return items.sort((a,b)=>b.when.localeCompare(a.when)).slice(0,5);
}
export function weeklyChart(data:TrackerData,metric:'volume'|'meters'|'completed',count=8){const now=weekOf(new Date());return Array.from({length:count},(_,i)=>{const date=dateFor(now);date.setDate(date.getDate()+(i-count+1)*7);const w=keyOf(date);return {date:w,value:metric==='volume'?summary(data,w).volume:metric==='meters'?summary(data,w).meters:summary(data,w).completed};});}
export function hydrationChart(data:TrackerData,n=7){return Array.from({length:n},(_,i)=>{const date=daysAgo(n-i-1);return {date,value:waterTotal(data,date),target:waterGoal(date)};});}
