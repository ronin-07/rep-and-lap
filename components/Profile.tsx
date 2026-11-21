'use client';
import Image from 'next/image';
import {ArrowRight,CalendarDays,Cloud,Flame,Medal,Settings2,UserRound} from 'lucide-react';
import type {Trainer} from '@/hooks/useTrainer';
import {summary,activeStreak,milestones} from '@/lib/metrics';
import {weekOf} from '@/lib/dates';
export default function Profile({app}:{app:Trainer}){
 const stats=summary(app.data,weekOf(new Date())),streak=activeStreak(app.data),m=milestones(app.data);
 return <div className="stack-xl"><div className="page-header"><div><span className="eyebrow">YOUR ACCOUNT</span><h1>Your space.</h1><p>Your routine, achievements and connected account.</p></div></div>
 <section className="card profile-card"><div className="profile-avatar">{app.user?.photoURL?<Image src={app.user.photoURL} alt="Profile" width={80} height={80} unoptimized referrerPolicy="no-referrer"/>:<UserRound size={34}/>}</div><div className="profile-details"><h2>{app.user?.name||'Guest athlete'}</h2><p>{app.user?.email||'Your workouts are saved on this device until you sign in.'}</p><span className="sync-pill"><Cloud size={14}/>{app.user?'Google account connected':'Local-only mode'}</span></div><button className="button-secondary" onClick={()=>app.goto('settings')}><Settings2 size={18}/> Settings <ArrowRight size={16}/></button></section>
 <div className="stats-grid"><div className="card mini-stat"><div className="mini-stat-head muted"><CalendarDays/> This week</div><strong>{stats.completed}/6</strong><small className="muted">Sessions completed</small></div><div className="card mini-stat"><div className="mini-stat-head muted"><Flame/> Streak</div><strong>{streak.current}</strong><small className="muted">Training days</small></div><div className="card mini-stat"><div className="mini-stat-head muted"><Medal/> Milestones</div><strong>{m.length}</strong><small className="muted">Recent achievements</small></div></div>
 <section className="card pane-pad"><span className="eyebrow">WEEKLY RHYTHM</span><h2>Three gym days. Three swim days.</h2><p className="muted">Monday–Wednesday: strength. Thursday–Saturday: swimming. Sunday: recovery.</p></section>
 <button className="settings-link card" onClick={()=>app.goto('settings')}><span><Settings2 size={21}/><span><strong>Settings & preferences</strong><small>Appearance, sync, reminders and backups</small></span></span><ArrowRight/></button>
 </div>;
}
