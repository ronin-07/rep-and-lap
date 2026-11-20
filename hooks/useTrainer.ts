'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {DAYS,type Day,type GymDay,type SwimDay,type GymSet,type TrackerData,type TrackingTab,type View,type UserInfo,type SyncMode,type ProgressTab,type SessionNotes,type SwimInterval} from '@/lib/types';
import {PLAN} from '@/lib/plan';
import {keyOf,weekOf,dateFor} from '@/lib/dates';
import {blankData,loadData,saveData,weekBlank,recordPayload,applyRecord,downloadFile,STORAGE_KEY,LAST_ACCOUNT_KEY,THEME_KEY} from '@/lib/storage';
import {firebaseConfigured,googleSignIn,googleSignOut,observeAuth,watchRecords,writeRecord} from '@/lib/firebase';
import {history,loggedSet,num,setCount,validSet} from '@/lib/metrics';

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
 const [restEnd,setRestEnd]=useState(0);
 const [clock,setClock]=useState(Date.now());
 const [online,setOnline]=useState(true);
 const [installPrompt,setInstallPrompt]=useState<Event|null>(null);
 const [firebaseError,setFirebaseError]=useState('');
 const inFlight=useRef(new Set<string>());
 const readyRef=useRef(false);
 const serverRef=useRef(false);
 const toastTimeout=useRef<ReturnType<typeof setTimeout>|null>(null);
 const flushTimeout=useRef<ReturnType<typeof setTimeout>|null>(null);
 const mountedRef=useRef(true);
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
 },[persist]);
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
  const oldTheme=localStorage.getItem(THEME_KEY);if(oldTheme==='dark'||oldTheme==='light')setTheme(oldTheme);
  setHydrated(true);
  if('serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='localhost')){
    void navigator.serviceWorker.register('/sw.js',{scope:'/'}).catch(()=>{});
  }
  const beforeInstall=(e:Event)=>{e.preventDefault();setInstallPrompt(e);};
  window.addEventListener('beforeinstallprompt',beforeInstall);
  return ()=>{mountedRef.current=false;window.removeEventListener('beforeinstallprompt',beforeInstall);};
 },[]);
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
    const next=applyRecord(current,key,payload);next.recordUpdates[key]=stamp;persist(next);
  },(ready,hasPending)=>{
    serverRef.current=ready;readyRef.current=ready;
    if(Object.keys(dataRef.current.pendingSync).length||hasPending)setSyncMode('syncing');
    else setSyncMode(ready?'synced':'checking');
  },err=>{setFirebaseError(err.message);setSyncMode('needs-attention');});
  void flush();
  return ()=>stop();
 },[user?.uid,flush,persist]);
 useEffect(()=>{if(!hydrated)return;
  const handleOnline=()=>{setOnline(true);void flush();};
  const handleOffline=()=>{setOnline(false);setSyncMode('saved-local');};
  const handleFocus=()=>{if(navigator.onLine)void flush();};
  window.addEventListener('online',handleOnline);window.addEventListener('offline',handleOffline);
  window.addEventListener('focus',handleFocus);
  const interval=setInterval(()=>{if(navigator.onLine&&uidRef.current!=='guest'&&Object.keys(dataRef.current.pendingSync).length)void flush();},30000);
  return ()=>{window.removeEventListener('online',handleOnline);window.removeEventListener('offline',handleOffline);window.removeEventListener('focus',handleFocus);clearInterval(interval);};
 },[hydrated,flush]);
 useEffect(()=>{if(!hydrated)return;const interval=setInterval(()=>setClock(Date.now()),15000);return ()=>clearInterval(interval);},[hydrated]);
 useEffect(()=>{
   if(!restEnd||restEnd<=Date.now())return;
   setClock(Date.now());
   const id=setInterval(()=>setClock(Date.now()),1000);
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
  const at=new Date().toISOString();
  update(d=>{const w=d.weeks[week]??=weekBlank();w.timing??={};w.timing[day]={startedAt:at};},`session:${week}:${day}`);
  notify('Workout timer started. You can keep logging sets.');
 };
 const finishSession=(day:Day)=>{
  const at=new Date().toISOString();const isDone=!!dataRef.current.weeks[week]?.done?.[day];
  update(d=>{const w=d.weeks[week]??=weekBlank();w.timing??={};const t=w.timing[day]??={};
   if(!t.endedAt)t.endedAt=at;w.timing[day]=t;w.done[day]=true;w.completedAt??={};w.completedAt[day]=at;
  },`session:${week}:${day}`);
  if(!isDone)setCelebration({title:'Session complete!',body:`${PLAN[day].name} is in the books.`,kind:'session'});
  else notify('Session end time recorded.');
 };
 const rescheduleSession=(day:Day,date:string,targetWeek=week)=>{
  const parsed=dateFor(date);if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||keyOf(parsed)!==date){notify('Choose a valid date.');return;}
  if(dataRef.current.weeks[targetWeek]?.done?.[day]){notify('Completed sessions cannot be moved.');return;}
  update(d=>{const w=d.weeks[targetWeek]??=weekBlank();w.schedule??={};w.schedule[day]=date;},`session:${targetWeek}:${day}`);
  notify(`${PLAN[day].name} moved to ${date}.`);
 };
 const catchUpWeek=(targetWeek=week)=>{
  const today=keyOf(new Date()),current=dataRef.current.weeks[targetWeek]??weekBlank();
  const pending=DAYS.filter(day=>!current.done?.[day]).map(day=>({day,date:current.schedule?.[day]||dateForWeek(targetWeek,day)})).sort((a,b)=>a.date.localeCompare(b.date));
  if(!pending.some(x=>x.date<today)){notify('No missed sessions in this week.');return;}
  const used=new Set<string>();
  // Already completed days stay fixed. Rescheduling never changes any exercise logs.
  for(const day of DAYS)if(current.done[day])used.add(current.schedule?.[day]||dateForWeek(targetWeek,day));
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
  update(d=>{const item=d.weeks[week]??=weekBlank();item.done[day]=!was;item.completedAt??={};
   if(was){delete item.completedAt[day];}
   else {const at=new Date().toISOString();item.completedAt[day]=at;if(item.timing?.[day]?.startedAt&&!item.timing[day]?.endedAt)item.timing[day]!.endedAt=at;}
  },`session:${week}:${day}`);
  if(!was)setCelebration({title:'Session complete!',body:`${PLAN[day].name} is in the books.`,kind:'session'});
 };
 const gymField=(day:GymDay,exercise:string,index:number,field:'kg'|'reps',value:string)=>update(d=>{
  const w=d.weeks[week]??=weekBlank(), ex=w.gym[day]??={};
  const target=ex[exercise]??={sets:[]};target.sets[index]??={};target.sets[index][field]=value;target.sets[index].done=false;ex[exercise]=target;
 },`session:${week}:${day}`);
 const gymNotes=(day:GymDay,exercise:string,value:string)=>update(d=>{
  const w=d.weeks[week]??=weekBlank(),ex=w.gym[day]??={};const e=ex[exercise]??={sets:[]};e.notes=value;ex[exercise]=e;
 },`session:${week}:${day}`);
 const changeSetCount=(day:GymDay,exercise:string,delta:number)=>{
  const current=setCount(dataRef.current,week,day,exercise),next=current+delta;if(next<1||next>10)return;
  const last=dataRef.current.weeks[week]?.gym?.[day]?.[exercise]?.sets?.[current-1];
  if(delta<0&&(last?.kg||last?.reps)&&!confirm('Remove the final set and its values?'))return;
  update(d=>{const w=d.weeks[week]??=weekBlank(),ex=w.gym[day]??={},entry=ex[exercise]??={sets:[]};
    if(delta<0)entry.sets=entry.sets.slice(0,next);entry.setCount=next;ex[exercise]=entry;d.setOverrides[`${day}|${exercise}`]=next;
  },[`session:${week}:${day}`,'preferences']);
 };
 const logSet=(day:GymDay,exercise:string,index:number)=>{
  const current=dataRef.current.weeks[week]?.gym?.[day]?.[exercise]?.sets?.[index];
  if(!validSet(current)){notify('Enter weight and reps before logging.');return;}
  const earlier=history(dataRef.current,day,exercise).filter(x=>x.week<week);
  const previousBest=earlier.length?Math.max(...earlier.map(x=>x.best)):null;
  const was=!!current?.done;
  update(d=>{const e=d.weeks[week].gym[day]![exercise].sets[index];e.done=!was;},`session:${week}:${day}`);
  if(!was){setRestEnd(Date.now()+(dataRef.current.restSeconds||90)*1000);
   if(previousBest!==null&&num(current?.kg)>previousBest)setCelebration({title:'New personal record!',body:`${exercise}: ${num(current?.kg)} kg`,kind:'pr'});
   else notify('Set logged. Rest timer started.');
  }
 };
 const usePrevious=(day:GymDay,exercise:string,index:number)=>{
  const old=history(dataRef.current,day,exercise).filter(x=>x.week<week).at(-1)?.sets[index];
  if(!old||!loggedSet(old))return;
  gymField(day,exercise,index,'kg',String(old.kg));
 };
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
  const w=d.weeks[week]??=weekBlank();w.sessionNotes??={};const notes=w.sessionNotes[day]??={};notes[field]=value;w.sessionNotes[day]=notes;
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
 const updatePreferences=(change:Partial<Pick<TrackerData,'restSeconds'|'targetWeight'|'reminders'>>)=>update(d=>{Object.assign(d,change);},'preferences');
 const backup=()=>downloadFile(`rep-and-lap-backup-${keyOf(new Date())}.json`,JSON.stringify({...dataRef.current,exportedAt:new Date().toISOString(),app:'Rep & Lap'},null,2));
 const restore=async(file:File)=>{
  try {if(file.size>5_000_000)throw new Error('File too large');const obj=JSON.parse(await file.text()) as TrackerData;
   if(!obj||typeof obj.weeks!=='object'||!obj.weeks||Array.isArray(obj.weeks)||Object.keys(obj.weeks).some(k=>!/^\d{4}-\d{2}-\d{2}$/.test(k)))throw new Error('Invalid backup');
   if(!confirm('Restore this backup? Existing local records will be replaced. A safety backup will download first.'))return;
   backup();const next:TrackerData={...blankData(),...obj,recordUpdates:{},pendingSync:{}};
   const stamp=Date.now();for(const [w,entry] of Object.entries(next.weeks))for(const day of DAYS)if(entry.done?.[day]!==undefined||entry.gym?.[day as GymDay]||entry.swim?.[day as SwimDay]||entry.sessionNotes?.[day]||entry.timing?.[day]||entry.schedule?.[day]||entry.completedAt?.[day])next.recordUpdates[`session:${w}:${day}`]=stamp;
   for(const key of Object.keys(next.weights))next.recordUpdates[`weight:${key}`]=stamp;
   for(const key of Object.keys(next.waterLogs))next.recordUpdates[`water:${key}`]=stamp;
   next.recordUpdates.preferences=stamp;next.pendingSync={...next.recordUpdates};persist(next);scheduleFlush();notify('Backup restored.');
  }catch{notify('That file is not a valid Rep & Lap backup.');}
 };
 const exportCsv=(kind:'gym'|'swim'|'weight'|'water')=>{
  const rows:string[][]=[];
  if(kind==='water'){rows.push(['date','timestamp','millilitres']);for(const item of Object.values(dataRef.current.waterLogs))if(!item.deleted)rows.push([item.date,item.at,String(item.ml)]);}
  if(kind==='weight'){rows.push(['date','kg','notes']);for(const [date,item] of Object.entries(dataRef.current.weights))if(!item.deleted)rows.push([date,String(item.kg??''),item.note||'']);}
  if(kind==='gym'){rows.push(['week','day','exercise','set','kg','reps','logged','scheduled_date','started_at','ended_at','completed_at']);for(const [w,x] of Object.entries(dataRef.current.weeks))for(const [day,exs] of Object.entries(x.gym))for(const [name,e] of Object.entries(exs||{}))e.sets.forEach((s,i)=>rows.push([w,day,name,String(i+1),String(s.kg??''),String(s.reps??''),s.done?'yes':'no',x.schedule?.[day as Day]||dateForWeek(w,day as Day),x.timing?.[day as Day]?.startedAt||'',x.timing?.[day as Day]?.endedAt||'',x.completedAt?.[day as Day]||'']));}
  if(kind==='swim'){rows.push(['week','day','duration','distance','longest freestyle','rest','RPE','sculling','treading','scheduled_date','started_at','ended_at','completed_at']);for(const [w,x] of Object.entries(dataRef.current.weeks))for(const [day,s] of Object.entries(x.swim))if(s)rows.push([w,day,String(s.duration??''),String(s.distance??''),String(s.longest??''),String(s.rest??''),String(s.rpe??''),String(s.sculling??''),String(s.treading??''),x.schedule?.[day as Day]||dateForWeek(w,day as Day),x.timing?.[day as Day]?.startedAt||'',x.timing?.[day as Day]?.endedAt||'',x.completedAt?.[day as Day]||'']);}
  const csv=rows.map(row=>row.map(x=>`"${x.replace(/"/g,'""')}"`).join(',')).join('\r\n');
  downloadFile(`rep-and-lap-${kind}-${keyOf(new Date())}.csv`,csv,'text/csv');
 };
 const resetLocal=()=>{if(!confirm('Clear local records on this device? Cloud records will not be removed.'))return;persist(blankData());notify('Local cache cleared.');};
 const enableReminders=async(enabled:boolean)=>{
  if(enabled&&'Notification' in window&&Notification.permission==='default'){const result=await Notification.requestPermission();if(result!=='granted'){notify('Notifications weren’t enabled.');return;}}
  updatePreferences({reminders:{...dataRef.current.reminders,enabled}});
 };
 const signin=async()=>{try{setFirebaseError('');await googleSignIn();}catch(e){const msg=e instanceof Error?e.message:'Sign-in unavailable';setFirebaseError(msg);notify('Google sign-in failed. Check your browser settings.');}};
 const signout=async()=>{try{await googleSignOut();}catch{notify('Unable to sign out.');}};
 const pending=Object.keys(data.pendingSync||{}).length;
 const displaySync:SyncMode=!online?'saved-local':firebaseError?'needs-attention':user?(pending?'syncing':syncMode):'saved-local';
 return {hydrated,data,user,week,setWeek,view,goto,trackingTab,setTrackingTab,progressTab,setProgressTab,gymDay,setGymDay,swimDay,setSwimDay,theme,setTheme,syncMode:displaySync,online,toast,notify,celebration,setCelebration,restEnd,clock,startRest:(sec?:number)=>setRestEnd(Date.now()+(sec||data.restSeconds)*1000),stopRest:()=>setRestEnd(0),extendRest:()=>setRestEnd(v=>v+15000),installPrompt,firebaseError,pending,signin,signout,flush:()=>void flush(),toggleDone,startSession,finishSession,rescheduleSession,catchUpWeek,gymField,gymNotes,changeSetCount,logSet,usePrevious,swimField,changeLengths,toggleDrill,addInterval,deleteInterval,noteField,addWater,deleteWater,saveWeight,deleteWeight,updatePreferences,backup,restore,exportCsv,resetLocal,enableReminders};
}
export type Trainer=ReturnType<typeof useTrainer>;
