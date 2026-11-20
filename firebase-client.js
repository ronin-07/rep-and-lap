/* Rep & Lap Firebase adapter (modular SDK). No secrets are stored here. */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, onAuthStateChanged, setPersistence, browserLocalPersistence, signInWithPopup, signOut } from 'https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, memoryLocalCache, collection, doc, setDoc, onSnapshot } from 'https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js';

const c = window.REP_AND_LAP_FIREBASE;
const valid = Boolean(c?.apiKey && c?.authDomain && c?.projectId && c?.appId);
const COLLECTIONS = ['gymSessions', 'swimSessions', 'weighIns', 'waterEntries', 'settings'];
let ready = false;
let auth;
let db;
let initError = null;

if(valid){
  try {
    const app = initializeApp(c);
    auth = getAuth(app);
    // IndexedDB persistent cache supports reopening online records without a connection.
    // If the browser denies IndexedDB or doesn't support it, keep local app storage working.
    try { db = initializeFirestore(app, {localCache:persistentLocalCache({tabManager:persistentMultipleTabManager()})}); }
    catch(err){
      console.warn('Persistent Firestore cache unavailable, using memory cache:', err);
      db = initializeFirestore(app, {localCache:memoryLocalCache()});
    }
    ready = true;
  } catch (err) { initError = err; console.error('Firebase initialization failed:', err); }
}

function recordCollection(key){
  if(key==='preferences')return 'settings';
  if(key.startsWith('session:')){
    const day=key.split(':')[2];
    return ['Monday','Tuesday','Wednesday'].includes(day)?'gymSessions':'swimSessions';
  }
  if(key.startsWith('weight:'))return 'weighIns';
  if(key.startsWith('water:'))return 'waterEntries';
  throw Error('Unknown record key');
}

window.RepLapFirebase = {
  configured:valid,
  ready,
  error:initError,
  onUser(callback){
    if(!ready)return ()=>{};
    // Authentication state is retained across browser sessions on this device.
    setPersistence(auth,browserLocalPersistence).catch(err=>console.warn('Auth storage persistence:',err));
    return onAuthStateChanged(auth,callback,error=>callback(null,error));
  },
  async signIn(){
    if(!ready)throw Error('Add your public Firebase web configuration first');
    const provider=new GoogleAuthProvider();
    provider.setCustomParameters({prompt:'select_account'});
    return signInWithPopup(auth,provider);
  },
  async signOut(){if(ready)return signOut(auth);},
  watch(uid,onRecord,onStatus,onError){
    if(!ready)return ()=>{};
    const unsub=[];
    const serverReady=new Set();
    COLLECTIONS.forEach(col=>{
      const ref=collection(db,'users',uid,col);
      unsub.push(onSnapshot(ref,{includeMetadataChanges:true},snapshot=>{
        // Each document is a small independent record; don't overwrite local pending edits.
        for(const change of snapshot.docChanges()){
          if(change.type==='removed')continue; // App uses tombstones so deletions sync offline.
          const value=change.doc.data();
          if(typeof value.recordKey==='string')onRecord(value.recordKey,value.payload,Number(value.updatedMs)||0,change.doc.metadata.hasPendingWrites,snapshot.metadata.fromCache);
        }
        if(!snapshot.metadata.fromCache)serverReady.add(col);
        onStatus({fromCache:snapshot.metadata.fromCache,hasPendingWrites:snapshot.metadata.hasPendingWrites,
          allServerReady:serverReady.size===COLLECTIONS.length});
      },onError));
    });
    return ()=>unsub.forEach(fn=>fn());
  },
  async put(uid,key,payload,updatedMs){
    if(!ready)throw Error('Firebase unavailable');
    const col=recordCollection(key);
    // The document ID is unique and deterministic; retries overwrite the same record.
    const id=key==='preferences'?'main':key;
    return setDoc(doc(db,'users',uid,col,id),{recordKey:key,payload,updatedMs});
  }
};
window.dispatchEvent(new Event('rep-lap-firebase-ready'));
