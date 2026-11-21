import {describe,it,expect} from 'vitest';
import {pauseSessionTiming,resumeSessionTiming,restartSessionTiming,stopSessionTiming,sessionClockState,formatSessionClock,elapsedSessionMs} from '../lib/session-timing';
import {stoppedSwimTiming,completeStoppedSwim} from '../lib/swim-session';
import {sessionMinutes,recentSessions} from '../lib/metrics';
import {blankData,weekBlank,recordPayload,applyRecord} from '../lib/storage';
import {readBackup} from '../lib/backup';

const at=(minute:number)=>new Date(Date.parse('2026-11-19T17:00:00.000Z')+minute*60_000).toISOString();

describe('Session clock pause/resume, both gym and swim',()=>{
 it('preserves old session durations with no pause fields',()=>{
  expect(sessionMinutes({startedAt:at(0),endedAt:at(45)})).toBe(45);
  expect(formatSessionClock({startedAt:at(0),endedAt:at(45)})).toBe('45:00');
  expect(sessionMinutes({startedAt:at(0)})).toBeNull();
  expect(sessionMinutes({startedAt:at(0)},Date.parse(at(2)))).toBe(2);
 });
 it('pauses the stopwatch without increasing its active duration while the phone is locked',()=>{
  const start={startedAt:at(0)};
  const paused=pauseSessionTiming(start,at(10))!;
  expect(sessionClockState(paused)).toBe('paused');
  expect(sessionMinutes(paused,Date.parse(at(35)))).toBe(10);
  expect(formatSessionClock(paused,Date.parse(at(300)))).toBe('10:00');
  expect(sessionMinutes(paused)).toBeNull(); // unfinished sessions do not enter historical totals
  expect(pauseSessionTiming(paused,at(20))).toBeNull();
 });
 it('resumes after a pause, excludes the gap and counts only active time',()=>{
  const paused=pauseSessionTiming({startedAt:at(0)},at(10))!;
  const resumed=resumeSessionTiming(paused,at(30))!;
  expect(resumed).toEqual({startedAt:at(0),pausedDurationMs:20*60_000});
  expect(sessionMinutes(resumed,Date.parse(at(35)))).toBe(15);
  expect(sessionMinutes(stopSessionTiming(resumed,at(45))!)).toBe(25);
 });
 it('supports multiple pauses without double-counting overlapping breaks',()=>{
  const timing={startedAt:at(0)};
  const once=resumeSessionTiming(pauseSessionTiming(timing,at(10)),at(20))!;
  const twice=resumeSessionTiming(pauseSessionTiming(once,at(30)),at(35))!;
  const stopped=stopSessionTiming(twice,at(50))!;
  expect(twice.pausedDurationMs).toBe(15*60_000);
  expect(sessionMinutes(stopped)).toBe(35);
  expect(stopped.pausedAt).toBeUndefined();
 });
 it('allows finishing while paused without counting time spent away',()=>{
  const stopped=stopSessionTiming(pauseSessionTiming({startedAt:at(0)},at(12)),at(72))!;
  expect(sessionMinutes(stopped)).toBe(12);
  expect(stopped.pausedAt).toBeUndefined();
  expect(stopped.pausedDurationMs).toBe(60*60_000);
  expect(sessionClockState(stopped)).toBe('stopped');
 });
 it('can continue an undone gym completion without changing prior active minutes',()=>{
  const completed={startedAt:at(0),endedAt:at(40)};
  // The session's done flag is changed by Undo; timing is intentionally untouched.
  const continuing=resumeSessionTiming(completed,at(100))!;
  expect(sessionClockState(continuing)).toBe('running');
  expect(sessionMinutes(continuing,Date.parse(at(115)))).toBe(55);
  expect(sessionMinutes(stopSessionTiming(continuing,at(120))!)).toBe(60);
  expect(resumeSessionTiming(continuing,at(121))).toBeNull();
 });
 it('lets a stopped swim be continued before logging; the gap is not swimming time',()=>{
  const stopped=stoppedSwimTiming({startedAt:at(0)},at(15))!;
  expect(stopped).toEqual({startedAt:at(0),endedAt:at(15)});
  const continued=resumeSessionTiming(stopped,at(60))!;
  expect(continued.endedAt).toBeUndefined();
  const stoppedAgain=stoppedSwimTiming(continued,at(75))!;
  expect(sessionMinutes(stoppedAgain)).toBe(30);
  const record=weekBlank();record.timing!.Thursday=stoppedAgain;
  expect(completeStoppedSwim(record,'Thursday',at(90))).toBe(true);
  expect(record.done.Thursday).toBe(true);
  expect(sessionMinutes(record.timing?.Thursday)).toBe(30);
 });
 it('restarts only the stopwatch while preserving sets and swim segments',()=>{
  const d=blankData(),week='2026-11-16';d.weeks[week]=weekBlank();
  d.weeks[week].gym.Monday={'Bench press':{sets:[{kg:65,reps:8,done:true}]}};
  d.weeks[week].swim.Thursday={segments:[{id:'free',activity:'freestyle',mode:'advanced',lengths:4}]};
  d.weeks[week].timing!.Monday={startedAt:at(0),endedAt:at(30)};
  d.weeks[week].timing!.Thursday={startedAt:at(0),endedAt:at(30),pausedDurationMs:300000};
  for(const day of ['Monday','Thursday'] as const){
   const clock=restartSessionTiming(d.weeks[week].timing?.[day],at(100))!;
   expect(clock).toEqual({startedAt:at(100)});
   d.weeks[week].timing![day]=clock;
  }
  const gym=applyRecord(blankData(),`session:${week}:Monday`,recordPayload(d,`session:${week}:Monday`));
  const swim=applyRecord(blankData(),`session:${week}:Thursday`,recordPayload(d,`session:${week}:Thursday`));
  expect(gym.weeks[week].gym.Monday?.['Bench press'].sets[0].kg).toBe(65);
  expect(swim.weeks[week].swim.Thursday?.segments?.[0].lengths).toBe(4);
  expect(sessionMinutes(gym.weeks[week].timing?.Monday,Date.parse(at(103)))).toBe(3);
 });
 it('round trips pause timestamps and accumulated minutes through Firebase records and backup',()=>{
  const d=blankData(),week='2026-11-16';d.weeks[week]=weekBlank();
  const paused=pauseSessionTiming({startedAt:at(0)},at(7))!;
  d.weeks[week].timing!.Monday=paused;
  const remote=applyRecord(blankData(),`session:${week}:Monday`,recordPayload(d,`session:${week}:Monday`));
  expect(remote.weeks[week].timing?.Monday).toEqual(paused);
  expect(readBackup(JSON.stringify(d),blankData()).backup.weeks[week].timing?.Monday).toEqual(paused);
  expect(recentSessions(remote)).toEqual([]); // paused is not completed
 });
 it('rejects invalid transitions, timestamps and malformed paused backups',()=>{
  expect(pauseSessionTiming(undefined,at(1))).toBeNull();
  expect(pauseSessionTiming({startedAt:at(10)},at(5))).toBeNull();
  expect(resumeSessionTiming({startedAt:at(0)},at(5))).toBeNull();
  expect(stopSessionTiming({startedAt:at(10)},at(5))).toBeNull();
  expect(restartSessionTiming({startedAt:at(0)},at(2))).toBeNull();
  expect(elapsedSessionMs({startedAt:at(0),endedAt:at(3),pausedDurationMs:-1})).toBeNull();
  const d=blankData(),week='2026-11-16';d.weeks[week]=weekBlank();
  d.weeks[week].timing!.Thursday={startedAt:at(0),pausedAt:at(10),endedAt:at(12)};
  expect(()=>readBackup(JSON.stringify(d),blankData())).toThrow('A paused clock must be running');
  d.weeks[week].timing!.Thursday={startedAt:at(0),pausedDurationMs:-100};
  expect(()=>readBackup(JSON.stringify(d),blankData())).toThrow('Invalid paused duration');
  d.weeks[week].timing!.Thursday={startedAt:at(20),pausedAt:at(10)};
  expect(()=>readBackup(JSON.stringify(d),blankData())).toThrow('Pause precedes session start');
 });
});
