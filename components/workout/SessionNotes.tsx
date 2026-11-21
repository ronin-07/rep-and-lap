'use client';
import {MessageSquareText} from 'lucide-react';
import type {Trainer} from '@/hooks/useTrainer';
import type {Day} from '@/lib/types';
export default function SessionNotes({app,day}:{app:Trainer;day:Day}){
 const existing=app.data.weeks[app.week]?.sessionNotes?.[day]||{};
 return <section className="card pane-pad stack"><div className="section-title"><div><span className="eyebrow">HOW DID IT FEEL?</span><h2>Session notes</h2></div><MessageSquareText color="var(--muted)" size={21}/></div>
 <div className="form-grid"><label className="field"><span>Energy</span><select value={existing.fatigue||''} onChange={e=>app.noteField(day,'fatigue',e.target.value)}><option value="">Select energy level</option>{['Fresh','Good','Okay','Tired','Very tired'].map(x=><option key={x}>{x}</option>)}</select></label>
 <label className="field"><span>Discomfort or pain</span><input value={existing.discomfort||''} onChange={e=>app.noteField(day,'discomfort',e.target.value)} placeholder="Optional: any discomfort?"/></label></div>
 <div className="form-grid"><label className="field"><span>Soreness / recovery</span><select value={existing.soreness||''} onChange={e=>app.noteField(day,'soreness',e.target.value)}><option value="">Not recorded</option>{['None','Mild','Moderate','High'].map(x=><option key={x}>{x}</option>)}</select></label><label className="field"><span>Overall difficulty (RPE)</span><select value={existing.sessionRpe??''} onChange={e=>app.noteField(day,'sessionRpe',e.target.value)}><option value="">Not rated</option>{[1,2,3,4,5,6,7,8,9,10].map(x=><option key={x} value={x}>{x} / 10</option>)}</select></label></div>
 <label className="field"><span>Technique notes</span><textarea rows={2} value={existing.technique||''} onChange={e=>app.noteField(day,'technique',e.target.value)} placeholder="Cues to remember next time"/></label>
 <label className="field"><span>Anything else?</span><textarea rows={2} value={existing.general||''} onChange={e=>app.noteField(day,'general',e.target.value)} placeholder="Mood, recovery, small wins…"/></label>
 <div className="hint">Autosaved on this device and synced when connected.</div></section>
}
