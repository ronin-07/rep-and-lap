import {normalizeSets,overlaySets} from './set-sync';
import {overlaySyncItems} from './item-sync';
import {DAYS, type TrackerData, type WeekLog, type Day} from './types';
import {SWIM_TARGET_DEFAULTS,SWIM_MODE_DEFAULTS} from './swimming';
function typedGymDay(day:Day):day is 'Monday'|'Tuesday'|'Wednesday'{return day==='Monday'||day==='Tuesday'||day==='Wednesday';}
export const STORAGE_KEY='rep-and-lap-firebase-v1'; // Reuse existing Firebase edition cache, no data reset.
export const LAST_ACCOUNT_KEY='rep-and-lap-firebase-last-account';
export const THEME_KEY='rep-and-lap-theme';
export function blankData():TrackerData {return {version:5,swimTemplates:{},swimPoolDefault:50,swimTargets:{...SWIM_TARGET_DEFAULTS},swimModes:{...SWIM_MODE_DEFAULTS},swimTechniqueMastery:{},routineTemplates:{},setRecords:{},pendingSets:{},setConflicts:{},syncItems:{},pendingItems:{},itemConflicts:{},weeks:{},weights:{},waterLogs:{},targetWeight:'',setOverrides:{},restSeconds:90,effortMode:'off',recordUpdates:{},pendingSync:{},reminders:{enabled:false,time:'18:00'}};}
export function weekBlank():WeekLog{return {done:{},gym:{},swim:{},sessionNotes:{},timing:{},schedule:{},completedAt:{},completedOn:{},scheduleStatus:{},routineOverrides:{},swimRoutineOverrides:{}};}
export function loadData(uid:string):TrackerData {
  if(typeof window==='undefined')return blankData();
  try {
    const value=JSON.parse(localStorage.getItem(`${STORAGE_KEY}:${uid}`)||'null');
    if(!value||typeof value.weeks!=='object'||Array.isArray(value.weeks))return blankData();
    const result:TrackerData={...blankData(),...value,version:5};
    if(!['off','rir','rpe'].includes(result.effortMode))result.effortMode='off';result.weights||={};result.waterLogs||={};result.recordUpdates||={};result.pendingSync||={};result.setOverrides||={};result.routineTemplates||={};result.swimTemplates||={};result.swimPoolDefault||=50;result.swimTargets||={...SWIM_TARGET_DEFAULTS};result.swimModes||={...SWIM_MODE_DEFAULTS};result.swimTechniqueMastery||={};
    if(!Object.keys(result.recordUpdates).length) {
      const t=Date.now()-60_000;
      for(const [w,entry] of Object.entries(result.weeks))for(const day of DAYS)
        if(entry.done?.[day]!==undefined||entry.gym?.[day as 'Monday']||entry.swim?.[day as 'Thursday']||entry.sessionNotes?.[day]||entry.timing?.[day]||entry.schedule?.[day]||entry.completedAt?.[day]||entry.completedOn?.[day]||entry.scheduleStatus?.[day]||entry.routineOverrides?.[day as 'Monday']||entry.swimRoutineOverrides?.[day as 'Thursday'])result.recordUpdates[`session:${w}:${day}`]=t;
      for(const k of Object.keys(result.weights))result.recordUpdates[`weight:${k}`]=t;
      for(const k of Object.keys(result.waterLogs))result.recordUpdates[`water:${k}`]=t;
    }
    result.syncItems||={};result.pendingItems||={};result.itemConflicts||={};
    normalizeSets(result);overlaySyncItems(result);return result;
  } catch{return blankData();}
}
export function saveData(uid:string,data:TrackerData) {localStorage.setItem(`${STORAGE_KEY}:${uid}`,JSON.stringify(data));}
export function recordPayload(data:TrackerData,key:string):unknown {
  if(key==='preferences')return {setOverrides:data.setOverrides,targetWeight:data.targetWeight,restSeconds:data.restSeconds,effortMode:data.effortMode,reminders:data.reminders,routineTemplates:data.routineTemplates,swimTemplates:data.swimTemplates,swimPoolDefault:data.swimPoolDefault,swimTargets:data.swimTargets,swimModes:data.swimModes,swimTechniqueMastery:data.swimTechniqueMastery};
  if(key.startsWith('weight:'))return data.weights[key.slice(7)]??{deleted:true};
  if(key.startsWith('water:'))return data.waterLogs[key.slice(6)]??{deleted:true};
  if(key.startsWith('session:')){
    const [,week,day]=key.split(':');const d=data.weeks[week];const typed=day as Day;
    return {done:d?.done?.[typed]??null,gym:d?.gym?.[typed as 'Monday']??null,swim:d?.swim?.[typed as 'Thursday']??null,notes:d?.sessionNotes?.[typed]??null,timing:d?.timing?.[typed]??null,plannedDate:d?.schedule?.[typed]??null,completedAt:d?.completedAt?.[typed]??null,completedOn:d?.completedOn?.[typed]??null,scheduleStatus:d?.scheduleStatus?.[typed]??null,routineOverride:d?.routineOverrides?.[typed as 'Monday']??null,swimRoutineOverride:d?.swimRoutineOverrides?.[typed as 'Thursday']??null};
  }
  return null;
}
export function applyRecord(data:TrackerData,key:string,value:unknown):TrackerData {
  const next:TrackerData=structuredClone(data);
  if(key==='preferences'){
    const p=(value||{}) as Partial<TrackerData>;
    next.setOverrides=p.setOverrides||{};next.routineTemplates=p.routineTemplates||{};next.swimTemplates=p.swimTemplates||{};next.swimPoolDefault=Number(p.swimPoolDefault)||50;next.swimTargets=p.swimTargets||{...SWIM_TARGET_DEFAULTS};next.swimModes=p.swimModes||{...SWIM_MODE_DEFAULTS};next.swimTechniqueMastery=p.swimTechniqueMastery||{};next.targetWeight=p.targetWeight??'';next.restSeconds=p.restSeconds||90;next.effortMode=['off','rir','rpe'].includes(p.effortMode||'')?p.effortMode!:'off';next.reminders=p.reminders||{enabled:false,time:'18:00'};
  }else if(key.startsWith('weight:'))next.weights[key.slice(7)]=(value||{deleted:true}) as TrackerData['weights'][string];
  else if(key.startsWith('water:'))next.waterLogs[key.slice(6)]=(value||{deleted:true}) as TrackerData['waterLogs'][string];
  else if(key.startsWith('session:')){
    const [,wk,day]=key.split(':');if(!/^\d{4}-\d{2}-\d{2}$/.test(wk)||!DAYS.includes(day as Day))return next;
    const d=day as Day,record=(value||{}) as {done?:boolean|null;gym?:unknown;swim?:unknown;notes?:unknown;timing?:unknown;plannedDate?:unknown;completedAt?:unknown;completedOn?:unknown;scheduleStatus?:unknown;routineOverride?:unknown;swimRoutineOverride?:unknown};
    const w=next.weeks[wk]??=weekBlank();
    if(record.done===null)delete w.done[d];
    else if(record.done!==undefined)w.done[d]=record.done;
    if(record.gym===null)delete w.gym[d as 'Monday'];
    else if(record.gym)w.gym[d as 'Monday']=record.gym as NonNullable<WeekLog['gym']['Monday']>;
    if(record.swim===null)delete w.swim[d as 'Thursday'];
    else if(record.swim)w.swim[d as 'Thursday']=record.swim as NonNullable<WeekLog['swim']['Thursday']>;
    if(record.notes===null)delete w.sessionNotes?.[d];
    else if(record.notes){w.sessionNotes??={};w.sessionNotes[d]=record.notes as NonNullable<WeekLog['sessionNotes']>[Day];}
    if(record.timing===null)delete w.timing?.[d];
    else if(record.timing && typeof record.timing==='object'){w.timing??={};w.timing[d]=record.timing as NonNullable<WeekLog['timing']>[Day];}
    if(typeof record.plannedDate==='string' && /^\d{4}-\d{2}-\d{2}$/.test(record.plannedDate)){w.schedule??={};w.schedule[d]=record.plannedDate;}
    else if(record.plannedDate===null && w.schedule)delete w.schedule[d];
    if(typeof record.completedAt==='string'&&!Number.isNaN(Date.parse(record.completedAt))){w.completedAt??={};w.completedAt[d]=record.completedAt;}
    else if(record.completedAt===null && w.completedAt)delete w.completedAt[d];
    if(typeof record.completedOn==='string' && /^\d{4}-\d{2}-\d{2}$/.test(record.completedOn)){w.completedOn??={};w.completedOn[d]=record.completedOn;}
    else if(record.completedOn===null && w.completedOn)delete w.completedOn[d];
    if(record.scheduleStatus==='rest'||record.scheduleStatus==='skipped'){w.scheduleStatus??={};w.scheduleStatus[d]=record.scheduleStatus;}
    else if(record.scheduleStatus===null && w.scheduleStatus)delete w.scheduleStatus[d];
    if(typedGymDay(d)&&Array.isArray(record.routineOverride)){w.routineOverrides??={};w.routineOverrides[d]=record.routineOverride as NonNullable<WeekLog['routineOverrides']>['Monday'];}
    else if(record.routineOverride===null && w.routineOverrides)delete w.routineOverrides[d as 'Monday'];
    if(!typedGymDay(d)&&record.swimRoutineOverride && typeof record.swimRoutineOverride==='object'){w.swimRoutineOverrides??={};w.swimRoutineOverrides[d as 'Thursday']=record.swimRoutineOverride as NonNullable<WeekLog['swimRoutineOverrides']>['Thursday'];}
    else if(!typedGymDay(d)&&record.swimRoutineOverride===null)delete w.swimRoutineOverrides?.[d as 'Thursday'];
  }
  overlaySets(next);overlaySyncItems(next);
  return next;
}
export function downloadFile(name:string,content:string,mime='application/json') {
  const url=URL.createObjectURL(new Blob([content],{type:mime}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
