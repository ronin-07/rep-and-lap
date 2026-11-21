import {exercisesFor} from './routines';
import {gymStats,setCount,loggedSet} from './metrics';
import type {Day,GymDay,GymSet,TrackerData} from './types';
import {scheduledDate} from './scheduling';
import {keyOf} from './dates';

export interface NextSetTarget {week:string;day:GymDay;exercise:string;index:number}
export interface RestState {startedAt:number;endsAt:number;durationSeconds:number;target:NextSetTarget|null;from?:NextSetTarget|null}
export const REST_KEY='replap-rest-v1';

export function nextIncompleteSet(data:TrackerData,week:string,day:GymDay,afterExercise:string,afterIndex:number):NextSetTarget|null {
 const positions=exercisesFor(data,week,day).flatMap(ex=>Array.from({length:setCount(data,week,day,ex.name)},(_,index)=>({week,day,exercise:ex.name,index})));
 const current=positions.findIndex(x=>x.exercise===afterExercise&&x.index===afterIndex);
 const following=current<0?positions:[...positions.slice(current+1),...positions.slice(0,current+1)];
 return following.find(x=>!loggedSet(data.weeks[week]?.gym?.[day]?.[x.exercise]?.sets[x.index]))||null;
}
export function previousCompletedSet(data:TrackerData,week:string,day:GymDay,exercise:string,index:number):GymSet|null {
 const candidates=Object.entries(data.weeks).filter(([w])=>w<week).sort(([a],[b])=>b.localeCompare(a));
 for(const [,item] of candidates){
  const values=item.gym?.[day]?.[exercise]?.sets||[];
  const matching=values[index];if(loggedSet(matching))return matching;
  const fallback=[...values].reverse().find(loggedSet);if(fallback)return fallback;
 }
 return null;
}
export function suggestedNextSet(data:TrackerData,week:string,day:GymDay,exercise:string,index:number):GymSet|null {
 const sets=data.weeks[week]?.gym?.[day]?.[exercise]?.sets||[];
 for(let i=index-1;i>=0;i--)if(loggedSet(sets[i]))return sets[i];
 return previousCompletedSet(data,week,day,exercise,index);
}
export function secondsLeft(rest:RestState|null,now:number):number{return rest?Math.max(0,Math.ceil((rest.endsAt-now)/1000)):0;}
export function makeRest(durationSeconds:number,target:NextSetTarget|null,now=Date.now(),from:NextSetTarget|null=null):RestState {
 const duration=Math.min(600,Math.max(5,Math.round(durationSeconds)));
 return {startedAt:now,endsAt:now+duration*1000,durationSeconds:duration,target,from};
}
export function parseRest(value:string|null,now=Date.now()):RestState|null {
 if(!value)return null;
 try {
  const rest=JSON.parse(value) as RestState;
  if(!Number.isFinite(rest.startedAt)||!Number.isFinite(rest.endsAt)||!Number.isFinite(rest.durationSeconds)||rest.durationSeconds<5||rest.durationSeconds>600||rest.endsAt<rest.startedAt||rest.endsAt>now+86400000||rest.endsAt<now-12*3600000)return null;
  if(rest.target!==null&&rest.target!==undefined){
   const t=rest.target;
   if(!/^\d{4}-\d{2}-\d{2}$/.test(t.week)||!['Monday','Tuesday','Wednesday'].includes(t.day)||typeof t.exercise!=='string'||!t.exercise||!Number.isInteger(t.index)||t.index<0||t.index>30)return null;
  }
  if(rest.from!==undefined&&rest.from!==null){
   const f=rest.from;
   if(!/^\d{4}-\d{2}-\d{2}$/.test(f.week)||!['Monday','Tuesday','Wednesday'].includes(f.day)||typeof f.exercise!=='string'||!f.exercise||!Number.isInteger(f.index)||f.index<0||f.index>30)return null;
  }
  return {...rest,target:rest.target||null};
 }catch{return null;}
}
export function formatRest(seconds:number):string{return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;}
export function validEffort(mode:'rir'|'rpe',value:number):boolean{return mode==='rir'?Number.isInteger(value)&&value>=0&&value<=4:Number.isFinite(value)&&value>=6&&value<=10&&value*2===Math.round(value*2);}
/** Past-due manual completion should ask for the actual training date, even
 * when a stopwatch was previously stopped. Running clocks finish today. */
export function needsManualCompletionDate(data:TrackerData,week:string,day:Day,today=keyOf(new Date())):boolean {
 return scheduledDate(data,week,day)<today;
}
export function hasUnfinishedSets(data:TrackerData,week:string,day:GymDay):boolean {const s=gymStats(data,week,day);return s.logged<s.total;}
