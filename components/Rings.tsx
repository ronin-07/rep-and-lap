'use client';
import {useId,type ReactNode,CSSProperties} from 'react';
import {Activity,Droplets,Dumbbell,Waves} from 'lucide-react';
interface Ring {label:string;value:string;progress:number;color:string}
export function Rings({gym,swim,water}:{gym:Ring;swim:Ring;water:Ring}){
 const uid=useId().replace(/:/g,'');
 const rings=[{...gym,r:100,id:'gym',Icon:Dumbbell,colors:['#b8a7ff','#7457eb']},
  {...swim,r:76,id:'swim',Icon:Waves,colors:['#79efe0','#26b8bb']},
  {...water,r:52,id:'water',Icon:Droplets,colors:['#ffd3a6','#fb817c']}];
 const total=Math.min(6,Math.max(0,Number(gym.value.split('/')[0])+Number(swim.value.split('/')[0])));
 return <section className="rings-card card"><div className="section-title activity-head"><div><span className="eyebrow">YOUR ACTIVITY</span><h2>Small efforts. Big momentum.</h2><p className="muted small">A picture of your training week and today&apos;s hydration.</p></div><span className="activity-period">THIS WEEK <span>+</span> TODAY</span></div>
  <div className="activity-body">
   <div className="ring-stage"><div className="ring-halo" aria-hidden="true"/><div className="ring-visual"><svg viewBox="0 0 252 252" role="img" aria-label={`${total} of 6 sessions. ${gym.label}: ${gym.value}. ${swim.label}: ${swim.value}. ${water.label}: ${water.value}.`}>
    <defs>{rings.map(r=><linearGradient key={r.id} id={`${uid}-${r.id}`} x1="0" x2="1" y1="0" y2="1"><stop offset="0" stopColor={r.colors[0]}/><stop offset="1" stopColor={r.colors[1]}/></linearGradient>)}</defs>
    {rings.map(({r,progress,id})=>{const c=2*Math.PI*r,completed=Math.min(1,Math.max(0,Number(progress)||0));return <g key={id} transform="rotate(-90 126 126)"><circle cx="126" cy="126" r={r} fill="none" stroke={`url(#${uid}-${id})`} strokeOpacity=".12" strokeWidth="16"/><circle className="progress-stroke" style={{'--ring-start':String(c),'--ring-end':String(c*(1-completed))} as CSSProperties} cx="126" cy="126" r={r} fill="none" stroke={`url(#${uid}-${id})`} strokeWidth="16" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c*(1-completed)}/></g>})}
   </svg><div className="ring-core"><strong>{total}<span>/6</span></strong><small>sessions</small></div></div></div>
   <div className="activity-detail"><div className="activity-note"><Activity size={17}/> <span>{total===6?'All sessions complete — amazing week!':total===0?'Your week starts with one session.':'Keep your momentum going.'}</span></div>
    <div className="ring-legend">{rings.map(r=>{const Icon=r.Icon;return <div className="ring-legend-row" key={r.id}><span className="legend-icon" style={{'--accent':r.color} as CSSProperties}><Icon size={17}/></span><div className="legend-data"><div className="legend-top"><span>{r.label}</span><strong>{r.value}</strong></div><div className="legend-track"><span style={{width:`${Math.min(100,Math.max(0,r.progress*100))}%`,background:`linear-gradient(90deg,${r.colors[0]},${r.colors[1]})`}}/></div></div></div>})}</div>
   </div>
  </div></section>;
}
export function PercentRing({percentage,children,color='#9b8aff'}:{percentage:number;children:ReactNode;color?:string}){
 const radius=28,c=2*Math.PI*radius;
 return <span className="small-ring"><svg viewBox="0 0 68 68" aria-hidden="true"><circle cx="34" cy="34" r={radius} fill="none" stroke="currentColor" strokeOpacity=".13" strokeWidth="8"/><circle cx="34" cy="34" r={radius} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c*(1-Math.min(1,percentage/100))} transform="rotate(-90 34 34)"/></svg><span>{children}</span></span>
}
