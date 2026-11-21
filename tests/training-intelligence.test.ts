import {describe,it,expect} from 'vitest';
import {blankData,weekBlank} from '../lib/storage';
import {resetDefaultPreservingHistory,exercisesFor} from '../lib/routines';
import {weeklyTrainingTime,trainingTimeWeeks,progressionAdvice,swimmingInsights,paceLabel} from '../lib/training-intelligence';
describe('Milestone 4 training intelligence',()=>{
 it('counts only finished timed sessions in the week of actual completion',()=>{
  const d=blankData();d.weeks['2026-11-16']=weekBlank();d.weeks['2026-11-16'].done.Monday=true;
  d.weeks['2026-11-16'].timing!.Monday={startedAt:'2026-11-23T10:00:00Z',endedAt:'2026-11-23T11:10:00Z'};
  expect(weeklyTrainingTime(d,'2026-11-16').minutes).toBe(0);
  expect(weeklyTrainingTime(d,'2026-11-23')).toMatchObject({minutes:70,sessions:1,averageMinutes:70});
  expect(trainingTimeWeeks(d,2,'2026-11-23')).toHaveLength(2);
 });
 it('advises one rep instead of premature weight increases',()=>{
  const d=blankData();d.weeks['2026-11-16']=weekBlank();
  d.weeks['2026-11-16'].gym.Monday={'Dumbbell bench press':{sets:[{kg:30,reps:10,done:true},{kg:30,reps:9,done:true}]}};
  expect(progressionAdvice(d,'2026-11-23','Monday','Dumbbell bench press')).toMatchObject({kind:'reps',targetKg:30,targetReps:11});
 });
 it('suggests a small load increase when all sets meet the range',()=>{
  const d=blankData();d.weeks['2026-11-16']=weekBlank();
  d.weeks['2026-11-16'].gym.Monday={'Dumbbell bench press':{sets:[{kg:30,reps:12,done:true,rir:2},{kg:30,reps:12,done:true,rir:2},{kg:30,reps:12,done:true,rir:3}]}};
  expect(progressionAdvice(d,'2026-11-23','Monday','Dumbbell bench press')).toMatchObject({kind:'weight',targetKg:31});
 });

 it('resetting a saved default does not hide previously logged sets',()=>{
  const d=blankData();d.weeks['2026-11-16']=weekBlank();
  d.routineTemplates.Monday=[{name:'Custom chest machine',sets:3,reps:'8–12',muscles:'Chest'}];
  d.weeks['2026-11-16'].gym.Monday={'Custom chest machine':{sets:[{kg:60,reps:8,done:true}]}};
  resetDefaultPreservingHistory(d,'2026-11-16','Monday');
  expect(d.routineTemplates.Monday).toBeUndefined();
  expect(exercisesFor(d,'2026-11-16','Monday').some(e=>e.name==='Custom chest machine')).toBe(true);
  expect(d.weeks['2026-11-16'].gym.Monday?.['Custom chest machine'].sets[0].kg).toBe(60);
  expect(exercisesFor(d,'2026-11-23','Monday').some(e=>e.name==='Barbell bench press')).toBe(true);
 });
 it('never invents a previous set',()=>{expect(progressionAdvice(blankData(),'2026-11-23','Monday','Barbell bench press')).toBeNull();});
 it('distinguishes swimming distance, continuous length and timed pace',()=>{
  const d=blankData();d.weeks['2026-11-16']=weekBlank();d.weeks['2026-11-16'].swim.Thursday={distance:100,longest:25,duration:5};
  const stats=swimmingInsights(d);expect(stats).toMatchObject({totalMeters:100,bestContinuous:25,latestPace:300});
  expect(paceLabel(stats.latestPace)).toBe('5:00 /100 m');
  expect(swimmingInsights(blankData()).bestContinuous).toBe(0);
 });
});
