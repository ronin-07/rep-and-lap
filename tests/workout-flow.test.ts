import {describe,it,expect} from 'vitest';
import {blankData,weekBlank} from '../lib/storage';
import {nextIncompleteSet,previousCompletedSet,suggestedNextSet,makeRest,parseRest,secondsLeft,formatRest,validEffort} from '../lib/workout-flow';
import {PLAN} from '../lib/plan';
import type {GymDay} from '../lib/types';
const week='2026-11-16';
const day:GymDay='Monday';
const plan=PLAN.Monday;
if(plan.kind!=='gym')throw new Error('Expected a gym plan');
const exercise=plan.exercises[0].name;

describe('mobile rest timer survives lock and reload',()=>{
 it('uses timestamps, not intervals, to determine the remaining duration',()=>{
  const startedAt=1_000_000;
  const timer=makeRest(90,{week,day,exercise,index:1},startedAt);
  expect(secondsLeft(timer,startedAt+30000)).toBe(60);
  const restored=parseRest(JSON.stringify(timer),startedAt+150000);
  expect(restored?.target?.exercise).toBe(exercise);
  expect(secondsLeft(restored,startedAt+150000)).toBe(0);
  expect(formatRest(89)).toBe('01:29');
 });
 it('discards malformed, unreasonable and very stale rest state',()=>{
  expect(parseRest('not json')).toBeNull();
  expect(parseRest(JSON.stringify(makeRest(90,null,0)),13*3600000)).toBeNull();
  expect(parseRest(JSON.stringify({...makeRest(90,null,0),endsAt:Infinity}),0)).toBeNull();
  expect(parseRest(JSON.stringify({...makeRest(90,null,0),target:{week,day,exercise,index:-1}}),0)).toBeNull();
 });
});

describe('next-set navigation and safe autofill',()=>{
 it('returns the next unfinished set rather than repeating the logged one',()=>{
  const data=blankData();data.weeks[week]=weekBlank();data.weeks[week].gym.Monday={[exercise]:{sets:[{kg:'60',reps:'10',done:true}]}};
  expect(nextIncompleteSet(data,week,day,exercise,0)).toEqual({week,day,exercise,index:1});
 });
 it('does not start a timer when all prescribed sets are logged',()=>{
  const data=blankData();data.weeks[week]=weekBlank();
  for(const ex of plan.exercises)data.weeks[week].gym.Monday![ex.name]={sets:Array.from({length:ex.sets},()=>({kg:60,reps:10,done:true}))};
  expect(nextIncompleteSet(data,week,day,exercise,0)).toBeNull();
 });
 it('copies from the latest comparable completed session, falling back to its last set',()=>{
  const data=blankData();data.weeks['2026-11-09']=weekBlank();
  data.weeks['2026-11-09'].gym.Monday={[exercise]:{sets:[{kg:50,reps:10,done:true},{kg:52.5,reps:8,done:true}]}};
  expect(previousCompletedSet(data,week,day,exercise,1)?.kg).toBe(52.5);
  expect(previousCompletedSet(data,week,day,exercise,7)?.reps).toBe(8);
  data.weeks[week]=weekBlank();data.weeks[week].gym.Monday={[exercise]:{sets:[{kg:55,reps:9,done:true}]}};
  expect(suggestedNextSet(data,week,day,exercise,1)?.kg).toBe(55); // Same workout wins.
  expect(suggestedNextSet(data,week,day,exercise,0)?.kg).toBe(50); // Prior week fallback.
 });
});

describe('optional effort rating validation',()=>{
 it('accepts RIR from 0 through 4 and RPE in half increments from 6 to 10',()=>{
  expect(validEffort('rir',0)).toBe(true);
  expect(validEffort('rir',4)).toBe(true);
  expect(validEffort('rir',4.5)).toBe(false);
  expect(validEffort('rpe',7.5)).toBe(true);
  expect(validEffort('rpe',10.5)).toBe(false);
  expect(validEffort('rpe',7.3)).toBe(false);
 });
});
