'use client';
import {useEffect,useState} from 'react';
import {Activity,ArrowLeft,ArrowRight,Cloud,CloudOff,CloudUpload,Dumbbell,Droplets,House,Menu,Moon,CalendarDays,Settings2,Sun,Trophy,UserRound,WifiOff,X,ShieldAlert} from 'lucide-react';
import {useTrainer} from '@/hooks/useTrainer';
import Dashboard from './dashboard/Dashboard';
import Workout from './workout/Workout';
import Progress from './progress/Progress';
import Profile from './Profile';
import Settings from './Settings';
import Conflicts from './Conflicts';
import ActiveTimerDock from './workout/ActiveTimerDock';
import TrainingCalendar from './progress/TrainingCalendar';
import Insights from './progress/Insights';
import Achievements from './progress/Achievements';
import NotificationBell from './NotificationBell';
import CompletionDateDialog from './workout/CompletionDateDialog';
import RecoveryCheckIn from './workout/RecoveryCheckIn';
const NAV=[{key:'home',label:'Home',icon:House},{key:'workout',label:'Log',icon:Dumbbell},{key:'progress',label:'Progress',icon:Activity},{key:'profile',label:'Profile',icon:UserRound}] as const;
const DESKTOP_CALENDAR = {key:'calendar' as const,label:'Calendar',icon:CalendarDays};
const DESKTOP_ACHIEVEMENTS = {key:'achievements' as const,label:'Achievements',icon:Trophy};
export default function AppShell(){
 const app=useTrainer();
 const totalConflicts=app.conflicts.length+app.itemConflicts.length;
 const active=app.view==='settings'||app.view==='conflicts'?'profile':app.view==='calendar'?'calendar':app.view;
 const conflictKeys=[...app.conflicts,...app.itemConflicts].map(({local})=>local.key);
 const [dismissedConflictKeys,setDismissedConflictKeys]=useState<string[]>([]);
 const conflictNotice=conflictKeys.some(key=>!dismissedConflictKeys.includes(key));
 const dismissConflictNotice=()=>setDismissedConflictKeys(conflictKeys);
 const [mobileMenu,setMobileMenu]=useState<{view:string;open:boolean}>({view:app.view,open:false});
 const mobileMenuOpen=mobileMenu.view===app.view&&mobileMenu.open;
 const setMobileMenuOpen=(next:boolean|((value:boolean)=>boolean))=>setMobileMenu(prev=>({
  view:app.view,open:typeof next==='function'?next(prev.view===app.view&&prev.open):next,
 }));
 // Close a menu after navigation so returning to an earlier view cannot reopen it.
 useEffect(()=>{
  let active=true;
  queueMicrotask(()=>{if(active)setMobileMenu({view:app.view,open:false});});
  return ()=>{active=false;};
 },[app.view]);
 useEffect(()=>{
  if(!mobileMenuOpen)return;
  const dismiss=(event:PointerEvent)=>{const target=event.target;if(target instanceof Element&&!target.closest('.mobile-extra-nav,.mobile-menu-trigger'))setMobileMenuOpen(false);};
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape')setMobileMenuOpen(false);};
  document.addEventListener('pointerdown',dismiss);document.addEventListener('keydown',escape);
  return ()=>{document.removeEventListener('pointerdown',dismiss);document.removeEventListener('keydown',escape);};
 },[mobileMenuOpen]);
 useEffect(()=>{
   const viewport=window.visualViewport;
   if(!viewport)return;
   const update=()=>document.body.classList.toggle('keyboard-open',viewport.height<window.innerHeight-170);
   viewport.addEventListener('resize',update);update();
   return ()=>{viewport.removeEventListener('resize',update);document.body.classList.remove('keyboard-open');};
 },[]);
 if(!app.hydrated)return <main className="loading-shell"><div className="loading-logo">R<span>&</span>L</div><p>Loading your training…</p></main>;
 return <div className="app-layout"><aside className="desktop-sidebar"><div className="brand"><span className="brand-logo"><Dumbbell size={25}/></span><div><strong>Rep <span>&</span> Lap</strong><small>TRAINING, IN MOTION</small></div></div>
 <nav className="desktop-nav" aria-label="Main navigation">{[...NAV,DESKTOP_CALENDAR,DESKTOP_ACHIEVEMENTS].map(item=><button key={item.key} className={app.view===item.key||active===item.key?'active':''} onClick={()=>app.goto(item.key)}><item.icon size={20}/>{item.label}</button>)}</nav>
 <div className="sidebar-footer"><button className={app.view==='settings'?'sidebar-settings active':'sidebar-settings'} onClick={()=>app.goto('settings')}><Settings2 size={19}/> Settings</button><div className="sidebar-account"><span className="sidebar-avatar"><UserRound size={21}/></span><span><strong>{app.user?.name||'Guest athlete'}</strong><small>{app.user?'Google connected':'Saved locally'}</small></span></div></div></aside>
 <div className="content-shell"><header className="topbar"><div className="topbar-name"><span className="live-dot"/><strong>{app.view==='home'?'Dashboard':app.view==='workout'?'Training log':app.view==='progress'?'Progress':app.view==='profile'?'Profile':app.view==='calendar'?'Calendar':app.view==='insights'?'Training insights':app.view==='achievements'?'Achievements':app.view==='conflicts'?'Conflicts':'Settings'}</strong></div><div className="topbar-actions">{totalConflicts?<button className="conflicts-trigger" onClick={()=>{app.goto('conflicts');dismissConflictNotice();}} aria-label={`${totalConflicts} training conflicts require review`}><ShieldAlert size={17}/><span>Conflicts</span><b>{totalConflicts}</b></button>:<span className={`sync-status ${app.syncMode}`} title="Cloud synchronization status">{app.syncMode==='synced'?<Cloud size={15}/>:app.syncMode==='syncing'?<CloudUpload size={15}/>:app.online?<CloudOff size={15}/>:<WifiOff size={15}/>}<span>{app.syncMode==='synced'?'Synced':app.syncMode==='syncing'?'Syncing…':app.syncMode==='checking'?'Checking…':app.syncMode==='needs-attention'?'Needs attention':'Saved locally'}</span></span>}<NotificationBell app={app} onOpen={()=>setMobileMenuOpen(false)}/><button className="icon-btn theme-toggle" onClick={()=>app.setTheme(app.theme==='dark'?'light':'dark')} title="Toggle theme" aria-label="Toggle color theme">{app.theme==='dark'?<Sun size={20}/>:<Moon size={20}/>}</button><button className="icon-btn settings-top" onClick={()=>app.goto('settings')} aria-label="Open settings"><Settings2 size={20}/></button><button className="icon-btn mobile-menu-trigger" onClick={()=>setMobileMenuOpen(open=>!open)} aria-expanded={mobileMenuOpen} aria-controls="mobile-extra-navigation" aria-label="Open navigation menu">{mobileMenuOpen?<X size={21}/>:<Menu size={21}/>}</button></div>{mobileMenuOpen&&<div className="mobile-extra-nav" id="mobile-extra-navigation" role="navigation" aria-label="More destinations"><button onClick={()=>{app.goto('calendar');setMobileMenuOpen(false);}}><CalendarDays size={19}/> Training calendar</button><button onClick={()=>{app.goto('insights');setMobileMenuOpen(false);}}><Activity size={19}/> Training insights</button><button onClick={()=>{app.goto('achievements');setMobileMenuOpen(false);}}><Trophy size={19}/> Achievements</button><button onClick={()=>{app.goto('settings');setMobileMenuOpen(false);}}><Settings2 size={19}/> Settings</button>{totalConflicts>0&&<button onClick={()=>{app.goto('conflicts');setMobileMenuOpen(false);}}><ShieldAlert size={19}/> Review conflicts ({totalConflicts})</button>}</div>}</header>
 <main className="app-main" id="main-content">{app.view==='home'?<Dashboard app={app}/>:app.view==='workout'?<Workout app={app}/>:app.view==='progress'?<Progress app={app}/>:app.view==='profile'?<Profile app={app}/>:app.view==='calendar'?<div className="stack-xl"><button className="calendar-back-home" onClick={()=>app.goto('home')}><ArrowLeft size={16}/> Back to Home</button><div className="page-header"><div><span className="eyebrow">YOUR PLAN</span><h1>Training calendar.</h1><p>Recovery, completed sessions and flexible scheduling, all in one place.</p></div></div><TrainingCalendar app={app}/></div>:app.view==='insights'?<div className="stack-xl"><button className="calendar-back-home" onClick={()=>app.goto('progress')}><ArrowLeft size={16}/> Back to Progress</button><div className="page-header"><div><span className="eyebrow">TRAINING INTELLIGENCE</span><h1>Your insights.</h1><p>Muscle coverage and monthly performance, in one place.</p></div></div><Insights app={app}/></div>:app.view==='achievements'?<div className="stack-xl"><button className="calendar-back-home" onClick={()=>app.goto('progress')}><ArrowLeft size={16}/> Back to Progress</button><div className="page-header"><div><span className="eyebrow">YOUR MILESTONES</span><h1>Achievements.</h1><p>Every milestone backed by your recorded training.</p></div></div><Achievements app={app}/></div>:app.view==='conflicts'?<Conflicts app={app}/>:<Settings app={app}/>}</main>
 <nav className="mobile-bottom-nav" aria-label="Mobile navigation">{NAV.map(item=><button key={item.key} className={active===item.key?'active':''} onClick={()=>{if(item.key==='progress'&&app.progressTab==='insights')app.setProgressTab('overview');app.goto(item.key);}}><item.icon size={22} strokeWidth={active===item.key?2.3:1.8}/><span>{item.label}</span></button>)}</nav>
 </div>
 <ActiveTimerDock app={app}/>
 <RecoveryCheckIn app={app}/>
 <CompletionDateDialog app={app}/>
 {totalConflicts>0&&conflictNotice&&app.view!=='conflicts'&&<div className="conflict-notice" role="alert"><ShieldAlert size={23}/><div><strong>Sync conflict detected</strong><small>{totalConflicts} {totalConflicts===1?'item needs':'items need'} your decision</small></div><button className="button-primary" onClick={()=>{dismissConflictNotice();app.goto('conflicts');}}>Review</button><button className="icon-btn" aria-label="Dismiss conflict notification" onClick={()=>dismissConflictNotice()}><X size={17}/></button></div>}
 {app.celebration&&!app.recoveryPrompt&&<div className="overlay" role="presentation" onClick={()=>app.dismissCelebration()}>
  <div className={`celebration card ${app.celebration.kind==='hydration'?'celebration-water':''}`} role="dialog" aria-modal="true" aria-label={app.celebration.title} onClick={e=>e.stopPropagation()}>
   {app.celebration.kind==='hydration'?<div className="water-celebration-art" aria-hidden="true"><span className="water-ripple ripple-one"/><span className="water-ripple ripple-two"/><span className="water-drop-core"><Droplets size={46}/></span><span className="water-spark spark-a"/><span className="water-spark spark-b"/><span className="water-spark spark-c"/><span className="water-spark spark-d"/></div>:<span className="celebration-trophy"><Trophy size={42}/></span>}
   <div className="eyebrow">{app.celebration.kind==='hydration'?'DAILY WATER GOAL COMPLETE':'A MOMENT TO CELEBRATE'}</div>
   <h2>{app.celebration.title}</h2><p>{app.celebration.body}</p>
   <button className="button-primary" onClick={()=>app.dismissCelebration()}>{app.celebration.kind==='hydration'?'Stay hydrated':'Keep going'} <ArrowRight size={18}/></button>
  </div>
 </div>}
 {app.toast&&<div className="toast" role="status">{app.toast}</div>}
 </div>;
}
