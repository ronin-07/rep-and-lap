import {describe,it,expect} from 'vitest';
import {blankData,weekBlank,recordPayload,applyRecord} from '../lib/storage';
import {readBackup,mergeBackup} from '../lib/backup';
import {activityNotifications} from '../lib/activity-notifications';
import {monthlyRecap,achievements} from '../lib/insights';
import {swimRoutine,initialSwimRoutines,segmentDistance,segmentContinuous,segmentTimed,swimTotals,strokeInsights,swimPersonalBests,effectivePool,validPool,validSwimSegmentPatch} from '../lib/swimming';
import type {SwimSegment} from '../lib/types';
const WK='2026-11-16', NOW=Date.parse('2026-11-20T19:00:00Z');
const makeSegment=(id:string,activity:SwimSegment['activity'],params:Partial<SwimSegment>={}):SwimSegment=>({id,activity,mode:'advanced',lengths:0,minutes:0,intervals:[],technique:{},...params});

describe('Milestone 6 multi-stroke swimming',()=>{
 it('defaults to 50 metres without reinterpreting older 25m sessions',()=>{
  const data=blankData();expect(data.swimPoolDefault).toBe(50);
  const legacy={lengths:4,distance:100};expect(effectivePool(legacy,50)).toBe(25);
  expect(swimTotals(legacy,50).meters).toBe(100);
  expect(swimTotals(undefined,50).meters).toBe(0);
 });
 it('rejects fractional pool settings and invalid editable swim measurements',()=>{
  expect(validPool(12.5)).toBe(50);
  expect(validPool(25)).toBe(25);
  expect(validSwimSegmentPatch({lengths:'-1'})).toBe(false);
  expect(validSwimSegmentPatch({lengths:'2.5'})).toBe(false);
  expect(validSwimSegmentPatch({timedSeconds:'Infinity'})).toBe(false);
  expect(validSwimSegmentPatch({minutes:'',lengths:'12'})).toBe(true);
 });
 it('does not silently award a smaller continuous record for an invalid overclaim',()=>{
  const invalid=makeSegment('s','freestyle',{lengths:2,longestContinuous:500});
  expect(segmentContinuous(invalid,50)).toBe(0);
  expect(segmentContinuous({...invalid,longestContinuous:100},50)).toBe(100);
  const data=blankData();data.weeks[WK]=weekBlank();data.weeks[WK].done.Thursday=true;
  data.weeks[WK].swim.Thursday={poolLength:50,segments:[invalid]};
  expect(swimPersonalBests(data)).toHaveLength(0);
 });
 it('separates continuous lengths from interval distance and avoids timed double counting',()=>{
  const freestyle=makeSegment('swim-a','freestyle',{lengths:4,longestContinuous:100,minutes:20,timedMeters:50,timedSeconds:72,
   intervals:[{id:'int-1',repeats:4,lengths:1,restSeconds:30}]});
  const breast=makeSegment('swim-b','breaststroke',{lengths:2,longestContinuous:50,minutes:10});
  const scull=makeSegment('swim-c','sculling',{mode:'learning',minutes:8});
  expect(segmentDistance(freestyle,50)).toBe(400);expect(segmentContinuous(freestyle,50)).toBe(100);
  expect(segmentTimed(freestyle,50)).toEqual({meters:50,seconds:72});
  const totals=swimTotals({poolLength:50,segments:[freestyle,breast,scull]});
  expect(totals).toMatchObject({meters:500,bestContinuous:100,freestyleBest:100,minutes:38});
  expect(totals.byStroke.freestyle?.meters).toBe(400);expect(totals.byStroke.breaststroke?.meters).toBe(100);
  expect(totals.byStroke.backstroke).toBeUndefined();
 });
 it('cannot count repeated breaks as uninterrupted distance',()=>{
  const set=makeSegment('swim-a','freestyle',{lengths:0,longestContinuous:200,intervals:[{id:'int-a',repeats:4,lengths:1,restSeconds:30}]});
  expect(segmentDistance(set,50)).toBe(200);expect(segmentContinuous(set,50)).toBe(0);
  expect(segmentTimed({...set,timedMeters:50,timedSeconds:70},50)).toBeNull();
 });
 it('keeps stroke-specific targets, timed records and independent practice minutes',()=>{
  const data=blankData();const w=data.weeks[WK]=weekBlank();w.done.Thursday=true;w.completedOn!.Thursday='2026-11-19';
  w.swim.Thursday={poolLength:50,segments:[makeSegment('s1','freestyle',{lengths:8,longestContinuous:400,minutes:26,timedMeters:100,timedSeconds:150}),makeSegment('s2','breaststroke',{lengths:1,longestContinuous:50,minutes:10})]};
  expect(strokeInsights(data,'freestyle')).toMatchObject({totalMeters:400,bestContinuous:400,practiceMinutes:26,goal:400,goalReached:true});
  expect(strokeInsights(data,'breaststroke')).toMatchObject({totalMeters:50,bestContinuous:50,practiceMinutes:10,goal:50,goalReached:true});
  expect(strokeInsights(data,'freestyle').bestTimes[100]).toBe(150);
  expect(strokeInsights(data,'butterfly').sessions).toHaveLength(0);
  const recap=monthlyRecap(data,'2026-11');expect(recap.swimMeters).toBe(450);
  expect(achievements(data).find(x=>x.id==='nonstop')?.unlocked).toBe(true);
 });
 it('only announces faster PRs over previous same-stroke and same-distance attempts',()=>{
  const data=blankData();const old=data.weeks[WK]=weekBlank();old.done.Thursday=true;
  old.completedAt!.Thursday='2026-11-19T17:00:00Z';old.completedOn!.Thursday='2026-11-19';
  old.swim.Thursday={poolLength:50,segments:[makeSegment('a','freestyle',{lengths:2,longestContinuous:50,timedMeters:50,timedSeconds:73})]};
  const next=data.weeks['2026-11-23']=weekBlank();next.done.Thursday=true;
  next.completedAt!.Thursday='2026-11-20T18:00:00Z';next.completedOn!.Thursday='2026-11-20';
  next.swim.Thursday={poolLength:50,segments:[makeSegment('b','freestyle',{lengths:2,longestContinuous:100,timedMeters:50,timedSeconds:75}),makeSegment('c','breaststroke',{lengths:1,longestContinuous:50,timedMeters:50,timedSeconds:100})]};
  const records=swimPersonalBests(data);
  expect(records.filter(x=>x.kind==='continuous')).toHaveLength(3);
  expect(records.filter(x=>x.kind==='time')).toHaveLength(2); // first freestyle 73s; first breaststroke 100s
  const items=activityNotifications(data,NOW);
  expect(items.filter(x=>x.kind==='swim-pr').length).toBe(6);
  expect(new Set(items.map(x=>x.id)).size).toBe(items.length);
 });
 it('does not announce records before the session is completed',()=>{
  const data=blankData();data.weeks[WK]=weekBlank();data.weeks[WK].swim.Thursday={segments:[makeSegment('a','freestyle',{lengths:1,longestContinuous:50})]};
  expect(swimPersonalBests(data)).toHaveLength(0);
 });
 it('round-trips segmented swim logs and custom plans through old session keys',()=>{
  const data=blankData(),log=data.weeks[WK]=weekBlank();
  log.swim.Friday={poolLength:50,segments:[makeSegment('swim-one','breaststroke',{lengths:1,minutes:12,technique:{'Streamlined glide':true},difficulty:'Moderate',notes:'Improved timing'})]};
  log.swimRoutineOverrides!.Friday={name:'Friday practice',description:'Sculling and breaststroke',activities:[{activity:'breaststroke',mode:'learning',plannedMinutes:30}]};
  const record=recordPayload(data,`session:${WK}:Friday`);
  const reloaded=applyRecord(blankData(),`session:${WK}:Friday`,record);
  expect(reloaded.weeks[WK].swim.Friday?.segments?.[0].difficulty).toBe('Moderate');
  expect(swimRoutine(reloaded,WK,'Friday').name).toBe('Friday practice');
  const backup=readBackup(JSON.stringify(data),blankData());
  const merged=mergeBackup(blankData(),backup.backup);
  expect(merged.data.weeks[WK].swim.Friday?.segments?.[0].technique?.['Streamlined glide']).toBe(true);
  expect(merged.data.weeks[WK].swimRoutineOverrides?.Friday?.name).toBe('Friday practice');
 });
 it('rejects invalid swim backup fields rather than importing unsafe data',()=>{
  const data=blankData();data.weeks[WK]=weekBlank();
  data.weeks[WK].swim.Thursday={segments:[makeSegment('a','freestyle',{intervals:[{id:'no',repeats:999999,lengths:1,restSeconds:30}]})]};
  expect(()=>readBackup(JSON.stringify(data),blankData())).toThrow('Invalid repetitions');
 });
 it('does not mutate the default plan when customized',()=>{
  const data=blankData(),one=swimRoutine(data,WK,'Friday');one.name='Changed';
  expect(swimRoutine(data,WK,'Friday').name).not.toBe('Changed');
  expect(initialSwimRoutines().Friday.activities).toHaveLength(2);
 });
});
