import {PLAN} from './plan';
import type {GymDay,RoutineExercise,TrackerData} from './types';
const DEFAULT_SETS=3;
const sanitize=(name:string)=>name.trim().replace(/\s+/g,' ');

export const EXERCISE_LIBRARY:RoutineExercise[]=[
 {name:'Dumbbell bench press',sets:3,reps:'8–12',muscles:'Chest · triceps'},
 {name:'Machine chest press',sets:3,reps:'8–12',muscles:'Chest'},
 {name:'Push-ups',sets:3,reps:'8–15',muscles:'Chest · triceps'},
 {name:'Arnold press',sets:3,reps:'8–12',muscles:'Shoulders'},
 {name:'Machine shoulder press',sets:3,reps:'8–12',muscles:'Shoulders'},
 {name:'Dumbbell lateral raises',sets:3,reps:'12–20',muscles:'Side delts'},
 {name:'Triceps dips',sets:3,reps:'8–12',muscles:'Triceps'},
 {name:'Assisted pull-ups',sets:3,reps:'6–12',muscles:'Lats · biceps'},
 {name:'Single-arm dumbbell row',sets:3,reps:'8–12',muscles:'Lats · mid back'},
 {name:'Machine row',sets:3,reps:'8–12',muscles:'Mid back'},
 {name:'Face pulls',sets:3,reps:'12–20',muscles:'Rear delts'},
 {name:'Cable curls',sets:3,reps:'10–15',muscles:'Biceps'},
 {name:'Goblet squat',sets:3,reps:'8–12',muscles:'Quads · glutes'},
 {name:'Bulgarian split squat',sets:3,reps:'8–12',muscles:'Quads · glutes'},
 {name:'Leg extension',sets:3,reps:'10–15',muscles:'Quads'},
 {name:'Seated leg curl',sets:3,reps:'10–15',muscles:'Hamstrings'},
 {name:'Hip thrust',sets:3,reps:'8–12',muscles:'Glutes'},
 {name:'Seated calf raises',sets:3,reps:'12–20',muscles:'Calves'},
];
export type CatalogExercise=RoutineExercise & {category?:string;equipment?:string};
export const EXTRA_EXERCISES:CatalogExercise[]=[
 {name:'Barbell incline bench press',sets:3,reps:'8–12',muscles:'Chest · shoulders',category:'Chest',equipment:'Barbell'},
 {name:'Dumbbell incline press',sets:3,reps:'8–12',muscles:'Chest · shoulders',category:'Chest',equipment:'Dumbbells'},
 {name:'Barbell decline bench press',sets:3,reps:'8–12',muscles:'Chest',category:'Chest',equipment:'Barbell'},
 {name:'Cable chest fly',sets:3,reps:'8–12',muscles:'Chest',category:'Chest',equipment:'Cable'},
 {name:'Pec deck fly',sets:3,reps:'8–12',muscles:'Chest',category:'Chest',equipment:'Machine'},
 {name:'Dumbbell chest fly',sets:3,reps:'8–12',muscles:'Chest',category:'Chest',equipment:'Dumbbells'},
 {name:'Smith machine bench press',sets:3,reps:'8–12',muscles:'Chest',category:'Chest',equipment:'Smith machine'},
 {name:'Chest dips',sets:3,reps:'8–12',muscles:'Chest · triceps',category:'Chest',equipment:'Bodyweight'},
 {name:'Barbell deadlift',sets:3,reps:'8–12',muscles:'Back · glutes · hamstrings',category:'Back',equipment:'Barbell'},
 {name:'Romanian deadlift',sets:3,reps:'8–12',muscles:'Hamstrings · glutes',category:'Back',equipment:'Barbell'},
 {name:'Conventional pull-up',sets:3,reps:'8–12',muscles:'Lats · biceps',category:'Back',equipment:'Bodyweight'},
 {name:'Chin-ups',sets:3,reps:'8–12',muscles:'Lats · biceps',category:'Back',equipment:'Bodyweight'},
 {name:'Wide grip lat pulldown',sets:3,reps:'8–12',muscles:'Lats',category:'Back',equipment:'Cable'},
 {name:'Close-grip lat pulldown',sets:3,reps:'8–12',muscles:'Lats',category:'Back',equipment:'Cable'},
 {name:'Straight-arm pulldown',sets:3,reps:'8–12',muscles:'Lats',category:'Back',equipment:'Cable'},
 {name:'Seated cable row',sets:3,reps:'8–12',muscles:'Mid back',category:'Back',equipment:'Cable'},
 {name:'Barbell bent-over row',sets:3,reps:'8–12',muscles:'Mid back · lats',category:'Back',equipment:'Barbell'},
 {name:'T-bar row',sets:3,reps:'8–12',muscles:'Mid back',category:'Back',equipment:'Machine'},
 {name:'Chest-supported dumbbell row',sets:3,reps:'8–12',muscles:'Mid back',category:'Back',equipment:'Dumbbells'},
 {name:'Rear delt fly',sets:3,reps:'8–12',muscles:'Rear delts',category:'Back',equipment:'Dumbbells'},
 {name:'Hyperextensions',sets:3,reps:'8–12',muscles:'Lower back · glutes',category:'Back',equipment:'Bodyweight'},
 {name:'Barbell overhead press',sets:3,reps:'8–12',muscles:'Shoulders · triceps',category:'Shoulders',equipment:'Barbell'},
 {name:'Seated dumbbell shoulder press',sets:3,reps:'8–12',muscles:'Shoulders',category:'Shoulders',equipment:'Dumbbells'},
 {name:'Cable lateral raise',sets:3,reps:'8–12',muscles:'Side delts',category:'Shoulders',equipment:'Cable'},
 {name:'Dumbbell front raise',sets:3,reps:'8–12',muscles:'Front delts',category:'Shoulders',equipment:'Dumbbells'},
 {name:'Reverse pec deck',sets:3,reps:'8–12',muscles:'Rear delts',category:'Shoulders',equipment:'Machine'},
 {name:'Cable rear delt fly',sets:3,reps:'8–12',muscles:'Rear delts',category:'Shoulders',equipment:'Cable'},
 {name:'Dumbbell shrugs',sets:3,reps:'8–12',muscles:'Traps',category:'Shoulders',equipment:'Dumbbells'},
 {name:'Barbell shrugs',sets:3,reps:'8–12',muscles:'Traps',category:'Shoulders',equipment:'Barbell'},
 {name:'Upright row',sets:3,reps:'8–12',muscles:'Shoulders · traps',category:'Shoulders',equipment:'Barbell'},
 {name:'Barbell biceps curl',sets:3,reps:'8–12',muscles:'Biceps',category:'Arms',equipment:'Barbell'},
 {name:'Incline dumbbell curl',sets:3,reps:'8–12',muscles:'Biceps',category:'Arms',equipment:'Dumbbells'},
 {name:'Hammer curl',sets:3,reps:'8–12',muscles:'Biceps · forearms',category:'Arms',equipment:'Dumbbells'},
 {name:'Preacher curl',sets:3,reps:'8–12',muscles:'Biceps',category:'Arms',equipment:'Machine'},
 {name:'Concentration curl',sets:3,reps:'8–12',muscles:'Biceps',category:'Arms',equipment:'Dumbbells'},
 {name:'Overhead cable triceps extension',sets:3,reps:'8–12',muscles:'Triceps',category:'Arms',equipment:'Cable'},
 {name:'Triceps rope pushdown',sets:3,reps:'8–12',muscles:'Triceps',category:'Arms',equipment:'Cable'},
 {name:'Skull crushers',sets:3,reps:'8–12',muscles:'Triceps',category:'Arms',equipment:'EZ bar'},
 {name:'Close-grip bench press',sets:3,reps:'8–12',muscles:'Triceps · chest',category:'Arms',equipment:'Barbell'},
 {name:'Reverse wrist curl',sets:3,reps:'8–12',muscles:'Forearms',category:'Arms',equipment:'Dumbbells'},
 {name:'Back squat',sets:3,reps:'8–12',muscles:'Quads · glutes',category:'Legs',equipment:'Barbell'},
 {name:'Front squat',sets:3,reps:'8–12',muscles:'Quads',category:'Legs',equipment:'Barbell'},
 {name:'Leg press',sets:3,reps:'8–12',muscles:'Quads · glutes',category:'Legs',equipment:'Machine'},
 {name:'Hack squat',sets:3,reps:'8–12',muscles:'Quads',category:'Legs',equipment:'Machine'},
 {name:'Walking lunges',sets:3,reps:'8–12',muscles:'Quads · glutes',category:'Legs',equipment:'Dumbbells'},
 {name:'Reverse lunges',sets:3,reps:'8–12',muscles:'Quads · glutes',category:'Legs',equipment:'Dumbbells'},
 {name:'Step-ups',sets:3,reps:'8–12',muscles:'Quads · glutes',category:'Legs',equipment:'Bodyweight'},
 {name:'Lying leg curl',sets:3,reps:'8–12',muscles:'Hamstrings',category:'Legs',equipment:'Machine'},
 {name:'Standing leg curl',sets:3,reps:'8–12',muscles:'Hamstrings',category:'Legs',equipment:'Machine'},
 {name:'Standing calf raise',sets:3,reps:'8–12',muscles:'Calves',category:'Legs',equipment:'Machine'},
 {name:'Cable pull-through',sets:3,reps:'8–12',muscles:'Glutes',category:'Legs',equipment:'Cable'},
 {name:'Hip abduction',sets:3,reps:'8–12',muscles:'Glutes',category:'Legs',equipment:'Machine'},
 {name:'Hip adduction',sets:3,reps:'8–12',muscles:'Adductors',category:'Legs',equipment:'Machine'},
 {name:'Glute kickback',sets:3,reps:'8–12',muscles:'Glutes',category:'Legs',equipment:'Cable'},
 {name:'Cable crunch',sets:3,reps:'12–20',muscles:'Abs',category:'Core',equipment:'Cable'},
 {name:'Hanging leg raise',sets:3,reps:'12–20',muscles:'Abs',category:'Core',equipment:'Bodyweight'},
 {name:'Knee raises',sets:3,reps:'12–20',muscles:'Abs',category:'Core',equipment:'Bodyweight'},
 {name:'Plank',sets:3,reps:'12–20',muscles:'Core',category:'Core',equipment:'Bodyweight'},
 {name:'Side plank',sets:3,reps:'12–20',muscles:'Obliques',category:'Core',equipment:'Bodyweight'},
 {name:'Russian twist',sets:3,reps:'12–20',muscles:'Obliques',category:'Core',equipment:'Bodyweight'},
 {name:'Ab wheel rollout',sets:3,reps:'12–20',muscles:'Abs',category:'Core',equipment:'Ab wheel'},
 {name:'Dead bug',sets:3,reps:'12–20',muscles:'Core',category:'Core',equipment:'Bodyweight'},
 {name:'Pallof press',sets:3,reps:'12–20',muscles:'Core · obliques',category:'Core',equipment:'Cable'},
 {name:'Bicycle crunch',sets:3,reps:'12–20',muscles:'Abs',category:'Core',equipment:'Bodyweight'},
];
export const FULL_EXERCISE_LIBRARY:CatalogExercise[]=Array.from(new Map(
 [...EXERCISE_LIBRARY,...Object.values(PLAN).flatMap(p=>p.kind==='gym'?p.exercises:[]),...EXTRA_EXERCISES]
 .map(ex=>[ex.name.toLowerCase(),ex] as const)
 ).values()).sort((a,b)=>a.name.localeCompare(b.name));
export function exerciseCategory(ex:CatalogExercise):string{
 if(ex.category)return ex.category;
 const muscles=ex.muscles.toLowerCase();
 if(/chest/.test(muscles))return 'Chest';
 if(/quad|hamstring|glute|calve/.test(muscles))return 'Legs';
 if(/shoulder|delt|trap/.test(muscles))return 'Shoulders';
 if(/tricep|bicep|forearm/.test(muscles))return 'Arms';
 if(/abs|core|oblique/.test(muscles))return 'Core';
 return 'Back';
}

export function exercisesFor(data:TrackerData,week:string,day:GymDay):RoutineExercise[]{
 const plan=PLAN[day];if(plan.kind!=='gym')return [];
 return data.weeks[week]?.routineOverrides?.[day]??data.routineTemplates?.[day]??plan.exercises;
}
export function cloneExercises(exercises:RoutineExercise[]):RoutineExercise[]{return exercises.map(ex=>({...ex}));}
export function editRoutine(exercises:RoutineExercise[],kind:'add'|'remove'|'move'|'replace',index:number,payload?:RoutineExercise|number):RoutineExercise[]{
 const list=cloneExercises(exercises);
 if(kind==='remove'){if(index<0||index>=list.length||list.length<=1)throw new Error('Keep at least one exercise');list.splice(index,1);}
 if(kind==='move'){
  const target=typeof payload==='number'?payload:-1;
  if(index<0||index>=list.length||target<0||target>=list.length)throw new Error('Cannot move exercise there');
  const [item]=list.splice(index,1);list.splice(target,0,item);
 }
 if(kind==='add'||kind==='replace'){
  if(typeof payload!=='object'||payload===null)throw new Error('Choose an exercise');
  const ex={name:sanitize(payload.name),sets:payload.sets||DEFAULT_SETS,reps:payload.reps||'8–12',muscles:payload.muscles||'Other'};
  if(!ex.name||ex.name.length>160||!Number.isInteger(ex.sets)||ex.sets<1||ex.sets>10||ex.reps.length>50||ex.muscles.length>160)throw new Error('Invalid exercise details');
  if(list.some((x,i)=>x.name.toLowerCase()===ex.name.toLowerCase()&&(kind==='add'||i!==index)))throw new Error('Exercise already in this routine');
  if(kind==='add'){if(list.length>=30)throw new Error('Maximum 30 exercises');list.push(ex);}
  else {if(index<0||index>=list.length)throw new Error('Invalid exercise');list[index]=ex;}
 }
 return list;
}

/** Preserve the exercise choices for already-used sessions before changing defaults.
 *  The active edited session is also frozen even before the first logged set.
 */
export function weeksToFreezeBeforeTemplateChange(data:TrackerData,week:string,day:GymDay):string[] {
 const weeks=new Set<string>([week]);
 for(const [key,record] of Object.entries(data.weeks)) {
  if(record.routineOverrides?.[day])continue;
  const hadSets=Object.values(record.gym?.[day]||{}).some(entry=>entry.sets.some(set=>!set.deleted&&(set.done||set.kg!==undefined||set.reps!==undefined)));
  if(hadSets||record.done?.[day]||record.timing?.[day]?.startedAt)weeks.add(key);
 }
 return [...weeks];
}

export function freezeExistingRoutines(data:TrackerData,week:string,day:GymDay):string[] {
 const frozen:string[]=[];
 for(const key of weeksToFreezeBeforeTemplateChange(data,week,day)) {
  const record=data.weeks[key];
  if(!record||record.routineOverrides?.[day])continue;
  const exercises=cloneExercises(exercisesFor(data,key,day));
  record.routineOverrides??={};record.routineOverrides[day]=exercises;
  frozen.push(key);
 }
 return frozen;
}

/** Produce a previewable restore plan without losing performed exercises. */
export function restoredSessionRoutine(data:TrackerData,week:string,day:GymDay):RoutineExercise[] {
 const builtIn=PLAN[day];
 const target=cloneExercises(data.routineTemplates?.[day] || (builtIn.kind==='gym'?builtIn.exercises:[]));
 const current=exercisesFor(data,week,day);
 const records=data.weeks[week]?.gym?.[day]||{};
 for(const [name,entry] of Object.entries(records)) {
  const lastLogged=entry.sets.reduce((max,set,i)=>set.done&&!set.deleted?Math.max(max,i+1):max,0);
  if(!lastLogged)continue;
  const existing=target.find(ex=>ex.name===name);
  if(existing)existing.sets=Math.max(existing.sets,lastLogged);
  else {
   const archived=current.find(ex=>ex.name===name);
   target.push({...archived||{name,sets:3,reps:'8–12',muscles:'Previously logged'},sets:Math.max(archived?.sets||3,lastLogged)});
  }
 }
 return target;
}

/** Only future routine templates change. Current / recorded sessions retain their plan. */
export function resetDefaultPreservingHistory(data:TrackerData,week:string,day:GymDay):void {
 freezeExistingRoutines(data,week,day);
 data.routineTemplates??={};
 delete data.routineTemplates[day];
}
