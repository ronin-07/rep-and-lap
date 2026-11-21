import {describe,it,expect} from 'vitest';
import {blankData,weekBlank} from '../lib/storage';
import {setCount,loggedSet,gymStats} from '../lib/metrics';
import {stableSetId} from '../lib/set-sync';
import {applySetCountChange,hasRemovableValues} from '../lib/set-management';
import {makeRest,nextIncompleteSet,needsManualCompletionDate,parseRest} from '../lib/workout-flow';
import {completedDate,scheduledDate,originalPlannedDate} from '../lib/scheduling';
const week='2026-11-16',day='Monday' as const,ex='Barbell bench press';
const setup=()=>{const data=blankData();data.weeks[week]=weekBlank();return data;};

describe('set-count bugfixes',()=>{
 it('removes an empty last set, updating both count sources',()=>{
  const data=setup();
  data.weeks[week].gym.Monday={[ex]:{sets:[],setCount:4}};
  data.setOverrides[`Monday|${ex}`]=4;
  expect(hasRemovableValues(undefined)).toBe(false);
  expect(hasRemovableValues({kg:'',reps:'',rpe:8})).toBe(true);
  expect(applySetCountChange(data,week,day,ex,-1,null)?.newCount).toBe(3);
  expect(setCount(data,week,day,ex)).toBe(3);
  expect(data.weeks[week].gym.Monday?.[ex].setCount).toBe(3);
  expect(data.setOverrides[`Monday|${ex}`]).toBe(3);
  expect(data.weeks[week].gym.Monday?.[ex].sets[3]).toMatchObject({kg:'',reps:'',done:false,deleted:true});
 });
 it('clears removed values and re-adds a genuinely blank set, even after repeated cycles',()=>{
  const data=setup();
  data.weeks[week].gym.Monday={[ex]:{setCount:4,sets:[{}, {}, {},{id:stableSetId(ex,3),kg:60,reps:8,done:true,rpe:8}]}};
  expect(hasRemovableValues(data.weeks[week].gym.Monday![ex].sets[3])).toBe(true);
  for(let i=0;i<2;i++){
   expect(applySetCountChange(data,week,day,ex,-1)?.newCount).toBe(3);
   expect(setCount(data,week,day,ex)).toBe(3);
   expect(gymStats(data,week,day).logged).toBe(0);
   expect(applySetCountChange(data,week,day,ex,1)?.newCount).toBe(4);
   const restored=data.weeks[week].gym.Monday![ex].sets[3];
   expect(restored).toMatchObject({kg:'',reps:'',done:false,deleted:false});
   expect(restored.rpe).toBeUndefined();
   expect(restored.id).toBe(stableSetId(ex,3));
   expect(loggedSet(restored)).toBe(false);
  }
  expect(data.pendingSets[`session:${week}:${day}~${stableSetId(ex,3)}`]?.value.deleted).toBe(false);
 });
 it('keeps an existing rest countdown but redirects the next-set shortcut to newly added set',()=>{
  const data=setup();
  data.weeks[week].gym.Monday={[ex]:{setCount:3,sets:[{kg:60,reps:10,done:true},{kg:60,reps:9,done:true},{kg:60,reps:8,done:true}]}};
  const originalTarget=nextIncompleteSet(data,week,day,ex,2);
  expect(originalTarget?.exercise).not.toBe(ex);
  const from={week,day,exercise:ex,index:2};
  const rest=makeRest(90,originalTarget,1_000_000,from);
  const updated=applySetCountChange(data,week,day,ex,1,rest);
  expect(updated?.rest?.target).toEqual({week,day,exercise:ex,index:3});
  expect(updated?.rest?.endsAt).toBe(rest.endsAt);
  expect(updated?.rest?.startedAt).toBe(rest.startedAt);
  expect(nextIncompleteSet(data,week,day,ex,2)).toEqual({week,day,exercise:ex,index:3});
  expect(parseRest(JSON.stringify(updated?.rest),1_000_001)?.from).toEqual(from);
 });
 it('retargets old rest states without origin only when target corresponds to preceding last set',()=>{
  const data=setup();
  data.weeks[week].gym.Monday={[ex]:{setCount:3,sets:[{kg:50,reps:10,done:true},{kg:50,reps:9,done:true},{kg:50,reps:8,done:true}]}};
  const target=nextIncompleteSet(data,week,day,ex,2);
  const rest=makeRest(90,target,1_000_000);
  const updated=applySetCountChange(data,week,day,ex,1,rest);
  expect(updated?.rest?.target).toEqual({week,day,exercise:ex,index:3});
 });
 it('marks removed target inaccessible and validates set count limits',()=>{
  const data=setup();data.weeks[week].gym.Monday={[ex]:{sets:[],setCount:1}};
  expect(applySetCountChange(data,week,day,ex,-1)).toBeNull();
  data.weeks[week].gym.Monday![ex].setCount=10;
  expect(applySetCountChange(data,week,day,ex,1)).toBeNull();
 });
});

describe('retroactive workout date selection',()=>{
 it('requests a choice for past due gym and swim dates and not future/today dates',()=>{
  const data=setup();
  expect(needsManualCompletionDate(data,week,'Monday','2026-11-21')).toBe(true);
  expect(needsManualCompletionDate(data,week,'Thursday','2026-11-21')).toBe(true);
  expect(needsManualCompletionDate(data,week,'Saturday','2026-11-21')).toBe(false);
  expect(needsManualCompletionDate(data,week,'Monday','2026-11-16')).toBe(false);
 });
 it('keeps the originally planned date separate from the manually selected actual date',()=>{
  const data=setup();
  const originally=originalPlannedDate(week,'Monday');
  data.weeks[week].schedule!.Monday='2026-11-18';
  expect(scheduledDate(data,week,'Monday')).toBe('2026-11-18');
  expect(originally).toBe('2026-11-16');
  data.weeks[week].done.Monday=true;
  data.weeks[week].completedOn!.Monday='2026-11-20';
  expect(completedDate(data,week,'Monday')).toBe('2026-11-20');
  expect(scheduledDate(data,week,'Monday')).toBe('2026-11-18');
 });
});
