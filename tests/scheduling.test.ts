import {describe,it,expect} from 'vitest';
import {blankData,weekBlank,recordPayload,applyRecord} from '../lib/storage';
import {entriesForDate,scheduledDate,statusFor,trainingStreak,weeklyAdherence,monthGrid,isValidDate} from '../lib/scheduling';
import {sessionForDate} from '../lib/metrics';
import {readBackup,mergeBackup} from '../lib/backup';
const week='2026-11-16';
const create=()=>{const d=blankData();d.weeks[week]=weekBlank();return d;};
describe('Flexible training schedule and calendar',()=>{
 it('moves a missed gym session across the week without changing the workout identity',()=>{
  const d=create();d.weeks[week].schedule!.Monday='2026-11-25';
  expect(scheduledDate(d,week,'Monday')).toBe('2026-11-25');
  expect(entriesForDate(d,'2026-11-16').some(x=>x.day==='Monday')).toBe(false);
  expect(entriesForDate(d,'2026-11-25').some(x=>x.week===week&&x.day==='Monday')).toBe(true);
  expect(sessionForDate(d,'2026-11-25')).toEqual({week,day:'Monday'});
 });
 it('marks rest as neutral but skip as not completed and still in adherence denominator',()=>{
  const d=create();d.weeks[week].scheduleStatus!.Tuesday='rest';d.weeks[week].scheduleStatus!.Thursday='skipped';
  expect(statusFor(d,week,'Tuesday')).toBe('rest');
  expect(statusFor(d,week,'Thursday')).toBe('skipped');
  expect(sessionForDate(d,'2026-11-17')).toBeNull();
  expect(weeklyAdherence(d,week)).toMatchObject({eligible:5,completed:0,rested:1,skipped:1});
 });
 it('completed training appears on its actual finish date and cannot also be a skipped session',()=>{
  const d=create();d.weeks[week].done.Monday=true;
  d.weeks[week].schedule!.Monday='2026-11-19';
  d.weeks[week].completedAt!.Monday='2026-11-20T12:00:00.000Z';
  expect(entriesForDate(d,'2026-11-19').some(x=>x.week===week&&x.day==='Monday')).toBe(false);
  expect(entriesForDate(d,'2026-11-20').some(x=>x.status==='completed'&&x.week===week)).toBe(true);
 });
 it('intentional recovery days keep a streak, but skips break it',()=>{
  const d=create();for(const day of ['Monday','Wednesday','Friday'] as const){d.weeks[week].done[day]=true;d.weeks[week].completedAt![day]=new Date(`${scheduledDate(d,week,day)}T12:00:00`).toISOString();}
  for(const day of ['Tuesday','Thursday','Saturday'] as const)d.weeks[week].scheduleStatus![day]='rest';
  expect(trainingStreak(d,'2026-11-20').current).toBe(3);
  d.weeks[week].scheduleStatus!.Thursday='skipped';
  expect(trainingStreak(d,'2026-11-20').current).toBe(1);
 });
 it('calendar is Monday-first and validates leap-year dates',()=>{
  expect(monthGrid('2026-11')).toHaveLength(42);
  expect(monthGrid('2026-11')[0]).toBe('2026-10-26');
  expect(isValidDate('2028-02-29')).toBe(true);
  expect(isValidDate('2026-02-29')).toBe(false);
 });
 it('new session states round-trip through the old Firestore collection and backup',()=>{
  const d=create();d.weeks[week].scheduleStatus!.Tuesday='rest';
  const remote=applyRecord(blankData(),`session:${week}:Tuesday`,recordPayload(d,`session:${week}:Tuesday`));
  expect(remote.weeks[week].scheduleStatus?.Tuesday).toBe('rest');
  const preview=readBackup(JSON.stringify(d),blankData());
  expect(preview.version).toBe(4);
  const restored=mergeBackup(blankData(),preview.backup).data;
  expect(restored.weeks[week].scheduleStatus?.Tuesday).toBe('rest');
 });
});
