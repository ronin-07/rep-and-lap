'use client';
import {useEffect,useState} from 'react';
import {Activity,HeartPulse,X} from 'lucide-react';
import type {Trainer} from '@/hooks/useTrainer';
import type {SessionNotes} from '@/lib/types';
export default function RecoveryCheckIn({app}:{app:Trainer}){
 const prompt=app.recoveryPrompt;
 if(!prompt)return null;
 return <RecoveryCheckInSheet key={`${prompt.week}:${prompt.day}`} app={app} prompt={prompt}/>;
}
function RecoveryCheckInSheet({app,prompt}:{app:Trainer;prompt:NonNullable<Trainer['recoveryPrompt']>}){
 const [draft,setDraft]=useState<SessionNotes>(()=>{
  const saved=app.data.weeks[prompt.week]?.sessionNotes?.[prompt.day];
  return {sessionRpe:saved?.sessionRpe,soreness:saved?.soreness||'',general:saved?.general||''};
 });
 const closeRecoveryPrompt=app.closeRecoveryPrompt;
 useEffect(()=>{
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape')closeRecoveryPrompt();};
  document.addEventListener('keydown',escape);
  return ()=>document.removeEventListener('keydown',escape);
 },[closeRecoveryPrompt]);
 return <div className="overlay" role="presentation" onClick={app.closeRecoveryPrompt}>
  <section className="card recovery-sheet" role="dialog" aria-modal="true" aria-labelledby="recovery-heading" onClick={e=>e.stopPropagation()}>
   <button type="button" className="icon-btn recovery-close" aria-label="Skip optional feedback" onClick={app.closeRecoveryPrompt}><X size={19}/></button>
   <span className="recovery-icon"><HeartPulse size={25}/></span>
   <span className="eyebrow">WORKOUT SAVED</span><h2 id="recovery-heading">How did it feel?</h2><p className="muted small">Your workout is already complete. Feedback is optional; skipping it will discard this draft, not undo your workout.</p>
   <div className="form-grid"><label className="field"><span>Overall difficulty (RPE)</span><select value={draft.sessionRpe??''} onChange={e=>setDraft(d=>({...d,sessionRpe:e.target.value===''?undefined:Number(e.target.value)}))}><option value="">Not rated</option>{[1,2,3,4,5,6,7,8,9,10].map(v=><option key={v} value={v}>{v} / 10</option>)}</select></label>
   <label className="field"><span>Soreness / recovery</span><select value={draft.soreness||''} onChange={e=>setDraft(d=>({...d,soreness:e.target.value}))}><option value="">Not recorded</option>{['None','Mild','Moderate','High'].map(x=><option key={x} value={x}>{x}</option>)}</select></label></div>
   <label className="field"><span>One takeaway (optional)</span><textarea rows={2} maxLength={5000} value={draft.general||''} placeholder="Energy, technique, or how to improve next session" onChange={e=>setDraft(d=>({...d,general:e.target.value}))}/></label>
   <button type="button" className="button-primary full" onClick={()=>app.saveRecoveryFeedback(draft)}><Activity size={17}/> Save feedback</button>
   <button type="button" className="text-btn recovery-skip" onClick={app.closeRecoveryPrompt}>Not now</button>
  </section>
 </div>;
}
