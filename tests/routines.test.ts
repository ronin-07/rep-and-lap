import {describe,it,expect} from 'vitest';
import {blankData,weekBlank,recordPayload,applyRecord} from '../lib/storage';
import {exercisesFor,editRoutine,EXERCISE_LIBRARY} from '../lib/routines';
import {gymStats} from '../lib/metrics';
import {readBackup,mergeBackup} from '../lib/backup';
const w='2026-11-16';
describe('Gym routine templates and session-specific substitutions',()=>{
 it('starts with the original plan and never mutates the shared template',()=>{
  const d=blankData();const original=exercisesFor(d,w,'Monday');
  const edited=editRoutine(original,'add',original.length,EXERCISE_LIBRARY[0]);
  expect(edited).toHaveLength(original.length+1);
  expect(exercisesFor(d,w,'Monday')).toHaveLength(original.length);
 });
 it('allows reorder, substitutions, removal, and refuses duplicates',()=>{
  const d=blankData();const original=exercisesFor(d,w,'Monday');
  const moved=editRoutine(original,'move',0,1);
  expect(moved[1].name).toBe(original[0].name);
  const swap=editRoutine(moved,'replace',1,EXERCISE_LIBRARY[0]);
  expect(swap[1].name).toBe('Dumbbell bench press');
  expect(editRoutine(swap,'remove',1)).toHaveLength(original.length-1);
  expect(()=>editRoutine(original,'add',0,original[0])).toThrow();
 });
 it('session override takes precedence over saved default and survives Firestore sync',()=>{
  const d=blankData();d.routineTemplates.Monday=[{name:'Machine chest press',sets:3,reps:'8–12',muscles:'Chest'}];
  expect(exercisesFor(d,w,'Monday')[0].name).toBe('Machine chest press');
  d.weeks[w]=weekBlank();d.weeks[w].routineOverrides!.Monday=[{name:'Dumbbell bench press',sets:3,reps:'8–12',muscles:'Chest'}];
  expect(exercisesFor(d,w,'Monday')[0].name).toBe('Dumbbell bench press');
  const remote=applyRecord(blankData(),`session:${w}:Monday`,recordPayload(d,`session:${w}:Monday`));
  expect(exercisesFor(remote,w,'Monday')[0].name).toBe('Dumbbell bench press');
  const pref=applyRecord(remote,'preferences',recordPayload(d,'preferences'));
  expect(pref.routineTemplates.Monday?.[0].name).toBe('Machine chest press');
 });
 it('uses active session routine for planned sets and retains archived exercise history',()=>{
  const d=blankData();d.weeks[w]=weekBlank();
  d.weeks[w].gym.Monday={'Barbell bench press':{sets:[{kg:50,reps:8,done:true}]}};
  d.weeks[w].routineOverrides!.Monday=[{name:'Dumbbell bench press',sets:2,reps:'8–12',muscles:'Chest'}];
  expect(gymStats(d,w,'Monday').total).toBe(2);
  expect(d.weeks[w].gym.Monday?.['Barbell bench press']?.sets[0].kg).toBe(50);
 });
 it('backs up new per-week and default routine structures safely',()=>{
  const d=blankData();d.routineTemplates.Monday=[{name:'Machine chest press',sets:3,reps:'8–12',muscles:'Chest'}];
  d.weeks[w]=weekBlank();d.weeks[w].routineOverrides!.Monday=[{name:'Dumbbell bench press',sets:2,reps:'8–12',muscles:'Chest'}];
  const preview=readBackup(JSON.stringify(d),blankData());const merged=mergeBackup(blankData(),preview.backup);
  expect(merged.data.routineTemplates.Monday?.[0].name).toBe('Machine chest press');
  expect(merged.data.weeks[w].routineOverrides?.Monday?.[0].name).toBe('Dumbbell bench press');
  expect(merged.changedKeys).toContain('preferences');
 });
});

describe('Active workout navigation with custom routines',()=>{
 it('finds the next exercise in the edited order, not the original hardcoded plan',async()=>{
  const {nextIncompleteSet}=await import('../lib/workout-flow');
  const d=blankData();d.weeks[w]=weekBlank();
  d.weeks[w].routineOverrides!.Monday=[
   {name:'Dumbbell bench press',sets:1,reps:'8–12',muscles:'Chest'},
   {name:'Machine chest press',sets:1,reps:'8–12',muscles:'Chest'}
  ];
  d.weeks[w].gym.Monday={'Dumbbell bench press':{sets:[{kg:20,reps:10,done:true}]}};
  expect(nextIncompleteSet(d,w,'Monday','Dumbbell bench press',0)).toMatchObject({exercise:'Machine chest press',index:0});
 });
});

describe('Hotfix: safe routine confirmations and template isolation',()=>{
 it('preserves the active session and previously logged sessions when saving a new default',async()=>{
  const {freezeExistingRoutines}=await import('../lib/routines');
  const d=blankData(),older='2026-11-09';
  d.routineTemplates.Monday=[{name:'Machine chest press',sets:3,reps:'8–12',muscles:'Chest'}];
  d.weeks[older]=weekBlank();
  d.weeks[older].gym.Monday={'Machine chest press':{sets:[{kg:35,reps:10,done:true}]}};
  d.weeks[w]=weekBlank();
  const beforeOld=exercisesFor(d,older,'Monday');
  const beforeCurrent=exercisesFor(d,w,'Monday');
  freezeExistingRoutines(d,w,'Monday');
  d.routineTemplates.Monday=[{name:'Dumbbell bench press',sets:3,reps:'8–12',muscles:'Chest'}];
  expect(exercisesFor(d,older,'Monday')).toEqual(beforeOld);
  expect(exercisesFor(d,w,'Monday')).toEqual(beforeCurrent);
  expect(exercisesFor(d,'2026-11-30','Monday')[0].name).toBe('Dumbbell bench press');
 });
 it('restores original future default without changing past logged or active session routines',async()=>{
  const {resetDefaultPreservingHistory}=await import('../lib/routines');
  const d=blankData(),past='2026-11-09';
  d.routineTemplates.Monday=[{name:'Machine chest press',sets:3,reps:'8–12',muscles:'Chest'}];
  d.weeks[past]=weekBlank();d.weeks[past].gym.Monday={'Machine chest press':{sets:[{kg:40,reps:9,done:true}]}};
  d.weeks[w]=weekBlank();
  const previous=exercisesFor(d,past,'Monday');const active=exercisesFor(d,w,'Monday');
  resetDefaultPreservingHistory(d,w,'Monday');
  expect(d.routineTemplates.Monday).toBeUndefined();
  expect(exercisesFor(d,past,'Monday')).toEqual(previous);
  expect(exercisesFor(d,w,'Monday')).toEqual(active);
  expect(exercisesFor(d,'2026-11-30','Monday')).toEqual(exercisesFor(blankData(),'2026-11-30','Monday'));
 });
 it('restoring workout preserves logged substitutions and their full set count',async()=>{
  const {restoredSessionRoutine}=await import('../lib/routines');
  const d=blankData();d.weeks[w]=weekBlank();
  d.weeks[w].routineOverrides!.Monday=[{name:'Dumbbell bench press',sets:1,reps:'8–12',muscles:'Chest'}];
  d.weeks[w].gym.Monday={'Dumbbell bench press':{sets:[{kg:20,reps:12,done:true},{kg:22,reps:9,done:true}]}};
  const restored=restoredSessionRoutine(d,w,'Monday');
  expect(restored.find(ex=>ex.name==='Dumbbell bench press')?.sets).toBeGreaterThanOrEqual(2);
  expect(d.weeks[w].gym.Monday['Dumbbell bench press']!.sets).toHaveLength(2);
  expect(restored[0].name).toBe(exercisesFor(blankData(),w,'Monday')[0].name);
 });
});
