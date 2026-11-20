/**
 * Read-only activity notifications derived from the user's existing training data.
 * No new Firestore records, writes, or notification permissions are required.
 * Read/unread state is a separate per-device, per-account UI preference.
 */
import {DAYS, type GymDay, type SwimDay, type TrackerData} from './types';
import {PLAN, GYM_DAYS, SWIM_DAYS} from './plan';
import {dateFor} from './dates';
import {completedDate, scheduledDate} from './scheduling';
import {achievements} from './insights';
import {loggedSet, num, waterGoal} from './metrics';

export type ActivityKind = 'session' | 'hydration' | 'achievement';
export type ActivityDestination = 'calendar' | 'water' | 'achievements';
export interface ActivityNotification {
 id: string;
 kind: ActivityKind;
 title: string;
 detail: string;
 occurredAt: number;
 destination: ActivityDestination;
}

type MilestoneMetric = 'sessions' | 'sets' | 'pool' | 'nonstop' | 'waterDays';
interface Action {
 id: string;
 at: number;
 kind: MilestoneMetric;
 value: number;
 event?: ActivityNotification;
}
const ACHIEVEMENT_METRICS:Record<string,{metric:MilestoneMetric;target:number}> = {
 first:{metric:'sessions',target:1},
 consistent:{metric:'sessions',target:12},
 sets:{metric:'sets',target:50},
 pool:{metric:'pool',target:1000},
 nonstop:{metric:'nonstop',target:50},
 hydrated:{metric:'waterDays',target:7},
};
const MAX_NOTIFICATIONS=50;
const HISTORY_DAYS=90;

function fallbackTime(date:string):number {
 const day=dateFor(date);
 if(!Number.isFinite(day.getTime()))return 0;
 day.setHours(12,0,0,0);
 return day.getTime();
}
function timestamp(value:unknown,date:string):number {
 if(typeof value==='string'){
  const ms=Date.parse(value);
  if(Number.isFinite(ms))return ms;
 }
 return fallbackTime(date);
}
function shortDate(date:string):string {
 const value=dateFor(date);
 return Number.isFinite(value.getTime())?value.toLocaleDateString('en-GB',{day:'numeric',month:'short'}):date;
}
function weekday(date:string):string {
 return dateFor(date).toLocaleDateString('en-GB',{weekday:'long'});
}
/** Build deterministic history. New UI badges are NOT emitted for ordinary set edits. */
export function activityNotifications(data:TrackerData,now=Date.now()):ActivityNotification[] {
 const actions:Action[]=[];
 const setUpdates=new Map(Object.values(data.setRecords||{}).map(set=>[set.setId,set.updatedMs]));
 for(const [week,record] of Object.entries(data.weeks))for(const day of DAYS){
  const actualDate=record.done?.[day]?completedDate(data,week,day):scheduledDate(data,week,day);
  const stamp=record.timing?.[day]?.endedAt || record.completedAt?.[day];
  const eventTime=timestamp(stamp,actualDate);
  if(record.done?.[day])actions.push({id:`session:${week}:${day}:${stamp||actualDate}`,at:eventTime,kind:'sessions',value:1,
   event:{id:`session:${week}:${day}:${stamp||actualDate}`,kind:'session',title:`${PLAN[day].name} logged`,
    detail:`${day} session · Trained ${shortDate(actualDate)}`,occurredAt:eventTime,destination:'calendar'}});
  if(GYM_DAYS.includes(day as GymDay)){
   for(const exercise of Object.values(record.gym?.[day as GymDay]||{}))for(const set of exercise.sets||[]){
    if(!loggedSet(set))continue;
    const setStamp=set.id?setUpdates.get(set.id):undefined;
    const at=Number.isFinite(setStamp)&&Number(setStamp)>0?Number(setStamp):eventTime;
    actions.push({id:`set:${week}:${day}:${set.id||actions.length}`,at,kind:'sets',value:1});
   }
  }else{
   const swim=record.swim?.[day as SwimDay];
   if(swim){
    const meters=Math.max(0,num(swim.distance));
    const continuous=Math.max(0,num(swim.longest));
    if(meters>0)actions.push({id:`swim-distance:${week}:${day}`,at:eventTime,kind:'pool',value:meters});
    if(continuous>0)actions.push({id:`swim-continuous:${week}:${day}`,at:eventTime,kind:'nonstop',value:continuous});
   }
  }
 }
 // Build hydration completions by date, using the drink which first crossed the goal.
 const drinks=new Map<string,Array<{id:string;at:number;ml:number}>>();
 for(const [id,water] of Object.entries(data.waterLogs)){
  if(water.deleted||!Number.isFinite(water.ml)||water.ml<=0||!/^\d{4}-\d{2}-\d{2}$/.test(water.date))continue;
  const entries=drinks.get(water.date)||[];
  entries.push({id,at:timestamp(water.at,water.date),ml:water.ml});drinks.set(water.date,entries);
 }
 for(const [date,entries] of drinks){
  entries.sort((a,b)=>a.at-b.at||a.id.localeCompare(b.id));
  let total=0;
  for(const entry of entries){
   const previous=total;total+=entry.ml;
   if(previous<waterGoal(date)&&total>=waterGoal(date)){
    const id=`hydration:${date}:${entry.id}`;
    actions.push({id,at:entry.at,kind:'waterDays',value:1,
     event:{id,kind:'hydration',title:`${weekday(date)} hydration goal reached`,
      detail:`${(waterGoal(date)/1000).toFixed(1)} L goal · ${shortDate(date)}`,occurredAt:entry.at,destination:'water'}});
    break;
   }
  }
 }
 actions.sort((a,b)=>a.at-b.at||a.id.localeCompare(b.id));
 const values:Record<MilestoneMetric,number>={sessions:0,sets:0,pool:0,nonstop:0,waterDays:0};
 const awards=new Map(achievements(data).filter(a=>a.unlocked).map(a=>[a.id,a]));
 const awarded=new Set<string>();
 const notifications:ActivityNotification[]=[];
 for(const action of actions){
  if(action.event)notifications.push(action.event);
  if(action.kind==='nonstop')values.nonstop=Math.max(values.nonstop,action.value);
  else values[action.kind]+=action.value;
  for(const [id,{metric,target}] of Object.entries(ACHIEVEMENT_METRICS)){
   if(awarded.has(id)||values[metric]<target||!awards.has(id))continue;
   const achievement=awards.get(id)!;
   awarded.add(id);
   notifications.push({id:`achievement:${id}`,kind:'achievement',title:`${achievement.name} unlocked!`,
    detail:achievement.description,occurredAt:action.at,destination:'achievements'});
  }
 }
 const cutoff=now-HISTORY_DAYS*24*60*60*1000;
 return notifications.filter(n=>n.occurredAt>=cutoff&&n.occurredAt<=now+5*60*1000)
  .sort((a,b)=>b.occurredAt-a.occurredAt||a.id.localeCompare(b.id)).slice(0,MAX_NOTIFICATIONS);
}

/** UI-only read receipts; never saved to or confused with Firebase workout data. */
export function readReceiptKey(accountId:string):string {
 return `replap-activity-read:v1:${accountId}`;
}
export function parseReadReceipts(raw:string|null):string[] {
 if(!raw)return [];
 try{const ids:unknown=JSON.parse(raw);return Array.isArray(ids)?ids.filter((x):x is string=>typeof x==='string'&&x.length<200).slice(-500):[];}
 catch{return [];}
}
