'use client';
interface Point {date:string;value:number;target?:number}
export function LineChart({points,title,unit='',stroke='#a78bfa',compare}:{points:Point[];title?:string;unit?:string;stroke?:string;compare?:Point[]}){
 const max=Math.max(1,...points.map(p=>p.value),...(compare||[]).map(p=>p.value));
 const n=Math.max(points.length-1,1),line=points.map((p,i)=>`${30+(i/n)*590},${190-(p.value/max)*158}`).join(' ');
 const second=compare?.map((p,i)=>`${30+(i/n)*590},${190-(p.value/max)*158}`).join(' ');
 return <div className="chart-wrap">{title&&<div className="chart-heading">{title}</div>}
 <svg viewBox="0 0 650 245" role="img" aria-label={`${title||'Progress'}: ${points.map(p=>`${p.date} ${p.value}${unit}`).join(', ')}`}>
 {[0,.25,.5,.75,1].map(x=><line key={x} x1="30" x2="620" y1={190-x*158} y2={190-x*158} className="chart-grid"/>)}
 {compare&&<polyline fill="none" stroke="var(--muted)" opacity=".45" strokeWidth="2" strokeDasharray="6 6" points={second}/>}
 <polyline fill="none" stroke={stroke} strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round" points={line}/>
 {points.map((p,i)=><circle key={p.date+i} cx={30+(i/n)*590} cy={190-(p.value/max)*158} r="4" fill={stroke} stroke="var(--panel)" strokeWidth="2"><title>{p.date}: {Math.round(p.value*10)/10} {unit}</title></circle>)}
 <text x="30" y="221" className="chart-axis">{points[0]?.date||''}</text><text x="620" y="221" textAnchor="end" className="chart-axis">{points.at(-1)?.date||''}</text>
 <text x="30" y="20" className="chart-axis">{Math.round(max)} {unit}</text>
 </svg></div>
}
export function MiniBars({values,color='#61d2bf'}:{values:{date:string;value:number}[];color?:string}){
 const max=Math.max(1,...values.map(x=>x.value));
 return <div className="mini-bars" role="img" aria-label={values.map(x=>`${x.date}: ${x.value}`).join(', ')}>{values.map((x,i)=><div key={x.date+i} className="bar-pair"><div className="bar-shell"><i style={{height:`${Math.max(4,x.value/max*100)}%`,background:color}}/></div><small>{x.date.slice(5)}</small></div>)}</div>
}
