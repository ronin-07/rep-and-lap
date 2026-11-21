/** Independently versioned swim activities, session stopwatches and rest timer.
 * Legacy session documents remain readable; these records are overlaid last. */
import type {Day,SessionTiming,SwimDay,SwimSegment,TrackerData,WeekLog} from './types';
import type {RestState} from './workout-flow';

export type ItemKind = 'swim-segment'|'clock'|'rest';
export type ItemValue = SwimSegment|SessionTiming|RestState|null;
export interface SyncItemDocument {key:string;kind:ItemKind;value:ItemValue;revision:number;updatedMs:number;updatedBy:string}
export interface PendingSyncItem {key:string;kind:ItemKind;value:ItemValue;baseRevision:number;updatedMs:number}
export interface SyncItemConflict {local:PendingSyncItem;remote:SyncItemDocument|null}

export function clockItemKey(week:string,day:Day):string {return `session:${week}:${day}~clock`;}
export function swimItemKey(week:string,day:SwimDay,id:string):string {return `session:${week}:${day}~${id}`;}
export const REST_ITEM_KEY='rest';
// Legacy backups accepted arbitrary activity IDs. Those remain supported via
// the original session snapshot, while new records use this restricted key.
export function canSyncSwimSegmentId(id:string):boolean {return /^[A-Za-z0-9_-]{1,72}$/.test(id)&&id!=='clock';}
export function queueSwimSegment(data:TrackerData,week:string,day:SwimDay,id:string,value:SwimSegment|null,stamp=Date.now()):void {
 if(canSyncSwimSegmentId(id))queueSyncItem(data,swimItemKey(week,day,id),'swim-segment',value,stamp);
}
const sessionPattern=/^session:(\d{4}-\d{2}-\d{2}):(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)~([a-zA-Z0-9_-]{1,72})$/;
function weekBlank():WeekLog{return {done:{},gym:{},swim:{},timing:{},sessionNotes:{},schedule:{},completedAt:{},completedOn:{},scheduleStatus:{},routineOverrides:{},swimRoutineOverrides:{}};}

export function applySyncItem(data:TrackerData,item:Pick<SyncItemDocument,'key'|'kind'|'value'>):void {
 if(item.kind==='rest')return; // The running rest countdown lives outside the workout log.
 const parsed=sessionPattern.exec(item.key);if(!parsed)return;
 const [,week,day,id]=parsed;
 const w=data.weeks[week]??=weekBlank();
 if(item.kind==='clock'){
   if(id!=='clock')return;
   w.timing??={};
   if(item.value===null)delete w.timing[day as Day];
   else w.timing[day as Day]=item.value as SessionTiming;
 }else if(item.kind==='swim-segment'){
   if(!['Thursday','Friday','Saturday'].includes(day)||id==='clock')return;
   const log=w.swim[day as SwimDay]??={};
   const original=log.segments??[];
   const index=original.findIndex(s=>s.id===id);
   if(item.value===null){log.segments=original.filter(s=>s.id!==id);}
   else if(index>=0){log.segments=[...original];log.segments[index]=item.value as SwimSegment;}
   else log.segments=[...original,item.value as SwimSegment];
 }
}
/** Preserve canonical item revisions over snapshots from older RepLap releases. */
export function overlaySyncItems(data:TrackerData):void {
 for(const record of Object.values(data.syncItems||{}))applySyncItem(data,record);
 for(const pending of Object.values(data.pendingItems||{}))applySyncItem(data,pending);
}
export function queueSyncItem(data:TrackerData,key:string,kind:ItemKind,value:ItemValue,stamp=Date.now()):void {
 data.syncItems??={};data.pendingItems??={};data.itemConflicts??={};
 const prior=data.pendingItems[key];
 data.pendingItems[key]={key,kind,value:structuredClone(value),baseRevision:prior?.baseRevision??data.syncItems[key]?.revision??0,updatedMs:Math.max(stamp,(prior?.updatedMs||0)+1)};
 delete data.itemConflicts[key];
}
export function integrateServerItem(data:TrackerData,item:SyncItemDocument):void {
 const prev=data.syncItems[item.key];if(prev&&prev.revision>item.revision)return;
 data.syncItems[item.key]=item;
 if(!data.pendingItems[item.key])applySyncItem(data,item);
}
export function acknowledgeItem(data:TrackerData,item:SyncItemDocument,stamp:number):void {
 data.syncItems[item.key]=item;
 const pending=data.pendingItems[item.key];
 if(pending?.updatedMs===stamp){delete data.pendingItems[item.key];delete data.itemConflicts[item.key];applySyncItem(data,item);}
 else if(pending){pending.baseRevision=item.revision;}
 else applySyncItem(data,item);
}
export function flagItemConflict(data:TrackerData,key:string,remote:SyncItemDocument|null):void {
 const pending=data.pendingItems[key];if(pending)data.itemConflicts[key]={local:structuredClone(pending),remote};
}
export function resolveItemConflict(data:TrackerData,key:string,choice:'mine'|'cloud',stamp=Date.now()):void {
 const conflict=data.itemConflicts[key];if(!conflict)return;
 if(choice==='cloud'){
   delete data.pendingItems[key];
   if(conflict.remote){data.syncItems[key]=conflict.remote;applySyncItem(data,conflict.remote);}
   else applySyncItem(data,{key,kind:conflict.local.kind,value:null});
 }else{
   const pending=data.pendingItems[key];if(pending){pending.baseRevision=conflict.remote?.revision??0;pending.updatedMs=Math.max(stamp,pending.updatedMs+1);}
   if(conflict.remote)data.syncItems[key]=conflict.remote;
 }
 delete data.itemConflicts[key];
}
export class ItemVersionConflict extends Error {
 constructor(public remote:SyncItemDocument|null){super('This training item was edited on another device');this.name='ItemVersionConflict';}
}
export function acceptItemRevision(remote:SyncItemDocument|null,op:PendingSyncItem):'write'|'already-saved'|'conflict' {
 if(remote&&remote.kind!==op.kind)return 'conflict';
 if(remote&&JSON.stringify(remote.value)===JSON.stringify(op.value))return 'already-saved';
 return (remote?.revision??0)===op.baseRevision?'write':'conflict';
}
export function itemDisplayName(op:Pick<PendingSyncItem,'key'|'kind'|'value'>):string {
 if(op.kind==='rest')return 'Rest countdown';
 const match=sessionPattern.exec(op.key);
 const location=match?`${match[1]} · ${match[2]}`:'Training session';
 return op.kind==='clock'?`${location} · workout timer`:`${location} · ${(op.value as SwimSegment|null)?.activity??'swimming activity'}`;
}
