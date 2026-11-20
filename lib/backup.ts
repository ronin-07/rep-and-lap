import {DAYS,type Day,type GymDay,type SwimDay,type TrackerData,type WeekLog} from './types';
import {blankData,weekBlank} from './storage';
import {normalizeSets} from './set-sync';

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
function validateWeek(week:unknown){
  const w=safeRecord(week,'week',16);
  for(const section of ['done','gym','swim','sessionNotes','timing','schedule','completedAt','scheduleStatus','routineOverrides']){
    if(w[section]===undefined)continue;
    const daily=safeRecord(w[section],section,7);
    for(const [day,value] of Object.entries(daily)){
      check(DAYS.includes(day as Day),`Unexpected day in ${section}`);
      if(section==='scheduleStatus')check(value==='rest'||value==='skipped','Invalid schedule status');
      if(section==='routineOverrides'){check(['Monday','Tuesday','Wednesday'].includes(day),'Invalid gym routine day');validateExercises(value);}
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
      if(section==='swim'||section==='sessionNotes'||section==='timing')check(object(value),'Invalid session details');
      if(section==='completedAt')check(typeof value==='string'&&Number.isFinite(Date.parse(value)),'Invalid completion timestamp');
    }
  }
}
function hasSession(w:WeekLog,day:Day):boolean {
  return hasOwn(w.done||{},day)||!!w.gym?.[day as GymDay]||!!w.swim?.[day as SwimDay]||!!w.sessionNotes?.[day]||!!w.timing?.[day]||!!w.schedule?.[day]||!!w.completedAt?.[day]||!!w.scheduleStatus?.[day]||!!w.routineOverrides?.[day as GymDay];
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
  check(typeof version==='number'&&Number.isInteger(version)&&version>=1&&version<=4,'Unsupported backup version');
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
      for(const prop of ['done','gym','swim','sessionNotes','timing','schedule','completedAt','scheduleStatus','routineOverrides'] as const){
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
  if(addedTemplate)changedKeys.push('preferences');
  return {data:normalizeSets(data),changedKeys,duplicates,newRecords};
}
export function markRestoredWrites(data:TrackerData,keys:string[],stamp=Date.now()):void {
  keys.forEach((key,i)=>{const t=Math.max(stamp+i,(data.recordUpdates[key]||0)+1);data.recordUpdates[key]=t;data.pendingSync[key]=t;});
}
export function replaceLocalBackup(source:TrackerData):TrackerData {return normalizeSets(structuredClone(source));}

// Spreadsheet applications evaluate formula-prefixed CSV cells, even when quoted.
export function csvCell(value:string):string {
  const safe=/^[\s]*[=+@\-\t\r]/.test(value)?`'${value}`:value;
  return `"${safe.replace(/"/g,'""')}"`;
}
