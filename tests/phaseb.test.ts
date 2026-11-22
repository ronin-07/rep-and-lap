import {describe,it,expect} from 'vitest';
import {blankData,recordPayload,applyRecord,weekBlank} from '../lib/storage';
import {waterGoal,hydrationChart} from '../lib/metrics';
import {homeFocus,homeQueue,todayFocus,dayIndicators} from '../lib/home-overview';
import {activityNotifications} from '../lib/activity-notifications';
import {weeklyTrainingTime} from '../lib/training-intelligence';

describe('Phase B hydration goal safety',()=>{
 it('keeps original day-specific targets until a user sets their default',()=>{
  const data=blankData();expect(waterGoal('2026-11-16',data)).toBe(2500);
  expect(waterGoal('2026-11-19',data)).toBe(2400);
  expect(waterGoal('2026-11-22',data)).toBe(2000);
 });
 it('uses the new daily goal from its effective date, retaining historical goal percentages',()=>{
  const data=blankData();data.waterGoalHistory={'2026-11-20':2800,'2026-12-01':3000};
  expect(waterGoal('2026-11-19',data)).toBe(2400);
  expect(waterGoal('2026-11-20',data)).toBe(2800);
  expect(waterGoal('2026-11-22',data)).toBe(2800);
  expect(waterGoal('2026-12-01',data)).toBe(3000);
  expect(waterGoal('2026-11-22',data)).toBe(2800);
 });
 it('round-trips the custom goal across cloud preferences',()=>{
  const data=blankData();data.waterGoalHistory={'2026-11-21':2750};
  const result=applyRecord(blankData(),'preferences',recordPayload(data,'preferences'));
  expect(result.waterGoalHistory).toEqual({'2026-11-21':2750});
 });
 it('rejects malformed cloud goal values rather than displaying unsafe targets',()=>{
  const data=blankData();
  const updated=applyRecord(data,'preferences',{waterGoalHistory:{'2026-11-21':2500,'invalid':100,'2026-11-22':-2}});
  expect(updated.waterGoalHistory).toEqual({'2026-11-21':2500});
 });
 it('charts against saved per-day historical goals',()=>{
  const data=blankData();data.waterGoalHistory={'2026-11-01':2900};
  expect(hydrationChart(data,2).every(d=>d.target===2900)).toBe(true);
 });
 it('uses the daily custom goal for hydration-completion notifications',()=>{
  const data=blankData();data.waterGoalHistory={'2026-11-20':3000};
  data.waterLogs.one={date:'2026-11-20',at:'2026-11-20T08:00:00Z',ml:2000};
  expect(activityNotifications(data,Date.parse('2026-11-21T12:00:00Z')).some(x=>x.kind==='hydration')).toBe(false);
  data.waterLogs.two={date:'2026-11-20',at:'2026-11-20T10:00:00Z',ml:1000};
  expect(activityNotifications(data,Date.parse('2026-11-21T12:00:00Z')).some(x=>x.kind==='hydration')).toBe(true);
 });
});

describe('Phase B home priority and calendar statuses',()=>{
 const today='2026-11-21',week='2026-11-16';
 it('offers scheduled today before older missed workouts',()=>{
  const data=blankData();expect(homeFocus(data,today).kind).toBe('scheduled');
  expect(homeFocus(data,today).entry?.day).toBe('Saturday');
 });
 it('does not confuse recovery with workout completion',()=>{
  const data=blankData();data.weeks[week]=weekBlank();data.weeks[week].scheduleStatus!.Saturday='rest';
  const days=dayIndicators(data,today);
  expect(days.some(x=>x.status==='rest')).toBe(true);
  expect(days.some(x=>x.status==='completed')).toBe(false);
 });
 it('prioritizes running workouts over today and upcoming workouts',()=>{
  const data=blankData();data.weeks[week]=weekBlank();data.weeks[week].timing!.Monday={startedAt:'2026-11-21T08:00:00.000Z'};
  const home=homeFocus(data,today);expect(home.kind).toBe('active');expect(home.entry?.day).toBe('Monday');
 });
 it('keeps auto-stopped timers review-required, never completed',()=>{
  const data=blankData();data.weeks[week]=weekBlank();data.weeks[week].timing!.Thursday={startedAt:'2026-11-20T08:00:00.000Z',endedAt:'2026-11-20T10:00:00.000Z',autoStopped:true};
  expect(homeFocus(data,today).kind).toBe('review');
  expect(data.weeks[week].done.Thursday).not.toBe(true);
 });
 it('can show two statuses on a date without losing either workout',()=>{
  const data=blankData();data.weeks[week]=weekBlank();data.weeks[week].schedule!.Monday=today;
  data.weeks[week].done.Monday=true;data.weeks[week].completedOn!.Monday=today;
  const all=dayIndicators(data,today);
  expect(all).toHaveLength(2);expect(all.some(d=>d.status==='completed')).toBe(true);
  expect(all.some(d=>d.status==='scheduled')).toBe(true);
 });
 it('never selects a skipped or rest day as actionable',()=>{
  const data=blankData();data.weeks[week]=weekBlank();
  data.weeks[week].scheduleStatus!.Saturday='skipped';
  expect(homeFocus(data,today).kind).toBe('skipped');
  expect(homeFocus(data,today).entry).toBeUndefined();
 });
});

describe('Phase B Home today-first selector regression',()=>{
 const sunday='2026-11-22',friday='2026-11-20',week='2026-11-16';
 it('does not replace an unscheduled Sunday with an older missed swim',()=>{
  const data=blankData();
  expect(homeFocus(data,sunday).kind).toBe('idle');
  const missed=homeQueue(data,sunday,3,3).missed;
  expect(missed.some(item=>item.day==='Friday'&&item.date===friday)).toBe(true);
 });
 it('keeps original week/day for missed-workout recovery or skip',()=>{
  const data=blankData();
  const missed=homeQueue(data,sunday,3,3).missed.find(item=>item.day==='Friday');
  expect(missed).toMatchObject({week,day:'Friday',date:friday,status:'scheduled'});
  data.weeks[week]=weekBlank();
  data.weeks[week].scheduleStatus!.Friday='rest';
  expect(homeQueue(data,sunday,3,3).missed.some(item=>item.day==='Friday')).toBe(false);
  expect(homeFocus(data,sunday).kind).toBe('idle');
 });
 it('shows an intentional today recovery entry for Undo without marking completed',()=>{
  const data=blankData();data.weeks[week]=weekBlank();
  data.weeks[week].scheduleStatus!.Saturday='rest';
  const detail=todayFocus(data,'2026-11-21');
  expect(detail.kind).toBe('recovery');
  expect(detail.entry).toMatchObject({day:'Saturday',status:'rest'});
  expect(data.weeks[week].done.Saturday).not.toBe(true);
 });
 it('puts an upcoming workout in a separate navigable queue',()=>{
  const data=blankData();
  const future=homeQueue(data,sunday,3,3).upcoming;
  expect(future.find(item=>item.day==='Monday')).toMatchObject({date:'2026-11-23',status:'scheduled'});
  expect(homeFocus(data,sunday).kind).toBe('idle');
 });
 it('preserves active workout priority and still exposes today',()=>{
  const data=blankData();data.weeks[week]=weekBlank();
  data.weeks[week].timing!.Friday={startedAt:'2026-11-21T09:00:00.000Z'};
  expect(homeFocus(data,sunday).kind).toBe('active');
  expect(todayFocus(data,sunday).kind).toBe('idle');
 });
 it('does not count missing timer metadata as recorded training time',()=>{
  const data=blankData();data.weeks[week]=weekBlank();data.weeks[week].done.Monday=true;
  const result=weeklyTrainingTime(data,week);
  expect(result.sessions).toBe(0);
  expect(result.minutes).toBe(0);
  expect(result.averageMinutes).toBeNull();
 });
});

describe('Phase B actual-date completion on Home',()=>{
 it('shows a workout completed on Sunday even if originally scheduled for Friday',()=>{
  const week='2026-11-16',today='2026-11-22';
  const data=blankData();data.weeks[week]=weekBlank();
  data.weeks[week].done.Friday=true;
  data.weeks[week].completedOn!.Friday=today;
  expect(todayFocus(data,today)).toMatchObject({kind:'completed',entry:{week,day:'Friday',date:today,status:'completed'}});
 });
});
