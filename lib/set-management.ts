/** Gym set-count mutations are kept together so the visible count, saved rows,
 * and independently synchronized set revisions cannot disagree. */
import type {GymDay,TrackerData,GymSet} from './types';
import {setCount,loggedSet} from './metrics';
import {queueSetChange} from './set-sync';
import {nextIncompleteSet,type RestState,type NextSetTarget} from './workout-flow';

const sameTarget=(a:NextSetTarget|null|undefined,b:NextSetTarget|null|undefined)=>
 !!a&&!!b&&a.week===b.week&&a.day===b.day&&a.exercise===b.exercise&&a.index===b.index;

export function hasRemovableValues(set?:GymSet):boolean {
 return !!set&&(set.done===true||set.rir!==undefined||set.rpe!==undefined||[set.kg,set.reps].some(v=>v!==undefined&&v!==null&&v!==''));
}

/** Mutates an already cloned TrackerData. Caller persists and flushes it. */
export function applySetCountChange(
 data:TrackerData,week:string,day:GymDay,exercise:string,delta:1|-1,
 rest:RestState|null=null,
):{oldCount:number;newCount:number;rest:RestState|null}|null {
 const oldCount=setCount(data,week,day,exercise),newCount=oldCount+delta;
 if(newCount<1||newCount>10)return null;
 const sessionKey=`session:${week}:${day}`;
 const previousLast=data.weeks[week]?.gym[day]?.[exercise]?.sets[oldCount-1];
 const previousLastLogged=loggedSet(previousLast);
 const oldNext=delta===1?nextIncompleteSet(data,week,day,exercise,oldCount-1):null;
 const index=delta===-1?oldCount-1:oldCount;
 queueSetChange(data,sessionKey,exercise,index,set=>{
  // A removed slot must not resurrect weights/reps when added back later.
  set.kg='';set.reps='';set.done=false;set.deleted=delta===-1;
  delete set.rir;delete set.rpe;
 });
 const entry=data.weeks[week]!.gym[day]![exercise];
 entry.setCount=newCount; // Previously only setOverrides changed on remove.
 data.setOverrides[`${day}|${exercise}`]=newCount;
 for(const key of [sessionKey,'preferences']){
  const stamp=Math.max(Date.now(),(data.recordUpdates[key]||0)+1);
  data.recordUpdates[key]=stamp;data.pendingSync[key]=stamp;
 }
 let revisedRest=rest;
 if(rest&&rest.target?.week===week&&rest.target.day===day){
  if(delta===1&&previousLastLogged&&(
   (rest.from&&sameTarget(rest.from,{week,day,exercise,index:oldCount-1}))||
   (!rest.from&&sameTarget(rest.target,oldNext))
  )){
   revisedRest={...rest,target:{week,day,exercise,index:oldCount}};
  }
  // Removing the row the rest timer points to must not leave a dead shortcut.
  if(delta===-1&&sameTarget(rest.target,{week,day,exercise,index})){
   const anchor=rest.from&&rest.from.exercise===exercise?Math.min(rest.from.index,newCount-1):newCount-1;
   revisedRest={...rest,target:nextIncompleteSet(data,week,day,exercise,anchor)};
  }
 }
 return {oldCount,newCount,rest:revisedRest};
}
