import {describe,it,expect} from 'vitest';
import {blankData,recordPayload,applyRecord,weekBlank} from '../lib/storage';
import {summary,waterGoal,waterTotal,history,milestones,setCount,weightTrend} from '../lib/metrics';

describe('Rep & Lap core model',()=>{
  it('uses correct activity-based hydration recommendations',()=>{
    expect(waterGoal('2026-11-16')).toBe(2500); // Monday
    expect(waterGoal('2026-11-19')).toBe(2400); // Thursday
    expect(waterGoal('2026-11-22')).toBe(2000); // Sunday
  });
  it('keeps completed session counts and volume separate',()=>{
    const d=blankData(),week='2026-11-16';d.weeks[week]=weekBlank();
    d.weeks[week].done.Monday=true;
    d.weeks[week].gym.Monday={'Barbell bench press':{sets:[{kg:'50',reps:'10',done:true},{kg:'50',reps:'9',done:true}]}};
    expect(summary(d,week).gym).toBe(1);
    expect(summary(d,week).volume).toBe(950);
    expect(setCount(d,week,'Monday','Barbell bench press')).toBe(3);
  });
  it('does not treat the first exercise session as a new PR',()=>{
    const d=blankData(),week='2026-11-16';d.weeks[week]=weekBlank();
    d.weeks[week].gym.Monday={'Barbell bench press':{sets:[{kg:50,reps:8,done:true}]}};
    expect(history(d,'Monday','Barbell bench press')).toHaveLength(1);
    expect(milestones(d).filter(m=>m.title==='New lifting record')).toHaveLength(0);
    const next='2026-11-23';d.weeks[next]=weekBlank();
    d.weeks[next].gym.Monday={'Barbell bench press':{sets:[{kg:52.5,reps:7,done:true}]}};
    expect(milestones(d).some(m=>m.detail.includes('52.5 kg'))).toBe(true);
  });
  it('preserves individual water records and tombstones',()=>{
    const d=blankData();d.waterLogs.a={date:'2026-11-20',at:'2026-11-20T15:00:00Z',ml:750};
    d.waterLogs.b={date:'2026-11-20',at:'2026-11-20T17:00:00Z',ml:250,deleted:true};
    expect(waterTotal(d,'2026-11-20')).toBe(750);
    const remote=applyRecord(blankData(),'water:a',recordPayload(d,'water:a'));
    expect(waterTotal(remote,'2026-11-20')).toBe(750);
  });
  it('computes a rolling weight trend while ignoring deleted records',()=>{
    const d=blankData();d.weights['2026-11-16']={kg:82};d.weights['2026-11-17']={kg:81};d.weights['2026-11-18']={deleted:true};
    const trend=weightTrend(d);
    expect(trend).toHaveLength(2);
    expect(trend[1].avg).toBe(81.5);
  });
  it('uses the same Firestore session payload as the previous app',()=>{
    const d=blankData();d.weeks['2026-11-16']=weekBlank();d.weeks['2026-11-16'].done.Monday=true;
    const payload=recordPayload(d,'session:2026-11-16:Monday');
    expect(payload).toMatchObject({done:true});
    expect(applyRecord(blankData(),'session:2026-11-16:Monday',payload).weeks['2026-11-16'].done.Monday).toBe(true);
  });
});
