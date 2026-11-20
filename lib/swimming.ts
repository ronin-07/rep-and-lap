/**
 * Milestone 6: normalized swimming activities and backward-compatible analytics.
 * One pool length is one traversal of the pool. Intervals add to, rather than
 * replace, the independently recorded length count. Timed efforts are a subset
 * of those lengths: they do not increase total distance.
 */
import type {SwimDay,SwimLog,SwimRoutine,SwimSegment,SwimSegmentTemplate,SwimStroke,SwimIntervalSet,TrackerData,SwimActivity,SwimSkillLevel} from './types';
import {SWIM_DAYS,PLAN} from './plan';
import {completedDate} from './scheduling';

export const SWIM_STROKES = ['freestyle','breaststroke','backstroke','butterfly'] as const;
export const SWIM_DRILLS = [
 {id:'sculling',name:'Sculling',description:'Feel water pressure through your hands'},
 {id:'kickboard',name:'Kickboard kicking',description:'Isolate the kick with flotation support'},
 {id:'streamline',name:'Streamline glide',description:'Body position and smooth gliding'},
 {id:'side-kicking',name:'Side kicking',description:'Body rotation and balance'},
 {id:'breathing',name:'Breathing drill',description:'Relaxed rhythm and exhalation'},
 {id:'floating',name:'Floating',description:'Buoyancy and relaxation'},
 {id:'treading',name:'Treading water',description:'Practice with supervision in safe depth'},
 {id:'catch-up',name:'Catch-up freestyle',description:'Coordination and relaxed arm extension'},
 {id:'single-arm',name:'Single-arm drill',description:'Focus on entry and catch'},
 {id:'cooldown',name:'Easy cooldown',description:'Comfortable low-effort laps'},
] as const;
export const SWIM_CHECKLIST: Record<SwimStroke,readonly string[]> = {
 freestyle:['Body position stays streamlined','Exhale gently underwater','Controlled side breathing','Smooth arm entry and catch','Balanced flutter kick','Maintain relaxed rhythm'],
 breaststroke:['Streamlined glide','Whip kick mechanics','Arm pull and breathing timing','Kick and glide coordination','Relaxed recovery'],
 backstroke:['Stable back float','Hips remain near surface','Alternating arm rotation','Continuous flutter kick','Consistent body alignment'],
 butterfly:['Body undulation rhythm','Dolphin kick timing','Two kicks per arm cycle','Symmetrical arm recovery','Comfortable breathing timing'],
};
export const SWIM_SKILL_LEVELS=['Not started','Learning','Basic','Comfortable','Confident'] as const;
export const SWIM_TARGET_DEFAULTS:Record<SwimStroke,number>={freestyle:400,breaststroke:50,backstroke:50,butterfly:25};
export const SWIM_MODE_DEFAULTS:Record<SwimStroke,'learning'|'advanced'>={freestyle:'advanced',breaststroke:'learning',backstroke:'learning',butterfly:'learning'};
export const SWIM_ACTIVITY_LABELS:Record<SwimActivity,string>={
 freestyle:'Freestyle',breaststroke:'Breaststroke',backstroke:'Backstroke',butterfly:'Butterfly',
 sculling:'Sculling',kickboard:'Kickboard kicking',streamline:'Streamline glide',
 'side-kicking':'Side kicking',breathing:'Breathing drill',floating:'Floating',treading:'Treading water',
 'catch-up':'Catch-up freestyle','single-arm':'Single-arm drill',cooldown:'Easy cooldown'
};
export const isStroke=(x:SwimActivity):x is SwimStroke=>(SWIM_STROKES as readonly string[]).includes(x);
export const swimNumber=(v:unknown):number=>typeof v==='number'&&Number.isFinite(v)?v:typeof v==='string'&&v.trim()!==''&&Number.isFinite(Number(v))?Number(v):0;
export function validPool(n:unknown):number {const v=swimNumber(n);return v>=10&&v<=100?v:50;}
export function effectivePool(log?:SwimLog,defaultPool=50):number {
 if(log?.poolLength!==undefined&&swimNumber(log.poolLength)>0)return validPool(log.poolLength);
 // Legacy swims were historically logged against a 25 m default.
 return log&&(log.lengths!==undefined||log.distance!==undefined||log.intervals?.length)?25:validPool(defaultPool);
}
export function blankSegment(activity:SwimActivity,mode:'learning'|'advanced'='learning'):SwimSegment {
 return {id:`swim-${cryptoId()}`,activity,mode,minutes:'',lengths:0,longestContinuous:0,intervals:[],technique:{},notes:'',difficulty:'',skillLevel:'Learning'};
}
function cryptoId():string {return typeof crypto!=='undefined'&&typeof crypto.randomUUID==='function'?crypto.randomUUID():`${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`;}
export function initialSwimRoutines():Record<SwimDay,SwimRoutine> {
 return {
  Thursday:{name:'Freestyle technique',description:'Relaxed practice, breathing and technique',activities:[{activity:'freestyle',mode:'advanced',plannedMinutes:30},{activity:'breathing',mode:'learning',plannedMinutes:10}]},
  Friday:{name:'New strokes + sculling',description:'Learn breaststroke and improve water confidence',activities:[{activity:'breaststroke',mode:'learning',plannedMinutes:25},{activity:'sculling',mode:'learning',plannedMinutes:10}]},
  Saturday:{name:'Freestyle endurance',description:'Build comfortable continuous distance',activities:[{activity:'freestyle',mode:'advanced',plannedMinutes:40}]},
 };
}
export function swimRoutine(data:TrackerData,week:string,day:SwimDay):SwimRoutine {
 const override=data.weeks[week]?.swimRoutineOverrides?.[day];
 const saved=data.swimTemplates?.[day];
 return structuredClone(override||saved||initialSwimRoutines()[day]);
}
export function swimHasHistory(log?:SwimLog):boolean {
 return !!log&&(!!log.segments?.length||log.duration!==undefined||log.distance!==undefined||log.longest!==undefined||!!log.intervals?.length||Object.keys(log.drills||{}).length>0||!!log.notes);
}
export function swimIntervalMeters(interval:SwimIntervalSet,pool:number):number {
 const reps=Math.max(0,Math.floor(swimNumber(interval.repeats)));
 const lengths=Math.max(0,Math.floor(swimNumber(interval.lengths)));
 return reps*lengths*pool;
}
export function segmentDistance(segment:SwimSegment,pool:number):number {
 const base=Math.max(0,Math.floor(swimNumber(segment.lengths)))*pool;
 return base+(segment.intervals||[]).reduce((n,interval)=>n+swimIntervalMeters(interval,pool),0);
}
export function segmentContinuous(segment:SwimSegment,pool:number):number {
 // Continuous swimming cannot be inferred from repeated intervals.
 return isStroke(segment.activity)?Math.min(Math.max(0,swimNumber(segment.longestContinuous)),Math.max(0,swimNumber(segment.lengths))*pool):0;
}
export function segmentTimed(segment:SwimSegment,pool:number):{meters:number;seconds:number}|null {
 if(!isStroke(segment.activity))return null;
 const meters=swimNumber(segment.timedMeters),secs=swimNumber(segment.timedSeconds);
 const base=Math.max(0,swimNumber(segment.lengths))*pool;
 if(meters<=0||secs<=0||meters>base)return null;
 return {meters,seconds:secs};
}
export interface SwimTotals {meters:number;bestContinuous:number;freestyleBest:number;minutes:number;byStroke:Partial<Record<SwimStroke,{meters:number;continuous:number;minutes:number}>>};
/** New segments supersede legacy aggregated fields, preventing double counting. */
export function swimTotals(log?:SwimLog,defaultPool=50):SwimTotals {
 const byStroke:SwimTotals['byStroke']={};
 if(!log)return {meters:0,bestContinuous:0,freestyleBest:0,minutes:0,byStroke};
 if(!log.segments?.length){
  const best=Math.max(0,swimNumber(log.longest));
  const meters=Math.max(0,swimNumber(log.distance));
  const minutes=Math.max(0,swimNumber(log.duration));
  return {meters,bestContinuous:best,freestyleBest:best,minutes,byStroke:{freestyle:{meters:0,continuous:best,minutes:0}}};
 }
 // When a historical session is extended with new segments, legacy aggregate
 // entries stay in an archived portion. New controls never write legacy fields.
 const pool=effectivePool(log,defaultPool);let meters=Math.max(0,swimNumber(log.distance)),bestContinuous=Math.max(0,swimNumber(log.longest)),freestyleBest=Math.max(0,swimNumber(log.longest)),minutes=Math.max(0,swimNumber(log.duration));
 if(meters||freestyleBest){byStroke.freestyle={meters:0,continuous:freestyleBest,minutes:0};} // Legacy distance/time may include multiple strokes.
 for(const segment of log.segments){
  const distance=segmentDistance(segment,pool),continuous=segmentContinuous(segment,pool),duration=Math.max(0,swimNumber(segment.minutes));
  meters+=distance;minutes+=duration;bestContinuous=Math.max(bestContinuous,continuous);
  if(segment.activity==='freestyle')freestyleBest=Math.max(freestyleBest,continuous);
  if(isStroke(segment.activity)){
   const entry=byStroke[segment.activity]??{meters:0,continuous:0,minutes:0};
   entry.meters+=distance;entry.continuous=Math.max(entry.continuous,continuous);entry.minutes+=duration;byStroke[segment.activity]=entry;
  }
 }
 return {meters,bestContinuous,freestyleBest,minutes,byStroke};
}
export type StrokeSession={date:string;week:string;day:SwimDay;meters:number;continuous:number;minutes:number;pacePer100:number|null;timed:{meters:number;seconds:number}|null;skillLevel?:SwimSkillLevel};
export interface StrokeInsights {stroke:SwimStroke;totalMeters:number;bestContinuous:number;practiceMinutes:number;sessions:StrokeSession[];bestTimes:Record<number,number>;bestPace:number|null;latestSkillLevel?:SwimSkillLevel;goal:number;goalReached:boolean};
export function strokeInsights(data:TrackerData,stroke:SwimStroke):StrokeInsights {
 const sessions:StrokeSession[]=[];const bestTimes:Record<number,number>={};
 for(const [week,record] of Object.entries(data.weeks))for(const day of SWIM_DAYS){
  const log=record.swim?.[day];if(!log)continue;
  const pool=effectivePool(log,data.swimPoolDefault);
  const segments=log.segments?.length?log.segments.filter(s=>s.activity===stroke):[];
  if(segments.length){
   const legacyMeters=0; // Unclassified legacy session distance is not assigned to a particular stroke.
   const legacyContinuous=stroke==='freestyle'?Math.max(0,swimNumber(log.longest)):0;
   const legacyMinutes=0;
   const meters=legacyMeters+segments.reduce((n,s)=>n+segmentDistance(s,pool),0);
   const continuous=Math.max(legacyContinuous,...segments.map(s=>segmentContinuous(s,pool)));
   const minutes=legacyMinutes+segments.reduce((n,s)=>n+Math.max(0,swimNumber(s.minutes)),0);
   const efforts=segments.map(s=>segmentTimed(s,pool)).filter((t):t is {meters:number;seconds:number}=>!!t);
   for(const effort of efforts)bestTimes[effort.meters]=Math.min(bestTimes[effort.meters]??Infinity,effort.seconds);
   if(meters||continuous||minutes||efforts.length)sessions.push({date:completedDate(data,week,day),week,day,meters,continuous,minutes,pacePer100:efforts.length?Math.min(...efforts.map(t=>t.seconds*100/t.meters)):null,timed:efforts.length?efforts.reduce((best,x)=>!best||x.seconds*100/x.meters<best.seconds*100/best.meters?x:best,null as {meters:number;seconds:number}|null):null,skillLevel:segments.map(s=>s.skillLevel).filter((v):v is SwimSkillLevel=>!!v).at(-1)});
  }else if(stroke==='freestyle'&&(swimNumber(log.distance)>0||swimNumber(log.longest)>0||swimNumber(log.duration)>0)){
   const meters=0,continuous=Math.max(0,swimNumber(log.longest));
   const minutes=0;
   if(meters||continuous||minutes)sessions.push({date:completedDate(data,week,day),week,day,meters,continuous,minutes,pacePer100:null,timed:null});
  }else if(stroke==='breaststroke'&&log.breaststroke&&(SWIM_SKILL_LEVELS as readonly string[]).includes(log.breaststroke)){
   sessions.push({date:completedDate(data,week,day),week,day,meters:0,continuous:0,minutes:0,pacePer100:null,timed:null,skillLevel:log.breaststroke as SwimSkillLevel});
  }
 }
 sessions.sort((a,b)=>a.date.localeCompare(b.date)||a.week.localeCompare(b.week));
 const totalMeters=sessions.reduce((n,s)=>n+s.meters,0),bestContinuous=Math.max(0,...sessions.map(s=>s.continuous));
 const practiceMinutes=sessions.reduce((n,s)=>n+s.minutes,0);
 const bestPace=Object.entries(bestTimes).length?Math.min(...Object.entries(bestTimes).map(([m,s])=>s*100/Number(m))):null;
 const latestSkillLevel=sessions.map(s=>s.skillLevel).filter((v):v is SwimSkillLevel=>!!v).at(-1);
 const goal=Math.max(25,Math.min(10000,swimNumber(data.swimTargets?.[stroke])||SWIM_TARGET_DEFAULTS[stroke]));
 return {stroke,totalMeters,bestContinuous,practiceMinutes,sessions,bestTimes,bestPace,latestSkillLevel,goal,goalReached:bestContinuous>=goal};
}
export type SwimRecordEvent={id:string;stroke:SwimStroke;kind:'continuous'|'time';date:string;week:string;day:SwimDay;meters:number;seconds?:number};
/** Reconstructed chronologically, so same-session edits never generate duplicate achievements. */
export function swimPersonalBests(data:TrackerData):SwimRecordEvent[]{
 const attempts:SwimRecordEvent[]=[];
 for(const [week,record] of Object.entries(data.weeks))for(const day of SWIM_DAYS){
  if(!record.done?.[day])continue; // PR announcements require a completed swim.
  const log=record.swim?.[day];if(!log)continue;
  const date=completedDate(data,week,day),pool=effectivePool(log,data.swimPoolDefault);
  if(log.segments?.length){
   const old=swimNumber(log.longest);if(old>0)attempts.push({id:`swim-pr-cont:${week}:${day}:legacy:${old}`, stroke:'freestyle',kind:'continuous',date,week,day,meters:old});
   for(const [index,segment] of log.segments.entries()){
    if(!isStroke(segment.activity))continue;
    const cont=segmentContinuous(segment,pool);
    if(cont>0)attempts.push({id:`swim-pr-cont:${week}:${day}:${segment.id}:${cont}`, stroke:segment.activity,kind:'continuous',date,week,day,meters:cont});
    const timed=segmentTimed(segment,pool);
    if(timed)attempts.push({id:`swim-pr-time:${week}:${day}:${segment.id}:${timed.meters}:${timed.seconds}`, stroke:segment.activity,kind:'time',date,week,day,meters:timed.meters,seconds:timed.seconds});
   }
  }else{const old=swimNumber(log.longest);if(old>0)attempts.push({id:`swim-pr-cont:${week}:${day}:legacy:${old}`, stroke:'freestyle',kind:'continuous',date,week,day,meters:old});}
 }
 attempts.sort((a,b)=>a.date.localeCompare(b.date)||a.week.localeCompare(b.week)||a.id.localeCompare(b.id));
 const bestDistances=new Map<SwimStroke,number>(),bestTimes=new Map<string,number>();
 return attempts.filter(item=>{
  if(item.kind==='continuous'){
   const best=bestDistances.get(item.stroke)||0;if(item.meters<=best)return false;
   bestDistances.set(item.stroke,item.meters);return true;
  }
  const key=`${item.stroke}:${item.meters}`,best=bestTimes.get(key)||Infinity;
  if((item.seconds||Infinity)>=best)return false;
  bestTimes.set(key,item.seconds!);return true;
 });
}
export function segmentFromTemplate(template:SwimSegmentTemplate,mode:'learning'|'advanced'):SwimSegment {
 return blankSegment(template.activity,template.mode||mode);
}
export function strokeFromLabel(label:string):SwimActivity|undefined{
 const value=label.toLowerCase().trim();return (Object.keys(SWIM_ACTIVITY_LABELS) as SwimActivity[]).find(k=>SWIM_ACTIVITY_LABELS[k].toLowerCase()===value);
}

/** Reuse customized swim-plan names wherever session summaries are shown. */
export function sessionDisplayName(data:TrackerData,week:string,day:import('./types').Day):string {
 if((SWIM_DAYS as readonly string[]).includes(day))return swimRoutine(data,week,day as SwimDay).name;
 return PLAN[day].name;
}
export function sessionDisplaySubtitle(data:TrackerData,week:string,day:import('./types').Day):string {
 if((SWIM_DAYS as readonly string[]).includes(day))return swimRoutine(data,week,day as SwimDay).description;
 const p=PLAN[day];return p.subtitle;
}
