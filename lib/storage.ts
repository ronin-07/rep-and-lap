import {DAYS, type TrackerData, type WeekLog, type Day} from './types';
export const STORAGE_KEY='rep-and-lap-firebase-v1'; // Reuse existing Firebase edition cache, no data reset.
export const LAST_ACCOUNT_KEY='rep-and-lap-firebase-last-account';
export const THEME_KEY='rep-and-lap-theme';
export function blankData():TrackerData {return {version:2,weeks:{},weights:{},waterLogs:{},targetWeight:'',setOverrides:{},restSeconds:90,recordUpdates:{},pendingSync:{},reminders:{enabled:false,time:'18:00'}};}
export function weekBlank():WeekLog{return {done:{},gym:{},swim:{},sessionNotes:{},timing:{},schedule:{},completedAt:{}};}
export function loadData(uid:string):TrackerData {
  if(typeof window==='undefined')return blankData();
  try {
    const value=JSON.parse(localStorage.getItem(`${STORAGE_KEY}:${uid}`)||'null');
    if(!value||typeof value.weeks!=='object'||Array.isArray(value.weeks))return blankData();
    const result:TrackerData={...blankData(),...value};
    result.weights||={};result.waterLogs||={};result.recordUpdates||={};result.pendingSync||={};result.setOverrides||={};
    if(!Object.keys(result.recordUpdates).length) {
      const t=Date.now()-60_000;
      for(const [w,entry] of Object.entries(result.weeks))for(const day of DAYS)
        if(entry.done?.[day]!==undefined||entry.gym?.[day as 'Monday']||entry.swim?.[day as 'Thursday']||entry.sessionNotes?.[day]||entry.timing?.[day]||entry.schedule?.[day]||entry.completedAt?.[day])result.recordUpdates[`session:${w}:${day}`]=t;
      for(const k of Object.keys(result.weights))result.recordUpdates[`weight:${k}`]=t;
      for(const k of Object.keys(result.waterLogs))result.recordUpdates[`water:${k}`]=t;
    }
    return result;
  } catch{return blankData();}
}
export function saveData(uid:string,data:TrackerData) {localStorage.setItem(`${STORAGE_KEY}:${uid}`,JSON.stringify(data));}
export function recordPayload(data:TrackerData,key:string):unknown {
  if(key==='preferences')return {setOverrides:data.setOverrides,targetWeight:data.targetWeight,restSeconds:data.restSeconds,reminders:data.reminders};
  if(key.startsWith('weight:'))return data.weights[key.slice(7)]??{deleted:true};
  if(key.startsWith('water:'))return data.waterLogs[key.slice(6)]??{deleted:true};
  if(key.startsWith('session:')){
    const [,week,day]=key.split(':');const d=data.weeks[week];const typed=day as Day;
    return {done:d?.done?.[typed]??null,gym:d?.gym?.[typed as 'Monday']??null,swim:d?.swim?.[typed as 'Thursday']??null,notes:d?.sessionNotes?.[typed]??null,timing:d?.timing?.[typed]??null,plannedDate:d?.schedule?.[typed]??null,completedAt:d?.completedAt?.[typed]??null};
  }
  return null;
}
export function applyRecord(data:TrackerData,key:string,value:unknown):TrackerData {
  const next:TrackerData=structuredClone(data);
  if(key==='preferences'){
    const p=(value||{}) as Partial<TrackerData>;
    next.setOverrides=p.setOverrides||{};next.targetWeight=p.targetWeight??'';next.restSeconds=p.restSeconds||90;next.reminders=p.reminders||{enabled:false,time:'18:00'};
  }else if(key.startsWith('weight:'))next.weights[key.slice(7)]=(value||{deleted:true}) as TrackerData['weights'][string];
  else if(key.startsWith('water:'))next.waterLogs[key.slice(6)]=(value||{deleted:true}) as TrackerData['waterLogs'][string];
  else if(key.startsWith('session:')){
    const [,wk,day]=key.split(':');if(!/^\d{4}-\d{2}-\d{2}$/.test(wk)||!DAYS.includes(day as Day))return next;
    const d=day as Day,record=(value||{}) as {done?:boolean|null;gym?:unknown;swim?:unknown;notes?:unknown;timing?:unknown;plannedDate?:unknown;completedAt?:unknown};
    const w=next.weeks[wk]??=weekBlank();
    if(record.done!==undefined&&record.done!==null)w.done[d]=record.done;
    if(record.gym)w.gym[d as 'Monday']=record.gym as NonNullable<WeekLog['gym']['Monday']>;
    if(record.swim)w.swim[d as 'Thursday']=record.swim as NonNullable<WeekLog['swim']['Thursday']>;
    if(record.notes){w.sessionNotes??={};w.sessionNotes[d]=record.notes as NonNullable<WeekLog['sessionNotes']>[Day];}
    if(record.timing && typeof record.timing==='object'){w.timing??={};w.timing[d]=record.timing as NonNullable<WeekLog['timing']>[Day];}
    if(typeof record.plannedDate==='string' && /^\d{4}-\d{2}-\d{2}$/.test(record.plannedDate)){w.schedule??={};w.schedule[d]=record.plannedDate;}
    else if(record.plannedDate===null && w.schedule)delete w.schedule[d];
    if(typeof record.completedAt==='string'&&!Number.isNaN(Date.parse(record.completedAt))){w.completedAt??={};w.completedAt[d]=record.completedAt;}
    else if(record.completedAt===null && w.completedAt)delete w.completedAt[d];
  }
  return next;
}
export function downloadFile(name:string,content:string,mime='application/json') {
  const url=URL.createObjectURL(new Blob([content],{type:mime}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
