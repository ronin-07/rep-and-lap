'use client';
import {useEffect,useState} from 'react';
import {CalendarCheck,CheckCircle2,X} from 'lucide-react';
import type {Trainer} from '@/hooks/useTrainer';
import {PLAN} from '@/lib/plan';
import {keyOf,formatDate} from '@/lib/dates';
import {completedDate,scheduledDate,originalPlannedDate,statusFor} from '@/lib/scheduling';
import DateInput from '@/components/DateInput';
export default function CompletionDateDialog({app}:{app:Trainer}) {
 const request=app.completionRequest;
 if(!request)return null;
 return <CompletionDateModal key={`${request.week}:${request.day}:${request.mode}`} app={app} request={request}/>;
}
function CompletionDateModal({app,request}:{app:Trainer;request:NonNullable<Trainer['completionRequest']>}) {
 const today=keyOf(new Date());
 const scheduled=scheduledDate(app.data,request.week,request.day);
 const existing=completedDate(app.data,request.week,request.day);
 const [choice,setChoice]=useState<'scheduled'|'today'|'other'>(request.mode==='edit'?'other':scheduled<=today?'scheduled':'today');
 const [otherDate,setOtherDate]=useState(request.mode==='edit'?existing:scheduled<=today?scheduled:today);
 useEffect(()=>{const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape')app.cancelCompletion();};window.addEventListener('keydown',onKey);return ()=>window.removeEventListener('keydown',onKey);},[app.cancelCompletion]);
 const actual=choice==='scheduled'?scheduled:choice==='today'?today:otherDate;
 const valid=/^\d{4}-\d{2}-\d{2}$/.test(actual)&&actual<=today;
 const isEditing=request.mode==='edit';
 return <div className="overlay completion-overlay" role="presentation" onClick={()=>app.cancelCompletion()}>
  <section className="card completion-date-modal" role="dialog" aria-modal="true" aria-labelledby="completion-modal-title" onClick={e=>e.stopPropagation()}>
   <div className="completion-modal-head"><span className="completion-modal-icon"><CalendarCheck size={23}/></span><button type="button" className="icon-btn" onClick={()=>app.cancelCompletion()} aria-label="Close completion date dialog"><X size={19}/></button></div>
   <span className="eyebrow">{isEditing?'CORRECT YOUR TRAINING HISTORY':'BACKFILL WORKOUT'}</span>
   <h2 id="completion-modal-title">{isEditing?'Edit completion date':'When did you train?'}</h2>
   <p className="muted small">{PLAN[request.day].name} · {request.day}</p>
   <p className="muted small">Choose the day you actually performed the session. The original schedule stays unchanged.</p>
   {statusFor(app.data,request.week,request.day)!=='scheduled'&&!isEditing&&<p className="completion-note">This workout was marked as rest or skipped. Completing it will replace that status.</p>}
   <div className="completion-options" role="radiogroup" aria-label="Actual completion date">
    <label className="completion-choice"><input type="radio" name="completed-date" checked={choice==='scheduled'} disabled={scheduled>today} onChange={()=>setChoice('scheduled')}/><span><strong>Scheduled date</strong><small>{formatDate(scheduled)}</small></span></label>
    <label className="completion-choice"><input type="radio" name="completed-date" checked={choice==='today'} onChange={()=>setChoice('today')}/><span><strong>Today</strong><small>{formatDate(today)}</small></span></label>
    <label className="completion-choice"><input type="radio" name="completed-date" checked={choice==='other'} onChange={()=>setChoice('other')}/><span><strong>Another date</strong><small>Backfill a different training day</small></span></label>
   </div>
   {choice==='other'&&<label className="field completion-custom-date"><span>Actual training date</span><DateInput value={otherDate} max={today} onChange={e=>setOtherDate(e.target.value)} ariaLabel="Actual training date"/></label>}
   {originalPlannedDate(request.week,request.day)!==scheduled&&<p className="muted tiny">Originally planned: {formatDate(originalPlannedDate(request.week,request.day))}</p>}
   <div className="completion-preview"><CheckCircle2 size={17}/><span>This workout will count toward <strong>{valid?formatDate(actual):'your chosen date'}</strong> for activity rings and insights.</span></div>
   <div className="completion-actions"><button type="button" className="button-secondary" onClick={()=>app.cancelCompletion()}>Cancel</button><button type="button" className="button-primary" disabled={!valid} onClick={()=>app.confirmCompletion(actual)}>{isEditing?'Save actual date':'Mark completed'}</button></div>
  </section>
 </div>;
}
