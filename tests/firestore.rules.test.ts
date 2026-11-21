import {beforeAll,afterAll,beforeEach,describe,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {initializeTestEnvironment,assertFails,assertSucceeds,type RulesTestEnvironment} from '@firebase/rules-unit-testing';
import {doc,setDoc,getDoc,updateDoc,deleteDoc} from 'firebase/firestore';

let env:RulesTestEnvironment;
const id='session:2026-11-16:Monday~s-12ab34cd-0';
const payload=(uid:string,revision:number)=>({key:id,sessionKey:'session:2026-11-16:Monday',setId:'s-12ab34cd-0',
  exercise:'Bench Press',index:0,value:{id:'s-12ab34cd-0',kg:60,reps:10,done:true},revision,updatedMs:1763630000000,updatedBy:uid});
beforeAll(async()=>{env=await initializeTestEnvironment({projectId:'replap-rules-tests',firestore:{rules:readFileSync('firestore.rules','utf8')}});});
afterAll(async()=>{await env?.cleanup();});
beforeEach(async()=>{await env.clearFirestore();});

describe('Gym set security rules (Firestore emulator)',()=>{
  it('permits an owner to create and read a v3 set',async()=>{
    const db=env.authenticatedContext('alice').firestore();
    const ref=doc(db,'users/alice/gymSets',id);
    await assertSucceeds(setDoc(ref,payload('alice',1)));
    await assertSucceeds(getDoc(ref));
  });
  it('denies unauthenticated and cross-user access',async()=>{
    const mine=doc(env.authenticatedContext('alice').firestore(),'users/alice/gymSets',id);
    await assertSucceeds(setDoc(mine,payload('alice',1)));
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(),'users/alice/gymSets',id)));
    await assertFails(getDoc(doc(env.authenticatedContext('bob').firestore(),'users/alice/gymSets',id)));
    await assertFails(setDoc(doc(env.authenticatedContext('bob').firestore(),'users/alice/gymSets',id),payload('bob',1)));
  });
  it('rejects stale or skipped revision numbers',async()=>{
    const db=env.authenticatedContext('alice').firestore(),ref=doc(db,'users/alice/gymSets',id);
    await assertSucceeds(setDoc(ref,payload('alice',1)));
    await assertFails(updateDoc(ref,{revision:1}));
    await assertFails(updateDoc(ref,{revision:3}));
    await assertSucceeds(updateDoc(ref,{revision:2}));
  });
  it('accepts optional RIR/RPE and rejects invalid effort numbers',async()=>{
    const db=env.authenticatedContext('alice').firestore(),ref=doc(db,'users/alice/gymSets',id);
    await assertSucceeds(setDoc(ref,{...payload('alice',1),value:{...payload('alice',1).value,rir:2}}));
    await assertSucceeds(updateDoc(ref,{revision:2,value:{...payload('alice',1).value,rpe:8.5}}));
    await assertFails(updateDoc(ref,{revision:3,value:{...payload('alice',1).value,rir:8}}));
    await assertFails(updateDoc(ref,{revision:3,value:{...payload('alice',1).value,rpe:12}}));
  });
  it('prevents identity swaps, malformed sets and hard deletes',async()=>{
    const db=env.authenticatedContext('alice').firestore(),ref=doc(db,'users/alice/gymSets',id);
    await assertFails(setDoc(ref,{...payload('alice',1),index:99}));
    await assertSucceeds(setDoc(ref,payload('alice',1)));
    await assertFails(updateDoc(ref,{exercise:'Squat',revision:2}));
    await assertFails(deleteDoc(ref));
  });
  it('continues to accept v2 gym session documents for backwards compatibility',async()=>{
    const db=env.authenticatedContext('alice').firestore();
    await assertSucceeds(setDoc(doc(db,'users/alice/gymSessions','session:2026-11-16:Monday'),
      {recordKey:'session:2026-11-16:Monday',payload:{done:true,gym:{}},updatedMs:1763630000000}));
  });
});

describe('Milestone 3 schedule and routine fields',()=>{
  it('accepts session status and routine snapshot for the owner without relaxing document security',async()=>{
    const own=env.authenticatedContext('alice').firestore();
    const ref=doc(own,'users/alice/gymSessions','session:2026-11-16:Monday');
    const session={recordKey:'session:2026-11-16:Monday',updatedMs:1763630000000,payload:{
      done:null,plannedDate:'2026-11-19',scheduleStatus:'rest',routineOverride:[{name:'Dumbbell bench press',sets:3,reps:'8–12',muscles:'Chest'}]
    }};
    await assertSucceeds(setDoc(ref,session));
    await assertFails(setDoc(doc(env.authenticatedContext('bob').firestore(),'users/alice/gymSessions','session:2026-11-16:Monday'),session));
  });
});

describe('Milestone 7 individually versioned training items',()=>{
 const clock='session:2026-11-16:Monday~clock';
 const swim='session:2026-11-16:Thursday~swim-12345678';
 const make=(key:string,kind:'clock'|'rest'|'swim-segment',value:unknown,revision=1,uid='alice')=>({key,kind,value,revision,updatedMs:1763630000000,updatedBy:uid});
 it('permits only the owner to read or update valid clock transitions',async()=>{
  const ref=doc(env.authenticatedContext('alice').firestore(),'users/alice/syncItems',clock);
  await assertSucceeds(setDoc(ref,make(clock,'clock',{startedAt:'2026-11-19T17:00:00.000Z'})));
  await assertSucceeds(updateDoc(ref,{revision:2,value:{startedAt:'2026-11-19T17:00:00.000Z',pausedAt:'2026-11-19T17:05:00.000Z'}}));
  await assertFails(updateDoc(ref,{revision:2}));
  await assertFails(updateDoc(ref,{revision:4}));
  await assertFails(getDoc(doc(env.authenticatedContext('bob').firestore(),'users/alice/syncItems',clock)));
  await assertFails(deleteDoc(ref));
 });
 it('permits a completed two-hour safety stop but rejects forged auto-stop flags',async()=>{
  const ref=doc(env.authenticatedContext('alice').firestore(),'users/alice/syncItems',clock);
  const start='2026-11-19T17:00:00.000Z',end='2026-11-19T19:00:00.000Z';
  await assertSucceeds(setDoc(ref,make(clock,'clock',{startedAt:start})));
  await assertSucceeds(updateDoc(ref,{revision:2,value:{startedAt:start,endedAt:end,autoStopped:true}}));
  await assertFails(updateDoc(ref,{revision:3,value:{startedAt:start,autoStopped:true}}));
  await assertFails(updateDoc(ref,{revision:3,value:{startedAt:start,endedAt:end,autoStopped:false}}));
  await assertFails(updateDoc(ref,{revision:3,value:{startedAt:start,endedAt:end,pausedAt:end,autoStopped:true}}));
 });
 it('allows swimming segment tombstones but denies forged IDs and changes to kind',async()=>{
  const ref=doc(env.authenticatedContext('alice').firestore(),'users/alice/syncItems',swim);
  const data={id:'swim-12345678',activity:'freestyle',mode:'advanced',lengths:4};
  await assertSucceeds(setDoc(ref,make(swim,'swim-segment',data)));
  await assertSucceeds(updateDoc(ref,{revision:2,value:null}));
  await assertFails(updateDoc(ref,{revision:3,kind:'clock'}));
  await assertFails(updateDoc(ref,{revision:3,value:{...data,id:'forged'}}));
  await assertFails(setDoc(doc(env.authenticatedContext('bob').firestore(),'users/alice/syncItems',swim),make(swim,'swim-segment',data,1,'bob')));
 });
 it('validates the shared rest timer and forbids invalid countdowns',async()=>{
  const ref=doc(env.authenticatedContext('alice').firestore(),'users/alice/syncItems','rest');
  await assertSucceeds(setDoc(ref,make('rest','rest',{startedAt:1763630000000,endsAt:1763630090000,durationSeconds:90,target:null})));
  await assertFails(updateDoc(ref,{revision:2,value:{startedAt:1,endsAt:2,durationSeconds:-1,target:null}}));
  await assertSucceeds(updateDoc(ref,{revision:2,value:null}));
 });
});
