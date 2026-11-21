import {describe,it,expect} from 'vitest';
import {blankData,weekBlank} from '../lib/storage';
import {nextSetGuidance} from '../lib/next-set-guidance';
import {elapsedSessionMs,sessionClockState} from '../lib/session-timing';
import {swimTotals,blankSegment} from '../lib/swimming';

const week='2026-11-16';
describe('Milestone 9 next-set guidance',()=>{
 it('never invents a load with no history and stays read-only',()=>{
  const data=blankData();const before=JSON.stringify(data);
  expect(nextSetGuidance(data,week,'Monday','Bench Press',3)).toMatchObject({nextIndex:0,targetKg:null,source:'no history'});
  expect(JSON.stringify(data)).toBe(before);
 });
 it('uses the most recently logged set in this session for the next target',()=>{
  const data=blankData();data.weeks[week]=weekBlank();
  data.weeks[week].gym.Monday={'Bench Press':{sets:[{kg:60,reps:10,done:true},{kg:62.5,reps:8,done:true},{}]}};
  const target=nextSetGuidance(data,week,'Monday','Bench Press',3);
  expect(target).toMatchObject({nextIndex:2,targetKg:62.5,targetReps:8,source:'current session'});
  expect(data.weeks[week].gym.Monday?.['Bench Press'].sets[2].kg).toBeUndefined();
 });
 it('keeps guidance separate from recorded completion and handles all sets logged',()=>{
  const data=blankData();data.weeks[week]=weekBlank();
  data.weeks[week].gym.Monday={'Bench Press':{sets:[{kg:55,reps:9,done:true},{kg:55,reps:9,done:true}]}};
  expect(nextSetGuidance(data,week,'Monday','Bench Press',2)).toMatchObject({nextIndex:null,targetKg:null,source:'all sets logged'});
  expect(nextSetGuidance(data,week,'Monday','Bench Press',3)).toMatchObject({nextIndex:2,targetKg:55,targetReps:9});
 });
 it('falls back to prior completed performance when this workout has no logged set',()=>{
  const data=blankData();data.weeks['2026-11-09']=weekBlank();
  data.weeks['2026-11-09'].gym.Monday={'Bench Press':{sets:[{kg:50,reps:8,done:true}]}};
  const target=nextSetGuidance(data,week,'Monday','Bench Press',3);
  expect(target.nextIndex).toBe(0);
  expect(target.targetKg).toBe(50);
 });
});
describe('Milestone 9 compatibility checks',()=>{
 it('retains completed-duration validation for read-only summaries',()=>{
  const timing={startedAt:'2026-11-21T10:00:00.000Z',endedAt:'2026-11-21T10:30:00.000Z',pausedDurationMs:60000};
  expect(sessionClockState(timing)).toBe('stopped');
  expect(elapsedSessionMs(timing)).toBe(29*60000);
 });
 it('preserves all segments even when only one editor is visible',()=>{
  const log={poolLength:50,segments:[{...blankSegment('freestyle'),lengths:2},{...blankSegment('breaststroke'),lengths:1}]};
  expect(swimTotals(log,50).meters).toBe(150);
 });
});
