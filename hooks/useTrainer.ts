'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {DAYS,type Day,type GymDay,type SwimDay,type GymSet,type TrackerData,type TrackingTab,type View,type UserInfo,type SyncMode,type ProgressTab,type SessionNotes,type SwimInterval,type ScheduleStatus,type RoutineExercise,type SwimActivity,type SwimStroke,type SwimRoutine,type SwimSegment,type SwimIntervalSet} from '@/lib/types';
import {PLAN} from '@/lib/plan';
import {exercisesFor,editRoutine,cloneExercises,resetDefaultPreservingHistory,restoredSessionRoutine,freezeExistingRoutines,weeksToFreezeBeforeTemplateChange} from '@/lib/routines';
import {isValidDate,scheduledDate,statusFor} from '@/lib/scheduling';
import {keyOf,weekOf,dateFor} from '@/lib/dates';
import {achievements} from '@/lib/insights';
import {blankData,loadData,saveData,weekBlank,recordPayload,applyRecord,downloadFile,LAST_ACCOUNT_KEY,THEME_KEY} from '@/lib/storage';
import {firebaseConfigured,googleSignIn,googleSignOut,observeAuth,watchRecords,writeRecord,writeSet,writeSyncItem} from '@/lib/firebase';
import {queueSetChange,integrateServerSet,acknowledgeSet,flagConflict,resolveSetConflict,SetVersionConflict} from '@/lib/set-sync';
import {readBackup,mergeBackup,markRestoredWrites,replaceLocalBackup,csvCell,type BackupPreview,type RestoreMode} from '@/lib/backup';
import {history,num,setCount,validSet,gymStats,waterGoal,waterTotal} from '@/lib/metrics';
import {REST_KEY,makeRest,nextIncompleteSet,parseRest,previousCompletedSet,suggestedNextSet,secondsLeft,validEffort,needsManualCompletionDate,type RestState,type NextSetTarget} from '@/lib/workout-flow';
import {applySetCountChange,hasRemovableValues} from '@/lib/set-management';
import {stableSetId} from '@/lib/set-sync';
import {clockItemKey,queueSwimSegment,REST_ITEM_KEY,queueSyncItem,integrateServerItem,acknowledgeItem,flagItemConflict,resolveItemConflict,ItemVersionConflict} from '@/lib/item-sync';
import {blankSegment,swimRoutine,swimTotals,swimPersonalBests,swimTechniqueEvidence,SWIM_CHECKLIST,SWIM_ACTIVITY_LABELS,SWIM_MODE_DEFAULTS,validPool,isStroke,validSwimSegmentPatch} from '@/lib/swimming';
import {stoppedSwimTiming,completeStoppedSwim} from '@/lib/swim-session';
import {elapsedSessionMs,sessionClockState,pauseSessionTiming,resumeSessionTiming,restartSessionTiming,stopSessionTiming,autoStopSessionTiming} from '@/lib/session-timing';

export type Celebration = {title:string;body:string;kind:'pr'|'hydration'|'achievement'}|{title:string;body:string;kind:'session';discipline:'gym'|'swim'}|null;
export function useTrainer(){
 const [hydrated,setHydrated]=useState(false);
 const [data,setData]=useState<TrackerData>(blankData);
 const dataRef=useRef(data);
 const uidRef=useRef('guest');
 const [user,setUser]=useState<UserInfo|null>(null);
 const [week,setWeek]=useState(()=>weekOf(new Date()));
 const [view,setView]=useState<View>('home');
 const [trackingTab,setTrackingTab]=useState<TrackingTab>('gym');
 const [progressTab,setProgressTab]=useState<ProgressTab>('overview');
 const [gymDay,setGymDay]=useState<GymDay>('Monday');
 const [swimDay,setSwimDay]=useState<SwimDay>('Thursday');
 const [theme,setTheme]=useState<'dark'|'light'>('dark');
 const [syncMode,setSyncMode]=useState<SyncMode>('saved-local');
 const [toast,setToast]=useState('');
 const [celebration,setCelebration]=useState<Celebration>(null);
 const [queuedCelebration,setQueuedCelebration]=useState<Celebration>(null);
 const [restState,setRestState]=useState<RestState|null>(null);
 const restEnd=restState?.endsAt??0;
 const [recoveryPrompt,setRecoveryPrompt]=useState<{week:string;day:Day}|null>(null);
 const [completionRequest,setCompletionRequest]=useState<{week:string;day:Day;mode:'complete'|'edit'}|null>(null);
 const [clock,setClock]=useState(Date.now());
 const [online,setOnline]=useState(true);
 const [installPrompt,setInstallPrompt]=useState<Event|null>(null);
 const [firebaseError,setFirebaseError]=useState('');
 const [restorePreview,setRestorePreview]=useState<BackupPreview|null>(null);
 const inFlight=useRef(new Set<string>());
 const readyRef=useRef(false);
 const serverRef=useRef(false);
 const toastTimeout=useRef<ReturnType<typeof setTimeout>|null>(null);
 const flushTimeout=useRef<ReturnType<typeof setTimeout>|null>(null);
 const mountedRef=useRef(true);
 const restRef=useRef<RestState|null>(null);
 const saveRest=useCallback((next:RestState|null)=>{
  restRef.current=next;setRestState(next);
  try {const key=`${REST_KEY}:${uidRef.current}`;if(next)localStorage.setItem(key,JSON.stringify(next));else localStorage.removeItem(key);}catch{}
 },[]);
 const notify=useCallback((message:string)=>{setToast(message);if(toastTimeout.current)clearTimeout(toastTimeout.current);toastTimeout.current=setTimeout(()=>setToast(''),3000);},[]);
 const persist=useCallback((next:TrackerData)=>{
  dataRef.current=next;setData(next);
  try{saveData(uidRef.current,next);}catch{setSyncMode('needs-attention');notify('Local storage is unavailable. Export a backup.');}
 },[notify]);
 const flush=useCallback(async()=>{
  const uid=uidRef.current;
  if(uid==='guest'||!firebaseConfigured||typeof navigator==='undefined'||!navigator.onLine)return;
  const pending={...dataRef.current.pendingSync};
  for(const [key,stamp] of Object.entries(pending)){
    if(inFlight.current.has(key))continue;
    inFlight.current.add(key);setSyncMode('syncing');
    const payload=recordPayload(dataRef.current,key);
    void writeRecord(uid,key,payload,stamp).then(()=>{
      if(uidRef.current!==uid)return;
      setFirebaseError('');
      const current=dataRef.current;
      if(current.pendingSync[key]===stamp){
        const next=structuredClone(current);
        delete next.pendingSync[key];
        persist(next);
      }
      if(!Object.keys(dataRef.current.pendingSync).length&&!Object.keys(dataRef.current.pendingSets).length&&!Object.keys(dataRef.current.pendingItems).length&&serverRef.current)setSyncMode('synced');
    }).catch((err:unknown)=>{
      if(uidRef.current!==uid)return;
      setFirebaseError(err instanceof Error?err.message:'Cloud write failed');
      setSyncMode(navigator.onLine?'needs-attention':'saved-local');
    }).finally(()=>{inFlight.current.delete(key);});
  }
  for(const [key,op] of Object.entries(dataRef.current.pendingSets||{})){
    if(inFlight.current.has(`set|${key}`)||dataRef.current.setConflicts[key])continue;
    const inflightKey=`set|${key}`;inFlight.current.add(inflightKey);setSyncMode('syncing');
    void writeSet(uid,op).then(record=>{
      if(uidRef.current!==uid)return;
      setFirebaseError('');
      const next=structuredClone(dataRef.current);acknowledgeSet(next,record,op.updatedMs);persist(next);
      if(next.pendingSets[key])setTimeout(()=>void flush(),250); // User edited again during the write.
      if(!Object.keys(next.pendingSync).length&&!Object.keys(next.pendingSets).length&&!Object.keys(next.pendingItems).length&&serverRef.current)setSyncMode('synced');
    }).catch((error:unknown)=>{
      if(uidRef.current!==uid)return;
      if(error instanceof SetVersionConflict){
        const next=structuredClone(dataRef.current);flagConflict(next,key,error.remote);persist(next);
        setSyncMode('needs-attention');notify('A set conflict needs your review.');
      }else {setFirebaseError(error instanceof Error?error.message:'Set sync failed');setSyncMode('needs-attention');}
    }).finally(()=>{inFlight.current.delete(inflightKey);});
  }
  for(const [key,op] of Object.entries(dataRef.current.pendingItems||{})){
    const busy=`item|${key}`;
    if(inFlight.current.has(busy)||dataRef.current.itemConflicts[key])continue;
    inFlight.current.add(busy);setSyncMode('syncing');
    void writeSyncItem(uid,op).then(record=>{
      if(uidRef.current!==uid)return;
      setFirebaseError('');
      const next=structuredClone(dataRef.current);acknowledgeItem(next,record,op.updatedMs);persist(next);
      // An edit made during the previous transaction must be sent after that
      // transaction releases the in-flight lock, not left in the local queue.
      if(next.pendingItems[key])setTimeout(()=>void flush(),250);
      if(op.kind==='rest'&&!next.pendingItems[key])saveRest(record.value?parseRest(JSON.stringify(record.value)):null);
      if(!Object.keys(next.pendingSync).length&&!Object.keys(next.pendingSets).length&&!Object.keys(next.pendingItems).length&&serverRef.current)setSyncMode('synced');
    }).catch((error:unknown)=>{
      if(uidRef.current!==uid)return;
      if(error instanceof ItemVersionConflict){
        const next=structuredClone(dataRef.current);flagItemConflict(next,key,error.remote);persist(next);
        setSyncMode('needs-attention');notify('A timer or swim activity needs conflict review.');
      }else {setFirebaseError(error instanceof Error?error.message:'Training item sync failed');setSyncMode('needs-attention');}
    }).finally(()=>{inFlight.current.delete(busy);});
  }
 },[persist,notify,saveRest]);
 const scheduleFlush=useCallback(()=>{if(flushTimeout.current)clearTimeout(flushTimeout.current);flushTimeout.current=setTimeout(()=>void flush(),700);},[flush]);
 // Every mutation writes to the existing Firebase-era localStorage shape, preserving logged history.
 const update=useCallback((mutate:(copy:TrackerData)=>void,keys:string|string[]|null)=>{
   const next=structuredClone(dataRef.current);mutate(next);
   if(keys){for(const key of Array.isArray(keys)?keys:[keys]){
     const stamp=Math.max(Date.now(),(next.recordUpdates[key]||0)+1);
     next.recordUpdates[key]=stamp;next.pendingSync[key]=stamp;
   }}
   persist(next);
   if(keys&&uidRef.current!=='guest')scheduleFlush();
 },[persist,scheduleFlush]);
 // Rest countdown uses absolute timestamps, so it resumes at the same remaining
 // time on another device. Guest timers remain local-only.
 const saveSyncedRest=useCallback((next:RestState|null)=>{
  if(dataRef.current.itemConflicts[REST_ITEM_KEY]){notify('Review the rest timer conflict before changing it.');setView('conflicts');return;}
  if(next===null&&restRef.current===null)return;
  if(next!==null&&JSON.stringify(next)===JSON.stringify(restRef.current))return;
  saveRest(next);
  if(uidRef.current!=='guest'){
   const copy=structuredClone(dataRef.current);
   queueSyncItem(copy,REST_ITEM_KEY,'rest',next);persist(copy);scheduleFlush();
  }
 },[saveRest,persist,scheduleFlush,notify]);
 const beginRest=useCallback((seconds:number,target:NextSetTarget|null=null,from:NextSetTarget|null=null)=>{
  saveSyncedRest(makeRest(seconds,target,Date.now(),from));setClock(Date.now());
 },[saveSyncedRest]);
 useEffect(()=>{
  mountedRef.current=true;
  let active=true;
  queueMicrotask(()=>{
   if(!active)return;
   setOnline(navigator.onLine);
   let last:string|null=null;try{last=localStorage.getItem(LAST_ACCOUNT_KEY);}catch{}
  try {const user=last?JSON.parse(last) as {id?:string}:null;uidRef.current=user?.id||'guest';}catch{uidRef.current='guest';}
  const stored=loadData(uidRef.current);dataRef.current=stored;setData(stored);
  try{saveRest(parseRest(localStorage.getItem(`${REST_KEY}:${uidRef.current}`)));}catch{saveRest(null);}
  try{const oldTheme=localStorage.getItem(THEME_KEY);if(oldTheme==='dark'||oldTheme==='light')setTheme(oldTheme);}catch{}
   setHydrated(true);
  });
  if('serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='localhost')){
    void navigator.serviceWorker.register('/sw.js',{scope:'/'}).catch(()=>{});
  }
  const beforeInstall=(e:Event)=>{e.preventDefault();setInstallPrompt(e);};
  window.addEventListener('beforeinstallprompt',beforeInstall);
  return ()=>{active=false;mountedRef.current=false;window.removeEventListener('beforeinstallprompt',beforeInstall);};
 },[saveRest]);
 useEffect(()=>{
  document.documentElement.dataset.theme=theme;
  const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.setAttribute('content',theme==='dark'?'#080e1c':'#f6f7fc');
  if(hydrated)try{localStorage.setItem(THEME_KEY,theme);}catch{}
 },[theme,hydrated]);
 useEffect(()=>{
  if(!hydrated)return;
  if(!firebaseConfigured){
   let active=true;
   queueMicrotask(()=>{if(active)setSyncMode('saved-local');});
   return ()=>{active=false;};
  }
  const unsub=observeAuth(nextUser=>{
    const newId=nextUser?.uid||'guest';
    if(newId!==uidRef.current){
      const previous=dataRef.current;try{saveData(uidRef.current,previous);}catch{}
      uidRef.current=newId;inFlight.current.clear();readyRef.current=false;serverRef.current=false;
      const fresh=loadData(newId);dataRef.current=fresh;setData(fresh);
      try{restRef.current=parseRest(localStorage.getItem(`${REST_KEY}:${newId}`));}catch{restRef.current=null;}setRestState(restRef.current);
    }
    setUser(nextUser);
    try{if(nextUser)localStorage.setItem(LAST_ACCOUNT_KEY,JSON.stringify({id:nextUser.uid,email:nextUser.email}));
    else localStorage.removeItem(LAST_ACCOUNT_KEY);}catch{}
    setSyncMode(nextUser?'checking':'saved-local');
  },err=>{setFirebaseError(err.message);setSyncMode('needs-attention');});
  return ()=>unsub();
 },[hydrated]);
 const userId=user?.uid;
 useEffect(()=>{
  if(!userId)return;
  const id=userId;serverRef.current=false;readyRef.current=false;
  const stop=watchRecords(id,(key,payload,stamp,hasPending,fromCache)=>{
    if(id!==uidRef.current||hasPending||(!key.startsWith('session:')&&!key.startsWith('weight:')&&!key.startsWith('water:')&&key!=='preferences'))return;
    const current=dataRef.current;
    if(current.pendingSync[key])return; // Preserve unacknowledged local writes.
    if(fromCache&&stamp<(current.recordUpdates[key]||0))return;
    if(stamp<(current.recordUpdates[key]||0))return; // Ignore older cloud snapshots even when online.
    const next=applyRecord(current,key,payload);next.recordUpdates[key]=stamp;persist(next);
  },(record,hasPending)=>{
    if(id!==uidRef.current||hasPending)return;
    const next=structuredClone(dataRef.current);
    integrateServerSet(next,record);persist(next);
  },(item,hasPending)=>{
    if(id!==uidRef.current||hasPending)return;
    const next=structuredClone(dataRef.current);
    integrateServerItem(next,item);persist(next);
    if(item.kind==='rest'&&!next.pendingItems[REST_ITEM_KEY]){
      saveRest(item.value?parseRest(JSON.stringify(item.value)):null);
    }
  },(ready,hasPending)=>{
    serverRef.current=ready;readyRef.current=ready;
    if(Object.keys(dataRef.current.setConflicts).length||Object.keys(dataRef.current.itemConflicts).length)setSyncMode('needs-attention');
    else if(Object.keys(dataRef.current.pendingSync).length||Object.keys(dataRef.current.pendingSets).length||Object.keys(dataRef.current.pendingItems).length||hasPending)setSyncMode('syncing');
    else setSyncMode(ready?'synced':'checking');
  },err=>{setFirebaseError(err.message);setSyncMode('needs-attention');});
  void flush();
  return ()=>stop();
 },[userId,flush,persist,saveRest]);
 useEffect(()=>{if(!hydrated)return;
  const handleOnline=()=>{setOnline(true);void flush();};
  const handleOffline=()=>{setOnline(false);setSyncMode('saved-local');};
  const handleFocus=()=>{setClock(Date.now());if(navigator.onLine)void flush();};
  const handleVisibility=()=>{if(document.visibilityState==='visible'){setClock(Date.now());if(navigator.onLine)void flush();}};
  window.addEventListener('online',handleOnline);window.addEventListener('offline',handleOffline);
  window.addEventListener('focus',handleFocus);document.addEventListener('visibilitychange',handleVisibility);
  const interval=setInterval(()=>{if(navigator.onLine&&uidRef.current!=='guest'&&(Object.keys(dataRef.current.pendingSync).length||Object.keys(dataRef.current.pendingSets).length||Object.keys(dataRef.current.pendingItems).length))void flush();},30000);
  return ()=>{window.removeEventListener('online',handleOnline);window.removeEventListener('offline',handleOffline);window.removeEventListener('focus',handleFocus);document.removeEventListener('visibilitychange',handleVisibility);clearInterval(interval);};
 },[hydrated,flush]);
 // Enforce the free client-side two-hour cap. This runs on every ticking second,
 // initial local hydration, focus/visibility restoration, and cloud snapshots.
 // A closed browser cannot write to Firestore, but the exact two-hour cutoff
 // is reconstructed and synchronized once any signed-in client comes online.
 useEffect(()=>{
  if(!hydrated)return;
  let active=true;
  queueMicrotask(()=>{
  if(!active)return;
  const now=Date.now();
  const expired:{week:string;day:Day}[]=[];
  for(const [wk,record] of Object.entries(data.weeks)){
   for(const day of DAYS){
    if(record.done?.[day])continue;
    if(autoStopSessionTiming(record.timing?.[day],now))expired.push({week:wk,day});
   }
  }
  if(!expired.length)return;
  update(copy=>{
   for(const item of expired){
    const timer=copy.weeks[item.week]?.timing?.[item.day];
    const stopped=autoStopSessionTiming(timer,now);
    if(!stopped)continue;
    const record=copy.weeks[item.week];record.timing??={};record.timing[item.day]=stopped;
    queueSyncItem(copy,clockItemKey(item.week,item.day),'clock',stopped);
   }
  },expired.map(x=>`session:${x.week}:${x.day}`));
  notify(expired.length===1?'Timer automatically stopped at 2 hours. Review your workout before finishing.':`${expired.length} forgotten timers automatically stopped at 2 hours. Review them in Log.`);
  });
  return ()=>{active=false;};
 },[hydrated,data,clock,update,notify]);
 // Keep global active-clock shortcut ticking even when the user opens
 // Calendar/Progress or switches to a different workout tab.
 const liveClock=Object.values(data.weeks).some(w=>Object.values(w.timing||{}).some(t=>sessionClockState(t)==='running'));
 useEffect(()=>{if(!hydrated)return;const interval=setInterval(()=>setClock(Date.now()),liveClock?1000:15000);return ()=>clearInterval(interval);},[hydrated,liveClock]);
 useEffect(()=>{
   if(!restEnd)return;
   if(restEnd<=Date.now())return;
   const id=setInterval(()=>{const now=Date.now();setClock(now);if(now>=restEnd)clearInterval(id);},1000);
   return ()=>clearInterval(id);
 },[restEnd]);
 useEffect(()=>{
  if(!hydrated||!data.reminders.enabled)return;
  const check=()=>{
    if(document.visibilityState!=='visible'||!('Notification' in window)||Notification.permission!=='granted')return;
    const now=new Date(),date=keyOf(now),time=`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    const dayIdx=now.getDay();if(dayIdx===0||time<data.reminders.time)return;
    if(localStorage.getItem('rep-lap-reminder-shown')===date)return;
    localStorage.setItem('rep-lap-reminder-shown',date);
    new Notification('Your Rep & Lap session is ready',{body:`${PLAN[DAYS[dayIdx-1]].name} is on today’s schedule.`,icon:'/icon-192.png'});
  };
  check();const interval=setInterval(check,60000);document.addEventListener('visibilitychange',check);
  return ()=>{clearInterval(interval);document.removeEventListener('visibilitychange',check);};
 },[data.reminders.enabled,data.reminders.time,hydrated]);
 const goto=useCallback((next:View,tab?:TrackingTab)=>{
  if(tab)setTrackingTab(tab);setView(next);window.scrollTo({top:0,behavior:'instant'});
 },[]);
 const startSession=(day:Day)=>{
  if(dataRef.current.itemConflicts[clockItemKey(week,day)]){notify('Resolve the timer conflict before changing it.');setView('conflicts');return;}
  const session=dataRef.current.weeks[week]?.timing?.[day];
  if(sessionClockState(session)!=='ready'){notify('Use Pause, Resume or Restart timer for this session.');return;}
  if(dataRef.current.weeks[week]?.done?.[day]){notify('Undo completion before starting another timer.');return;}
  if(statusFor(dataRef.current,week,day)!=='scheduled'&&!confirm('This was marked as a rest or skipped day. Restore the workout and start?'))return;
  const startedMs=Date.now();const at=new Date(startedMs).toISOString();setClock(startedMs);
  update(d=>{const w=d.weeks[week]??=weekBlank();if(w.scheduleStatus)delete w.scheduleStatus[day];w.timing??={};w.timing[day]={startedAt:at};queueSyncItem(d,clockItemKey(week,day),'clock',w.timing[day]);
    if(PLAN[day].kind==='gym'){w.routineOverrides??={};w.routineOverrides[day as GymDay]??=cloneExercises(exercisesFor(d,week,day as GymDay));}
    else {w.swimRoutineOverrides??={};w.swimRoutineOverrides[day as SwimDay]??=swimRoutine(d,week,day as SwimDay);}
  },`session:${week}:${day}`);
  notify(PLAN[day].kind==='swim'?'Swim timer started. Log laps and drills when you return.':'Workout timer started. You can keep logging sets.');
 };
 // Pauses and subsequent resumes are persisted in the same session record as
 // the start/end timestamps. Old sessions have an implicit zero paused duration.
 const pauseSession=(day:Day)=>{
  if(dataRef.current.itemConflicts[clockItemKey(week,day)]){notify('Resolve the timer conflict before changing it.');setView('conflicts');return;}
  const entry=dataRef.current.weeks[week],at=new Date().toISOString();
  if(entry?.done?.[day]){notify('Undo completion before changing the clock.');return;}
  if(autoStopSessionTiming(entry?.timing?.[day],Date.parse(at))){notify('The 2-hour limit was reached; the timer will stop automatically.');return;}
  const next=pauseSessionTiming(entry?.timing?.[day],at);
  if(!next){notify('Start a running session before pausing.');return;}
  setClock(Date.parse(at));
  update(d=>{const w=d.weeks[week]??=weekBlank();w.timing??={};w.timing[day]=next;queueSyncItem(d,clockItemKey(week,day),'clock',next);},`session:${week}:${day}`);
  if(PLAN[day].kind==='gym'&&restRef.current&&(!restRef.current.target||restRef.current.target.day===day))saveSyncedRest(null);
  notify('Workout paused. Paused time will not count toward the session duration.');
 };
 const resumeSession=(day:Day)=>{
  if(dataRef.current.itemConflicts[clockItemKey(week,day)]){notify('Resolve the timer conflict before changing it.');setView('conflicts');return;}
  const entry=dataRef.current.weeks[week];
  if(entry?.done?.[day]){notify('Undo completion before continuing this session.');return;}
  if(statusFor(dataRef.current,week,day)!=='scheduled'){notify('Restore this session on the calendar before continuing.');return;}
  if(entry?.timing?.[day]?.autoStopped){notify('This timer reached the 2-hour safety limit. Restart its clock from the timer menu or finish the workout; your logs are safe.');return;}
  const at=new Date().toISOString(),next=resumeSessionTiming(entry?.timing?.[day],at);
  if(!next){notify('Only a paused or stopped session can be resumed.');return;}
  setClock(Date.parse(at));
  update(d=>{const w=d.weeks[week]??=weekBlank();w.timing??={};w.timing[day]=next;queueSyncItem(d,clockItemKey(week,day),'clock',next);},`session:${week}:${day}`);
  notify('Session resumed. Earlier active time and your logged data are preserved.');
 };
 const restartSession=(day:Day)=>{
  if(dataRef.current.itemConflicts[clockItemKey(week,day)]){notify('Resolve the timer conflict before changing it.');setView('conflicts');return;}
  const entry=dataRef.current.weeks[week];
  if(entry?.done?.[day]){notify('Undo completion before restarting the timer.');return;}
  if(statusFor(dataRef.current,week,day)!=='scheduled'){notify('Restore this session on the calendar before restarting.');return;}
  if(sessionClockState(entry?.timing?.[day])!=='stopped'){notify('Stop the session before restarting its clock.');return;}
  if(!confirm('Restart the session timer from 0? This resets only the elapsed time; all logged sets, laps and notes are kept.'))return;
  const at=new Date().toISOString(),next=restartSessionTiming(entry?.timing?.[day],at);
  if(!next){notify('Could not restart this timer.');return;}
  setClock(Date.parse(at));
  update(d=>{const w=d.weeks[week]??=weekBlank();w.timing??={};w.timing[day]=next;queueSyncItem(d,clockItemKey(week,day),'clock',next);},`session:${week}:${day}`);
  notify('Timer restarted from zero. Your workout log is unchanged.');
 };
 const finishSession=(day:Day)=>{
  if(dataRef.current.itemConflicts[clockItemKey(week,day)]){notify('Resolve the timer conflict before changing it.');setView('conflicts');return;}
  if(PLAN[day].kind==='swim'){notify('Stop your swim timer, log the swim, then save it.');return;}
  const entry=dataRef.current.weeks[week],at=new Date().toISOString();
  if(entry?.done?.[day]){notify('Undo completion before changing the session.');return;}
  if(autoStopSessionTiming(entry?.timing?.[day],Date.parse(at))){notify('The 2-hour cutoff has been reached. Review the automatically stopped timer before finishing.');return;}
  const stopped=stopSessionTiming(entry?.timing?.[day],at);
  if(!stopped){notify('Start or resume the session clock before finishing.');return;}
  setClock(Date.parse(at));
  update(d=>{const w=d.weeks[week]??=weekBlank();w.timing??={};w.timing[day]=stopped;queueSyncItem(d,clockItemKey(week,day),'clock',stopped);
   w.done[day]=true;if(w.scheduleStatus)delete w.scheduleStatus[day];w.completedAt??={};w.completedAt[day]=at;w.completedOn??={};w.completedOn[day]=keyOf(new Date(at));
  },`session:${week}:${day}`);
  if(restRef.current&&(!restRef.current.target||restRef.current.target.day===day))saveSyncedRest(null);
  showCompletedFeedback(week,day);
 };
 // Stop either timer without completing the workout; useful if a session is
 // abandoned, or the athlete wants to finish entering sets/laps later.
 const stopWorkoutTimer=(day:Day)=>{
  if(dataRef.current.itemConflicts[clockItemKey(week,day)]){notify('Resolve the timer conflict before changing it.');setView('conflicts');return;}
  if(dataRef.current.weeks[week]?.done?.[day]){notify('Reopen this workout before changing its timer.');return;}
  const at=new Date().toISOString();
  const current=dataRef.current.weeks[week]?.timing?.[day];
  const stopped=autoStopSessionTiming(current,Date.parse(at))??stopSessionTiming(current,at);
  if(!stopped){notify('No running or paused timer to stop.');return;}
  setClock(Date.parse(at));
  update(d=>{const w=d.weeks[week]??=weekBlank();w.timing??={};w.timing[day]=stopped;queueSyncItem(d,clockItemKey(week,day),'clock',stopped);},`session:${week}:${day}`);
  notify(stopped.autoStopped?'Timer capped at 2 hours. Your logged entries remain saved and the workout is still incomplete.':PLAN[day].kind==='swim'?'Swim timer stopped. Add laps or notes, then finish when ready.':'Gym timer stopped. Your sets are saved; finish when ready.');
 };
 const stopSwimSession=(day:SwimDay)=>stopWorkoutTimer(day);
 const completeSwimSession=(day:SwimDay)=>{
  if(dataRef.current.itemConflicts[clockItemKey(week,day)]){notify('Resolve the timer conflict before changing it.');setView('conflicts');return;}
  const entry=dataRef.current.weeks[week],timing=entry?.timing?.[day];
  if(entry?.done?.[day]){notify('This swim has already been completed.');return;}
  if(timing?.startedAt&&!timing.endedAt){notify('Stop the swim timer before saving your workout.');return;}
  if(!timing?.startedAt){requestCompletion(week,day);return;} // Manual log: ask for the actual date.
  const at=new Date().toISOString();
  // Validate the full saved clock (including any paused duration) before showing
  // a completion celebration. A malformed clock must not produce a false success.
  if(!entry||!completeStoppedSwim(structuredClone(entry),day,at)){
   notify('Swim timer timestamps are invalid. The session has not been completed.');return;
  }
  // An old, manually finalized session needs the actual training date choice,
  // not an implicit assumption that the stopwatch stop date is the answer.
  if(needsManualCompletionDate(dataRef.current,week,day)){requestCompletion(week,day);return;}
  update(d=>{const w=d.weeks[week]??=weekBlank();completeStoppedSwim(w,day,at);},`session:${week}:${day}`);
  showCompletedFeedback(week,day);
 };
 const saveWorkout=(day:Day)=>{
  const w=dataRef.current.weeks[week],state=sessionClockState(w?.timing?.[day]);
  if(autoStopSessionTiming(w?.timing?.[day],Date.now())){notify('The two-hour limit has been reached. Your timer is being stopped; try Finish again after it updates.');return;}
  if(w?.done?.[day]){notify('This workout is already saved as completed.');return;}
  if(dataRef.current.itemConflicts[clockItemKey(week,day)]){notify('Resolve the timer conflict before saving.');setView('conflicts');return;}
  if(PLAN[day].kind==='gym'){
    if(state==='running'||state==='paused')finishSession(day);
    else if(state==='stopped'){
      const end=w?.timing?.[day]?.endedAt;
      if(!end||elapsedSessionMs(w?.timing?.[day])===null){
        notify('Invalid gym timer. The workout was not completed.');return;
      }
      // A manually marked past-due session must offer Scheduled / Today /
      // Another date, even if a stopwatch was previously stopped.
      if(needsManualCompletionDate(dataRef.current,week,day)){
        requestCompletion(week,day);return;
      }
      const at=new Date().toISOString();
      update(d=>{const entry=d.weeks[week]??=weekBlank();entry.done[day]=true;
        if(entry.scheduleStatus)delete entry.scheduleStatus[day];entry.completedAt??={};entry.completedAt[day]=at;
        entry.completedOn??={};entry.completedOn[day]=keyOf(new Date(end));
      },`session:${week}:${day}`);
      if(restRef.current&&(!restRef.current.target||restRef.current.target.day===day))saveSyncedRest(null);
      showCompletedFeedback(week,day);
    }else requestCompletion(week,day);
    return;
  }
  if(state==='running'||state==='paused'){
    const at=new Date().toISOString(),stopped=stoppedSwimTiming(w?.timing?.[day],at);
    if(!stopped){notify('Invalid swim timer. Nothing was completed.');return;}
    const check=structuredClone(w??weekBlank());check.timing??={};check.timing[day]=stopped;
    if(!completeStoppedSwim(check,day as SwimDay,at)){notify('Unable to validate the stopped swim timer.');return;}
    update(d=>{const entry=d.weeks[week]??=weekBlank();entry.timing??={};entry.timing[day]=stopped;
      queueSyncItem(d,clockItemKey(week,day),'clock',stopped);completeStoppedSwim(entry,day as SwimDay,at);
    },`session:${week}:${day}`);
    setClock(Date.parse(at));showCompletedFeedback(week,day);return;
  }
  completeSwimSession(day as SwimDay);
 };
 const rescheduleSession=(day:Day,date:string,targetWeek=week)=>{
  if(!isValidDate(date)){notify('Choose a valid date.');return;}
  if(dataRef.current.weeks[targetWeek]?.done?.[day]){notify('Completed sessions cannot be moved.');return;}
  if(dataRef.current.weeks[targetWeek]?.timing?.[day]?.startedAt&&!dataRef.current.weeks[targetWeek]?.timing?.[day]?.endedAt){notify('Finish or cancel the active session before moving it.');return;}
  update(d=>{const w=d.weeks[targetWeek]??=weekBlank();w.schedule??={};w.schedule[day]=date;if(w.scheduleStatus)delete w.scheduleStatus[day];},`session:${targetWeek}:${day}`);
  notify(`${PLAN[day].name} moved to ${date}.`);
 };
 const setScheduleStatus=(day:Day,status:ScheduleStatus|null,targetWeek=week)=>{
  const record=dataRef.current.weeks[targetWeek];
  if(record?.done?.[day]){notify('Completed workouts cannot be marked as rest or skipped.');return;}
  if(record?.timing?.[day]?.startedAt&&!record.timing[day]?.endedAt){notify('Finish this active session before changing the schedule.');return;}
  update(d=>{const w=d.weeks[targetWeek]??=weekBlank();w.scheduleStatus??={};if(status)w.scheduleStatus[day]=status;else delete w.scheduleStatus[day];},`session:${targetWeek}:${day}`);
  notify(status==='rest'?'Recovery day saved. Your streak will not be penalized.':status==='skipped'?'Workout marked as skipped.': 'Workout restored to the schedule.');
 };
 const catchUpWeek=(targetWeek=week)=>{
  const today=keyOf(new Date()),current=dataRef.current.weeks[targetWeek]??weekBlank();
  const pending=DAYS.filter(day=>!current.done?.[day]&&!current.scheduleStatus?.[day]).map(day=>({day,date:current.schedule?.[day]||dateForWeek(targetWeek,day)})).sort((a,b)=>a.date.localeCompare(b.date));
  if(!pending.some(x=>x.date<today)){notify('No missed sessions in this week.');return;}
  const used=new Set<string>();
  // Already completed days stay fixed. Rescheduling never changes any exercise logs.
  for(const day of DAYS)if(current.done[day]||current.scheduleStatus?.[day])used.add(current.schedule?.[day]||dateForWeek(targetWeek,day));
  // Respect sessions already planned from other weeks so catch-up won't silently collide.
  for(const [otherWeek] of Object.entries(dataRef.current.weeks))if(otherWeek!==targetWeek)for(const day of DAYS){const otherStatus=statusFor(dataRef.current,otherWeek,day);if(otherStatus==='scheduled'||otherStatus==='completed')used.add(scheduledDate(dataRef.current,otherWeek,day));}
  let cursor=today;const assignments=new Map<Day,string>();
  for(const item of pending){
   let target=item.date>=cursor&&!used.has(item.date)?item.date:cursor;
   let attempts=0;
   while((used.has(target)||dateFor(target).getDay()===0) && attempts++<35){const d=dateFor(target);d.setDate(d.getDate()+1);target=keyOf(d);}
   used.add(target);assignments.set(item.day,target);const d=dateFor(target);d.setDate(d.getDate()+1);cursor=keyOf(d);
  }
  update(d=>{const w=d.weeks[targetWeek]??=weekBlank();w.schedule??={};for(const [day,date] of assignments)w.schedule[day]=date;},pending.map(x=>`session:${targetWeek}:${x.day}`));
  notify('Pending sessions shifted. Check the dates for next-week overlaps.');
 };
 function dateForWeek(w:string,day:Day){const d=dateFor(w);d.setDate(d.getDate()+DAYS.indexOf(day));return keyOf(d);}
 // Manual/backfilled completion asks for the actual training DATE. The timestamp
 // remains an audit marker; choosing the planned date must not silently move the session.
 const requestCompletion=(targetWeek:string,day:Day,mode:'complete'|'edit'='complete')=>{
  const existing=dataRef.current.weeks[targetWeek];
  if(mode==='edit'&&!existing?.done?.[day]){notify('This workout is not completed yet.');return;}
  if(mode==='complete'&&existing?.done?.[day]){notify('This workout is already completed.');return;}
  if(mode==='complete'&&existing?.timing?.[day]?.startedAt&&!existing.timing[day]?.endedAt){notify('Stop or finish your running/paused timer first.');return;}
  setCompletionRequest({week:targetWeek,day,mode});
 };
 const confirmCompletion=(date:string)=>{
  const request=completionRequest;
  if(!request||!isValidDate(date)||date>keyOf(new Date())){notify('Choose a valid completion date that is not in the future.');return;}
  const {week:targetWeek,day,mode}=request;
  if(mode==='edit'&&!dataRef.current.weeks[targetWeek]?.done?.[day]){setCompletionRequest(null);return;}
  if(mode==='complete'&&dataRef.current.weeks[targetWeek]?.done?.[day]){setCompletionRequest(null);return;}
  update(d=>{const item=d.weeks[targetWeek]??=weekBlank();item.completedOn??={};item.completedOn[day]=date;
   if(mode==='complete'){item.done[day]=true;item.completedAt??={};item.completedAt[day]=new Date().toISOString();if(item.scheduleStatus)delete item.scheduleStatus[day];}
  },`session:${targetWeek}:${day}`);
  setCompletionRequest(null);
  if(mode==='complete'){if(restRef.current&&(!restRef.current.target||restRef.current.target.day===day))saveSyncedRest(null);showCompletedFeedback(targetWeek,day);}
  else notify('Actual training date updated. Original schedule unchanged.');
 };
 const toggleDone=(day:Day)=>{
  const targetWeek=week,was=!!dataRef.current.weeks[targetWeek]?.done?.[day];
  if(!was){requestCompletion(targetWeek,day);return;}
  if(!confirm('Mark this session incomplete? All logged sets and workout time will be kept.'))return;
  update(d=>{const item=d.weeks[targetWeek]??=weekBlank();item.done[day]=false;delete item.completedAt?.[day];delete item.completedOn?.[day];},`session:${targetWeek}:${day}`);
 };
 const editSet=(day:GymDay,exercise:string,index:number,change:(set:GymSet)=>void)=>{
  const next=structuredClone(dataRef.current);
  const w=next.weeks[week]??=weekBlank();
  if(!w.routineOverrides?.[day]){w.routineOverrides??={};w.routineOverrides[day]=cloneExercises(exercisesFor(next,week,day));
    const key=`session:${week}:${day}`;const stamp=Math.max(Date.now(),(next.recordUpdates[key]||0)+1);next.recordUpdates[key]=stamp;next.pendingSync[key]=stamp;}
  queueSetChange(next,`session:${week}:${day}`,exercise,index,change);
  persist(next);if(uidRef.current!=='guest')scheduleFlush();
 };
 // Historical corrections remain logged: editing a completed set must not
 // silently unset its done flag and remove it from statistics.
 const gymField=(day:GymDay,exercise:string,index:number,field:'kg'|'reps',value:string)=>
  editSet(day,exercise,index,set=>{const keepLogged=!!dataRef.current.weeks[week]?.done?.[day]&&!!set.done;
   set[field]=value;set.done=keepLogged;set.deleted=false;});
 const gymNotes=(day:GymDay,exercise:string,value:string)=>update(d=>{
  const w=d.weeks[week]??=weekBlank(),ex=w.gym[day]??={};const e=ex[exercise]??={sets:[]};e.notes=value;ex[exercise]=e;
 },`session:${week}:${day}`);
 const changeSetCount=(day:GymDay,exercise:string,delta:number)=>{
  if(delta!==1&&delta!==-1)return;
  const current=setCount(dataRef.current,week,day,exercise),next=current+delta;
  if(next<1||next>10)return;
  const last=dataRef.current.weeks[week]?.gym?.[day]?.[exercise]?.sets?.[current-1];
  if(delta<0&&hasRemovableValues(last)&&!confirm('Remove the final set and its values?'))return;
  const copy=structuredClone(dataRef.current);
  const change=applySetCountChange(copy,week,day,exercise,delta,restRef.current);
  if(!change)return;
  persist(copy);if(uidRef.current!=='guest')scheduleFlush();
  // Re-target an ongoing rest countdown if a new set was added to the
  // exercise just completed. Preserve the countdown's original end time.
  if(change.rest!==restRef.current)saveSyncedRest(change.rest);
 };
 const changeRoutine=(day:GymDay,kind:'add'|'remove'|'move'|'replace',index:number,payload?:RoutineExercise|number)=>{
  try {
   const existing=exercisesFor(dataRef.current,week,day);
   if((kind==='remove'||kind==='replace')&&existing[index]){
    const archived=dataRef.current.weeks[week]?.gym?.[day]?.[existing[index].name];
    if(archived?.sets?.some(s=>s.done&&!s.deleted)&&!confirm('This exercise has logged sets. Hide it from the current routine? Its recorded sets will remain in history.'))return;
   }
   const changed=editRoutine(existing,kind,index,payload);
   if((kind==='remove'||kind==='replace')&&restRef.current?.target?.week===week&&restRef.current?.target?.day===day&&restRef.current?.target?.exercise===existing[index]?.name)saveSyncedRest(null);
   update(d=>{const w=d.weeks[week]??=weekBlank();w.routineOverrides??={};w.routineOverrides[day]=changed;},`session:${week}:${day}`);
   notify('This session’s routine updated.');
  }catch(error){notify(error instanceof Error?error.message:'Routine change failed.');}
 };
 const saveRoutineDefault=(day:GymDay)=>{
  const exercises=cloneExercises(exercisesFor(dataRef.current,week,day));
  const frozenWeeks=weeksToFreezeBeforeTemplateChange(dataRef.current,week,day);
  update(d=>{freezeExistingRoutines(d,week,day);d.routineTemplates[day]=exercises;},['preferences',...frozenWeeks.map(w=>`session:${w}:${day}`)]);
  notify('Saved as your default for future workouts. Existing sessions are unchanged.');
 };
 const resetSessionRoutine=(day:GymDay)=>{
  if(dataRef.current.weeks[week]?.done?.[day]){notify('Completed workouts cannot be restored.');return;}
  update(d=>{const w=d.weeks[week]??=weekBlank();w.routineOverrides??={};w.routineOverrides[day]=restoredSessionRoutine(d,week,day);},`session:${week}:${day}`);
  notify('Workout plan restored. Every logged set is preserved.');
 };
 const resetDefaultRoutine=(day:GymDay)=>{
  if(!dataRef.current.routineTemplates?.[day])return;
  const frozenWeeks=weeksToFreezeBeforeTemplateChange(dataRef.current,week,day);
  try {update(d=>resetDefaultPreservingHistory(d,week,day),['preferences',...frozenWeeks.map(w=>`session:${w}:${day}`)]);
    notify('Original RepLap routine restored for future workouts.');}catch(error){notify(error instanceof Error?error.message:'Could not restore original default.');}
 };
 const deleteLoggedSet=(day:GymDay,exercise:string,index:number)=>{
  const record=dataRef.current.weeks[week]?.gym?.[day]?.[exercise]?.sets?.[index];
  if(!record||record.deleted||!record.done)return;
  // A tombstone allows offline edits to propagate instead of resurrecting a deleted set.
  editSet(day,exercise,index,set=>{set.kg='';set.reps='';set.done=false;set.deleted=true;delete set.rir;delete set.rpe;});
  if(restRef.current?.target?.exercise===exercise&&restRef.current?.target?.day===day)saveSyncedRest(null);
  notify('Logged set deleted. Set slot is ready to reuse.');
 };
 const logSet=(day:GymDay,exercise:string,index:number)=>{
  const current=dataRef.current.weeks[week]?.gym?.[day]?.[exercise]?.sets?.[index];
  if(!validSet(current)){notify('Enter weight and reps before logging.');return;}
  const earlier=history(dataRef.current,day,exercise).filter(x=>x.week<week);
  const previousBest=earlier.length?Math.max(...earlier.map(x=>x.best)):null;
  const was=!!current?.done;
  if(was&&!confirm('Unmark this logged set? Its weight and reps will be kept. Use Delete to remove the recording.'))return;
  editSet(day,exercise,index,set=>{set.done=!was;set.deleted=false;});
  if(!was){
   // Editing a historical completed workout must not start a new live rest
   // countdown or show an old session's lifting record as a new notification.
   if(dataRef.current.weeks[week]?.done?.[day]){notify('Corrected set saved to the completed workout.');return;}
   const target=nextIncompleteSet(dataRef.current,week,day,exercise,index);
   if(target)beginRest(dataRef.current.restSeconds||90,target,{week,day,exercise,index});
   else saveSyncedRest(null); // The final set never leaves a pointless rest countdown.
   if(previousBest!==null&&num(current?.kg)>previousBest)setCelebration({title:'New personal record!',body:`${exercise}: ${num(current?.kg)} kg`,kind:'pr'});
   else notify(target?'Set logged · rest timer running':'All planned sets logged. Nice work!');
  }else if(restRef.current)saveSyncedRest(null);
 };
 const usePrevious=(day:GymDay,exercise:string,index:number,onlyBlank=false)=>{
  const old=previousCompletedSet(dataRef.current,week,day,exercise,index);
  if(!old){notify('No earlier logged set for this exercise.');return;}
  const current=dataRef.current.weeks[week]?.gym?.[day]?.[exercise]?.sets?.[index];
  if(onlyBlank&&(current?.kg!==undefined&&current?.kg!==''||current?.reps!==undefined&&current?.reps!==''))return;
  editSet(day,exercise,index,set=>{const preserveLogged=!!dataRef.current.weeks[week]?.done?.[day]&&!!set.done;
   set.kg=old.kg;set.reps=old.reps;set.done=preserveLogged;set.deleted=false;});
  notify('Previous weight and reps filled. Review before logging.');
 };
 const setEffort=(day:GymDay,exercise:string,index:number,mode:'rir'|'rpe',raw:string)=>{
  if(raw!==''&&!validEffort(mode,Number(raw))){notify('Choose a valid effort value.');return;}
  editSet(day,exercise,index,set=>{delete set[mode==='rir'?'rpe':'rir'];if(raw==='')delete set[mode];else set[mode]=Number(raw);});
 };
 const goToNextSet=()=>{
  const current=restRef.current;
  const target=current?.from
    ?nextIncompleteSet(dataRef.current,current.from.week,current.from.day,current.from.exercise,current.from.index)
    :current?.target;
  saveSyncedRest(null);
  if(!target)return;
  setWeek(target.week);setGymDay(target.day);setTrackingTab('gym');setView('workout');
  const entry=dataRef.current.weeks[target.week]?.gym?.[target.day]?.[target.exercise]?.sets[target.index];
  if((entry?.kg===undefined||entry.kg==='')&&(entry?.reps===undefined||entry.reps==='')){
   const old=suggestedNextSet(dataRef.current,target.week,target.day,target.exercise,target.index);
   if(old){const next=structuredClone(dataRef.current);queueSetChange(next,`session:${target.week}:${target.day}`,target.exercise,target.index,set=>{set.kg=old.kg;set.reps=old.reps;set.done=false;});persist(next);if(uidRef.current!=='guest')scheduleFlush();}
  }
  const id=`set-kg-${stableSetId(target.exercise,target.index)}`;
  setTimeout(()=>{const field=document.getElementById(id) as HTMLInputElement|null;field?.scrollIntoView({behavior:'smooth',block:'center'});field?.focus({preventScroll:true});},60);
 };
 // Completion has already been persisted before this prompt is shown.
 // A dismissed optional check-in must never complete the workout or write feedback.
 const showCompletedFeedback=(targetWeek:string,day:Day)=>{
  let nextRecord:Celebration=null;
  if(['Thursday','Friday','Saturday'].includes(day)){
   const records=swimPersonalBests(dataRef.current).filter(e=>e.week===targetWeek&&e.day===day);
   for(const best of records.slice().reverse()){
    const receipt=`replap-swim-pr-celebrated:${uidRef.current}:${best.id}`;
    let already=false;try{already=!!localStorage.getItem(receipt);}catch{}
    if(already)continue;
    try{localStorage.setItem(receipt,'1');}catch{}
    nextRecord={kind:'pr',title:`New ${SWIM_ACTIVITY_LABELS[best.stroke]} record!`,
     body:best.kind==='continuous'?`You swam ${best.meters} metres without stopping!`:`Fastest logged ${best.meters} m: ${best.seconds?.toFixed(1)} seconds. Keep it up!`};
    break;
   }
  }
  // Compare against the same recorded session before its completion. The
  // achievement must be earned by this action, never by a background sync.
  if(!nextRecord){
   const prior=structuredClone(dataRef.current);
   if(prior.weeks[targetWeek])prior.weeks[targetWeek].done[day]=false;
   const previouslyEarned=new Set(achievements(prior).filter(b=>b.unlocked).map(b=>b.id));
   const newBadge=achievements(dataRef.current).find(b=>b.unlocked&&!previouslyEarned.has(b.id));
   if(newBadge)nextRecord={kind:'achievement',title:`${newBadge.name} unlocked!`,body:newBadge.description};
  }
  // The completion effect is only enqueued by this device's successful user
  // action, never by a Firestore snapshot, reload, timer cutoff or log edit.
  const receipt=`replap-session-completed:v2:${uidRef.current}:${targetWeek}:${day}:${dataRef.current.weeks[targetWeek]?.completedAt?.[day]||''}`;
  let fresh=true;
  try{if(localStorage.getItem(receipt))fresh=false;else localStorage.setItem(receipt,'1');}catch{}
  const isSwim=PLAN[day].kind==='swim';
  const weekRecord=dataRef.current.weeks[targetWeek];
  const body=isSwim?`${swimTotals(weekRecord?.swim?.[day as SwimDay],dataRef.current.swimPoolDefault).meters} m recorded in the pool. Great work!`:`${gymStats(dataRef.current,targetWeek,day as GymDay).logged} logged sets completed. Keep building momentum!`;
  setQueuedCelebration(nextRecord);
  setCelebration(fresh?{kind:'session',discipline:isSwim?'swim':'gym',title:isSwim?'Swimming complete!':'Workout complete!',body}:nextRecord);
  if(!fresh)setQueuedCelebration(null);
  setRecoveryPrompt({week:targetWeek,day});
  notify('Workout completed and saved. Feedback is optional.');
 };
 const closeRecoveryPrompt=()=>setRecoveryPrompt(null);
 const saveRecoveryFeedback=(values:SessionNotes)=>{
  const prompt=recoveryPrompt;if(!prompt||!dataRef.current.weeks[prompt.week]?.done?.[prompt.day]){setRecoveryPrompt(null);return;}
  const filtered:SessionNotes={general:(values.general||'').slice(0,5000),soreness:values.soreness||'',sessionRpe:values.sessionRpe};
  update(d=>{const w=d.weeks[prompt.week]??=weekBlank();w.sessionNotes??={};w.sessionNotes[prompt.day]={...w.sessionNotes[prompt.day],...filtered};},`session:${prompt.week}:${prompt.day}`);
  closeRecoveryPrompt();
 };
 const dismissCelebration=()=>{
  if(queuedCelebration){setCelebration(queuedCelebration);setQueuedCelebration(null);}
  else setCelebration(null);
 };

 const swimPlanEdit=(day:SwimDay,routine:SwimRoutine)=>{
  if(!routine.name.trim()||routine.name.length>80||routine.activities.length>15){notify('Choose a session name and up to 15 activities.');return;}
  update(d=>{const w=d.weeks[week]??=weekBlank();w.swimRoutineOverrides??={};w.swimRoutineOverrides[day]=structuredClone(routine);},`session:${week}:${day}`);
 };
 const beginSwimRoutine=(day:SwimDay)=>{
  const plan=swimRoutine(dataRef.current,week,day);
  update(d=>{const w=d.weeks[week]??=weekBlank();w.swimRoutineOverrides??={};w.swimRoutineOverrides[day]??=structuredClone(plan);const log=w.swim[day]??={};
   if(log.segments?.length)return;
   log.poolLength=log.poolLength??validPool(d.swimPoolDefault);
   log.segments=plan.activities.map(item=>blankSegment(item.activity,isStroke(item.activity)?d.swimModes[item.activity]||item.mode||SWIM_MODE_DEFAULTS[item.activity]:item.mode||'learning'));
   for(const item of log.segments)queueSwimSegment(d,week,day,item.id,item);
  },`session:${week}:${day}`);
 };
 const addSwimSegment=(day:SwimDay,activity:SwimActivity)=>{
  const plan=swimRoutine(dataRef.current,week,day);
  update(d=>{const w=d.weeks[week]??=weekBlank();w.swimRoutineOverrides??={};w.swimRoutineOverrides[day]??=structuredClone(plan);const log=w.swim[day]??={};
    log.poolLength=log.poolLength??validPool(d.swimPoolDefault);
    log.segments??=[];if(log.segments.length>=25)return;
    const item=blankSegment(activity,isStroke(activity)?d.swimModes[activity]||SWIM_MODE_DEFAULTS[activity]:'learning');log.segments.push(item);queueSwimSegment(d,week,day,item.id,item);
  },`session:${week}:${day}`);
 };
 const updateSwimSegment=(day:SwimDay,id:string,patch:Partial<SwimSegment>)=>{
  if(!validSwimSegmentPatch(patch))return;
  update(d=>{
  const s=d.weeks[week]?.swim?.[day]?.segments?.find(x=>x.id===id);if(!s)return;
  Object.assign(s,patch);queueSwimSegment(d,week,day,id,s);
 },`session:${week}:${day}`);
 };
 const removeSwimSegment=(day:SwimDay,id:string)=>{
  const log=dataRef.current.weeks[week]?.swim?.[day];const segment=log?.segments?.find(x=>x.id===id);if(!segment)return;
  if(!confirm(`Remove this ${segment.activity} entry? The lengths, intervals and notes recorded in this segment will be deleted.`))return;
  update(d=>{const log=d.weeks[week]?.swim?.[day];if(log){log.segments=log.segments?.filter(x=>x.id!==id);queueSwimSegment(d,week,day,id,null);}},`session:${week}:${day}`);
 };
 const toggleSwimTechnique=(day:SwimDay,id:string,step:string,done:boolean)=>update(d=>{
  const item=d.weeks[week]?.swim?.[day]?.segments?.find(x=>x.id===id);if(!item)return;
  item.technique??={};item.technique[step]=done;queueSwimSegment(d,week,day,id,item);
 },`session:${week}:${day}`);
 const addSwimInterval=(day:SwimDay,id:string,interval:Omit<SwimIntervalSet,'id'>)=>{
  if(!Number.isInteger(interval.repeats)||interval.repeats<1||interval.repeats>50||!Number.isInteger(interval.lengths)||interval.lengths<1||interval.lengths>40||!Number.isInteger(interval.restSeconds)||interval.restSeconds<0||interval.restSeconds>1800||
     (interval.secondsPerRepeat!==undefined&&(!Number.isFinite(Number(interval.secondsPerRepeat))||Number(interval.secondsPerRepeat)<=0||Number(interval.secondsPerRepeat)>10000))){notify('Check interval repetitions, lengths, rest and timed repeat values.');return;}
  update(d=>{const item=d.weeks[week]?.swim?.[day]?.segments?.find(x=>x.id===id);if(!item)return;
   item.intervals??=[];if(item.intervals.length>=60){notify('A swimming segment can contain up to 60 interval sets.');return;}item.intervals.push({...interval,id:crypto.randomUUID()});queueSwimSegment(d,week,day,id,item);
  },`session:${week}:${day}`);
 };
 const removeSwimInterval=(day:SwimDay,id:string,intervalId:string)=>update(d=>{
  const item=d.weeks[week]?.swim?.[day]?.segments?.find(x=>x.id===id);if(item){item.intervals=item.intervals?.filter(x=>x.id!==intervalId);queueSwimSegment(d,week,day,id,item);}
 },`session:${week}:${day}`);
 const setSwimTechniqueMastered=(stroke:SwimStroke,step:string,mastered:boolean)=>{
  if(!SWIM_CHECKLIST[stroke].includes(step)){notify('Unknown technique step.');return;}
  if(mastered&&(swimTechniqueEvidence(dataRef.current,stroke).byStep[step]||0)<3){notify('Practice this step in three completed swimming sessions first.');return;}
  update(d=>{d.swimTechniqueMastery??={};const flags=d.swimTechniqueMastery[stroke]??={};flags[step]=mastered;},'preferences');
  notify(mastered?'Technique mastery confirmed.':'Technique mastery confirmation removed.');
 };
 const editSwimPreference=(patch:Partial<Pick<TrackerData,'swimPoolDefault'|'swimTargets'|'swimModes'>>)=>{
  if(patch.swimPoolDefault!==undefined&&validPool(patch.swimPoolDefault)!==patch.swimPoolDefault)return;
  update(d=>{Object.assign(d,patch);},'preferences');
 };
 const saveSwimDefault=(day:SwimDay)=>{
  const routine=swimRoutine(dataRef.current,week,day);
  if(!confirm(`Save "${routine.name}" as the default ${day} swim routine? Existing sessions and records will remain unchanged.`))return;
  const freeze=Object.entries(dataRef.current.weeks).filter(([w,x])=>w!==week&&(!!x.swim?.[day]||!!x.done?.[day]||!!x.swimRoutineOverrides?.[day])).map(([w])=>w);
  update(d=>{for(const w of freeze){const entry=d.weeks[w];entry.swimRoutineOverrides??={};entry.swimRoutineOverrides[day]??=swimRoutine(d,w,day);}
   d.swimTemplates[day]=structuredClone(routine);
  },['preferences',...freeze.map(w=>`session:${w}:${day}`)]);
  notify('Swim routine saved as default.');
 };
 const restoreSwimDefault=(day:SwimDay)=>{
  if(!dataRef.current.swimTemplates[day])return;
  if(!confirm(`Restore the original RepLap ${day} swim plan for future sessions? Logged swims and the current plan will remain unchanged.`))return;
  const freeze=Array.from(new Set([week,...Object.entries(dataRef.current.weeks).filter(([,x])=>!!x.swim?.[day]||!!x.done?.[day]).map(([w])=>w)]));
  update(d=>{for(const w of freeze){const entry=d.weeks[w];entry.swimRoutineOverrides??={};entry.swimRoutineOverrides[day]??=swimRoutine(d,w,day);}
    delete d.swimTemplates[day];
  },['preferences',...freeze.map(w=>`session:${w}:${day}`)]);
  notify('Original swim default restored for future sessions.');
 };
 const swimField=(day:SwimDay,field:string,value:string|number|boolean)=>update(d=>{
  const w=d.weeks[week]??=weekBlank(),item=w.swim[day]??={drills:{}};
  (item as unknown as Record<string,unknown>)[field]=value;
  if(field==='poolLength'&&num(item.lengths)>0)item.distance=num(item.lengths)*num(item.poolLength);
 },`session:${week}:${day}`);
 const changeLengths=(day:SwimDay,change:number)=>update(d=>{
  const w=d.weeks[week]??=weekBlank(),item=w.swim[day]??={drills:{}};
  const count=Math.max(0,num(item.lengths)+change);item.lengths=count;item.poolLength=num(item.poolLength)||validPool(d.swimPoolDefault);item.distance=count*num(item.poolLength);
 },`session:${week}:${day}`);
 const toggleDrill=(day:SwimDay,index:number,value:boolean)=>update(d=>{
  const w=d.weeks[week]??=weekBlank(),item=w.swim[day]??={drills:{}};item.drills??={};item.drills[index]=value;
 },`session:${week}:${day}`);
 const addInterval=(day:SwimDay,interval:SwimInterval)=>update(d=>{
  const w=d.weeks[week]??=weekBlank(),item=w.swim[day]??={drills:{}};item.intervals??=[];item.intervals.push(interval);
 },`session:${week}:${day}`);
 const deleteInterval=(day:SwimDay,index:number)=>update(d=>{const item=d.weeks[week]?.swim?.[day];if(item)item.intervals?.splice(index,1);},`session:${week}:${day}`);
 const noteField=(day:Day,field:keyof SessionNotes,value:string)=>update(d=>{
  const w=d.weeks[week]??=weekBlank();w.sessionNotes??={};const notes=w.sessionNotes[day]??={};if(field==='sessionRpe')notes.sessionRpe=value===''?undefined:Number(value);else notes[field]=value;w.sessionNotes[day]=notes;
 },`session:${week}:${day}`);
 const addWater=(amount:number,date=keyOf(new Date()))=>{
  if(!Number.isFinite(amount)||amount<25||amount>2000){notify('Enter a drink between 25 and 2,000 mL.');return;}
  // Celebrate only when THIS device's user action crosses today's goal.
  // Reopening the app, initial Firebase snapshots and a repeated daily goal
  // must not retrigger the animation. This key is account- and date-scoped.
  const crossedToday=date===keyOf(new Date())&&waterTotal(dataRef.current,date)<waterGoal(date,dataRef.current)
    &&waterTotal(dataRef.current,date)+amount>=waterGoal(date,dataRef.current);
  const id=crypto.randomUUID();const at=new Date().toISOString();
  update(d=>{d.waterLogs[id]={date,at,ml:amount};},`water:${id}`);
  if(crossedToday){
    const celebratedKey=`replap-water-goal:${uidRef.current}:${date}`;
    let shouldCelebrate=true;
    try{if(localStorage.getItem(celebratedKey))shouldCelebrate=false;
      else localStorage.setItem(celebratedKey,'1');}catch{}
    if(shouldCelebrate)setCelebration({kind:'hydration',title:'Hydration hero! 💧',
      body:`Bottle by bottle, you hit your ${(waterGoal(date,dataRef.current)/1000).toFixed(1)} L goal. Your future self says cheers!`});
  }
 };
 const deleteWater=(id:string)=>update(d=>{if(d.waterLogs[id])d.waterLogs[id].deleted=true;},`water:${id}`);
 const saveWeight=(date:string,kg:number,note:string)=>{
  if(kg<20||kg>400){notify('Enter a weight between 20 and 400 kg.');return;}
  update(d=>{d.weights[date]={kg,note};},`weight:${date}`);
  notify('Weigh-in recorded.');
 };
 const deleteWeight=(date:string)=>{if(!confirm('Remove this weigh-in?'))return;update(d=>{d.weights[date]={deleted:true};},`weight:${date}`);};
 const setDefaultWaterGoal=(amount:number)=>{
  if(!Number.isInteger(amount)||amount<500||amount>6000){notify('Choose a daily water goal between 500 and 6,000 mL.');return;}
  const date=keyOf(new Date());
  update(d=>{d.waterGoalHistory??={};d.waterGoalHistory[date]=amount;},'preferences');
  notify(`Daily water goal set to ${(amount/1000).toFixed(2)} L.`);
 };
 const updatePreferences=(change:Partial<Pick<TrackerData,'restSeconds'|'targetWeight'|'reminders'|'effortMode'>>)=>update(d=>{Object.assign(d,change);},'preferences');
 const backup=()=>downloadFile(`rep-and-lap-backup-${keyOf(new Date())}.json`,JSON.stringify({...dataRef.current,exportedAt:new Date().toISOString(),app:'Rep & Lap'},null,2));
 const restore=async(file:File)=>{
  try{
    if(file.size>5_000_000)throw new Error('Backup is larger than 5 MB');
    const preview=readBackup(await file.text(),dataRef.current);
    setRestorePreview(preview);
  }catch(error){notify(error instanceof Error?error.message:'That file is not a valid RepLap backup.');}
 };
 const confirmRestore=(mode:RestoreMode)=>{
  const preview=restorePreview;if(!preview)return;
  // A cloud replacement requires deleting old documents and set revisions across devices.
  // Until that can be done safely, replacing is intentionally local/guest only.
  if(mode==='replace-local'&&uidRef.current!=='guest'){notify('Sign out to replace guest-only local data. Use Merge for your cloud account.');return;}
  if(uidRef.current!=='guest'&&!serverRef.current){notify('Wait until the initial cloud sync completes before importing.');return;}
  const phrase=mode==='merge'?'Merge new records? Existing records will never be overwritten.':'Replace all guest records on this device?';
  if(!confirm(phrase+' A safety backup will download first.'))return;
  backup();
  if(mode==='replace-local')persist(replaceLocalBackup(preview.backup));
  else{
    const merged=mergeBackup(dataRef.current,preview.backup);
    markRestoredWrites(merged.data,merged.changedKeys);
    persist(merged.data);
    if(merged.changedKeys.length&&uidRef.current!=='guest')scheduleFlush();
  }
  setRestorePreview(null);notify('Backup import completed.');
 };
 const cancelRestore=()=>setRestorePreview(null);
 const exportCsv=(kind:'gym'|'swim'|'weight'|'water')=>{
  const rows:string[][]=[];
  if(kind==='water'){rows.push(['date','timestamp','millilitres']);for(const item of Object.values(dataRef.current.waterLogs))if(!item.deleted)rows.push([item.date,item.at,String(item.ml)]);}
  if(kind==='weight'){rows.push(['date','kg','notes']);for(const [date,item] of Object.entries(dataRef.current.weights))if(!item.deleted)rows.push([date,String(item.kg??''),item.note||'']);}
  if(kind==='gym'){rows.push(['week','day','exercise','set','set_id','kg','reps','rir','rpe','logged','scheduled_date','started_at','ended_at','completed_at','actual_training_date']);for(const [w,x] of Object.entries(dataRef.current.weeks))for(const [day,exs] of Object.entries(x.gym))for(const [name,e] of Object.entries(exs||{}))e.sets.forEach((s,i)=>rows.push([w,day,name,String(i+1),s.id||'',String(s.kg??''),String(s.reps??''),String(s.rir??''),String(s.rpe??''),s.done?'yes':'no',x.schedule?.[day as Day]||dateForWeek(w,day as Day),x.timing?.[day as Day]?.startedAt||'',x.timing?.[day as Day]?.endedAt||'',x.completedAt?.[day as Day]||'',x.completedOn?.[day as Day]||'']));}
  if(kind==='swim'){
   rows.push(['week','day','activity','mode','segment_id','pool_m','practice_minutes','lengths','continuous_m','timed_distance_m','timed_seconds','difficulty','intervals_json','technique_json','notes','legacy_distance_m','legacy_continuous_m','scheduled_date','actual_training_date']);
   for(const [w,x] of Object.entries(dataRef.current.weeks))for(const [day,s] of Object.entries(x.swim)){
    if(!s)continue;
    const base=[w,day] as string[],pool=String(s.poolLength??25),scheduled=x.schedule?.[day as Day]||dateForWeek(w,day as Day),actual=x.completedOn?.[day as Day]||'';
    if(s.segments?.length)for(const seg of s.segments){rows.push([...base,seg.activity,seg.mode,seg.id,pool,String(seg.minutes??''),String(seg.lengths??''),String(seg.longestContinuous??''),String(seg.timedMeters??''),String(seg.timedSeconds??''),seg.difficulty||'',JSON.stringify(seg.intervals||[]),JSON.stringify(seg.technique||{}),seg.notes||'',String(s.distance??''),String(s.longest??''),scheduled,actual]);}
    else rows.push([...base,'legacy','','',pool,String(s.duration??''),String(s.lengths??''),String(s.longest??''),'','','','',JSON.stringify(s.drills||{}),s.notes||'',String(s.distance??''),String(s.longest??''),scheduled,actual]);
   }
  }
  const csv=rows.map(row=>row.map(csvCell).join(',')).join('\r\n');
  downloadFile(`rep-and-lap-${kind}-${keyOf(new Date())}.csv`,csv,'text/csv');
 };
 const resetLocal=()=>{if(!confirm('Clear local records on this device? Cloud records will not be removed.'))return;persist(blankData());notify('Local cache cleared.');};
 const enableReminders=async(enabled:boolean)=>{
  if(enabled&&'Notification' in window&&Notification.permission==='default'){const result=await Notification.requestPermission();if(result!=='granted'){notify('Notifications weren’t enabled.');return;}}
  updatePreferences({reminders:{...dataRef.current.reminders,enabled}});
 };
 const signin=async()=>{try{setFirebaseError('');await googleSignIn();}catch(e){const msg=e instanceof Error?e.message:'Sign-in unavailable';setFirebaseError(msg);notify('Google sign-in failed. Check your browser settings.');}};
 const signout=async()=>{try{await googleSignOut();}catch{notify('Unable to sign out.');}};
 const pending=Object.keys(data.pendingSync||{}).length+Object.keys(data.pendingSets||{}).length+Object.keys(data.pendingItems||{}).length;
 const conflicts=Object.values(data.setConflicts||{});
 const itemConflicts=Object.values(data.itemConflicts||{});
 const resolveConflict=(key:string,choice:'mine'|'cloud')=>{const next=structuredClone(dataRef.current);resolveSetConflict(next,key,choice);persist(next);if(choice==='mine')scheduleFlush();};
 const resolveTrainingItemConflict=(key:string,choice:'mine'|'cloud')=>{
  const next=structuredClone(dataRef.current),conflict=next.itemConflicts[key];
  resolveItemConflict(next,key,choice);persist(next);
  if(choice==='cloud'&&conflict?.local.kind==='rest')saveRest(conflict.remote?.value?parseRest(JSON.stringify(conflict.remote.value)):null);
  if(choice==='cloud'&&conflict?.local.kind==='clock'){
   const m=/^session:(\d{4}-\d{2}-\d{2}):(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)~clock$/.exec(key);
   if(m){const [,w,day]=m,entry=next.weeks[w];
    if(entry?.done?.[day as Day]&&sessionClockState(entry.timing?.[day as Day])!=='stopped'){
     delete entry.done[day as Day];delete entry.completedAt?.[day as Day];delete entry.completedOn?.[day as Day];
     const session=`session:${w}:${day}`,stamp=Math.max(Date.now(),(next.recordUpdates[session]||0)+1);
     next.recordUpdates[session]=stamp;next.pendingSync[session]=stamp;persist(next);scheduleFlush();
    }
   }
  }
  if(choice==='mine')scheduleFlush();
 };
 const displaySync:SyncMode=!online?'saved-local':conflicts.length||itemConflicts.length||firebaseError?'needs-attention':user?(pending?'syncing':syncMode):'saved-local';
 return {hydrated,data,user,accountId:uidRef.current,week,setWeek,view,goto,trackingTab,setTrackingTab,progressTab,setProgressTab,gymDay,setGymDay,swimDay,setSwimDay,theme,setTheme,syncMode:displaySync,online,toast,notify,celebration,setCelebration,dismissCelebration,restEnd,restState,restRemaining:secondsLeft(restState,clock),restReady:!!restState&&secondsLeft(restState,clock)===0,clock,startRest:(sec?:number)=>beginRest(sec||data.restSeconds),stopRest:()=>saveSyncedRest(null),extendRest:()=>saveSyncedRest(restRef.current?{...restRef.current,endsAt:Math.max(restRef.current.endsAt,Date.now())+30000}:null),goToNextSet,recoveryPrompt,closeRecoveryPrompt,saveRecoveryFeedback,setEffort,installPrompt,firebaseError,pending,conflicts,itemConflicts,resolveConflict,resolveTrainingItemConflict,signin,signout,flush:()=>void flush(),toggleDone,completionRequest,requestCompletion,confirmCompletion,cancelCompletion:()=>setCompletionRequest(null),startSession,pauseSession,resumeSession,restartSession,finishSession,stopWorkoutTimer,stopSwimSession,completeSwimSession,saveWorkout,rescheduleSession,setScheduleStatus,catchUpWeek,changeRoutine,saveRoutineDefault,resetSessionRoutine,resetDefaultRoutine,gymField,gymNotes,changeSetCount,logSet,deleteLoggedSet,usePrevious,swimField,changeLengths,toggleDrill,addInterval,deleteInterval,swimPlanEdit,beginSwimRoutine,addSwimSegment,updateSwimSegment,removeSwimSegment,toggleSwimTechnique,setSwimTechniqueMastered,addSwimInterval,removeSwimInterval,editSwimPreference,saveSwimDefault,restoreSwimDefault,noteField,addWater,setDefaultWaterGoal,deleteWater,saveWeight,deleteWeight,updatePreferences,backup,restore,restorePreview,confirmRestore,cancelRestore,exportCsv,resetLocal,enableReminders};
}
export type Trainer=ReturnType<typeof useTrainer>;
