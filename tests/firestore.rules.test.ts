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
