import {describe,it,expect} from 'vitest';
import {blankData,weekBlank,recordPayload,applyRecord} from '../lib/storage';
import {entriesForDate,scheduledDate,statusFor,trainingStreak,weeklyAdherence,monthGrid,isValidDate,completedDate,originalPlannedDate,completedElsewhereForDate} from '../lib/scheduling';
import {sessionForDate,calendarCompleted} from '../lib/metrics';
import {monthlyRecap} from '../lib/insights';
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
 it('backfills an older workout without moving it to the day the user clicked Complete',()=>{
  const d=create();d.weeks[week].done.Thursday=true;
  d.weeks[week].completedAt!.Thursday='2026-11-20T16:00:00.000Z'; // marked today
  d.weeks[week].completedOn!.Thursday='2026-11-19'; // actually trained yesterday
  expect(completedDate(d,week,'Thursday')).toBe('2026-11-19');
  expect(entriesForDate(d,'2026-11-19').some(e=>e.week===week&&e.day==='Thursday'&&e.status==='completed')).toBe(true);
  expect(entriesForDate(d,'2026-11-20').some(e=>e.week===week&&e.day==='Thursday')).toBe(false);
  expect(calendarCompleted(d,week)).toMatchObject({completed:1,swim:1});
  expect(weeklyAdherence(d,week).completed).toBe(1);
 });
 it('honors actual training dates across months while preserving the original planned date',()=>{
  const d=create();d.weeks[week].done.Thursday=true;
  d.weeks[week].schedule!.Thursday='2026-11-25'; // workout was rescheduled
  d.weeks[week].completedAt!.Thursday='2026-12-02T12:00:00.000Z';
  d.weeks[week].completedOn!.Thursday='2026-12-01';
  expect(originalPlannedDate(week,'Thursday')).toBe('2026-11-19');
  expect(scheduledDate(d,week,'Thursday')).toBe('2026-11-25');
  expect(completedDate(d,week,'Thursday')).toBe('2026-12-01');
  expect(entriesForDate(d,'2026-11-25').some(x=>x.week===week&&x.day==='Thursday')).toBe(false);
  expect(completedElsewhereForDate(d,'2026-11-25')).toMatchObject([{week,day:'Thursday',actualDate:'2026-12-01'}]);
  expect(entriesForDate(d,'2026-12-01').some(x=>x.week===week&&x.day==='Thursday')).toBe(true);
  expect(monthlyRecap(d,'2026-11').completedSessions).toBe(0);
  expect(monthlyRecap(d,'2026-12').completedSessions).toBe(1);
  expect(weeklyAdherence(d,week).completed).toBe(1);
 });
 it('round-trips the selected training date through Firestore and backup safely',()=>{
  const d=create();d.weeks[week].done.Thursday=true;
  d.weeks[week].completedAt!.Thursday='2026-11-20T18:00:00.000Z';
  d.weeks[week].completedOn!.Thursday='2026-11-19';
  const saved=applyRecord(blankData(),`session:${week}:Thursday`,recordPayload(d,`session:${week}:Thursday`));
  expect(saved.weeks[week].completedOn?.Thursday).toBe('2026-11-19');
  const read=readBackup(JSON.stringify(d),blankData());
  expect(mergeBackup(blankData(),read.backup).data.weeks[week].completedOn?.Thursday).toBe('2026-11-19');
  const invalid=structuredClone(d);invalid.weeks[week].completedOn!.Thursday='2026-02-30';
  expect(()=>readBackup(JSON.stringify(invalid),blankData())).toThrow(/completion date/);
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
