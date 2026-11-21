/** Read-only next-set suggestion for the active exercise. Never mutates set values. */
import type {GymDay,TrackerData} from './types';
import {loggedSet,num} from './metrics';
import {suggestedNextSet} from './workout-flow';
import {progressionAdvice} from './training-intelligence';

export interface NextSetGuidance {
 nextIndex:number|null;
 targetKg:number|null;
 targetReps:number|null;
 source:'current session'|'previous workout progression'|'previous set'|'no history'|'all sets logged';
}
export function nextSetGuidance(data:TrackerData,week:string,day:GymDay,exercise:string,count:number):NextSetGuidance {
 const sets=data.weeks[week]?.gym?.[day]?.[exercise]?.sets||[];
 let nextIndex:number|null=null;
 for(let i=0;i<count;i++)if(!loggedSet(sets[i])){nextIndex=i;break;}
 if(nextIndex===null)return {nextIndex:null,targetKg:null,targetReps:null,source:'all sets logged'};
 const current=sets.slice(0,nextIndex).filter(loggedSet).at(-1);
 if(current&&num(current.kg)>0&&num(current.reps)>0)
  return {nextIndex,targetKg:num(current.kg),targetReps:num(current.reps),source:'current session'};
 const progression=progressionAdvice(data,week,day,exercise);
 if(progression)return {nextIndex,targetKg:progression.targetKg,targetReps:progression.targetReps,source:'previous workout progression'};
 const previous=suggestedNextSet(data,week,day,exercise,nextIndex);
 if(previous&&num(previous.kg)>0&&num(previous.reps)>0)
  return {nextIndex,targetKg:num(previous.kg),targetReps:num(previous.reps),source:'previous set'};
 return {nextIndex,targetKg:null,targetReps:null,source:'no history'};
}
