import {describe,it,expect} from 'vitest';
import {blankData,weekBlank,recordPayload,applyRecord} from '../lib/storage';
import {readBackup,mergeBackup} from '../lib/backup';
import {SWIM_CHECKLIST,initialSwimRoutines,swimRoutine,swimTechniqueEvidence,swimTechniqueStage,swimTotals} from '../lib/swimming';
import type {SwimSegment,SwimDay,TrackerData} from '../lib/types';

const week='2026-11-16';
const step=SWIM_CHECKLIST.freestyle[0];
const makeSwim=(id:string,steps:Record<string,boolean>={[step]:true}):SwimSegment=>({id,activity:'freestyle',mode:'advanced',lengths:2,minutes:15,technique:steps});
function addPractice(data:TrackerData,weekKey:string,day:SwimDay,completed:boolean,duplicate=false){
 const record=data.weeks[weekKey]??=weekBlank();record.done[day]=completed;
 record.swim[day]={poolLength:50,segments:[makeSwim(`${weekKey}-${day}-a`),...(duplicate?[makeSwim(`${weekKey}-${day}-b`)]:[])]};
}
describe('Milestone 8 technique evidence and mastery',()=>{
 it('only counts completed practice sessions, not unfinished saved segments',()=>{
  const data=blankData();addPractice(data,week,'Thursday',false);addPractice(data,week,'Friday',true);
  const result=swimTechniqueEvidence(data,'freestyle');
  expect(result.sessions).toBe(1);expect(result.segments).toBe(1);expect(result.byStep[step]).toBe(1);
  expect(swimTechniqueStage(result.byStep[step],false)).toBe('practicing');
 });
 it('counts checked techniques at most once per completed workout',()=>{
  const data=blankData();addPractice(data,week,'Thursday',true,true);
  expect(swimTechniqueEvidence(data,'freestyle')).toMatchObject({sessions:1,segments:2,byStep:{[step]:1}});
 });
 it('requires three completed sessions and manual confirmation to show mastery',()=>{
  const data=blankData();addPractice(data,week,'Thursday',true);addPractice(data,week,'Friday',true);
  expect(swimTechniqueStage(swimTechniqueEvidence(data,'freestyle').byStep[step],true)).toBe('practicing');
  addPractice(data,week,'Saturday',true);
  expect(swimTechniqueEvidence(data,'freestyle').byStep[step]).toBe(3);
  expect(swimTechniqueStage(3,false)).toBe('improving');
  expect(swimTechniqueStage(3,true)).toBe('mastered');
  expect(swimTechniqueStage(0,true)).toBe('not-practiced');
  data.weeks[week].done.Saturday=false;
  expect(swimTechniqueStage(swimTechniqueEvidence(data,'freestyle').byStep[step],true)).toBe('practicing');
 });
 it('ignores unchecked or unknown techniques and aggregates only by selected stroke',()=>{
  const data=blankData();addPractice(data,week,'Thursday',true);
  data.weeks[week].swim.Thursday!.segments![0].technique={[step]:false,'arbitrary technique':true};
  const evidence=swimTechniqueEvidence(data,'freestyle');
  expect(evidence.byStep[step]).toBeUndefined();expect(Object.keys(evidence.byStep)).toHaveLength(0);
  expect(swimTechniqueEvidence(data,'backstroke').sessions).toBe(0);
 });
});

describe('Milestone 8 default schedules and data compatibility',()=>{
 it('includes freestyle on all three built-in swimming days',()=>{
  const defaults=initialSwimRoutines();
  for(const day of ['Thursday','Friday','Saturday'] as const)
   expect(defaults[day].activities.some(a=>a.activity==='freestyle')).toBe(true);
 });
 it('respects existing customized swimming templates and historical week overrides',()=>{
  const data=blankData();data.swimTemplates.Friday={name:'Custom learning',description:'Personal routine',activities:[{activity:'sculling',plannedMinutes:10}]};
  const custom=swimRoutine(data,week,'Friday');
  expect(custom.name).toBe('Custom learning');expect(custom.activities.map(x=>x.activity)).toEqual(['sculling']);
  data.weeks[week]=weekBlank();data.weeks[week].swimRoutineOverrides!.Friday={name:'Historical',description:'Old training',activities:[{activity:'breaststroke',plannedMinutes:30}]};
  expect(swimRoutine(data,week,'Friday').name).toBe('Historical');
  expect(swimRoutine(data,'2026-11-23','Friday').name).toBe('Custom learning');
 });
 it('preserves technique confirmations in cloud preferences and JSON backup',()=>{
  const data=blankData();data.swimTechniqueMastery.freestyle={[step]:true};
  expect((recordPayload(data,'preferences') as Record<string,unknown>).swimTechniqueMastery).toEqual(data.swimTechniqueMastery);
  expect(applyRecord(blankData(),'preferences',recordPayload(data,'preferences')).swimTechniqueMastery).toEqual(data.swimTechniqueMastery);
  const parsed=readBackup(JSON.stringify(data),blankData());
  expect(parsed.backup.swimTechniqueMastery.freestyle?.[step]).toBe(true);
  const merged=mergeBackup(blankData(),parsed.backup);
  expect(merged.data.swimTechniqueMastery.freestyle?.[step]).toBe(true);
  expect(merged.changedKeys).toContain('preferences');
 });
 it('rejects invalid mastery confirmations in backups without harming legacy backups',()=>{
  const data=blankData();
  data.swimTechniqueMastery.freestyle={[step]:true};
  (data.swimTechniqueMastery.freestyle as Record<string,unknown>)['arbitrary technique']=true;
  expect(()=>readBackup(JSON.stringify(data),blankData())).toThrow('Invalid technique mastery confirmation');
  const legacy=blankData();delete (legacy as Partial<TrackerData>).swimTechniqueMastery;
  expect(readBackup(JSON.stringify(legacy),blankData()).backup.swimTechniqueMastery).toEqual({});
 });
 it('preserves stroke distances while technique flags and confirmation are changed',()=>{
  const data=blankData();addPractice(data,week,'Thursday',true);
  const before=swimTotals(data.weeks[week].swim.Thursday,50).meters;
  data.swimTechniqueMastery.freestyle={[step]:true};
  data.weeks[week].swim.Thursday!.segments![0].technique={[step]:false};
  expect(swimTotals(data.weeks[week].swim.Thursday,50).meters).toBe(before);
 });
});
