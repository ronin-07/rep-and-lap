/** Deterministic training insights. No Firebase or UI dependencies. */
import {DAYS, type GymDay, type SwimDay, type TrackerData} from './types';
import {SWIM_DAYS} from './plan';
import {weekOf, dateFor, keyOf} from './dates';
import {completedDate} from './scheduling';
import {num, loggedSet, sessionMinutes} from './metrics';
import {exercisesFor} from './routines';

export type TrainingWeek = {week:string; minutes:number; sessions:number; averageMinutes:number|null};
export function weeklyTrainingTime(data:TrackerData, week:string):TrainingWeek {
 const end=dateFor(week);end.setDate(end.getDate()+7);const until=keyOf(end);
 let minutes=0,sessions=0;
 for(const [sourceWeek,entry] of Object.entries(data.weeks))for(const day of DAYS){
  if(!entry.done?.[day])continue;
  const completed=completedDate(data,sourceWeek,day);
  if(completed<week||completed>=until)continue;
  const duration=sessionMinutes(entry.timing?.[day]);
  if(duration!==null){minutes+=duration;sessions++;}
 }
 return {week,minutes,sessions,averageMinutes:sessions?minutes/sessions:null};
}
export function trainingTimeWeeks(data:TrackerData, count=8, anchor=weekOf(new Date())):TrainingWeek[]{
 const start=dateFor(anchor);return Array.from({length:count},(_,i)=>{
  const d=dateFor(keyOf(start));d.setDate(d.getDate()-(count-i-1)*7);
  return weeklyTrainingTime(data,keyOf(d));
 });
}

export interface ProgressionAdvice {
 exercise:string;lastKg:number;lastReps:number;targetKg:number;targetReps:number;
 kind:'reps'|'weight'|'maintain';explanation:string;sourceWeek:string;
}
/** Conservative double progression. No recommendation without a previous complete session. */
export function progressionAdvice(data:TrackerData,currentWeek:string,day:GymDay,name:string):ProgressionAdvice|null {
 const records=Object.entries(data.weeks).filter(([week])=>week<currentWeek)
  .sort(([a],[b])=>b.localeCompare(a));
 let previous:{week:string;sets:{kg:number;reps:number;rir?:number}[]}|null=null;
 for(const [week,record] of records){
  const sets=(record.gym?.[day]?.[name]?.sets||[]).filter(loggedSet)
   .map(s=>({kg:num(s.kg),reps:num(s.reps),rir:s.rir}))
   .filter(s=>s.kg>0&&Number.isInteger(s.reps)&&s.reps>0);
  if(sets.length){previous={week,sets};break;}
 }
 if(!previous)return null;
 const list=exercisesFor(data,currentWeek,day);
 const exercise=list.find(e=>e.name===name);
 const numbers=exercise?.reps?.match(/(\d+)\s*[–-]\s*(\d+)/);
 const lower=numbers?Number(numbers[1]):8,upper=numbers?Number(numbers[2]):12;
 const best=[...previous.sets].sort((a,b)=>b.kg-a.kg||b.reps-a.reps)[0];
 const allAtUpper=previous.sets.length>=Math.min(2,exercise?.sets||2)&&previous.sets.every(s=>s.reps>=upper&&s.kg===best.kg);
 const effortSafe=previous.sets.every(s=>s.rir===undefined||s.rir>=2);
 if(allAtUpper&&effortSafe){const increment=best.kg>=40?2.5:1;
  return {exercise:name,lastKg:best.kg,lastReps:best.reps,targetKg:best.kg+increment,targetReps:lower,kind:'weight',sourceWeek:previous.week,
   explanation:`All logged working sets reached ${upper} reps. If technique and recovery are good, try +${increment} kg and work back up from ${lower} reps.`};}
 if(best.reps<upper){return {exercise:name,lastKg:best.kg,lastReps:best.reps,targetKg:best.kg,targetReps:Math.min(upper,best.reps+1),kind:'reps',sourceWeek:previous.week,
  explanation:'Aim for one more quality rep before increasing weight. Skip the increase if form or recovery suffers.'};}
 return {exercise:name,lastKg:best.kg,lastReps:best.reps,targetKg:best.kg,targetReps:best.reps,kind:'maintain',sourceWeek:previous.week,
  explanation:'Keep the same load and bring remaining working sets up to the top of the rep range before increasing weight.'};
}

export interface SwimPerformance {date:string;day:SwimDay;meters:number;continuousMeters:number;durationMinutes:number|null;pacePer100:number|null};
export function swimmingPerformance(data:TrackerData):SwimPerformance[]{
 const out:SwimPerformance[]=[];
 for(const [week,entry] of Object.entries(data.weeks))for(const day of SWIM_DAYS){
  const swim=entry.swim?.[day];if(!swim)continue;
  const meters=num(swim.distance),continuousMeters=num(swim.longest);
  const duration=num(swim.duration);
  const durationMinutes=duration>0?duration:(entry.done?.[day]?sessionMinutes(entry.timing?.[day]):null);
  const pacePer100=meters>0&&durationMinutes!==null&&durationMinutes>0?(durationMinutes*60*100)/meters:null;
  if(meters>0||continuousMeters>0||durationMinutes!==null)out.push({date:completedDate(data,week,day),day,meters,continuousMeters,durationMinutes,pacePer100});
 }
 return out.sort((a,b)=>a.date.localeCompare(b.date));
}
export function swimmingInsights(data:TrackerData){
 const sessions=swimmingPerformance(data),timed=sessions.filter(x=>x.pacePer100!==null);
 const totalMeters=sessions.reduce((sum,x)=>sum+x.meters,0);
 const bestContinuous=sessions.reduce((n,x)=>Math.max(n,x.continuousMeters),0);
 const recent=timed.at(-1)||null;
 return {sessions,totalMeters,bestContinuous,latestPace:recent?.pacePer100??null,longestDistance:sessions.reduce((n,x)=>Math.max(n,x.meters),0)};
}
export function paceLabel(seconds:number|null):string{
 if(seconds===null||!Number.isFinite(seconds))return '—';
 const rounded=Math.round(seconds);
 return `${Math.floor(rounded/60)}:${String(rounded%60).padStart(2,'0')} /100 m`;
}
