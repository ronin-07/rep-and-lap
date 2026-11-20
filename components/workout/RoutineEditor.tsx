'use client';
import {useState} from 'react';
import {ArrowDown,ArrowUp,Plus,Repeat2,Save,RotateCcw,Trash2} from 'lucide-react';
import type {Trainer} from '@/hooks/useTrainer';
import type {GymDay,RoutineExercise} from '@/lib/types';
import {exercisesFor,EXERCISE_LIBRARY} from '@/lib/routines';

export default function RoutineEditor({app,day}:{app:Trainer;day:GymDay}){
 const [open,setOpen]=useState(false);
 const [choice,setChoice]=useState(EXERCISE_LIBRARY[0].name);
 const [customName,setCustomName]=useState('');
 const [replaceIndex,setReplaceIndex]=useState<number|null>(null);
 const current=exercisesFor(app.data,app.week,day);
 const preset=(name:string):RoutineExercise|undefined=>name==='__custom__'?{name:customName.trim(),sets:3,reps:'8–12',muscles:'Custom exercise'}:EXERCISE_LIBRARY.find(x=>x.name===name);
 const addOrReplace=()=>{
  const exercise=preset(choice);if(!exercise){app.notify('Select an exercise.');return;}
  if(!exercise.name){app.notify('Enter an exercise name first.');return;}
  app.changeRoutine(day,replaceIndex===null?'add':'replace',replaceIndex??current.length,exercise);
  if(replaceIndex===null){const next=EXERCISE_LIBRARY.find(x=>!current.some(y=>y.name===x.name)&&x.name!==choice);setChoice(next?.name||'__custom__');}
  setReplaceIndex(null);setCustomName('');
 };
 return <section className="card pane-pad routine-editor">
  <div className="routine-heading"><div><span className="eyebrow">FLEXIBLE ROUTINE</span><h3>Make the workout yours.</h3><p className="muted small">Change only this session, or save it as the default for future weeks. Your logged sets stay in history.</p></div><button className="button-secondary" onClick={()=>setOpen(x=>!x)} aria-expanded={open}>{open?'Close editor':'Edit routine'} <Repeat2 size={16}/></button></div>
  {open&&<div className="routine-body">
   <div className="routine-items">{current.map((ex,i)=><div className="routine-item" key={ex.name}><div className="routine-name"><strong>{ex.name}</strong><small>{ex.sets} sets · {ex.reps} reps</small></div><div className="routine-controls"><button className="icon-btn" disabled={i===0} onClick={()=>app.changeRoutine(day,'move',i,i-1)} aria-label={`Move ${ex.name} up`}><ArrowUp size={16}/></button><button className="icon-btn" disabled={i===current.length-1} onClick={()=>app.changeRoutine(day,'move',i,i+1)} aria-label={`Move ${ex.name} down`}><ArrowDown size={16}/></button><button className="button-secondary" onClick={()=>{setReplaceIndex(i);setOpen(true);}}>Swap</button><button className="icon-btn danger" disabled={current.length<=1} onClick={()=>app.changeRoutine(day,'remove',i)} aria-label={`Remove ${ex.name}`}><Trash2 size={16}/></button></div></div>)}</div>
   <div className="routine-add"><div className="routine-add-title"><Plus size={17}/><strong>{replaceIndex===null?'Add exercise':`Replace ${current[replaceIndex]?.name}`}</strong></div><div className="routine-add-fields"><label className="field"><span>Exercise</span><select value={choice} onChange={e=>setChoice(e.target.value)}><option value="__custom__">Custom exercise…</option>{EXERCISE_LIBRARY.filter(x=>!current.some(y=>y.name===x.name)||replaceIndex!==null&&current[replaceIndex]?.name===x.name).map(x=><option key={x.name} value={x.name}>{x.name}</option>)}</select></label>{choice==='__custom__'&&<label className="field"><span>Name</span><input value={customName} maxLength={160} placeholder="e.g. Bulgarian split squat" onChange={e=>setCustomName(e.target.value)}/></label>}<button className="button-primary" onClick={addOrReplace}>{replaceIndex===null?'Add exercise':'Use substitution'}</button>{replaceIndex!==null&&<button className="button-secondary" onClick={()=>setReplaceIndex(null)}>Cancel swap</button>}</div></div>
   <div className="routine-footer"><button className="button-secondary" onClick={()=>app.saveRoutineDefault(day)}><Save size={15}/> Save as default</button><button className="button-secondary" onClick={()=>app.resetSessionRoutine(day)}><RotateCcw size={15}/> Reset this session</button><button className="text-btn" onClick={()=>app.resetDefaultRoutine(day)}>Reset saved default</button></div>
  </div>}
 </section>;
}
