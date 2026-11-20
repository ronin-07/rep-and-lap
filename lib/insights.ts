/**
 * Derived Milestone 5 insights. Pure functions: no browser, Firebase, or writes.
 * All displayed achievements and muscle coverage must come from saved logs.
 */
import {DAYS, type Day, type GymDay, type TrackerData} from './types';
import {GYM_DAYS, SWIM_DAYS, PLAN} from './plan';
import {dateFor, keyOf} from './dates';
import {completedDate, scheduledDate} from './scheduling';
import {FULL_EXERCISE_LIBRARY, exercisesFor} from './routines';
import {loggedSet, num, sessionMinutes, waterGoal} from './metrics';

type MuscleGroup = 'Chest' | 'Back' | 'Shoulders' | 'Biceps' | 'Triceps' |
 'Quads' | 'Hamstrings' | 'Glutes' | 'Calves' | 'Core';
export const MUSCLE_GROUPS:MuscleGroup[] = ['Chest','Back','Shoulders','Biceps','Triceps','Quads','Hamstrings','Glutes','Calves','Core'];

export interface MuscleResult {
 group:MuscleGroup;
 primarySets:number;
 secondarySets:number;
 weightedSets:number;
}
export interface MuscleSummary {
 week:string;
 groups:MuscleResult[];
 countedSets:number;
 uncategorizedSets:number;
}

function groupsForLabel(label:string):MuscleGroup[] {
 const value=label.toLowerCase().trim();
 const out:MuscleGroup[]=[];
 if(/chest|pectoral|pecs?\b/.test(value))out.push('Chest');
 if(/back|lats?|rhomboid|traps?|teres/.test(value))out.push('Back');
 if(/shoulder|delts?|rotator/.test(value))out.push('Shoulders');
 if(/biceps?|brachialis/.test(value))out.push('Biceps');
 if(/triceps?/.test(value))out.push('Triceps');
 if(/quads?|quadriceps/.test(value))out.push('Quads');
 if(/hamstrings?|biceps femoris/.test(value))out.push('Hamstrings');
 if(/glutes?|hips?/.test(value))out.push('Glutes');
 if(/calves|calf|gastrocnemius|soleus/.test(value))out.push('Calves');
 if(/abs?\b|core|oblique|abdominals?/.test(value))out.push('Core');
 return out;
}

/** First listed group is counted as a primary set, later distinct groups as 0.5. */
export function musclesForExercise(label:string):{group:MuscleGroup;share:number}[] {
 const seen=new Set<MuscleGroup>();
 const result:{group:MuscleGroup;share:number}[]=[];
 for(const part of label.split(/[·,|]/)){
  for(const group of groupsForLabel(part)){
   if(seen.has(group))continue;
   seen.add(group);result.push({group,share:result.length===0?1:0.5});
  }
 }
 return result;
}

function sessionDay(data:TrackerData,sourceWeek:string,day:Day):string {
 return data.weeks[sourceWeek]?.done?.[day]
  ?completedDate(data,sourceWeek,day):scheduledDate(data,sourceWeek,day);
}
function isInWeek(date:string,week:string):boolean {
 const end=dateFor(week);end.setDate(end.getDate()+7);
 return date>=week && date<keyOf(end);
}
function metadataFor(data:TrackerData,sourceWeek:string,day:GymDay,exercise:string):string | null {
 const target=exercise.trim().toLowerCase();
 const current=exercisesFor(data,sourceWeek,day).find(x=>x.name.trim().toLowerCase()===target);
 if(current?.muscles)return current.muscles;
 const catalog=FULL_EXERCISE_LIBRARY.find(x=>x.name.trim().toLowerCase()===target);
 if(catalog?.muscles)return catalog.muscles;
 const builtIn=PLAN[day];
 if(builtIn.kind==='gym')return builtIn.exercises.find(x=>x.name.trim().toLowerCase()===target)?.muscles||null;
 return null;
}

/** Weekly *logged* sets. Includes in-progress sessions; excludes deleted and unlogged sets. */
export function muscleCoverage(data:TrackerData,week:string):MuscleSummary {
 const counts=new Map<MuscleGroup,{primary:number;secondary:number}>(MUSCLE_GROUPS.map(g=>[g,{primary:0,secondary:0}]));
 let countedSets=0,uncategorizedSets=0;
 for(const [sourceWeek,entry] of Object.entries(data.weeks))for(const day of GYM_DAYS){
  if(!isInWeek(sessionDay(data,sourceWeek,day),week))continue;
  for(const [name,exercise] of Object.entries(entry.gym?.[day]||{})){
   const logged=(exercise.sets||[]).filter(loggedSet);
   if(!logged.length)continue;
   const muscles=musclesForExercise(metadataFor(data,sourceWeek,day,name)||'');
   if(!muscles.length){uncategorizedSets+=logged.length;continue;}
   countedSets+=logged.length;
   for(const {group,share} of muscles){
    const c=counts.get(group)!;
    if(share===1)c.primary+=logged.length;else c.secondary+=logged.length;
   }
  }
 }
 return {week,countedSets,uncategorizedSets,groups:MUSCLE_GROUPS.map(group=>{
  const c=counts.get(group)!;
  return {group,primarySets:c.primary,secondarySets:c.secondary,weightedSets:c.primary+c.secondary*0.5};
 })};
}

export function previousMonth(month:string):string {
 const d=dateFor(`${month}-01`);d.setMonth(d.getMonth()-1);return keyOf(d).slice(0,7);
}
export function nextMonth(month:string):string {
 const d=dateFor(`${month}-01`);d.setMonth(d.getMonth()+1);return keyOf(d).slice(0,7);
}
export function monthLabel(month:string):string {
 return dateFor(`${month}-01`).toLocaleDateString('en-GB',{month:'long',year:'numeric'});
}

export interface MonthRecap {
 month:string;
 gymSessions:number;
 swimSessions:number;
 completedSessions:number;
 activeDays:number;
 weightChangeKg:number|null;
 timedSessions:number;
 trainingMinutes:number;
 averageSessionMinutes:number|null;
 workingSets:number; // valid logged gym sets; the current UI does not distinguish warm-ups
 liftedVolumeKg:number;
 swimMeters:number;
 continuousBestMeters:number;
 hydrationGoalDays:number;
 hydrationLoggedDays:number;
 newWeightRecords:number;
}

/** New heaviest-load records only count when there was an earlier logged baseline. */
function newRecordsByMonth(data:TrackerData):Map<string,number> {
 const sessions:{date:string;day:GymDay;name:string;weight:number}[]=[];
 for(const [week,log] of Object.entries(data.weeks))for(const day of GYM_DAYS){
  const date=sessionDay(data,week,day);
  for(const [name,ex] of Object.entries(log.gym?.[day]||{})){
   const weights=(ex.sets||[]).filter(loggedSet).map(s=>num(s.kg)).filter(x=>x>0);
   if(weights.length)sessions.push({date,day,name:name.trim().toLowerCase(),weight:Math.max(...weights)});
  }
 }
 sessions.sort((a,b)=>a.date.localeCompare(b.date)||a.day.localeCompare(b.day)||a.name.localeCompare(b.name));
 const best=new Map<string,number>(),counts=new Map<string,number>();
 for(const item of sessions){
  const key=item.name;
  const previous=best.get(key);
  if(previous!==undefined && item.weight>previous){
   const month=item.date.slice(0,7);counts.set(month,(counts.get(month)||0)+1);
  }
  if(previous===undefined||item.weight>previous)best.set(key,item.weight);
 }
 return counts;
}

export function monthlyRecap(data:TrackerData,month:string):MonthRecap {
 const active=new Set<string>(),hydration=new Map<string,number>();
 let gymSessions=0,swimSessions=0,timedSessions=0,trainingMinutes=0;
 let workingSets=0,liftedVolumeKg=0,swimMeters=0,continuousBestMeters=0;
 for(const [week,log] of Object.entries(data.weeks))for(const day of DAYS){
  const date=sessionDay(data,week,day);
  if(!date.startsWith(`${month}-`))continue;
  if(log.done?.[day]){
   active.add(date);
   if(GYM_DAYS.includes(day as GymDay))gymSessions++;
   else swimSessions++;
   const minutes=sessionMinutes(log.timing?.[day]);
   if(minutes!==null){trainingMinutes+=minutes;timedSessions++;}
  }
  if(GYM_DAYS.includes(day as GymDay)){
   for(const ex of Object.values(log.gym?.[day as GymDay]||{}))for(const s of ex.sets||[]){
    if(!loggedSet(s))continue;
    workingSets++;liftedVolumeKg+=num(s.kg)*num(s.reps);
   }
  }else{
   const swim=log.swim?.[day as typeof SWIM_DAYS[number]];
   if(swim){swimMeters+=Math.max(0,num(swim.distance));continuousBestMeters=Math.max(continuousBestMeters,Math.max(0,num(swim.longest)));}
  }
 }
 for(const entry of Object.values(data.waterLogs)){
  if(entry.deleted||!entry.date.startsWith(`${month}-`)||entry.ml<=0)continue;
  hydration.set(entry.date,(hydration.get(entry.date)||0)+entry.ml);
 }
 const hydrationGoalDays=[...hydration.entries()].filter(([date,ml])=>ml>=waterGoal(date)).length;
 const weighIns=Object.entries(data.weights)
  .filter(([date,entry])=>date.startsWith(`${month}-`)&&!entry.deleted&&num(entry.kg)>0)
  .sort(([a],[b])=>a.localeCompare(b));
 const weightChangeKg=weighIns.length>=2
  ?num(weighIns.at(-1)![1].kg)-num(weighIns[0][1].kg):null;
 return {month,gymSessions,swimSessions,completedSessions:gymSessions+swimSessions,activeDays:active.size,weightChangeKg,
  timedSessions,trainingMinutes,averageSessionMinutes:timedSessions?trainingMinutes/timedSessions:null,
  workingSets,liftedVolumeKg,swimMeters,continuousBestMeters,
  hydrationGoalDays,hydrationLoggedDays:hydration.size,newWeightRecords:newRecordsByMonth(data).get(month)||0};
}

export interface Achievement {
 id:string;name:string;description:string;icon:'trophy'|'water'|'swim'|'dumbbell'|'calendar'|'sparkles';
 value:number;target:number;unit:string;unlocked:boolean;
}
/** Derived badges do not require writes or artificially extend a streak. */
export function achievements(data:TrackerData):Achievement[]{
 let sessions=0,workingSets=0,swimMeters=0,continuous=0;
 const hydrated=new Map<string,number>();
 for(const log of Object.values(data.weeks)){
  for(const day of DAYS)if(log.done?.[day])sessions++;
  for(const day of GYM_DAYS)for(const ex of Object.values(log.gym?.[day]||{}))workingSets+=(ex.sets||[]).filter(loggedSet).length;
  for(const day of SWIM_DAYS){const swim=log.swim?.[day];if(swim){swimMeters+=Math.max(0,num(swim.distance));continuous=Math.max(continuous,Math.max(0,num(swim.longest)));}}
 }
 for(const item of Object.values(data.waterLogs))if(!item.deleted&&item.ml>0)hydrated.set(item.date,(hydrated.get(item.date)||0)+item.ml);
 const waterDays=[...hydrated.entries()].filter(([date,ml])=>ml>=waterGoal(date)).length;
 const base:Omit<Achievement,'unlocked'>[]=[
  {id:'first',name:'First Step',description:'Finish your first training session',icon:'sparkles',value:sessions,target:1,unit:'session'},
  {id:'consistent',name:'Showing Up',description:'Complete 12 gym or swim sessions',icon:'calendar',value:sessions,target:12,unit:'sessions'},
  {id:'sets',name:'Iron Habit',description:'Log 50 gym sets',icon:'dumbbell',value:workingSets,target:50,unit:'sets'},
  {id:'pool',name:'One-Kilometre Club',description:'Log 1,000 m in the pool',icon:'swim',value:swimMeters,target:1000,unit:'m'},
  {id:'nonstop',name:'No Stopping',description:'Swim 50 m continuously',icon:'trophy',value:continuous,target:50,unit:'m'},
  {id:'hydrated',name:'Hydration Habit',description:'Reach your water goal on seven logged days',icon:'water',value:waterDays,target:7,unit:'days'},
 ];
 return base.map(item=>({...item,unlocked:item.value>=item.target}));
}
