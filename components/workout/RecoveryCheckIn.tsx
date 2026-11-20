'use client';
import {Activity,HeartPulse,X} from 'lucide-react';
import type {Trainer} from '@/hooks/useTrainer';
export default function RecoveryCheckIn({app}:{app:Trainer}){
 const prompt=app.recoveryPrompt;if(!prompt)return null;
 const notes=app.data.weeks[prompt.week]?.sessionNotes?.[prompt.day]||{};
 return <div className="overlay" role="presentation" onClick={app.closeRecoveryPrompt}>
  <section className="card recovery-sheet" role="dialog" aria-modal="true" aria-labelledby="recovery-heading" onClick={e=>e.stopPropagation()}>
   <button className="icon-btn recovery-close" aria-label="Skip recovery check-in" onClick={app.closeRecoveryPrompt}><X size={19}/></button>
   <span className="recovery-icon"><HeartPulse size={25}/></span>
   <span className="eyebrow">WORKOUT COMPLETE</span><h2 id="recovery-heading">How did it feel?</h2><p className="muted small">Optional check-in. Your session is already saved, even if you skip this.</p>
   <div className="form-grid"><label className="field"><span>Overall difficulty (RPE)</span><select value={notes.sessionRpe??''} onChange={e=>app.noteField(prompt.day,'sessionRpe',e.target.value)}><option value="">Not rated</option>{[1,2,3,4,5,6,7,8,9,10].map(v=><option key={v} value={v}>{v} / 10</option>)}</select></label>
   <label className="field"><span>Soreness / recovery</span><select value={notes.soreness||''} onChange={e=>app.noteField(prompt.day,'soreness',e.target.value)}><option value="">Not recorded</option>{['None','Mild','Moderate','High'].map(x=><option key={x} value={x}>{x}</option>)}</select></label></div>
   <label className="field"><span>One takeaway (optional)</span><textarea rows={2} value={notes.general||''} placeholder="Energy, technique, or how to improve next session" onChange={e=>app.noteField(prompt.day,'general',e.target.value)}/></label>
   <button className="button-primary full" onClick={app.closeRecoveryPrompt}><Activity size={17}/> Save and finish</button>
   <button className="text-btn recovery-skip" onClick={app.closeRecoveryPrompt}>Not now</button>
  </section>
 </div>;
}
