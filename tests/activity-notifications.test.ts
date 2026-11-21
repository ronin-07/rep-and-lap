import {describe,expect,it} from 'vitest';
import {activityNotifications,parseReadReceipts,readReceiptKey} from '../lib/activity-notifications';
import {blankData,weekBlank} from '../lib/storage';
const NOW=Date.parse('2026-11-20T18:00:00Z');

describe('Activity notifications derived from real logs',()=>{
 it('shows a quiet empty state for an unused account',()=>{
  expect(activityNotifications(blankData(),NOW)).toEqual([]);
 });
 it('uses the actual trained date, not the planned or edited-on date',()=>{
  const data=blankData();const wk=data.weeks['2026-11-16']=weekBlank();
  wk.done.Monday=true;
  wk.completedAt={Monday:'2026-11-20T17:00:00Z'};
  wk.completedOn={Monday:'2026-11-16'};
  wk.schedule={Monday:'2026-11-18'};
  const item=activityNotifications(data,NOW).find(n=>n.kind==='session')!;
  expect(item.title).toBe('Push day logged');
  expect(item.detail).toContain('Trained 16 Nov');
  expect(item.occurredAt).toBe(Date.parse('2026-11-20T17:00:00Z'));
  expect(activityNotifications(data,NOW).filter(n=>n.kind==='achievement').map(n=>n.title)).toContain('First Step unlocked!');
 });
 it('announces hydration only when a day reaches its full goal, not each drink',()=>{
  const data=blankData();
  data.waterLogs.one={date:'2026-11-17',ml:750,at:'2026-11-17T09:00:00Z'};
  data.waterLogs.two={date:'2026-11-17',ml:750,at:'2026-11-17T12:00:00Z'};
  data.waterLogs.three={date:'2026-11-17',ml:1000,at:'2026-11-17T17:00:00Z'};
  let events=activityNotifications(data,NOW);
  expect(events.filter(n=>n.kind==='hydration')).toHaveLength(1);
  expect(events.find(n=>n.kind==='hydration')?.title).toBe('Tuesday hydration goal reached');
  expect(events.find(n=>n.kind==='hydration')?.id).toBe('hydration:2026-11-17:three');
  data.waterLogs.three.deleted=true;
  events=activityNotifications(data,NOW);
  expect(events.filter(n=>n.kind==='hydration')).toHaveLength(0);
 });
 it('does not notify each logged gym set or create achievements before their targets',()=>{
  const data=blankData();const wk=data.weeks['2026-11-16']=weekBlank();
  wk.gym.Monday={'Barbell bench press':{sets:[{id:'a',kg:50,reps:10,done:true},{id:'b',kg:55,reps:8,done:true}]}};
  const events=activityNotifications(data,NOW);
  expect(events).toHaveLength(0);
 });
 it('creates 50m continuous achievement only from real longest-continuous entries',()=>{
  const data=blankData();const wk=data.weeks['2026-11-16']=weekBlank();
  wk.swim.Thursday={distance:100,longest:25};
  expect(activityNotifications(data,NOW).some(n=>n.id==='achievement:nonstop')).toBe(false);
  wk.swim.Thursday.longest=50;
  expect(activityNotifications(data,NOW).some(n=>n.id==='achievement:nonstop')).toBe(true);
 });
 it('does not duplicate events and retains stable IDs on repeated calls',()=>{
  const data=blankData();const wk=data.weeks['2026-11-16']=weekBlank();
  wk.done.Monday=true;wk.completedAt={Monday:'2026-11-16T15:00:00Z'};
  const once=activityNotifications(data,NOW),twice=activityNotifications(data,NOW);
  expect(once.map(n=>n.id)).toEqual(twice.map(n=>n.id));
  expect(new Set(once.map(n=>n.id)).size).toBe(once.length);
 });
 it('does not show old activity or future-dated events',()=>{
  const data=blankData();
  const old=data.weeks['2026-06-01']=weekBlank();old.done.Monday=true;old.completedAt={Monday:'2026-06-01T18:00:00Z'};
  const future=data.weeks['2026-11-23']=weekBlank();future.done.Monday=true;future.completedAt={Monday:'2026-11-25T18:00:00Z'};
  expect(activityNotifications(data,NOW)).toHaveLength(0);
 });
 it('keeps read receipts per account and tolerates invalid or old data',()=>{
  expect(readReceiptKey('guest')).not.toBe(readReceiptKey('firebase-user'));
  expect(parseReadReceipts('broken')).toEqual([]);
  expect(parseReadReceipts(JSON.stringify(['a',4,'b']))).toEqual(['a','b']);
 });
});
