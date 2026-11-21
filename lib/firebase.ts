'use client';
import {getApp,getApps,initializeApp,type FirebaseApp} from 'firebase/app';
import {getAuth,GoogleAuthProvider,signInWithPopup,signOut,setPersistence,browserLocalPersistence,onAuthStateChanged,type Auth,type User} from 'firebase/auth';
import {initializeFirestore,persistentLocalCache,persistentMultipleTabManager,memoryLocalCache,collection,onSnapshot,doc,setDoc,runTransaction,type Firestore,type Unsubscribe} from 'firebase/firestore';
import type {UserInfo,SetDocument,PendingSetWrite} from './types';
import {acceptSetRevision,SetVersionConflict} from './set-sync';
import {acceptItemRevision,ItemVersionConflict,type SyncItemDocument,type PendingSyncItem} from './item-sync';

export const firebaseConfig={
 apiKey:process.env.NEXT_PUBLIC_FIREBASE_API_KEY||'',
 authDomain:process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN||'',
 projectId:process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID||'',
 appId:process.env.NEXT_PUBLIC_FIREBASE_APP_ID||'',
 messagingSenderId:process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID||'',
};
export const firebaseConfigured=!!(firebaseConfig.apiKey&&firebaseConfig.authDomain&&firebaseConfig.projectId&&firebaseConfig.appId);
let app:FirebaseApp|undefined,auth:Auth|undefined,db:Firestore|undefined;
function init(){
 if(!firebaseConfigured)return false;
 if(!app){app=getApps().length?getApp():initializeApp(firebaseConfig);auth=getAuth(app);
   // Firestore persistence is enabled before the database is ever used.
   try { db=initializeFirestore(app,{localCache:persistentLocalCache({tabManager:persistentMultipleTabManager()})}); }
   catch {db=initializeFirestore(app,{localCache:memoryLocalCache()});} // Safari private mode and restricted IndexedDB.
 }
 return true;
}
export function observeAuth(callback:(user:UserInfo|null)=>void,onError:(e:Error)=>void):Unsubscribe {
 if(!init())return ()=>{};
 void setPersistence(auth!,browserLocalPersistence).catch(onError);
 return onAuthStateChanged(auth!,u=>callback(u?toUserInfo(u):null),onError);
}
export function toUserInfo(u:User):UserInfo{return {uid:u.uid,name:u.displayName||'Member',email:u.email||'',photoURL:u.photoURL};}
export async function googleSignIn(){if(!init())throw new Error('Set Firebase NEXT_PUBLIC environment variables first');const provider=new GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});return signInWithPopup(auth!,provider);}
export async function googleSignOut(){if(auth)await signOut(auth);}
const COLLECTIONS=['gymSessions','swimSessions','weighIns','waterEntries','settings','gymSets','syncItems'] as const;
function colFor(key:string){if(key==='preferences')return 'settings';if(key.startsWith('weight:'))return 'weighIns';if(key.startsWith('water:'))return 'waterEntries';if(key.startsWith('session:'))return ['Monday','Tuesday','Wednesday'].includes(key.split(':')[2])?'gymSessions':'swimSessions';throw new Error('Unexpected record key');}
export function watchRecords(uid:string,onRecord:(key:string,payload:unknown,stamp:number,localWrite:boolean,fromCache:boolean)=>void,onSet:(record:SetDocument,localWrite:boolean,fromCache:boolean)=>void,onItem:(record:SyncItemDocument,localWrite:boolean,fromCache:boolean)=>void,onStatus:(allServerReady:boolean,pending:boolean)=>void,onError:(e:Error)=>void):Unsubscribe {
 if(!db)return ()=>{};
 const synced=new Set<string>();const activeWrites=new Map<string,boolean>();
 const subscriptions=COLLECTIONS.map(name=>onSnapshot(collection(db!,'users',uid,name),{includeMetadataChanges:true},s=>{
  for(const change of s.docChanges())if(change.type!=='removed'){
   const value=change.doc.data();
   if(name==='syncItems'){
     if(typeof value.key==='string'&&value.key===change.doc.id)onItem(value as SyncItemDocument,change.doc.metadata.hasPendingWrites,s.metadata.fromCache);
   }else if(name==='gymSets'){
     if(typeof value.key==='string'&&value.key===change.doc.id)onSet(value as SetDocument,change.doc.metadata.hasPendingWrites,s.metadata.fromCache);
   }else if(typeof value.recordKey==='string')onRecord(value.recordKey,value.payload,Number(value.updatedMs)||0,change.doc.metadata.hasPendingWrites,s.metadata.fromCache);
  }
  if(!s.metadata.fromCache)synced.add(name);
  activeWrites.set(name,s.metadata.hasPendingWrites);
  onStatus(synced.size===COLLECTIONS.length,[...activeWrites.values()].some(Boolean));
 },onError));
 return ()=>subscriptions.forEach(fn=>fn());
}
export function writeRecord(uid:string,key:string,payload:unknown,updatedMs:number):Promise<void>{
 if(!db)return Promise.reject(new Error('Firebase unavailable'));
 const c=colFor(key);return setDoc(doc(db,'users',uid,c,key==='preferences'?'main':key),{recordKey:key,payload,updatedMs});
}

// A transaction runs only when online. Pending operations are saved in localStorage first.
// A stale revision is surfaced as a conflict, never silently overwritten.
export async function writeSet(uid:string,op:PendingSetWrite):Promise<SetDocument> {
 if(!db)throw new Error('Firebase unavailable');
 const ref=doc(db,'users',uid,'gymSets',op.key);
 return runTransaction(db,async transaction=>{
  const snapshot=await transaction.get(ref);
  const remote=snapshot.exists()?snapshot.data() as SetDocument:null;
  const decision=acceptSetRevision(remote,op);
  if(decision==='conflict')throw new SetVersionConflict(remote);
  if(decision==='already-saved')return remote!;
  const next:SetDocument={key:op.key,sessionKey:op.sessionKey,setId:op.setId,
    exercise:op.exercise,index:op.index,value:op.value,revision:(remote?.revision??0)+1,
    updatedMs:op.updatedMs,updatedBy:uid};
  transaction.set(ref,next);
  return next;
 });
}

// Version-checked writes are distinct from legacy whole-session documents.
// Transactions cannot commit while offline, so the caller retains the pending op.
export async function writeSyncItem(uid:string,op:PendingSyncItem):Promise<SyncItemDocument> {
 if(!db)throw new Error('Firebase unavailable');
 const ref=doc(db,'users',uid,'syncItems',op.key);
 return runTransaction(db,async transaction=>{
  const snapshot=await transaction.get(ref);
  const remote=snapshot.exists()?snapshot.data() as SyncItemDocument:null;
  const decision=acceptItemRevision(remote,op);
  if(decision==='conflict')throw new ItemVersionConflict(remote);
  if(decision==='already-saved')return remote!;
  const next:SyncItemDocument={key:op.key,kind:op.kind,value:op.value,revision:(remote?.revision??0)+1,updatedMs:op.updatedMs,updatedBy:uid};
  transaction.set(ref,next);return next;
 });
}
