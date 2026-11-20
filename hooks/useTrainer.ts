'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {DAYS,type Day,type GymDay,type SwimDay,type GymSet,type TrackerData,type TrackingTab,type View,type UserInfo,type SyncMode,type ProgressTab,type SessionNotes,type SwimInterval,type ScheduleStatus,type RoutineExercise} from '@/lib/types';
import {PLAN} from '@/lib/plan';
import {exercisesFor,editRoutine,cloneExercises} from '@/lib/routines';
import {isValidDate,scheduledDate,entriesForDate,statusFor,moveDate} from '@/lib/scheduling';
import {keyOf,weekOf,dateFor} from '@/lib/dates';
import {blankData,loadData,saveData,weekBlank,recordPayload,applyRecord,downloadFile,STORAGE_KEY,LAST_ACCOUNT_KEY,THEME_KEY} from '@/lib/storage';
import {firebaseConfigured,googleSignIn,googleSignOut,observeAuth,watchRecords,writeRecord,writeSet} from '@/lib/firebase';
import {queueSetChange,integrateServerSet,acknowledgeSet,flagConflict,resolveSetConflict,SetVersionConflict} from '@/lib/set-sync';
import {readBackup,mergeBackup,markRestoredWrites,replaceLocalBackup,csvCell,type BackupPreview,type RestoreMode} from '@/lib/backup';
import {history,loggedSet,num,setCount,validSet} from '@/lib/metrics';
import {REST_KEY,makeRest,nextIncompleteSet,parseRest,previousCompletedSet,suggestedNextSet,secondsLeft,validEffort,type RestState,type NextSetTarget} from '@/lib/workout-flow';
import {stableSetId} from '@/lib/set-sync';

export type Celebration = {title:string;body:string;kind:'session'|'pr'}|null;
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
 const [restState,setRestState]=useState<RestState|null>(null);
 const restEnd=restState?.endsAt??0;
 const [recoveryPrompt,setRecoveryPrompt]=useState<{week:string;day:Day}|null>(null);
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
 const beginRest=useCallback((seconds:number,target:NextSetTarget|null=null)=>{saveRest(makeRest(seconds,target));setClock(Date.now());},[saveRest]);
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
      if(!Object.keys(dataRef.current.pendingSync).length&&serverRef.current)setSyncMode('synced');
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
      if(!Object.keys(next.pendingSync).length&&!Object.keys(next.pendingSets).length&&serverRef.current)setSyncMode('synced');
    }).catch((error:unknown)=>{
      if(uidRef.current!==uid)return;
      if(error instanceof SetVersionConflict){
        const next=structuredClone(dataRef.current);flagConflict(next,key,error.remote);persist(next);
        setSyncMode('needs-attention');notify('A set conflict needs your review.');
      }else {setFirebaseError(error instanceof Error?error.message:'Set sync failed');setSyncMode('needs-attention');}
    }).finally(()=>{inFlight.current.delete(inflightKey);});
  }
 },[persist,notify]);
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
 useEffect(()=>{
  mountedRef.current=true;setOnline(navigator.onLine);
  const last=localStorage.getItem(LAST_ACCOUNT_KEY);
  try {const user=last?JSON.parse(last) as {id?:string}:null;uidRef.current=user?.id||'guest';}catch{uidRef.current='guest';}
  const stored=loadData(uidRef.current);dataRef.current=stored;setData(stored);
  saveRest(parseRest(localStorage.getItem(`${REST_KEY}:${uidRef.current}`)));
  const oldTheme=localStorage.getItem(THEME_KEY);if(oldTheme==='dark'||oldTheme==='light')setTheme(oldTheme);
  setHydrated(true);
  if('serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='localhost')){
    void navigator.serviceWorker.register('/sw.js',{scope:'/'}).catch(()=>{});
  }
  const beforeInstall=(e:Event)=>{e.preventDefault();setInstallPrompt(e);};
  window.addEventListener('beforeinstallprompt',beforeInstall);
  return ()=>{mountedRef.current=false;window.removeEventListener('beforeinstallprompt',beforeInstall);};
 },[saveRest]);
 useEffect(()=>{
  document.documentElement.dataset.theme=theme;
  const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.setAttribute('content',theme==='dark'?'#080e1c':'#f6f7fc');
  if(hydrated)localStorage.setItem(THEME_KEY,theme);
 },[theme,hydrated]);
 useEffect(()=>{
  if(!hydrated)return;
  if(!firebaseConfigured){setSyncMode('saved-local');return;}
  const unsub=observeAuth(nextUser=>{
    const newId=nextUser?.uid||'guest';
    if(newId!==uidRef.current){
      const previous=dataRef.current;try{saveData(uidRef.current,previous);}catch{}
      uidRef.current=newId;inFlight.current.clear();readyRef.current=false;serverRef.current=false;
      const fresh=loadData(newId);dataRef.current=fresh;setData(fresh);
      restRef.current=parseRest(localStorage.getItem(`${REST_KEY}:${newId}`));setRestState(restRef.current);
    }
    setUser(nextUser);
    if(nextUser)localStorage.setItem(LAST_ACCOUNT_KEY,JSON.stringify({id:nextUser.uid,email:nextUser.email}));
    else localStorage.removeItem(LAST_ACCOUNT_KEY);
    setSyncMode(nextUser?'checking':'saved-local');
  },err=>{setFirebaseError(err.message);setSyncMode('needs-attention');});
  return ()=>unsub();
 },[hydrated]);
 useEffect(()=>{
  if(!user)return;
  const id=user.uid;serverRef.current=false;readyRef.current=false;
  const stop=watchRecords(id,(key,payload,stamp,hasPending,fromCache)=>{
    if(id!==uidRef.current||hasPending||(!key.startsWith('session:')&&!key.startsWith('weight:')&&!key.startsWith('water:')&&key!=='preferences'))return;
    const current=dataRef.current;
    if(current.pendingSync[key])return; // Preserve unacknowledged local writes.
    if(fromCache&&stamp<(current.recordUpdates[key]||0))return;
    if(stamp<(current.recordUpdates[key]||0))return; // Ignore older cloud snapshots even when online.
    const next=applyRecord(current,key,payload);next.recordUpdates[key]=stamp;persist(next);
  },(record,hasPending,fromCache)=>{
    if(id!==uidRef.current||hasPending)return;
    const next=structuredClone(dataRef.current);
    integrateServerSet(next,record);persist(next);
  },(ready,hasPending)=>{
    serverRef.current=ready;readyRef.current=ready;
    if(Object.keys(dataRef.current.setConflicts).length)setSyncMode('needs-attention');
    else if(Object.keys(dataRef.current.pendingSync).length||Object.keys(dataRef.current.pendingSets).length||hasPending)setSyncMode('syncing');
    else setSyncMode(ready?'synced':'checking');
  },err=>{setFirebaseError(err.message);setSyncMode('needs-attention');});
  void flush();
  return ()=>stop();
 },[user?.uid,flush,persist]);
 useEffect(()=>{if(!hydrated)return;
  const handleOnline=()=>{setOnline(true);void flush();};
  const handleOffline=()=>{setOnline(false);setSyncMode('saved-local');};
  const handleFocus=()=>{setClock(Date.now());if(navigator.onLine)void flush();};
  const handleVisibility=()=>{if(document.visibilityState==='visible'){setClock(Date.now());if(navigator.onLine)void flush();}};
  window.addEventListener('online',handleOnline);window.addEventListener('offline',handleOffline);
  window.addEventListener('focus',handleFocus);document.addEventListener('visibilitychange',handleVisibility);
  const interval=setInterval(()=>{if(navigator.onLine&&uidRef.current!=='guest'&&(Object.keys(dataRef.current.pendingSync).length||Object.keys(dataRef.current.pendingSets).length))void flush();},30000);
  return ()=>{window.removeEventListener('online',handleOnline);window.removeEventListener('offline',handleOffline);window.removeEventListener('focus',handleFocus);document.removeEventListener('visibilitychange',handleVisibility);clearInterval(interval);};
 },[hydrated,flush]);
 useEffect(()=>{if(!hydrated)return;const interval=setInterval(()=>setClock(Date.now()),15000);return ()=>clearInterval(interval);},[hydrated]);
 useEffect(()=>{
   if(!restEnd)return;
   setClock(Date.now());
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
  const session=dataRef.current.weeks[week]?.timing?.[day];
  if(session?.startedAt&&!session.endedAt){notify('This session is already running.');return;}
  if(dataRef.current.weeks[week]?.done?.[day]||session?.endedAt){notify('This session was already finished.');return;}
  if(statusFor(dataRef.current,week,day)!=='scheduled'&&!confirm('This was marked as a rest or skipped day. Restore the workout and start?'))return;
  const at=new Date().toISOString();
  update(d=>{const w=d.weeks[week]??=weekBlank();if(w.scheduleStatus)delete w.scheduleStatus[day];w.timing??={};w.timing[day]={startedAt:at};
    if(PLAN[day].kind==='gym'){w.routineOverrides??={};w.routineOverrides[day as GymDay]??=cloneExercises(exercisesFor(d,week,day as GymDay));}
  },`session:${week}:${day}`);
  notify('Workout timer started. You can keep logging sets.');
 };
 const finishSession=(day:Day)=>{
  const at=new Date().toISOString();const isDone=!!dataRef.current.weeks[week]?.done?.[day];
  update(d=>{const w=d.weeks[week]??=weekBlank();w.timing??={};const t=w.timing[day]??={};
   if(!t.endedAt)t.endedAt=at;w.timing[day]=t;w.done[day]=true;if(w.scheduleStatus)delete w.scheduleStatus[day];w.completedAt??={};w.completedAt[day]=at;
  },`session:${week}:${day}`);
  if(restRef.current&&(!restRef.current.target||restRef.current.target.day===day))saveRest(null);
  if(!isDone)setRecoveryPrompt({week,day});
  else notify('Session end time recorded.');
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
 const toggleDone=(day:Day)=>{
  const was=!!dataRef.current.weeks[week]?.done?.[day];
  if(was&&!confirm('Mark this session incomplete? All logged sets and workout time will be kept.'))return;
  if(!was&&statusFor(dataRef.current,week,day)!=='scheduled'&&!confirm('Restore this skipped or rest session and mark it complete?'))return;
  update(d=>{const item=d.weeks[week]??=weekBlank();item.done[day]=!was;if(!was&&item.scheduleStatus)delete item.scheduleStatus[day];item.completedAt??={};
   if(was){delete item.completedAt[day];}
   else {const at=new Date().toISOString();item.completedAt[day]=at;if(item.timing?.[day]?.startedAt&&!item.timing[day]?.endedAt)item.timing[day]!.endedAt=at;}
  },`session:${week}:${day}`);
  if(!was){if(restRef.current&&(!restRef.current.target||restRef.current.target.day===day))saveRest(null);setRecoveryPrompt({week,day});}
 };
 const editSet=(day:GymDay,exercise:string,index:number,change:(set:GymSet)=>void)=>{
  const next=structuredClone(dataRef.current);
  const w=next.weeks[week]??=weekBlank();
  if(!w.routineOverrides?.[day]){w.routineOverrides??={};w.routineOverrides[day]=cloneExercises(exercisesFor(next,week,day));
    const key=`session:${week}:${day}`;const stamp=Math.max(Date.now(),(next.recordUpdates[key]||0)+1);next.recordUpdates[key]=stamp;next.pendingSync[key]=stamp;}
  queueSetChange(next,`session:${week}:${day}`,exercise,index,change);
  persist(next);if(uidRef.current!=='guest')scheduleFlush();
 };
 const gymField=(day:GymDay,exercise:string,index:number,field:'kg'|'reps',value:string)=>
  editSet(day,exercise,index,set=>{set[field]=value;set.done=false;set.deleted=false;});
 const gymNotes=(day:GymDay,exercise:string,value:string)=>update(d=>{
  const w=d.weeks[week]??=weekBlank(),ex=w.gym[day]??={};const e=ex[exercise]??={sets:[]};e.notes=value;ex[exercise]=e;
 },`session:${week}:${day}`);
 const changeSetCount=(day:GymDay,exercise:string,delta:number)=>{
  const current=setCount(dataRef.current,week,day,exercise),next=current+delta;if(next<1||next>10)return;
  const last=dataRef.current.weeks[week]?.gym?.[day]?.[exercise]?.sets?.[current-1];
  if(delta<0&&(last?.kg||last?.reps)&&!confirm('Remove the final set and its values?'))return;
  if(delta<0){
    const copy=structuredClone(dataRef.current);
    queueSetChange(copy,`session:${week}:${day}`,exercise,current-1,set=>{set.deleted=true;set.done=false;});
    copy.setOverrides[`${day}|${exercise}`]=next;
    const stamp=Math.max(Date.now(),(copy.recordUpdates.preferences||0)+1);
    copy.recordUpdates.preferences=stamp;copy.pendingSync.preferences=stamp;
    persist(copy);if(uidRef.current!=='guest')scheduleFlush();
  }else update(d=>{const w=d.weeks[week]??=weekBlank(),ex=w.gym[day]??={},entry=ex[exercise]??={sets:[]};
    entry.setCount=next;ex[exercise]=entry;d.setOverrides[`${day}|${exercise}`]=next;
  },'preferences');
 };
 const changeRoutine=(day:GymDay,kind:'add'|'remove'|'move'|'replace',index:number,payload?:RoutineExercise|number)=>{
  try {
   const existing=exercisesFor(dataRef.current,week,day);
   if((kind==='remove'||kind==='replace')&&existing[index]){
    const archived=dataRef.current.weeks[week]?.gym?.[day]?.[existing[index].name];
    if(archived?.sets?.some(s=>s.done&&!s.deleted)&&!confirm('This exercise has logged sets. Hide it from the current routine? Its recorded sets will remain in history.'))return;
   }
   const changed=editRoutine(existing,kind,index,payload);
   if((kind==='remove'||kind==='replace')&&restRef.current?.target?.week===week&&restRef.current?.target?.day===day&&restRef.current?.target?.exercise===existing[index]?.name)saveRest(null);
   update(d=>{const w=d.weeks[week]??=weekBlank();w.routineOverrides??={};w.routineOverrides[day]=changed;},`session:${week}:${day}`);
   notify('This session’s routine updated.');
  }catch(error){notify(error instanceof Error?error.message:'Routine change failed.');}
 };
 const saveRoutineDefault=(day:GymDay)=>{
  const exercises=cloneExercises(exercisesFor(dataRef.current,week,day));
  update(d=>{d.routineTemplates[day]=exercises;},'preferences');
  notify('Saved as your default for future sessions.');
 };
 const resetSessionRoutine=(day:GymDay)=>{
  if(!confirm('Restore the default exercise list for this session? Logged sets stay in history.'))return;
  update(d=>{const w=d.weeks[week]??=weekBlank();if(w.routineOverrides)delete w.routineOverrides[day];},`session:${week}:${day}`);
 };
 const resetDefaultRoutine=(day:GymDay)=>{
  if(!confirm('Reset your saved default routine for this day?'))return;
  update(d=>{delete d.routineTemplates[day];},'preferences');
 };
 const logSet=(day:GymDay,exercise:string,index:number)=>{
  const current=dataRef.current.weeks[week]?.gym?.[day]?.[exercise]?.sets?.[index];
  if(!validSet(current)){notify('Enter weight and reps before logging.');return;}
  const earlier=history(dataRef.current,day,exercise).filter(x=>x.week<week);
  const previousBest=earlier.length?Math.max(...earlier.map(x=>x.best)):null;
  const was=!!current?.done;
  editSet(day,exercise,index,set=>{set.done=!was;set.deleted=false;});
  if(!was){
   const target=nextIncompleteSet(dataRef.current,week,day,exercise,index);
   if(target)beginRest(dataRef.current.restSeconds||90,target);
   else saveRest(null); // The final set never leaves a pointless rest countdown.
   if(previousBest!==null&&num(current?.kg)>previousBest)setCelebration({title:'New personal record!',body:`${exercise}: ${num(current?.kg)} kg`,kind:'pr'});
   else notify(target?'Set logged · rest timer running':'All planned sets logged. Nice work!');
  }else if(restRef.current)saveRest(null);
 };
 const usePrevious=(day:GymDay,exercise:string,index:number,onlyBlank=false)=>{
  const old=previousCompletedSet(dataRef.current,week,day,exercise,index);
  if(!old){notify('No earlier logged set for this exercise.');return;}
  const current=dataRef.current.weeks[week]?.gym?.[day]?.[exercise]?.sets?.[index];
  if(onlyBlank&&(current?.kg!==undefined&&current?.kg!==''||current?.reps!==undefined&&current?.reps!==''))return;
  editSet(day,exercise,index,set=>{set.kg=old.kg;set.reps=old.reps;set.done=false;set.deleted=false;});
  notify('Previous weight and reps filled. Review before logging.');
 };
 const setEffort=(day:GymDay,exercise:string,index:number,mode:'rir'|'rpe',raw:string)=>{
  if(raw!==''&&!validEffort(mode,Number(raw))){notify('Choose a valid effort value.');return;}
  editSet(day,exercise,index,set=>{delete set[mode==='rir'?'rpe':'rir'];if(raw==='')delete set[mode];else set[mode]=Number(raw);});
 };
 const goToNextSet=()=>{
  const target=restRef.current?.target;
  saveRest(null);
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
 const closeRecoveryPrompt=()=>{const prompt=recoveryPrompt;setRecoveryPrompt(null);if(prompt)setCelebration({title:'Session complete!',body:`${PLAN[prompt.day].name} is in the books.`,kind:'session'});};
 const swimField=(day:SwimDay,field:string,value:string|number|boolean)=>update(d=>{
  const w=d.weeks[week]??=weekBlank(),item=w.swim[day]??={drills:{}};
  (item as unknown as Record<string,unknown>)[field]=value;
  if(field==='poolLength'&&num(item.lengths)>0)item.distance=num(item.lengths)*num(item.poolLength);
 },`session:${week}:${day}`);
 const changeLengths=(day:SwimDay,change:number)=>update(d=>{
  const w=d.weeks[week]??=weekBlank(),item=w.swim[day]??={drills:{}};
  const count=Math.max(0,num(item.lengths)+change);item.lengths=count;item.poolLength=num(item.poolLength)||25;item.distance=count*num(item.poolLength);
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
  if(amount<25||amount>2000){notify('Enter a drink between 25 and 2,000 mL.');return;}
  const id=crypto.randomUUID();const at=new Date().toISOString();
  update(d=>{d.waterLogs[id]={date,at,ml:amount};},`water:${id}`);
 };
 const deleteWater=(id:string)=>update(d=>{if(d.waterLogs[id])d.waterLogs[id].deleted=true;},`water:${id}`);
 const saveWeight=(date:string,kg:number,note:string)=>{
  if(kg<20||kg>400){notify('Enter a weight between 20 and 400 kg.');return;}
  update(d=>{d.weights[date]={kg,note};},`weight:${date}`);
  notify('Weigh-in recorded.');
 };
 const deleteWeight=(date:string)=>{if(!confirm('Remove this weigh-in?'))return;update(d=>{d.weights[date]={deleted:true};},`weight:${date}`);};
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
  if(kind==='gym'){rows.push(['week','day','exercise','set','set_id','kg','reps','rir','rpe','logged','scheduled_date','started_at','ended_at','completed_at']);for(const [w,x] of Object.entries(dataRef.current.weeks))for(const [day,exs] of Object.entries(x.gym))for(const [name,e] of Object.entries(exs||{}))e.sets.forEach((s,i)=>rows.push([w,day,name,String(i+1),s.id||'',String(s.kg??''),String(s.reps??''),String(s.rir??''),String(s.rpe??''),s.done?'yes':'no',x.schedule?.[day as Day]||dateForWeek(w,day as Day),x.timing?.[day as Day]?.startedAt||'',x.timing?.[day as Day]?.endedAt||'',x.completedAt?.[day as Day]||'']));}
  if(kind==='swim'){rows.push(['week','day','duration','distance','longest freestyle','rest','RPE','sculling','treading','scheduled_date','started_at','ended_at','completed_at']);for(const [w,x] of Object.entries(dataRef.current.weeks))for(const [day,s] of Object.entries(x.swim))if(s)rows.push([w,day,String(s.duration??''),String(s.distance??''),String(s.longest??''),String(s.rest??''),String(s.rpe??''),String(s.sculling??''),String(s.treading??''),x.schedule?.[day as Day]||dateForWeek(w,day as Day),x.timing?.[day as Day]?.startedAt||'',x.timing?.[day as Day]?.endedAt||'',x.completedAt?.[day as Day]||'']);}
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
 const pending=Object.keys(data.pendingSync||{}).length+Object.keys(data.pendingSets||{}).length;
 const conflicts=Object.values(data.setConflicts||{});
 const resolveConflict=(key:string,choice:'mine'|'cloud')=>{const next=structuredClone(dataRef.current);resolveSetConflict(next,key,choice);persist(next);if(choice==='mine')scheduleFlush();};
 const displaySync:SyncMode=!online?'saved-local':conflicts.length||firebaseError?'needs-attention':user?(pending?'syncing':syncMode):'saved-local';
 return {hydrated,data,user,week,setWeek,view,goto,trackingTab,setTrackingTab,progressTab,setProgressTab,gymDay,setGymDay,swimDay,setSwimDay,theme,setTheme,syncMode:displaySync,online,toast,notify,celebration,setCelebration,restEnd,restState,restRemaining:secondsLeft(restState,clock),restReady:!!restState&&secondsLeft(restState,clock)===0,clock,startRest:(sec?:number)=>beginRest(sec||data.restSeconds),stopRest:()=>saveRest(null),extendRest:()=>saveRest(restRef.current?{...restRef.current,endsAt:Math.max(restRef.current.endsAt,Date.now())+30000}:null),goToNextSet,recoveryPrompt,closeRecoveryPrompt,setEffort,installPrompt,firebaseError,pending,conflicts,resolveConflict,signin,signout,flush:()=>void flush(),toggleDone,startSession,finishSession,rescheduleSession,setScheduleStatus,catchUpWeek,changeRoutine,saveRoutineDefault,resetSessionRoutine,resetDefaultRoutine,gymField,gymNotes,changeSetCount,logSet,usePrevious,swimField,changeLengths,toggleDrill,addInterval,deleteInterval,noteField,addWater,deleteWater,saveWeight,deleteWeight,updatePreferences,backup,restore,restorePreview,confirmRestore,cancelRestore,exportCsv,resetLocal,enableReminders};
}
export type Trainer=ReturnType<typeof useTrainer>;
