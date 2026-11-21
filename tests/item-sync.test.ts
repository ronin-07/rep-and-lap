import {describe,it,expect} from 'vitest';
import {blankData,applyRecord,recordPayload} from '../lib/storage';
import {queueSyncItem,queueSwimSegment,overlaySyncItems,integrateServerItem,acknowledgeItem,flagItemConflict,resolveItemConflict,clockItemKey,swimItemKey,REST_ITEM_KEY,acceptItemRevision,type SyncItemDocument} from '../lib/item-sync';
import {pauseSessionTiming,stopSessionTiming,sessionClockState,elapsedSessionMs} from '../lib/session-timing';
import {makeRest,secondsLeft} from '../lib/workout-flow';
import {markRestoredWrites} from '../lib/backup';

const week='2026-11-16',session=`session:${week}:Thursday`,clock=clockItemKey(week,'Thursday');
const stamp='2026-11-19T17:00:00.000Z';
const record=(key:string,kind:SyncItemDocument['kind'],value:SyncItemDocument['value'],revision=1):SyncItemDocument=>({key,kind,value,revision,updatedMs:123456789,updatedBy:'alice'});
const seg=(id:string,lengths:number)=>({id,activity:'freestyle' as const,mode:'advanced' as const,lengths});

describe('Milestone 7 independent swimming synchronization',()=>{
 it('merges independently added activities on two devices without dropping either',()=>{
  const d=blankData(),a=swimItemKey(week,'Thursday','free'),b=swimItemKey(week,'Thursday','breast');
  integrateServerItem(d,record(a,'swim-segment',seg('free',4)));
  integrateServerItem(d,record(b,'swim-segment',{...seg('breast',2),activity:'breaststroke'}));
  expect(d.weeks[week].swim.Thursday?.segments?.map(x=>x.id)).toEqual(['free','breast']);
  expect(acceptItemRevision(null,{key:b,kind:'swim-segment',value:seg('breast',2),baseRevision:0,updatedMs:124})).toBe('write');
 });
 it('overlays individual records over stale legacy session data',()=>{
  const d=blankData(),key=swimItemKey(week,'Thursday','free');
  integrateServerItem(d,record(key,'swim-segment',seg('free',10)));
  const legacy=blankData();legacy.weeks[week]={...d.weeks[week],swim:{Thursday:{segments:[seg('free',2),seg('old',3)]}}};
  const updated=applyRecord({...legacy,syncItems:d.syncItems},session,recordPayload(legacy,session));
  expect(updated.weeks[week].swim.Thursday?.segments?.find(x=>x.id==='free')?.lengths).toBe(10);
  expect(updated.weeks[week].swim.Thursday?.segments?.find(x=>x.id==='old')?.lengths).toBe(3);
 });
 it('retains a deletion tombstone through later stale session snapshots',()=>{
  const d=blankData(),key=swimItemKey(week,'Thursday','free');
  integrateServerItem(d,record(key,'swim-segment',null));
  const old=blankData();old.weeks[week]={...d.weeks[week],swim:{Thursday:{segments:[seg('free',8)]}}};
  const restored=applyRecord({...old,syncItems:d.syncItems},session,recordPayload(old,session));
  expect(restored.weeks[week].swim.Thursday?.segments).toHaveLength(0);
 });
 it('preserves a locally pending edit when receiving a newer cloud item',()=>{
  const d=blankData(),key=swimItemKey(week,'Thursday','free');
  integrateServerItem(d,record(key,'swim-segment',seg('free',2),1));
  queueSyncItem(d,key,'swim-segment',seg('free',4),1000);
  integrateServerItem(d,record(key,'swim-segment',seg('free',8),2));
  expect(d.weeks[week].swim.Thursday?.segments?.[0].lengths).toBe(2); // pending overlay is applied after snapshots
  overlaySyncItems(d);
  expect(d.weeks[week].swim.Thursday?.segments?.[0].lengths).toBe(4);
  expect(acceptItemRevision(d.syncItems[key],d.pendingItems[key])).toBe('conflict');
 });
 it('requires explicit choice for concurrent edits of the same stroke',()=>{
  const key=swimItemKey(week,'Thursday','free'),remote=record(key,'swim-segment',seg('free',8),2);
  const d=blankData();integrateServerItem(d,record(key,'swim-segment',seg('free',2),1));
  queueSyncItem(d,key,'swim-segment',seg('free',4),1000);
  flagItemConflict(d,key,remote);
  expect(d.itemConflicts[key].remote?.revision).toBe(2);
  resolveItemConflict(d,key,'mine',2000);
  expect(d.pendingItems[key].baseRevision).toBe(2);
  expect(acceptItemRevision(remote,d.pendingItems[key])).toBe('write');
 });
 it('lets a user discard an offline edit and adopt the canonical segment',()=>{
  const key=swimItemKey(week,'Thursday','free'),d=blankData();
  queueSyncItem(d,key,'swim-segment',seg('free',4),1000);
  flagItemConflict(d,key,record(key,'swim-segment',seg('free',10),2));
  resolveItemConflict(d,key,'cloud');
  expect(d.pendingItems[key]).toBeUndefined();
  expect(d.weeks[week].swim.Thursday?.segments?.[0].lengths).toBe(10);
 });
 it('does not acknowledge newer local edits before they reach the server',()=>{
  const key=swimItemKey(week,'Thursday','free'),d=blankData();
  queueSyncItem(d,key,'swim-segment',seg('free',4),1000);
  const sent=d.pendingItems[key].updatedMs;
  queueSyncItem(d,key,'swim-segment',seg('free',6),1001);
  acknowledgeItem(d,record(key,'swim-segment',seg('free',4)),sent);
  expect(d.pendingItems[key].value).toEqual(seg('free',6));
  expect(d.pendingItems[key].baseRevision).toBe(1);
 });
});

describe('Milestone 7 timer synchronization',()=>{
 it('replays pause and stop states on a second device using wall-clock timestamps',()=>{
  const d=blankData(),start={startedAt:stamp};
  integrateServerItem(d,record(clock,'clock',start));
  expect(sessionClockState(d.weeks[week].timing?.Thursday)).toBe('running');
  const paused=pauseSessionTiming(start,'2026-11-19T17:10:00.000Z')!;
  integrateServerItem(d,record(clock,'clock',paused,2));
  expect(sessionClockState(d.weeks[week].timing?.Thursday)).toBe('paused');
  expect(elapsedSessionMs(d.weeks[week].timing?.Thursday,Date.parse('2026-11-19T17:50:00.000Z'))).toBe(600000);
  const stopped=stopSessionTiming(paused,'2026-11-19T17:40:00.000Z')!;
  integrateServerItem(d,record(clock,'clock',stopped,3));
  expect(sessionClockState(d.weeks[week].timing?.Thursday)).toBe('stopped');
  expect(elapsedSessionMs(d.weeks[week].timing?.Thursday)).toBe(600000);
 });
 it('rejects a stale clock transition rather than overwriting the other device',()=>{
  const d=blankData();integrateServerItem(d,record(clock,'clock',{startedAt:stamp},1));
  const paused=pauseSessionTiming({startedAt:stamp},'2026-11-19T17:05:00.000Z')!;
  queueSyncItem(d,clock,'clock',paused,1000);
  const remote=record(clock,'clock',{startedAt:stamp,endedAt:'2026-11-19T17:08:00.000Z'},2);
  expect(acceptItemRevision(remote,d.pendingItems[clock])).toBe('conflict');
 });
 it('synchronizes absolute rest countdowns across devices and can stop them',()=>{
  const d=blankData(),rest=makeRest(90,null,100_000);
  queueSyncItem(d,REST_ITEM_KEY,'rest',rest,1000);
  expect(secondsLeft(rest,145_000)).toBe(45);
  acknowledgeItem(d,record(REST_ITEM_KEY,'rest',rest),d.pendingItems[REST_ITEM_KEY].updatedMs);
  expect(d.pendingItems[REST_ITEM_KEY]).toBeUndefined();
  queueSyncItem(d,REST_ITEM_KEY,'rest',null,1001);
  expect(acceptItemRevision(d.syncItems.rest,d.pendingItems.rest)).toBe('write');
 });
 it('enqueues independent clocks and swim segments when importing old backup records',()=>{
  const d=blankData();d.weeks[week]={done:{},gym:{},swim:{Thursday:{segments:[seg('free',2)]}},timing:{Thursday:{startedAt:stamp}}};
  markRestoredWrites(d,[session]);
  expect(Object.keys(d.pendingItems)).toContain(clock);
  expect(Object.keys(d.pendingItems)).toContain(swimItemKey(week,'Thursday','free'));
 });
 it('retains legacy backup segments with unsupported IDs in the session rather than creating denied sync writes',()=>{
  const d=blankData(),legacyId='invalid id with spaces';
  d.weeks[week]={done:{},gym:{},swim:{Thursday:{segments:[seg(legacyId,2),seg('valid',1)]}},timing:{}};
  markRestoredWrites(d,[session]);
  expect(d.weeks[week].swim.Thursday?.segments).toHaveLength(2);
  expect(Object.keys(d.pendingItems)).toContain(swimItemKey(week,'Thursday','valid'));
  expect(Object.keys(d.pendingItems)).not.toContain(swimItemKey(week,'Thursday',legacyId));
  queueSwimSegment(d,week,'Thursday',legacyId,seg(legacyId,5));
  expect(Object.keys(d.pendingItems)).not.toContain(swimItemKey(week,'Thursday',legacyId));
 });
});
