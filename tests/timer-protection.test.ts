import {describe,it,expect} from 'vitest';
import {autoStopSessionTiming,elapsedSessionMs,pauseSessionTiming,resumeSessionTiming,restartSessionTiming,sessionClockState,stopSessionTiming,timerWarningRemainingMs,TIMER_AUTO_STOP_MS,TIMER_WARNING_MS} from '../lib/session-timing';
import {blankData,weekBlank,recordPayload,applyRecord} from '../lib/storage';
import {clockItemKey,queueSyncItem} from '../lib/item-sync';
import {readBackup} from '../lib/backup';
const at=(m:number)=>new Date(Date.parse('2026-11-21T16:00:00Z')+m*60_000).toISOString();
const time=(m:number)=>Date.parse(at(m));
describe('Option A: client-only forgotten timer protection',()=>{
 it('warns at 1:50 of active time, then stops at exactly 2:00',()=>{
  const running={startedAt:at(0)};
  expect(TIMER_WARNING_MS).toBe(110*60_000);
  expect(TIMER_AUTO_STOP_MS).toBe(120*60_000);
  expect(timerWarningRemainingMs(running,time(109))).toBeNull();
  expect(timerWarningRemainingMs(running,time(110))).toBe(10*60_000);
  expect(timerWarningRemainingMs(running,time(119))).toBe(60_000);
  expect(autoStopSessionTiming(running,time(119))).toBeNull();
  const capped=autoStopSessionTiming(running,time(600))!;
  expect(capped.endedAt).toBe(at(120));
  expect(capped.autoStopped).toBe(true);
  expect(elapsedSessionMs(capped)).toBe(120*60_000);
  expect(sessionClockState(capped)).toBe('stopped');
  expect(autoStopSessionTiming(capped,time(700))).toBeNull();
  expect(resumeSessionTiming(capped,at(601))).toBeNull();
  expect(restartSessionTiming(capped,at(601))).toEqual({startedAt:at(601)});
 });
 it('excludes pauses and works across a laptop close/reopen',()=>{
  const paused=pauseSessionTiming({startedAt:at(0)},at(30))!;
  expect(autoStopSessionTiming(paused,time(900))).toBeNull();
  const resumed=resumeSessionTiming(paused,at(600))!;
  expect(timerWarningRemainingMs(resumed,time(680))).toBe(10*60_000);
  const capped=autoStopSessionTiming(resumed,time(900))!;
  expect(capped.endedAt).toBe(at(690));
  expect(elapsedSessionMs(capped)).toBe(120*60_000);
  expect(capped.pausedDurationMs).toBe(570*60_000);
 });
 it('stopped timers are never automatically completed',()=>{
  const data=blankData(),week='2026-11-16';data.weeks[week]=weekBlank();
  data.weeks[week].gym.Monday={'Bench Press':{sets:[{kg:60,reps:8,done:true}]}};
  const capped=autoStopSessionTiming({startedAt:at(0)},time(500))!;
  data.weeks[week].timing!.Monday=capped;
  const key=clockItemKey(week,'Monday');queueSyncItem(data,key,'clock',capped);
  expect(data.weeks[week].done.Monday).toBeUndefined();
  expect(data.weeks[week].gym.Monday?.['Bench Press'].sets[0].kg).toBe(60);
  expect(data.pendingItems[key]?.value).toEqual(capped);
  const copy=applyRecord(blankData(),`session:${week}:Monday`,recordPayload(data,`session:${week}:Monday`));
  expect(copy.weeks[week].timing?.Monday).toEqual(capped);
  expect(readBackup(JSON.stringify(data),blankData()).backup.weeks[week].timing?.Monday).toEqual(capped);
 });
 it('does not modify the time on an already manually stopped session',()=>{
  const done=stopSessionTiming({startedAt:at(0)},at(50))!;
  expect(autoStopSessionTiming(done,time(200))).toBeNull();
  expect(timerWarningRemainingMs(done,time(200))).toBeNull();
 });
});
