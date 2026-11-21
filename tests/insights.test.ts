import {describe,expect,it} from 'vitest';
import {blankData,weekBlank} from '../lib/storage';
import {achievements,monthLabel,monthlyRecap,muscleCoverage,musclesForExercise,nextMonth,previousMonth} from '../lib/insights';
import {loggedSet} from '../lib/metrics';

describe('Milestone 5 data-driven insights',()=>{
 it('never creates awards for an empty history',()=>{
  const data=blankData();
  expect(achievements(data).every(a=>!a.unlocked&&a.value===0)).toBe(true);
  expect(monthlyRecap(data,'2026-11').completedSessions).toBe(0);
  expect(muscleCoverage(data,'2026-11-16').countedSets).toBe(0);
 });
 it('counts primary and secondary muscles without duplicate labels',()=>{
  expect(musclesForExercise('Chest · chest · triceps')).toEqual([
   {group:'Chest',share:1},{group:'Triceps',share:0.5},
  ]);
  const data=blankData();data.weeks['2026-11-16']=weekBlank();
  data.weeks['2026-11-16'].gym.Monday={
   'Barbell bench press':{sets:[{id:'a',kg:50,reps:10,done:true},{id:'b',kg:52,reps:8,done:true},{id:'c',kg:60,reps:8,deleted:true},{id:'d',kg:70,reps:8,done:false}]},
  };
  const coverage=muscleCoverage(data,'2026-11-16');
  expect(coverage.countedSets).toBe(2);
  expect(coverage.groups.find(g=>g.group==='Chest')).toMatchObject({primarySets:2,secondarySets:0,weightedSets:2});
  expect(coverage.groups.find(g=>g.group==='Triceps')).toMatchObject({primarySets:0,secondarySets:2,weightedSets:1});
  expect(loggedSet({kg:60,reps:8,deleted:true})).toBe(false);
 });
 it('counts sets from a rescheduled session in its actual completed week',()=>{
  const data=blankData();data.weeks['2026-11-16']=weekBlank();
  data.weeks['2026-11-16'].gym.Monday={'Barbell bench press':{sets:[{kg:50,reps:10,done:true}]}};
  data.weeks['2026-11-16'].done.Monday=true;
  data.weeks['2026-11-16'].schedule!.Monday='2026-11-23';
  expect(muscleCoverage(data,'2026-11-16').countedSets).toBe(0);
  expect(muscleCoverage(data,'2026-11-23').countedSets).toBe(1);
 });
 it('counts monthly completed sessions, time, swim logs and recorded hydration only',()=>{
  const data=blankData();data.weeks['2026-10-26']=weekBlank();
  data.weeks['2026-10-26'].gym.Monday={'Barbell bench press':{sets:[{kg:50,reps:10,done:true}]}};
  data.weeks['2026-11-02']=weekBlank();
  data.weeks['2026-11-02'].gym.Monday={'Barbell bench press':{sets:[{kg:55,reps:8,done:true},{kg:55,reps:6,deleted:true}]}};
  data.weeks['2026-11-02'].done.Monday=true;
  data.weeks['2026-11-02'].timing!.Monday={startedAt:'2026-11-02T15:00:00Z',endedAt:'2026-11-02T16:10:00Z'};
  data.weeks['2026-11-02'].swim.Thursday={distance:150,longest:25};
  data.weeks['2026-11-02'].done.Thursday=true;
  data.waterLogs.a={date:'2026-11-02',at:'2026-11-02T12:00:00Z',ml:2500};
  data.waterLogs.b={date:'2026-11-03',at:'2026-11-03T12:00:00Z',ml:750};
  data.waterLogs.c={date:'2026-11-04',at:'2026-11-04T12:00:00Z',ml:2400,deleted:true};
  data.weights['2026-11-03']={kg:82};data.weights['2026-11-17']={kg:81.4};
  expect(monthlyRecap(data,'2026-10').newWeightRecords).toBe(0);
  expect(monthlyRecap(data,'2026-11')).toMatchObject({completedSessions:2,gymSessions:1,swimSessions:1,
   timedSessions:1,trainingMinutes:70,workingSets:1,liftedVolumeKg:440,swimMeters:150,
   hydrationGoalDays:1,hydrationLoggedDays:2,newWeightRecords:1});
  expect(monthlyRecap(data,'2026-11').weightChangeKg).toBeCloseTo(-0.6);
 });
 it('does not award a 50m continuous swim for multiple 25m lengths',()=>{
  const data=blankData();data.weeks['2026-11-16']=weekBlank();
  data.weeks['2026-11-16'].swim.Thursday={distance:100,longest:25};
  const nonstop=achievements(data).find(a=>a.id==='nonstop')!;
  expect(nonstop).toMatchObject({value:25,unlocked:false});
  expect(achievements(data).find(a=>a.id==='pool')?.value).toBe(100);
 });
 it('handles December–January month navigation',()=>{
  expect(nextMonth('2026-12')).toBe('2027-01');
  expect(previousMonth('2027-01')).toBe('2026-12');
  expect(monthLabel('2026-11')).toBe('November 2026');
 });
});
