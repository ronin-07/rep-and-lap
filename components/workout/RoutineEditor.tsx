'use client';
import {useRef,useState,type PointerEvent} from 'react';
import {ArrowDown,ArrowUp,GripVertical,Plus,Repeat2,Save,RotateCcw,Search,Trash2} from 'lucide-react';
import type {Trainer} from '@/hooks/useTrainer';
import type {GymDay,RoutineExercise} from '@/lib/types';
import {exercisesFor,FULL_EXERCISE_LIBRARY,exerciseCategory} from '@/lib/routines';
const GROUPS=['All','Chest','Back','Shoulders','Arms','Legs','Core'];
export default function RoutineEditor({app,day}:{app:Trainer;day:GymDay}){
 const [open,setOpen]=useState(false),[query,setQuery]=useState(''),[group,setGroup]=useState('All');
 const [choice,setChoice]=useState(''),[customName,setCustomName]=useState(''),[replaceIndex,setReplaceIndex]=useState<number|null>(null);
 const [dragged,setDragged]=useState<number|null>(null),[over,setOver]=useState<number|null>(null);
 const dragRef=useRef<{source:number;pointer:number}|null>(null);
 const current=exercisesFor(app.data,app.week,day);
 const catalog=FULL_EXERCISE_LIBRARY.filter(ex=>{
  const allowed= !current.some(x=>x.name.toLowerCase()===ex.name.toLowerCase())||replaceIndex!==null&&current[replaceIndex]?.name===ex.name;
  return allowed&&(group==='All'||exerciseCategory(ex)===group)&&`${ex.name} ${ex.muscles} ${ex.equipment||''}`.toLowerCase().includes(query.toLowerCase());
 });
 const preset=(name:string):RoutineExercise|undefined=>name==='__custom__'?{name:customName.trim(),sets:3,reps:'8–12',muscles:'Custom exercise'}:FULL_EXERCISE_LIBRARY.find(x=>x.name===name);
 const addOrReplace=()=>{const exercise=preset(choice);if(!exercise?.name){app.notify('Choose an exercise or enter a custom name.');return;}
  app.changeRoutine(day,replaceIndex===null?'add':'replace',replaceIndex??current.length,exercise);setChoice('');setCustomName('');setReplaceIndex(null);};
 const finishDrag=(event:PointerEvent<HTMLButtonElement>)=>{
  const source=dragRef.current?.source;
  if(source===undefined)return;
  const el=document.elementFromPoint(event.clientX,event.clientY)?.closest('[data-routine-index]');
  const target=el?.getAttribute('data-routine-index');
  dragRef.current=null;setDragged(null);setOver(null);
  if(target!==null&&target!==undefined&&Number(target)!==source)app.changeRoutine(day,'move',source,Number(target));
 };
 return <section className="card pane-pad routine-editor">
  <div className="routine-heading"><div><span className="eyebrow">FLEXIBLE ROUTINE</span><h3>Make the workout yours.</h3><p className="muted small">Drag the handle to reorder, or use arrows with the keyboard. Changes to this session preserve your logged sets.</p></div><button className="button-secondary" onClick={()=>setOpen(x=>!x)} aria-expanded={open}>{open?'Close editor':'Edit routine'} <Repeat2 size={16}/></button></div>
  {open&&<div className="routine-body">
   <div className="routine-items">{current.map((ex,i)=><div data-routine-index={i} className={`routine-item ${dragged===i?'dragging':''} ${over===i&&dragged!==i?'drop-target':''}`} key={`${ex.name}-${i}`}>
    <button type="button" className="routine-drag" aria-label={`Drag ${ex.name} to reorder`} title="Drag to reorder exercises" onPointerDown={e=>{if(e.button!==0)return;dragRef.current={source:i,pointer:e.pointerId};setDragged(i);e.currentTarget.setPointerCapture(e.pointerId);}} onPointerMove={e=>{if(dragRef.current?.pointer!==e.pointerId)return;const el=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-routine-index]');const next=el?.getAttribute('data-routine-index');setOver(next==null?null:Number(next));}} onPointerUp={finishDrag} onPointerCancel={()=>{dragRef.current=null;setDragged(null);setOver(null);}}><GripVertical size={22}/></button>
    <div className="routine-name"><strong>{ex.name}</strong><small>{ex.sets} sets · {ex.reps} reps</small></div><div className="routine-controls"><button className="icon-btn" disabled={i===0} onClick={()=>app.changeRoutine(day,'move',i,i-1)} aria-label={`Move ${ex.name} up`}><ArrowUp size={16}/></button><button className="icon-btn" disabled={i===current.length-1} onClick={()=>app.changeRoutine(day,'move',i,i+1)} aria-label={`Move ${ex.name} down`}><ArrowDown size={16}/></button><button className="button-secondary" onClick={()=>{setReplaceIndex(i);setChoice('');}}>Swap</button><button className="icon-btn danger" disabled={current.length<=1} onClick={()=>app.changeRoutine(day,'remove',i)} aria-label={`Remove ${ex.name} from routine`}><Trash2 size={16}/></button></div></div>)}</div>
   <div className="routine-add"><div className="routine-add-title"><Plus size={17}/><strong>{replaceIndex===null?'Add exercise':`Replace ${current[replaceIndex]?.name}`}</strong></div><label className="field routine-search"><span>Find an exercise</span><div className="routine-search-input"><Search size={18}/><input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search exercise, equipment or muscle" aria-label="Search exercise library"/></div></label>
   <div className="routine-filters" aria-label="Filter exercises by muscle group">{GROUPS.map(g=><button type="button" key={g} aria-pressed={group===g} className={group===g?'selected':''} onClick={()=>setGroup(g)}>{g}</button>)}</div>
   <div className="exercise-catalog" role="listbox" aria-label="Exercises">{catalog.slice(0,50).map(ex=><button key={ex.name} type="button" role="option" aria-selected={choice===ex.name} className={choice===ex.name?'selected':''} onClick={()=>{setChoice(ex.name);setCustomName('');}}><span><strong>{ex.name}</strong><small>{exerciseCategory(ex)} · {ex.equipment||ex.muscles}</small></span>{choice===ex.name?<span className="catalog-chosen">Selected</span>:<Plus size={16}/>}</button>)}{catalog.length===0&&<p className="muted small">No matching exercises. You can add your own below.</p>}{catalog.length>50&&<p className="muted tiny">Showing 50 results. Refine your search to see more.</p>}</div>
   <button className={`text-btn catalog-custom ${choice==='__custom__'?'selected':''}`} onClick={()=>setChoice('__custom__')}>+ Add a custom exercise</button>{choice==='__custom__'&&<label className="field"><span>Custom exercise name</span><input maxLength={160} value={customName} onChange={e=>setCustomName(e.target.value)} placeholder="e.g. Bulgarian split squat"/></label>}
   <div className="routine-add-actions"><button className="button-primary" onClick={addOrReplace} disabled={!choice||choice==='__custom__'&&!customName.trim()}>{replaceIndex===null?'Add selected exercise':'Use substitution'}</button>{replaceIndex!==null&&<button className="button-secondary" onClick={()=>{setReplaceIndex(null);setChoice('');}}>Cancel swap</button>}</div></div>
   <div className="routine-footer"><button className="button-secondary" onClick={()=>app.saveRoutineDefault(day)}><Save size={15}/> Save as default</button><button className="button-secondary" onClick={()=>app.resetSessionRoutine(day)}><RotateCcw size={15}/> Reset this session</button><button className="text-btn" onClick={()=>app.resetDefaultRoutine(day)}>Reset saved default</button></div>
  </div>}
 </section>;
}
