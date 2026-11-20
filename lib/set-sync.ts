import type {GymSet,PendingSetWrite,SetDocument,TrackerData,GymDay,WeekLog} from './types';
const weekBlank=():WeekLog=>({done:{},gym:{},swim:{},sessionNotes:{},timing:{},schedule:{},completedAt:{},scheduleStatus:{},routineOverrides:{}});

export const DATA_SCHEMA_VERSION=4;
export function stableSetId(exercise:string,index:number):string {
  // Deterministic IDs let two devices upgrade pre-v3 sets without duplicating them.
  let hash=2166136261;
  for(let i=0;i<exercise.length;i++){hash^=exercise.charCodeAt(i);hash=Math.imul(hash,16777619);}
  return `s-${(hash>>>0).toString(16).padStart(8,'0')}-${index}`;
}
export function setKey(sessionKey:string,setId:string):string {return `${sessionKey}~${setId}`;}
export function parseGymSessionKey(key:string):{week:string;day:GymDay}|null {
  const m=/^session:(\d{4}-\d{2}-\d{2}):(Monday|Tuesday|Wednesday)$/.exec(key);
  return m?{week:m[1],day:m[2] as GymDay}:null;
}
export function normalizeSets(data:TrackerData):TrackerData {
  data.version=DATA_SCHEMA_VERSION;
  data.setRecords??={};data.pendingSets??={};data.setConflicts??={};
  for(const entry of Object.values(data.weeks||{})) {
    entry.done??={};entry.gym??={};entry.swim??={};
    entry.sessionNotes??={};entry.timing??={};entry.schedule??={};entry.completedAt??={};entry.scheduleStatus??={};entry.routineOverrides??={};
    for(const exercises of Object.values(entry.gym))for(const [exercise,log] of Object.entries(exercises||{})){
      if(!Array.isArray(log?.sets))continue;
      log.sets.forEach((set,index)=>{if(set&&!set.id)set.id=stableSetId(exercise,index);});
    }
  }
  overlaySets(data);
  return data;
}
function placeSet(data:TrackerData,record:Pick<SetDocument,'sessionKey'|'setId'|'exercise'|'index'|'value'>){
  const session=parseGymSessionKey(record.sessionKey);
  if(!session||record.index<0||record.index>30)return;
  const entry=data.weeks[session.week]??=weekBlank(),exercises=entry.gym[session.day]??={};
  const exercise=exercises[record.exercise]??={sets:[]};
  const position=exercise.sets.findIndex(set=>set?.id===record.setId);
  const index=position>=0?position:record.index;
  exercise.sets[index]={...record.value,id:record.setId};
  exercises[record.exercise]=exercise;
}
export function overlaySets(data:TrackerData):void {
  // Legacy session snapshots are overlaid with canonical per-set revisions.
  for(const record of Object.values(data.setRecords||{}))placeSet(data,record);
  // Unsynced edits must always remain visible locally.
  for(const op of Object.values(data.pendingSets||{}))placeSet(data,op);
}
export function queueSetChange(data:TrackerData,sessionKey:string,exercise:string,index:number,edit:(set:GymSet)=>void,stamp=Date.now()):string {
  const session=parseGymSessionKey(sessionKey);if(!session)throw new Error('Not a gym session');
  const entry=data.weeks[session.week]??=weekBlank(),exercises=entry.gym[session.day]??={};
  const exerciseLog=exercises[exercise]??={sets:[]};
  const previous=exerciseLog.sets[index]??{};
  const setId=previous.id||stableSetId(exercise,index);
  const key=setKey(sessionKey,setId);
  const value:GymSet={...previous,id:setId};edit(value);
  exerciseLog.sets[index]=value;exercises[exercise]=exerciseLog;
  const existing=data.pendingSets[key];
  data.pendingSets[key]={key,sessionKey,setId,exercise,index,value,baseRevision:existing?.baseRevision??data.setRecords[key]?.revision??0,updatedMs:Math.max(stamp,(existing?.updatedMs||0)+1)};
  delete data.setConflicts[key];
  return key;
}
export function integrateServerSet(data:TrackerData,record:SetDocument):void {
  const current=data.setRecords[record.key];
  if(current&&current.revision>record.revision)return;
  data.setRecords[record.key]=record;
  if(!data.pendingSets[record.key])placeSet(data,record);
}
export function acknowledgeSet(data:TrackerData,record:SetDocument,attemptStamp:number):void {
  data.setRecords[record.key]=record;
  const pending=data.pendingSets[record.key];
  if(pending&&pending.updatedMs===attemptStamp){delete data.pendingSets[record.key];delete data.setConflicts[record.key];placeSet(data,record);}
  else if(pending){pending.baseRevision=record.revision;}
  else placeSet(data,record);
}
export function flagConflict(data:TrackerData,key:string,remote:SetDocument|null):void {
  const pending=data.pendingSets[key];if(pending)data.setConflicts[key]={local:structuredClone(pending),remote};
}
export function resolveSetConflict(data:TrackerData,key:string,choice:'mine'|'cloud',stamp=Date.now()):void {
  const conflict=data.setConflicts[key];if(!conflict)return;
  if(choice==='cloud'){
    delete data.pendingSets[key];
    if(conflict.remote){data.setRecords[key]=conflict.remote;placeSet(data,conflict.remote);}
    else { // A locally created set can be discarded when no cloud document exists.
      const {local}=conflict;placeSet(data,{...local,value:{id:local.setId}});
    }
  }else{
    const op=data.pendingSets[key];if(op){op.baseRevision=conflict.remote?.revision??0;op.updatedMs=Math.max(stamp,op.updatedMs+1);}
    if(conflict.remote)data.setRecords[key]=conflict.remote;
  }
  delete data.setConflicts[key];
}
export class SetVersionConflict extends Error {
  constructor(public remote:SetDocument|null){super('This set was edited on another device');this.name='SetVersionConflict';}
}
export function valuesEqual(a:GymSet,b:GymSet):boolean {
  return String(a.kg??'')===String(b.kg??'')&&String(a.reps??'')===String(b.reps??'')&&!!a.done===!!b.done&&!!a.deleted===!!b.deleted;
}
export function acceptSetRevision(remote:SetDocument|null,op:PendingSetWrite):'write'|'already-saved'|'conflict' {
  const revision=remote?.revision??0;
  if(remote&&valuesEqual(remote.value,op.value))return 'already-saved';
  return revision===op.baseRevision?'write':'conflict';
}
