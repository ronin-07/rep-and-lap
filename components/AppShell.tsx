'use client';
import {useEffect} from 'react';
import {Activity,ArrowRight,Check,Cloud,CloudOff,CloudUpload,Download,Dumbbell,House,Menu,Moon,Settings2,Sun,Trophy,UserRound,WifiOff,X} from 'lucide-react';
import {useTrainer} from '@/hooks/useTrainer';
import Dashboard from './dashboard/Dashboard';
import Workout from './workout/Workout';
import Progress from './progress/Progress';
import Profile from './Profile';
import Settings from './Settings';
const NAV=[{key:'home',label:'Home',icon:House},{key:'workout',label:'Workout',icon:Dumbbell},{key:'progress',label:'Progress',icon:Activity},{key:'profile',label:'Profile',icon:UserRound}] as const;
export default function AppShell(){
 const app=useTrainer();
 const active=app.view==='settings'?'profile':app.view;
 useEffect(()=>{
   const viewport=window.visualViewport;
   if(!viewport)return;
   const update=()=>document.body.classList.toggle('keyboard-open',viewport.height<window.innerHeight-170);
   viewport.addEventListener('resize',update);update();
   return ()=>{viewport.removeEventListener('resize',update);document.body.classList.remove('keyboard-open');};
 },[]);
 if(!app.hydrated)return <main className="loading-shell"><div className="loading-logo">R<span>&</span>L</div><p>Loading your training…</p></main>;
 return <div className="app-layout"><aside className="desktop-sidebar"><div className="brand"><span className="brand-logo"><Dumbbell size={25}/></span><div><strong>Rep <span>&</span> Lap</strong><small>TRAINING, IN MOTION</small></div></div>
 <nav className="desktop-nav" aria-label="Main navigation">{NAV.map(item=><button key={item.key} className={active===item.key?'active':''} onClick={()=>app.goto(item.key)}><item.icon size={20}/>{item.label}</button>)}</nav>
 <div className="sidebar-footer"><button className={app.view==='settings'?'sidebar-settings active':'sidebar-settings'} onClick={()=>app.goto('settings')}><Settings2 size={19}/> Settings</button><div className="sidebar-account"><span className="sidebar-avatar"><UserRound size={21}/></span><span><strong>{app.user?.name||'Guest athlete'}</strong><small>{app.user?'Google connected':'Saved locally'}</small></span></div></div></aside>
 <div className="content-shell"><header className="topbar"><div className="topbar-name"><span className="live-dot"/><strong>{app.view==='home'?'Dashboard':app.view==='workout'?'Workout log':app.view==='progress'?'Progress':app.view==='profile'?'Profile':'Settings'}</strong></div><div className="topbar-actions"><span className={`sync-status ${app.syncMode}`} title="Cloud synchronization status">{app.syncMode==='synced'?<Cloud size={15}/>:app.syncMode==='syncing'?<CloudUpload size={15}/>:app.online?<CloudOff size={15}/>:<WifiOff size={15}/>}<span>{app.syncMode==='synced'?'Synced':app.syncMode==='syncing'?'Syncing…':app.syncMode==='checking'?'Checking…':app.syncMode==='needs-attention'?'Needs attention':'Saved locally'}</span></span><button className="icon-btn theme-toggle" onClick={()=>app.setTheme(app.theme==='dark'?'light':'dark')} title="Toggle theme" aria-label="Toggle color theme">{app.theme==='dark'?<Sun size={20}/>:<Moon size={20}/>}</button><button className="icon-btn settings-top" onClick={()=>app.goto('settings')} aria-label="Open settings"><Settings2 size={20}/></button></div></header>
 <main className="app-main" id="main-content">{app.view==='home'?<Dashboard app={app}/>:app.view==='workout'?<Workout app={app}/>:app.view==='progress'?<Progress app={app}/>:app.view==='profile'?<Profile app={app}/>:<Settings app={app}/>}</main>
 <nav className="mobile-bottom-nav" aria-label="Mobile navigation">{NAV.map(item=><button key={item.key} className={active===item.key?'active':''} onClick={()=>app.goto(item.key)}><item.icon size={22} strokeWidth={active===item.key?2.3:1.8}/><span>{item.label}</span></button>)}</nav>
 </div>
 {app.celebration&&<div className="overlay" role="dialog" aria-modal="true" aria-label={app.celebration.title} onClick={()=>app.setCelebration(null)}><div className="celebration card" onClick={e=>e.stopPropagation()}><span className="celebration-trophy"><Trophy size={42}/></span><div className="eyebrow">A MOMENT TO CELEBRATE</div><h2>{app.celebration.title}</h2><p>{app.celebration.body}</p><button className="button-primary" onClick={()=>app.setCelebration(null)}>Keep going <ArrowRight size={18}/></button></div></div>}
 {app.toast&&<div className="toast" role="status">{app.toast}</div>}
 </div>;
}
