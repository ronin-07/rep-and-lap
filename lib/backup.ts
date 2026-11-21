import {DAYS,type Day,type GymDay,type SwimDay,type TrackerData,type WeekLog} from './types';
import {blankData,weekBlank} from './storage';
import {normalizeSets} from './set-sync';
import {clockItemKey,queueSwimSegment,queueSyncItem} from './item-sync';
import {SWIM_STROKES,SWIM_ACTIVITY_LABELS,SWIM_CHECKLIST,validPool,validSwimSegmentPatch} from './swimming';

export interface BackupCounts {sessions:number;sets:number;weighIns:number;drinks:number}
export interface BackupPreview {backup:TrackerData;counts:BackupCounts;duplicates:number;newRecords:number;version:number;exportedAt?:string}
export type RestoreMode='merge'|'replace-local';
const DATE=/^\d{4}-\d{2}-\d{2}$/;
const validDate=(value:string)=>DATE.test(value)&&!Number.isNaN(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
const hasOwn=(value:object,key:string)=>Object.prototype.hasOwnProperty.call(value,key);
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
function check(condition:unknown,message:string):asserts condition {if(!condition)throw new Error(message);}
function safeRecord(v:unknown,label:string,max:number):Record<string,unknown> {
  check(object(v),`Invalid ${label}`);
  const entries=Object.entries(v);check(entries.length<=max,`Too many ${label}`);
  for(const [key] of entries)check(!['__proto__','prototype','constructor'].includes(key),`Unsafe ${label} key`);
  return v;
}
function saneScalar(v:unknown,max=1000){return v===undefined||v===null||(typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<=max)||(typeof v==='string'&&v.length<=40&&Number.isFinite(Number(v))&&Math.abs(Number(v))<=max);}
function validateExercises(value:unknown){
 check(Array.isArray(value)&&value.length<=30,'Invalid routine exercises');
 const seen=new Set<string>();
 for(const candidate of value){const ex=safeRecord(candidate,'routine exercise',4);check(Object.keys(ex).every(k=>['name','sets','reps','muscles'].includes(k)),'Unexpected routine field');
  check(typeof ex.name==='string'&&ex.name.trim().length>0&&ex.name.length<=160&&!seen.has(ex.name),'Invalid or duplicate exercise name');
  check(typeof ex.sets==='number'&&Number.isInteger(ex.sets)&&ex.sets>=1&&ex.sets<=10,'Invalid routine set count');
  check(typeof ex.reps==='string'&&ex.reps.length<=50&&typeof ex.muscles==='string'&&ex.muscles.length<=160,'Invalid routine fields');
  seen.add(ex.name);
 }
}
const ACTIVITY_NAMES=new Set(Object.keys(SWIM_ACTIVITY_LABELS));
function validateSwimRoutine(value:unknown){
 const plan=safeRecord(value,'swim plan',5);
 check(Object.keys(plan).every(k=>['name','description','activities'].includes(k)),'Unexpected swim plan fields');
 check(typeof plan.name==='string'&&plan.name.length<=80&&plan.name.trim().length>0,'Invalid swim plan title');
 check(typeof plan.description==='string'&&plan.description.length<=240,'Invalid swim description');
 check(Array.isArray(plan.activities)&&plan.activities.length<=15,'Invalid planned activities');
 for(const item of plan.activities){const row=safeRecord(item,'planned swim activity',5);
  check(typeof row.activity==='string'&&ACTIVITY_NAMES.has(row.activity),'Invalid swim activity');
  if(row.mode!==undefined)check(row.mode==='learning'||row.mode==='advanced','Invalid swim tracking mode');
  if(row.plannedMinutes!==undefined)check(typeof row.plannedMinutes==='number'&&Number.isFinite(row.plannedMinutes)&&row.plannedMinutes>=0&&row.plannedMinutes<=240,'Invalid planned duration');
 }
}
function validateSwim(value:unknown){
 const entry=safeRecord(value,'swim log',18);
 for(const k of ['duration','distance','longest','rest','rpe','sculling','treading','poolLength','lengths'])if(entry[k]!==undefined)check(saneScalar(entry[k],200000),'Invalid legacy swim measurement');
 if(entry.notes!==undefined)check(typeof entry.notes==='string'&&entry.notes.length<=5000,'Invalid swim note');
 if(entry.breaststroke!==undefined)check(typeof entry.breaststroke==='string'&&entry.breaststroke.length<=60,'Invalid learning status');
 if(entry.drills!==undefined){const keys=safeRecord(entry.drills,'legacy drill checks',60);for(const done of Object.values(keys))check(typeof done==='boolean','Invalid legacy drill state');}
 if(entry.intervals!==undefined){check(Array.isArray(entry.intervals)&&entry.intervals.length<=80,'Invalid legacy intervals');for(const value of entry.intervals){const row=safeRecord(value,'legacy interval',8);for(const field of ['repeats','lengths','rest','pool'])check(typeof row[field]==='number'&&Number.isFinite(row[field]),'Invalid legacy interval field');}}
 if(entry.segments!==undefined){check(Array.isArray(entry.segments)&&entry.segments.length<=25,'Invalid swim segments');
  if(entry.segments.length)check(entry.poolLength===undefined||(typeof entry.poolLength==='number'&&validPool(entry.poolLength)===entry.poolLength),'Invalid segmented swim pool length');
  const ids=new Set<string>();
  for(const value of entry.segments){const row=safeRecord(value,'swim segment',18);
   check(typeof row.id==='string'&&row.id.length<=100&&!ids.has(row.id),'Invalid or duplicate swim segment ID');ids.add(row.id);
   check(typeof row.activity==='string'&&ACTIVITY_NAMES.has(row.activity),'Unknown swimming stroke or drill');
   check(row.mode==='learning'||row.mode==='advanced','Invalid stroke mode');
   check(validSwimSegmentPatch(row as unknown as import('./types').SwimSegment),'Invalid swim measurement');
   if(row.skillLevel!==undefined)check(['Not started','Learning','Basic','Comfortable','Confident'].includes(String(row.skillLevel)),'Invalid swim skill level');
   if(row.difficulty!==undefined)check(['','Easy','Moderate','Difficult'].includes(String(row.difficulty)),'Invalid difficulty');
   if(row.notes!==undefined)check(typeof row.notes==='string'&&row.notes.length<=5000,'Swim notes too long');
   if(row.technique!==undefined){const checks=safeRecord(row.technique,'technique checks',50);for(const [key,flag] of Object.entries(checks))check(key.length<=150&&typeof flag==='boolean','Invalid technique state');}
   if(row.intervals!==undefined){check(Array.isArray(row.intervals)&&row.intervals.length<=60,'Invalid interval list');
    for(const item of row.intervals){const x=safeRecord(item,'interval set',8);
     check(typeof x.id==='string'&&x.id.length<=100,'Invalid interval ID');
     check(typeof x.repeats==='number'&&Number.isInteger(x.repeats)&&x.repeats>=1&&x.repeats<=50,'Invalid repetitions');
     check(typeof x.lengths==='number'&&Number.isInteger(x.lengths)&&x.lengths>=1&&x.lengths<=40,'Invalid lengths');
     check(typeof x.restSeconds==='number'&&Number.isInteger(x.restSeconds)&&x.restSeconds>=0&&x.restSeconds<=1800,'Invalid rest');
     if(x.secondsPerRepeat!==undefined){
      const raw=x.secondsPerRepeat;
      const seconds=typeof raw==='number'?raw:typeof raw==='string'&&raw.trim()!==''?Number(raw):NaN;
      check(Number.isFinite(seconds)&&seconds>0&&seconds<=10000,'Invalid timed interval');
     }
    }
   }
  }
 }
}
function validateWeek(week:unknown){
  const w=safeRecord(week,'week',16);
  for(const section of ['done','gym','swim','sessionNotes','timing','schedule','completedAt','completedOn','scheduleStatus','routineOverrides','swimRoutineOverrides']){
    if(w[section]===undefined)continue;
    const daily=safeRecord(w[section],section,7);
    for(const [day,value] of Object.entries(daily)){
      check(DAYS.includes(day as Day),`Unexpected day in ${section}`);
      if(section==='scheduleStatus')check(value==='rest'||value==='skipped','Invalid schedule status');
      if(section==='routineOverrides'){check(['Monday','Tuesday','Wednesday'].includes(day),'Invalid gym routine day');validateExercises(value);}
      if(section==='swimRoutineOverrides'){check(['Thursday','Friday','Saturday'].includes(day),'Invalid swim routine day');validateSwimRoutine(value);}
      if(section==='done')check(typeof value==='boolean',`Invalid completion flag`);
      if(section==='schedule')check(typeof value==='string'&&validDate(value),`Invalid scheduled date`);
      if(section==='gym'){
        const exercises=safeRecord(value,'exercise list',60);
        for(const [name,exercise] of Object.entries(exercises)){
          check(name.length>0&&name.length<=160,'Invalid exercise name');
          const ex=safeRecord(exercise,'exercise',6);check(Array.isArray(ex.sets)&&ex.sets.length<=30,'Invalid exercise sets');
          for(const set of ex.sets){if(set==null)continue;const s=safeRecord(set,'set',9);
            check(saneScalar(s.kg,1200)&&saneScalar(s.reps,1000),'Invalid set numbers');
            if(s.rir!==undefined)check(typeof s.rir==='number'&&Number.isInteger(s.rir)&&s.rir>=0&&s.rir<=4,'Invalid set RIR');
            if(s.rpe!==undefined)check(typeof s.rpe==='number'&&s.rpe>=6&&s.rpe<=10&&s.rpe*2===Math.round(s.rpe*2),'Invalid set RPE');
            check(s.done===undefined||typeof s.done==='boolean','Invalid completed set');
            check(s.deleted===undefined||typeof s.deleted==='boolean','Invalid deleted set');
            if(s.id!==undefined)check(typeof s.id==='string'&&/^s-[a-f0-9]{8}-\d{1,2}$/.test(s.id),'Invalid set ID');
          }
          if(ex.notes!==undefined)check(typeof ex.notes==='string'&&ex.notes.length<=5000,'Exercise note too long');
        }
      }
      if(section==='swim')validateSwim(value);
      if(section==='sessionNotes')check(object(value),'Invalid session details');
      if(section==='timing'){
        const clock=safeRecord(value,'session clock',5);
        const isStamp=(input:unknown)=>typeof input==='string'&&Number.isFinite(Date.parse(input));
        for(const field of ['startedAt','endedAt','pausedAt'])if(clock[field]!==undefined)check(isStamp(clock[field]),`Invalid ${field} timestamp`);
        if(clock.pausedDurationMs!==undefined)check(typeof clock.pausedDurationMs==='number'&&Number.isSafeInteger(clock.pausedDurationMs)&&clock.pausedDurationMs>=0,'Invalid paused duration');
        if(clock.autoStopped!==undefined)check(clock.autoStopped===true&&clock.endedAt!==undefined&&clock.pausedAt===undefined,'Invalid automatic stop flag');
        if(clock.pausedAt!==undefined){
          check(isStamp(clock.startedAt)&&clock.endedAt===undefined,'A paused clock must be running');
          check(Date.parse(clock.pausedAt as string)>=Date.parse(clock.startedAt as string),'Pause precedes session start');
        }
        if(clock.startedAt!==undefined&&clock.endedAt!==undefined)
          check(Date.parse(clock.endedAt as string)>=Date.parse(clock.startedAt as string),'Session ends before it starts');
      }
      if(section==='completedAt')check(typeof value==='string'&&Number.isFinite(Date.parse(value)),'Invalid completion timestamp');
      if(section==='completedOn')check(typeof value==='string'&&validDate(value),'Invalid actual completion date');
    }
  }
}
function hasSession(w:WeekLog,day:Day):boolean {
  return hasOwn(w.done||{},day)||!!w.gym?.[day as GymDay]||!!w.swim?.[day as SwimDay]||!!w.sessionNotes?.[day]||!!w.timing?.[day]||!!w.schedule?.[day]||!!w.completedAt?.[day]||!!w.completedOn?.[day]||!!w.scheduleStatus?.[day]||!!w.routineOverrides?.[day as GymDay]||!!w.swimRoutineOverrides?.[day as SwimDay];
}
export function countRecords(data:TrackerData):BackupCounts {
  let sessions=0,sets=0;
  for(const w of Object.values(data.weeks))for(const day of DAYS){
    if(hasSession(w,day))sessions++;
    for(const entry of Object.values(w.gym?.[day as GymDay]||{}))sets+=entry.sets.filter(s=>s&&!s.deleted&&(s.kg!==undefined||s.reps!==undefined||s.done)).length;
  }
  return {sessions,sets,weighIns:Object.values(data.weights).filter(x=>!x.deleted).length,drinks:Object.values(data.waterLogs).filter(x=>!x.deleted).length};
}
export function readBackup(text:string,current:TrackerData):BackupPreview {
  check(text.length<=5_000_000,'Backup exceeds 5 MB');
  const raw=safeRecord(JSON.parse(text) as unknown,'backup',35);
  const version=raw.version??1;
  check(typeof version==='number'&&Number.isInteger(version)&&version>=1&&version<=5,'Unsupported backup version');
  const weeks=safeRecord(raw.weeks,'weeks',520),weights=safeRecord(raw.weights??{},'weigh-ins',6000),water=safeRecord(raw.waterLogs??{},'drinks',50000);
  for(const [day,w] of Object.entries(weeks)){check(validDate(day),'Invalid week date');validateWeek(w);}
  for(const [day,value] of Object.entries(weights)){
    check(validDate(day),'Invalid weigh-in date');const row=safeRecord(value,'weigh-in',5);
    check(row.deleted===true||(saneScalar(row.kg,400)&&row.kg!==undefined),'Invalid weight');
    if(row.note!==undefined)check(typeof row.note==='string'&&row.note.length<=3000,'Invalid weight note');
  }
  for(const [id,value] of Object.entries(water)){
    check(/^[A-Za-z0-9_-]{1,100}$/.test(id),'Invalid drink ID');const row=safeRecord(value,'drink',6);
    check(typeof row.date==='string'&&validDate(row.date),'Invalid drink date');
    check(typeof row.at==='string'&&Number.isFinite(Date.parse(row.at)),'Invalid drink timestamp');
    check(typeof row.ml==='number'&&Number.isFinite(row.ml)&&row.ml>=0&&row.ml<=5000,'Invalid drink volume');
  }
  const base=blankData();
  base.weeks=weeks as unknown as TrackerData['weeks'];
  base.weights=weights as unknown as TrackerData['weights'];
  base.waterLogs=water as unknown as TrackerData['waterLogs'];
  if(raw.setOverrides!==undefined){
    const overrides=safeRecord(raw.setOverrides,'set overrides',500);
    for(const [key,value] of Object.entries(overrides))check(key.length<=200&&typeof value==='number'&&Number.isInteger(value)&&value>=1&&value<=30,'Invalid set override');
    base.setOverrides={...overrides} as Record<string,number>;
  }
  if(raw.routineTemplates!==undefined){const templates=safeRecord(raw.routineTemplates,'routine templates',3);for(const [day,value] of Object.entries(templates)){check(['Monday','Tuesday','Wednesday'].includes(day),'Invalid routine template day');validateExercises(value);}base.routineTemplates=templates as TrackerData['routineTemplates'];}
  if(raw.swimTemplates!==undefined){const templates=safeRecord(raw.swimTemplates,'swim routines',3);for(const [day,value] of Object.entries(templates)){check(['Thursday','Friday','Saturday'].includes(day),'Invalid swim routine day');validateSwimRoutine(value);}base.swimTemplates=templates as TrackerData['swimTemplates'];}
  if(raw.swimPoolDefault!==undefined){check(typeof raw.swimPoolDefault==='number'&&validPool(raw.swimPoolDefault)===raw.swimPoolDefault,'Invalid default pool length');base.swimPoolDefault=raw.swimPoolDefault;}
  if(raw.swimTargets!==undefined){const values=safeRecord(raw.swimTargets,'swim targets',4);for(const [key,value] of Object.entries(values))check((SWIM_STROKES as readonly string[]).includes(key)&&typeof value==='number'&&value>=25&&value<=10000,'Invalid swim goal');base.swimTargets=values as TrackerData['swimTargets'];}
  if(raw.swimModes!==undefined){const values=safeRecord(raw.swimModes,'swim modes',4);for(const [key,value] of Object.entries(values))check((SWIM_STROKES as readonly string[]).includes(key)&&(value==='learning'||value==='advanced'),'Invalid swim mode');base.swimModes=values as TrackerData['swimModes'];}
  if(raw.swimTechniqueMastery!==undefined){
   const strokes=safeRecord(raw.swimTechniqueMastery,'technique mastery',4);
   for(const [stroke,flags] of Object.entries(strokes)){
    check((SWIM_STROKES as readonly string[]).includes(stroke),'Invalid mastery stroke');
    const steps=safeRecord(flags,'technique mastery steps',10);
    for(const [step,mastered] of Object.entries(steps))check(SWIM_CHECKLIST[stroke as typeof SWIM_STROKES[number]].includes(step)&&typeof mastered==='boolean','Invalid technique mastery confirmation');
   }
   base.swimTechniqueMastery=strokes as TrackerData['swimTechniqueMastery'];
  }
  if(raw.waterGoalHistory!==undefined){
   const goals=safeRecord(raw.waterGoalHistory,'water goals',500);
   for(const [date,value] of Object.entries(goals))check(/^\d{4}-\d{2}-\d{2}$/.test(date)&&typeof value==='number'&&Number.isInteger(value)&&value>=500&&value<=6000,'Invalid daily water goal');
   base.waterGoalHistory=goals as Record<string,number>;
  }
  if(saneScalar(raw.targetWeight,400))base.targetWeight=raw.targetWeight as TrackerData['targetWeight'];
  if(typeof raw.restSeconds==='number'&&raw.restSeconds>=15&&raw.restSeconds<=600)base.restSeconds=raw.restSeconds;
  if(raw.effortMode==='off'||raw.effortMode==='rir'||raw.effortMode==='rpe')base.effortMode=raw.effortMode;
  if(object(raw.reminders)&&typeof raw.reminders.enabled==='boolean'&&typeof raw.reminders.time==='string')base.reminders={enabled:raw.reminders.enabled,time:raw.reminders.time};
  // Derived revisions, pending cloud writes, remote snapshots and conflicts are intentionally discarded.
  // The validated gym values in weeks are the portable source of truth for restore.
  normalizeSets(base);
  const result=mergeBackup(current,base);
  return {backup:base,counts:countRecords(base),duplicates:result.duplicates,newRecords:result.newRecords,version,exportedAt:typeof raw.exportedAt==='string'?raw.exportedAt:undefined};
}
export function mergeBackup(current:TrackerData,source:TrackerData):{data:TrackerData;changedKeys:string[];duplicates:number;newRecords:number} {
  const data=structuredClone(current),changedKeys:string[]=[];
  let duplicates=0,newRecords=0;
  for(const [week,incoming] of Object.entries(source.weeks)){
    const existing=data.weeks[week]??=weekBlank();
    for(const day of DAYS){
      if(!hasSession(incoming,day))continue;
      if(hasSession(existing,day)){duplicates++;continue;}
      for(const prop of ['done','gym','swim','sessionNotes','timing','schedule','completedAt','completedOn','scheduleStatus','routineOverrides','swimRoutineOverrides'] as const){
        const from=incoming[prop] as Record<string,unknown>|undefined;
        if(from&&hasOwn(from,day)){const into=(existing[prop]??={}) as Record<string,unknown>;into[day]=structuredClone(from[day]);}
      }
      changedKeys.push(`session:${week}:${day}`);newRecords++;
    }
  }
  for(const [date,weight] of Object.entries(source.weights)){
    if(hasOwn(data.weights,date)){duplicates++;continue;}
    data.weights[date]=structuredClone(weight);changedKeys.push(`weight:${date}`);newRecords++;
  }
  for(const [id,drink] of Object.entries(source.waterLogs)){
    if(hasOwn(data.waterLogs,id)){duplicates++;continue;}
    data.waterLogs[id]=structuredClone(drink);changedKeys.push(`water:${id}`);newRecords++;
  }
  // The user's saved routine templates are portable preferences, but never overwrite an existing template during Merge.
  let addedTemplate=false;for(const day of ['Monday','Tuesday','Wednesday'] as const){if(!data.routineTemplates[day]&&source.routineTemplates[day]){data.routineTemplates[day]=structuredClone(source.routineTemplates[day]);addedTemplate=true;}}
  for(const day of ['Thursday','Friday','Saturday'] as const)if(!data.swimTemplates[day]&&source.swimTemplates[day]){data.swimTemplates[day]=structuredClone(source.swimTemplates[day]);addedTemplate=true;}
  // Merge conservatively: existing training preferences always win.
  for(const stroke of SWIM_STROKES){if(!data.swimTargets[stroke]&&source.swimTargets[stroke]){data.swimTargets[stroke]=source.swimTargets[stroke];addedTemplate=true;}}
  // Confirmations are imported only for unconfirmed steps, never removing existing choices.
  for(const stroke of SWIM_STROKES){
   const existing=data.swimTechniqueMastery[stroke]??={};
   for(const [step,confirmed] of Object.entries(source.swimTechniqueMastery?.[stroke]||{}))if(confirmed&&!existing[step]){existing[step]=true;addedTemplate=true;}
  }
  for(const [date,goal] of Object.entries(source.waterGoalHistory||{}))if(!(date in data.waterGoalHistory)){data.waterGoalHistory[date]=goal;addedTemplate=true;}
  if(addedTemplate)changedKeys.push('preferences');
  return {data:normalizeSets(data),changedKeys,duplicates,newRecords};
}
export function markRestoredWrites(data:TrackerData,keys:string[],stamp=Date.now()):void {
  keys.forEach((key,i)=>{
    const t=Math.max(stamp+i,(data.recordUpdates[key]||0)+1);data.recordUpdates[key]=t;data.pendingSync[key]=t;
    // Backups predate independent records. Imported sessions must publish their
    // clocks and individual swimming activities as well as their legacy payload.
    const match=/^session:(\d{4}-\d{2}-\d{2}):(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)$/.exec(key);
    if(!match)return;
    const [,week,day]=match,entry=data.weeks[week];if(!entry)return;
    const clock=entry.timing?.[day as Day];
    if(clock)queueSyncItem(data,clockItemKey(week,day as Day),'clock',clock,t);
    if(['Thursday','Friday','Saturday'].includes(day))for(const segment of entry.swim?.[day as SwimDay]?.segments||[]){
      // Older backups permitted arbitrary IDs up to 100 characters. Preserve
      // those records in the legacy session without queuing an invalid cloud
      // document; app-generated activity IDs fit the independent-sync schema.
      queueSwimSegment(data,week,day as SwimDay,segment.id,segment,t);
    }
  });
}
export function replaceLocalBackup(source:TrackerData):TrackerData {return normalizeSets(structuredClone(source));}

// Spreadsheet applications evaluate formula-prefixed CSV cells, even when quoted.
export function csvCell(value:string):string {
  const safe=/^[\s]*[=+@\-\t\r]/.test(value)?`'${value}`:value;
  return `"${safe.replace(/"/g,'""')}"`;
}
