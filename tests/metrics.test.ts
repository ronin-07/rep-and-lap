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

describe('Workout intelligence and rescheduling',()=>{
  it('estimates 1RM with the Epley formula only for valid rep ranges',async()=>{
    const {estimatedOneRepMax}=await import('../lib/metrics');
    expect(estimatedOneRepMax(60,5)).toBeCloseTo(70);
    expect(estimatedOneRepMax(100,1)).toBe(100);
    expect(estimatedOneRepMax(0,8)).toBeNull();
    expect(estimatedOneRepMax(50,15)).toBeNull();
  });
  it('compares the same lift over multiple training weeks',async()=>{
    const {strengthInsights}=await import('../lib/metrics');
    const d=blankData();
    d.weeks['2026-11-16']=weekBlank();d.weeks['2026-11-23']=weekBlank();
    d.weeks['2026-11-16'].gym.Monday={'Barbell bench press':{sets:[{kg:50,reps:10,done:true}]}};
    d.weeks['2026-11-23'].gym.Monday={'Barbell bench press':{sets:[{kg:55,reps:10,done:true}]}};
    const insight=strengthInsights(d);
    expect(insight.matched).toHaveLength(1);
    expect(insight.overallPct).toBeCloseTo(10);
  });
  it('round trips start, end, completion and moved session date through Firestore format',async()=>{
    const {sessionMinutes,calendarCompleted,recentSessions}=await import('../lib/metrics');
    const d=blankData();const week='2026-11-16';d.weeks[week]=weekBlank();
    d.weeks[week].done.Monday=true;
    d.weeks[week].schedule!.Monday='2026-11-23';
    d.weeks[week].timing!.Monday={startedAt:'2026-11-23T15:00:00Z',endedAt:'2026-11-23T16:10:00Z'};
    d.weeks[week].completedAt!.Monday='2026-11-23T16:10:00Z';
    const remote=applyRecord(blankData(),`session:${week}:Monday`,recordPayload(d,`session:${week}:Monday`));
    expect(remote.weeks[week].schedule!.Monday).toBe('2026-11-23');
    expect(sessionMinutes(remote.weeks[week].timing?.Monday)).toBe(70);
    expect(calendarCompleted(remote,'2026-11-23').gym).toBe(1);
    expect(calendarCompleted(remote,'2026-11-16').gym).toBe(0);
    expect(recentSessions(remote)[0].minutes).toBe(70);
  });
});
