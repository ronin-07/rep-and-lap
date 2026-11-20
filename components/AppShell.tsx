'use client';
import {useEffect,useRef,useState} from 'react';
import {Activity,ArrowRight,Check,Cloud,CloudOff,CloudUpload,Download,Dumbbell,House,Menu,Moon,CalendarDays,Settings2,Sun,Trophy,UserRound,WifiOff,X,ShieldAlert} from 'lucide-react';
import {useTrainer} from '@/hooks/useTrainer';
import Dashboard from './dashboard/Dashboard';
import Workout from './workout/Workout';
import Progress from './progress/Progress';
import Profile from './Profile';
import Settings from './Settings';
import Conflicts from './Conflicts';
import RestDock from './workout/RestDock';
import TrainingCalendar from './progress/TrainingCalendar';
import RecoveryCheckIn from './workout/RecoveryCheckIn';
const NAV=[{key:'home',label:'Home',icon:House},{key:'workout',label:'Workout',icon:Dumbbell},{key:'progress',label:'Progress',icon:Activity},{key:'profile',label:'Profile',icon:UserRound}] as const;
const DESKTOP_CALENDAR = {key:'calendar' as const,label:'Calendar',icon:CalendarDays};
export default function AppShell(){
 const app=useTrainer();
 const active=app.view==='settings'||app.view==='conflicts'?'profile':app.view==='calendar'?'home':app.view;
 const [conflictNotice,setConflictNotice]=useState(false);
 const seenConflicts=useRef(new Set<string>());
 useEffect(()=>{const active=new Set(app.conflicts.map(({local})=>local.key));for(const key of seenConflicts.current)if(!active.has(key))seenConflicts.current.delete(key);const newlyDetected=app.conflicts.some(({local})=>!seenConflicts.current.has(local.key));active.forEach(key=>seenConflicts.current.add(key));if(newlyDetected&&app.view!=='conflicts')setConflictNotice(true);if(!active.size||app.view==='conflicts')setConflictNotice(false);},[app.conflicts,app.view]);
 useEffect(()=>{
   const viewport=window.visualViewport;
   if(!viewport)return;
   const update=()=>document.body.classList.toggle('keyboard-open',viewport.height<window.innerHeight-170);
   viewport.addEventListener('resize',update);update();
   return ()=>{viewport.removeEventListener('resize',update);document.body.classList.remove('keyboard-open');};
 },[]);
 if(!app.hydrated)return <main className="loading-shell"><div className="loading-logo">R<span>&</span>L</div><p>Loading your training…</p></main>;
 return <div className={`app-layout ${app.restState&&app.view==='workout'&&app.trackingTab==='gym'?'rest-open':''}`}><aside className="desktop-sidebar"><div className="brand"><span className="brand-logo"><Dumbbell size={25}/></span><div><strong>Rep <span>&</span> Lap</strong><small>TRAINING, IN MOTION</small></div></div>
 <nav className="desktop-nav" aria-label="Main navigation">{[...NAV,DESKTOP_CALENDAR].map(item=><button key={item.key} className={app.view===item.key||active===item.key?'active':''} onClick={()=>app.goto(item.key)}><item.icon size={20}/>{item.label}</button>)}</nav>
 <div className="sidebar-footer"><button className={app.view==='settings'?'sidebar-settings active':'sidebar-settings'} onClick={()=>app.goto('settings')}><Settings2 size={19}/> Settings</button><div className="sidebar-account"><span className="sidebar-avatar"><UserRound size={21}/></span><span><strong>{app.user?.name||'Guest athlete'}</strong><small>{app.user?'Google connected':'Saved locally'}</small></span></div></div></aside>
 <div className="content-shell"><header className="topbar"><div className="topbar-name"><span className="live-dot"/><strong>{app.view==='home'?'Dashboard':app.view==='workout'?'Workout log':app.view==='progress'?'Progress':app.view==='profile'?'Profile':app.view==='calendar'?'Calendar':app.view==='conflicts'?'Conflicts':'Settings'}</strong></div><div className="topbar-actions">{app.conflicts.length?<button className="conflicts-trigger" onClick={()=>{app.goto('conflicts');setConflictNotice(false);}} aria-label={`${app.conflicts.length} set conflicts require review`}><ShieldAlert size={17}/><span>Conflicts</span><b>{app.conflicts.length}</b></button>:<span className={`sync-status ${app.syncMode}`} title="Cloud synchronization status">{app.syncMode==='synced'?<Cloud size={15}/>:app.syncMode==='syncing'?<CloudUpload size={15}/>:app.online?<CloudOff size={15}/>:<WifiOff size={15}/>}<span>{app.syncMode==='synced'?'Synced':app.syncMode==='syncing'?'Syncing…':app.syncMode==='checking'?'Checking…':app.syncMode==='needs-attention'?'Needs attention':'Saved locally'}</span></span>}<button className="icon-btn theme-toggle" onClick={()=>app.setTheme(app.theme==='dark'?'light':'dark')} title="Toggle theme" aria-label="Toggle color theme">{app.theme==='dark'?<Sun size={20}/>:<Moon size={20}/>}</button><button className="icon-btn settings-top" onClick={()=>app.goto('settings')} aria-label="Open settings"><Settings2 size={20}/></button></div></header>
 <main className="app-main" id="main-content">{app.view==='home'?<Dashboard app={app}/>:app.view==='workout'?<Workout app={app}/>:app.view==='progress'?<Progress app={app}/>:app.view==='profile'?<Profile app={app}/>:app.view==='calendar'?<div className="stack-xl"><div className="page-header"><div><span className="eyebrow">YOUR PLAN</span><h1>Training calendar.</h1><p>Recovery, completed sessions and flexible scheduling, all in one place.</p></div></div><TrainingCalendar app={app}/></div>:app.view==='conflicts'?<Conflicts app={app}/>:<Settings app={app}/>}</main>
 <nav className="mobile-bottom-nav" aria-label="Mobile navigation">{NAV.map(item=><button key={item.key} className={active===item.key?'active':''} onClick={()=>app.goto(item.key)}><item.icon size={22} strokeWidth={active===item.key?2.3:1.8}/><span>{item.label}</span></button>)}</nav>
 </div>
 <RestDock app={app}/>
 <RecoveryCheckIn app={app}/>
 {app.conflicts.length>0&&conflictNotice&&app.view!=='conflicts'&&<div className="conflict-notice" role="alert"><ShieldAlert size={23}/><div><strong>Sync conflict detected</strong><small>{app.conflicts.length} {app.conflicts.length===1?'set needs':'sets need'} your decision</small></div><button className="button-primary" onClick={()=>{setConflictNotice(false);app.goto('conflicts');}}>Review</button><button className="icon-btn" aria-label="Dismiss conflict notification" onClick={()=>setConflictNotice(false)}><X size={17}/></button></div>}
 {app.celebration&&<div className="overlay" role="dialog" aria-modal="true" aria-label={app.celebration.title} onClick={()=>app.setCelebration(null)}><div className="celebration card" onClick={e=>e.stopPropagation()}><span className="celebration-trophy"><Trophy size={42}/></span><div className="eyebrow">A MOMENT TO CELEBRATE</div><h2>{app.celebration.title}</h2><p>{app.celebration.body}</p><button className="button-primary" onClick={()=>app.setCelebration(null)}>Keep going <ArrowRight size={18}/></button></div></div>}
 {app.toast&&<div className="toast" role="status">{app.toast}</div>}
 </div>;
}
