import type {ReactNode,CSSProperties} from 'react';
interface Ring {label:string;value:string;progress:number;color:string}
export function Rings({gym,swim,water}:{gym:Ring;swim:Ring;water:Ring}){
 const rings=[{...gym,r:74},{...swim,r:55},{...water,r:36}];
 return <div className="rings-card card"><div className="section-title"><div><span className="eyebrow">YOUR ACTIVITY</span><h2>Make every session count.</h2></div><span className="muted tiny">This week + today</span></div>
 <div className="ring-layout"><div className="ring-visual"><svg viewBox="0 0 188 188" role="img" aria-label={`${gym.label} ${gym.value}, ${swim.label} ${swim.value}, ${water.label} ${water.value}`}>
 {rings.map(({r,progress,color,label})=><g key={label} transform="rotate(-90 94 94)"><circle cx="94" cy="94" r={r} fill="none" stroke={color} strokeOpacity=".16" strokeWidth="13"/><circle className="progress-stroke" style={{'--ring-start':String(2*Math.PI*r),'--ring-end':String(2*Math.PI*r*(1-Math.min(1,Math.max(0,progress))))} as CSSProperties} cx="94" cy="94" r={r} fill="none" stroke={color} strokeWidth="13" strokeLinecap="round" strokeDasharray={2*Math.PI*r} strokeDashoffset={2*Math.PI*r*(1-Math.min(1,Math.max(0,progress)))}/></g>)}
 <text x="94" y="91" textAnchor="middle" className="ring-center">{Number(gym.value.split('/')[0])+Number(swim.value.split('/')[0])}/6</text><text x="94" y="110" textAnchor="middle" className="ring-small">workouts</text>
 </svg></div>
 <div className="ring-legend">{rings.map(r=><div className="ring-legend-row" key={r.label}><div className="legend-label"><i style={{background:r.color}}/> {r.label}</div><strong>{r.value}</strong></div>)}</div></div></div>;
}
export function PercentRing({percentage,children,color='#9b8aff'}:{percentage:number;children:ReactNode;color?:string}){
 const radius=28,c=2*Math.PI*radius;
 return <span className="small-ring"><svg viewBox="0 0 68 68" aria-hidden="true"><circle cx="34" cy="34" r={radius} fill="none" stroke="currentColor" strokeOpacity=".13" strokeWidth="8"/><circle cx="34" cy="34" r={radius} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c*(1-Math.min(1,percentage/100))} transform="rotate(-90 34 34)"/></svg><span>{children}</span></span>
}
