import type {Day, GymDay, SwimDay, RoutineExercise} from './types';
export type ExercisePlan = RoutineExercise;
export interface GymPlan {kind:'gym';name:string;subtitle:string;exercises:ExercisePlan[]}
export interface SwimPlan {kind:'swim';name:string;subtitle:string;description:string;drills:string[]}
export const PLAN:Record<Day,GymPlan|SwimPlan> = {
  Monday:{kind:'gym',name:'Push day',subtitle:'Chest · Shoulders · Triceps',exercises:[
    {name:'Barbell bench press',sets:3,reps:'6–10',muscles:'Chest · triceps'},
    {name:'Incline dumbbell press',sets:3,reps:'8–12',muscles:'Upper chest'},
    {name:'Seated dumbbell shoulder press',sets:2,reps:'8–12',muscles:'Front delts · triceps'},
    {name:'Cable lateral raises',sets:3,reps:'12–20',muscles:'Side delts'},
    {name:'Cable triceps pushdowns',sets:3,reps:'10–15',muscles:'Triceps'},
    {name:'Overhead cable triceps extensions',sets:2,reps:'10–15',muscles:'Long-head triceps'},
  ]},
  Tuesday:{kind:'gym',name:'Pull day',subtitle:'Back · Rear delts · Biceps',exercises:[
    {name:'Lat pulldown',sets:3,reps:'8–12',muscles:'Lats'},
    {name:'Seated cable row (neutral grip)',sets:3,reps:'8–12',muscles:'Mid back'},
    {name:'Chest-supported dumbbell row',sets:2,reps:'10–12',muscles:'Upper/mid back'},
    {name:'Cable rear delt fly',sets:3,reps:'12–20',muscles:'Rear delts'},
    {name:'Incline dumbbell biceps curls',sets:3,reps:'8–12',muscles:'Biceps'},
    {name:'Dumbbell hammer curls',sets:2,reps:'10–15',muscles:'Brachialis · forearms'},
  ]},
  Wednesday:{kind:'gym',name:'Leg day',subtitle:'Quads · Hamstrings · Glutes · Core',exercises:[
    {name:'Barbell back squats',sets:3,reps:'6–10',muscles:'Quads · glutes'},
    {name:'Romanian deadlifts',sets:3,reps:'8–10',muscles:'Hamstrings · glutes'},
    {name:'Leg press',sets:3,reps:'10–12',muscles:'Quads · glutes'},
    {name:'Hamstring curl machine',sets:2,reps:'10–15',muscles:'Hamstrings'},
    {name:'Standing calf raises',sets:3,reps:'12–20',muscles:'Calves'},
    {name:'Cable crunches',sets:3,reps:'10–15',muscles:'Abs'},
  ]},
  Thursday:{kind:'swim',name:'Freestyle technique',subtitle:'Easy · 30–45 min',description:'Find a rhythm with relaxed repeats and controlled breathing.',drills:['Relaxed 25 m repeats','Streamline and flutter kick','Side breathing and rotation','Easy cooldown']},
  Friday:{kind:'swim',name:'Breaststroke + sculling',subtitle:'Easy–moderate · 30–45 min',description:'Learn the coordination, glide and fundamentals of staying afloat.',drills:['Breaststroke kick and glide','Arm/kick coordination','Supported sculling','Floating or supervised treading']},
  Saturday:{kind:'swim',name:'Freestyle endurance',subtitle:'Moderate · 35–50 min',description:'Build comfortable 25 m repeats toward nonstop 50 m and 100 m.',drills:['4 × 25 m warm-up','4–8 × 25 m with rest','Continuous distance attempt','Easy cooldown']},
};
export const GYM_DAYS:GymDay[]=['Monday','Tuesday','Wednesday'];
export const SWIM_DAYS:SwimDay[]=['Thursday','Friday','Saturday'];
export function isGym(day:Day):day is GymDay {return PLAN[day].kind==='gym';}
export function isSwim(day:Day):day is SwimDay {return PLAN[day].kind==='swim';}
