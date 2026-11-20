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
