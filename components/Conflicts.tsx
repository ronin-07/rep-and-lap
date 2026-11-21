'use client';
import {ArrowLeft,Cloud,HardDriveDownload,ShieldAlert,CheckCircle2} from 'lucide-react';
import type {Trainer} from '@/hooks/useTrainer';
import {itemDisplayName,type PendingSyncItem} from '@/lib/item-sync';
import {sessionClockState} from '@/lib/session-timing';

function itemSummary(item:PendingSyncItem|{kind:PendingSyncItem['kind'];value:PendingSyncItem['value']}|null):string {
 if(!item)return 'No cloud record';
 if(item.kind==='rest'){const rest=item.value as {endsAt?:number}|null;return rest?`Ends ${prettyDate(rest.endsAt)}`:'Stopped';}
 if(item.kind==='clock'){const clock=item.value as {startedAt?:string;endedAt?:string;pausedAt?:string}|null;return clock?`${sessionClockState(clock)} · ${clock.startedAt?new Date(clock.startedAt).toLocaleTimeString():''}`:'Not started';}
 const seg=item.value as {activity?:string;lengths?:number|string;minutes?:number|string}|null;return seg?`${seg.activity??'Swim'} · ${seg.lengths??0} lengths · ${seg.minutes??0} min`:'Activity removed';
}
function prettyDate(ms:number|undefined):string {
 if(!ms||!Number.isFinite(ms))return 'Unknown time';
 return new Date(ms).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'});
}
export default function Conflicts({app}:{app:Trainer}){
 return <div className="stack-xl"><div className="page-header"><div>
  <button className="back-link" onClick={()=>app.goto('workout')}><ArrowLeft size={17}/> Back to workouts</button>
  <span className="eyebrow">SYNC REVIEW</span><h1>Conflicts</h1>
  <p>When devices edit the same timer, swim activity or gym set, review both versions. Unrelated activities sync independently.</p>
 </div></div>
 {!app.conflicts.length&&!app.itemConflicts.length?<section className="card pane-pad empty-conflicts"><CheckCircle2 size={36} color="var(--green)"/><h2>All caught up</h2><p className="muted">No unresolved training conflicts. Your next workout is ready.</p><button className="button-primary" onClick={()=>app.goto('workout')}>Back to workout</button></section>:<>
  <div className="conflict-intro"><ShieldAlert size={21}/><div><strong>{app.conflicts.length+app.itemConflicts.length} {(app.conflicts.length+app.itemConflicts.length)===1?'item needs':'items need'} a decision</strong><p>Compare both versions before choosing. Your decision will be saved locally and synced when online.</p></div></div>
  {app.itemConflicts.map(({local,remote})=><article className="card pane-pad conflict-card stack" key={local.key}>
   <div className="conflict-card-heading"><div><span className="eyebrow">{local.kind==='clock'?'SESSION TIMER':local.kind==='rest'?'REST TIMER':'SWIMMING ACTIVITY'}</span><h2>{itemDisplayName(local)}</h2></div><span className="conflict-revision">Revision {remote?.revision??0}</span></div>
   <div className="conflict-compare">
    <div className="conflict-value"><div className="conflict-source"><HardDriveDownload size={16}/> This device</div><strong>{itemSummary(local)}</strong><small>{prettyDate(local.updatedMs)}</small></div>
    <div className="conflict-value"><div className="conflict-source"><Cloud size={16}/> Cloud</div><strong>{itemSummary(remote)}</strong><small>{prettyDate(remote?.updatedMs)}</small></div>
   </div>
   <div className="conflict-actions"><button className="button-secondary" onClick={()=>app.resolveTrainingItemConflict(local.key,'cloud')}>Use cloud version</button><button className="button-primary" onClick={()=>app.resolveTrainingItemConflict(local.key,'mine')}>Keep my edit</button></div>
   <p className="hint">Your choice applies to this item only. Keeping your version retries with the latest cloud revision.</p>
  </article>)}
  {app.conflicts.map(({local,remote})=><article className="card pane-pad conflict-card stack" key={local.key}>
   <div className="conflict-card-heading"><div><span className="eyebrow">{local.sessionKey.split(':').slice(1).join(' · ')}</span><h2>{local.exercise} · Set {local.index+1}</h2></div><span className="conflict-revision">Revision {remote?.revision??0}</span></div>
   <div className="conflict-compare">
    <div className="conflict-value"><div className="conflict-source"><HardDriveDownload size={16}/> Your device</div><strong>{local.value.kg??'—'} kg <span>×</span> {local.value.reps??'—'}</strong><small>{local.value.rir!==undefined?`RIR ${local.value.rir} · `:''}{local.value.rpe!==undefined?`RPE ${local.value.rpe} · `:''}{prettyDate(local.updatedMs)}</small></div>
    <div className="conflict-value"><div className="conflict-source"><Cloud size={16}/> Cloud version</div><strong>{remote?.value.kg??'—'} kg <span>×</span> {remote?.value.reps??'—'}</strong><small>{remote?.value.rir!==undefined?`RIR ${remote.value.rir} · `:''}{remote?.value.rpe!==undefined?`RPE ${remote.value.rpe} · `:''}{prettyDate(remote?.updatedMs)}</small></div>
   </div>
   <div className="conflict-actions"><button className="button-secondary" onClick={()=>app.resolveConflict(local.key,'cloud')}>Use cloud version</button><button className="button-primary" onClick={()=>app.resolveConflict(local.key,'mine')}>Keep my edit</button></div>
   <p className="hint">Keep my edit queues a version-checked write. If another device edits the set again, you'll be asked to review it again.</p>
  </article>)}
 </>}
 </div>;
}
