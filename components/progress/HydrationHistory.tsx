'use client';
import {useState} from 'react';
import {Droplets} from 'lucide-react';
import type {TrackerData} from '@/lib/types';
import {hydrationChart} from '@/lib/metrics';
import {formatDate} from '@/lib/dates';
/** Both pointer hover and keyboard focus/touch selection expose the same real daily totals. */
export default function HydrationHistory({data,days=14}:{data:TrackerData;days?:number}){
 const history=hydrationChart(data,days),[picked,setPicked]=useState<string|null>(null);
 const selected=history.find(d=>d.date===picked)||history.at(-1);
 const maximum=Math.max(2500,...history.flatMap(x=>[x.target,x.value]));
 return <div className="phaseb-hydration-history">
  <div className="phaseb-hydration-bars" role="group" aria-label="Select a day to inspect hydration history">
   {history.map(row=><button type="button" key={row.date} className={`phaseb-hydration-day ${selected?.date===row.date?'is-selected':''}`}
    onMouseEnter={()=>setPicked(row.date)} onFocus={()=>setPicked(row.date)} onClick={()=>setPicked(row.date)} aria-pressed={selected?.date===row.date}
    aria-label={`${formatDate(row.date)}: ${row.value} millilitres consumed; target ${row.target} millilitres; ${Math.round(row.value/row.target*100)} percent`}>
    <span className="phaseb-hydration-bar-area"><span className="phaseb-hydration-target" style={{bottom:`${row.target/maximum*100}%`}}/><span className="phaseb-hydration-fill" style={{height:`${Math.max(0,row.value/maximum*100)}%`}}/></span>
    <small>{row.date.slice(-2)}</small>
   </button>)}
  </div>
  {selected&&<div className="phaseb-hydration-detail" role="status"><span><Droplets size={17}/> {formatDate(selected.date)}</span><strong>{(selected.value/1000).toFixed(2)} / {(selected.target/1000).toFixed(2)} L</strong><span>{Math.round(selected.value/selected.target*100)}% of that day’s goal</span></div>}
  <p className="muted tiny">Hover, focus or tap any day for the recorded amount and its historical goal.</p>
 </div>;
}
