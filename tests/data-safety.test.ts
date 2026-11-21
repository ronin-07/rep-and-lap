import {describe,it,expect} from 'vitest';
import {blankData,weekBlank,recordPayload,applyRecord} from '../lib/storage';
import {stableSetId,normalizeSets,queueSetChange,integrateServerSet,acknowledgeSet,flagConflict,resolveSetConflict,acceptSetRevision} from '../lib/set-sync';
import {readBackup,mergeBackup,markRestoredWrites,csvCell} from '../lib/backup';
import type {SetDocument} from '../lib/types';
const wk='2026-11-16',session=`session:${wk}:Monday`,exercise='Barbell bench press';
function legacy(){const d=blankData();d.version=2;d.weeks[wk]=weekBlank();d.weeks[wk].gym.Monday={[exercise]:{sets:[{kg:'60',reps:'8',done:true},{kg:'60',reps:'7',done:true}]}};return d;}
describe('v3 legacy migration and individual set operation safety',()=>{
 it('preserves legacy sets and assigns deterministic stable IDs',()=>{
  const d=normalizeSets(legacy());
  expect(d.version).toBe(4);
  expect(d.weeks[wk].gym.Monday?.[exercise].sets[0].id).toBe(stableSetId(exercise,0));
  expect(normalizeSets(d).weeks[wk].gym.Monday?.[exercise].sets[0].kg).toBe('60');
 });
 it('keeps independent set writes separate even when another session snapshot arrives',()=>{
  const d=normalizeSets(legacy());
  const a=queueSetChange(d,session,exercise,0,s=>{s.kg='62.5';});
  const b=queueSetChange(d,session,exercise,1,s=>{s.reps='9';});
  expect(a).not.toBe(b);expect(Object.keys(d.pendingSets)).toHaveLength(2);
  const older=applyRecord(d,session,recordPayload(legacy(),session));
  expect(older.weeks[wk].gym.Monday?.[exercise].sets[0].kg).toBe('62.5');
  expect(older.weeks[wk].gym.Monday?.[exercise].sets[1].reps).toBe('9');
 });
 it('flags concurrent same-set edits without silently replacing the local value',()=>{
  const d=normalizeSets(legacy()),key=queueSetChange(d,session,exercise,0,s=>{s.kg='65';});
  const other: SetDocument={...d.pendingSets[key],value:{id:d.pendingSets[key].setId,kg:'62.5',reps:'8',done:true},revision:1,updatedBy:'alice'};
  expect(acceptSetRevision(other,d.pendingSets[key])).toBe('conflict');
  integrateServerSet(d,other);
  expect(d.weeks[wk].gym.Monday?.[exercise].sets[0].kg).toBe('65');
  flagConflict(d,key,other);expect(d.setConflicts[key]).toBeTruthy();
  resolveSetConflict(d,key,'cloud');
  expect(d.pendingSets[key]).toBeUndefined();
  expect(d.weeks[wk].gym.Monday?.[exercise].sets[0].kg).toBe('62.5');
 });
 it('allows explicitly keeping my edit after a conflict by rebasing the revision',()=>{
  const d=normalizeSets(legacy()),key=queueSetChange(d,session,exercise,0,s=>{s.reps=12;});
  const other: SetDocument={...d.pendingSets[key],value:{id:d.pendingSets[key].setId,kg:60,reps:10,done:true},revision:1,updatedBy:'alice'};
  flagConflict(d,key,other);resolveSetConflict(d,key,'mine');
  expect(d.pendingSets[key].baseRevision).toBe(1);
  expect(acceptSetRevision(other,d.pendingSets[key])).toBe('write');
 });
 it('retains a newer local change made while an older write was in flight',()=>{
  const d=normalizeSets(legacy());const key=queueSetChange(d,session,exercise,0,s=>{s.reps=9;},100);
  const firstStamp=d.pendingSets[key].updatedMs;
  const firstValue={...d.pendingSets[key].value};
  queueSetChange(d,session,exercise,0,s=>{s.reps=10;},101);
  const committed: SetDocument={...d.pendingSets[key],value:firstValue,revision:1,updatedMs:firstStamp,updatedBy:'alice'};
  acknowledgeSet(d,committed,firstStamp);
  expect(d.pendingSets[key].baseRevision).toBe(1);
  expect(d.pendingSets[key].value.reps).toBe(10);
 });
});
describe('Backup validation and non-destructive merge',()=>{
 it('imports a v2 backup without changing existing records',()=>{
  const original=legacy();const d=blankData();d.weeks[wk]=weekBlank();d.weeks[wk].done.Monday=true;
  const preview=readBackup(JSON.stringify(original),d);
  expect(preview.version).toBe(2);expect(preview.duplicates).toBe(1);
  expect(preview.newRecords).toBe(0);
  expect(mergeBackup(d,preview.backup).data.weeks[wk].done.Monday).toBe(true);
 });
 it('merges new water and gym sessions and queues each for sync',()=>{
  const imported=legacy();imported.waterLogs.bottle={date:'2026-11-16',at:'2026-11-16T10:00:00Z',ml:750};
  const preview=readBackup(JSON.stringify(imported),blankData());
  const result=mergeBackup(blankData(),preview.backup);
  expect(result.changedKeys).toContain(session);expect(result.changedKeys).toContain('water:bottle');
  markRestoredWrites(result.data,result.changedKeys,1000);
  expect(result.data.pendingSync[session]).toBeGreaterThan(0);
  expect(result.data.pendingSync['water:bottle']).toBeGreaterThan(0);
 });
 it('rejects poisoned objects, malformed dates and unsupported future formats',()=>{
  expect(()=>readBackup('{"version":3,"weeks":{"__proto__":{}}}',blankData())).toThrow();
  expect(()=>readBackup('{"version":99,"weeks":{}}',blankData())).toThrow();
  expect(()=>readBackup('{"version":2,"weeks":{"tomorrow":{}}}',blankData())).toThrow();
 });
 it('neutralizes spreadsheet formulas when exporting CSV',()=>{
  expect(csvCell('=HYPERLINK(\"http://example.com\")')).toBe('\"\'=HYPERLINK(\"\"http://example.com\"\")\"');
  expect(csvCell('Normal')).toBe('\"Normal\"');
 });
 it('rejects invalid set numbers and maliciously large imports',()=>{
  const d=legacy();d.weeks[wk].gym.Monday![exercise].sets[0].kg='oops';
  expect(()=>readBackup(JSON.stringify(d),blankData())).toThrow();
  expect(()=>readBackup('x'.repeat(5_000_001),blankData())).toThrow();
 });
});
