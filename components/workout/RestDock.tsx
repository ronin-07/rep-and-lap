'use client';
import {Clock3,FastForward,Plus,TimerReset,ArrowRight,X} from 'lucide-react';
import type {Trainer} from '@/hooks/useTrainer';
import {formatRest} from '@/lib/workout-flow';
export default function RestDock({app}:{app:Trainer}){
 const rest=app.restState;if(!rest||app.view!=='workout'||app.trackingTab!=='gym')return null;
 const ready=app.restReady;
 return <section className={`rest-dock ${ready?'rest-dock-ready':''}`} role="status" aria-live={ready?'polite':'off'} aria-label={ready?'Rest complete':'Rest timer'}>
  <div className="rest-dock-main"><div className="rest-dock-symbol"><Clock3 size={20}/></div><div className="rest-dock-info"><strong>{ready?'Rest complete':formatRest(app.restRemaining)}</strong><small>{ready?(rest.target?`Ready for ${rest.target.exercise} · Set ${rest.target.index+1}`:'Ready to train'):(rest.target?`Next · ${rest.target.exercise} · Set ${rest.target.index+1}`:'Resting')}</small></div></div>
  {!ready&&<div className="rest-dock-actions"><button className="rest-action" aria-label="Add 30 seconds of rest" onClick={app.extendRest}><Plus size={15}/> 30s</button><button className="rest-action" onClick={rest.target?app.goToNextSet:app.stopRest}><FastForward size={15}/> Skip</button></div>}
  {ready&&<div className="rest-dock-actions">{rest.target?<button className="rest-next" onClick={app.goToNextSet}>Log next set <ArrowRight size={16}/></button>:<button className="rest-next" onClick={app.stopRest}>Done <TimerReset size={16}/></button>}</div>}
  <button className="rest-dismiss" aria-label="Dismiss timer" onClick={app.stopRest}><X size={17}/></button>
  {!ready&&<div className="rest-track"><span style={{width:`${Math.max(0,Math.min(100,app.restRemaining/rest.durationSeconds*100))}%`}}/></div>}
 </section>;
}
