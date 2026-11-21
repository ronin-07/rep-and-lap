'use client';
import {useEffect} from 'react';
/** Route-level recovery when a React error prevents the training shell rendering.
 * Local data is intentionally left alone; clearing storage could lose offline logs. */
export default function Error({error,reset}:{error:Error & {digest?:string};reset:()=>void}){
 useEffect(()=>{console.error('RepLap page error',error);},[error]);
 return <main style={{minHeight:'100dvh',display:'grid',placeItems:'center',padding:'24px',background:'#080e1c',color:'#f5f7ff'}}>
  <section style={{maxWidth:480,width:'100%',background:'#19243b',borderRadius:18,padding:24,border:'1px solid #34415a'}}>
   <h1 style={{fontSize:24,marginBottom:10}}>RepLap couldn&apos;t load this screen</h1>
   <p style={{lineHeight:1.6,color:'#b6c2da'}}>Your locally saved workout data has not been cleared. Try reloading. If the workout timer is still running, use the emergency recovery page to stop the locally cached timer without completing the workout.</p>
   <div style={{display:'flex',gap:12,flexWrap:'wrap',marginTop:18}}>
    <button type="button" onClick={()=>reset()} style={{padding:'12px 16px',borderRadius:10,background:'#7860e3',color:'white',border:0,cursor:'pointer'}}>Try again</button>
    <a href="/recover-timer.html" style={{padding:'12px 16px',borderRadius:10,background:'#2d3c59',color:'white',textDecoration:'none'}}>Recover timer</a>
   </div>
   <p style={{fontSize:12,color:'#aebad0',marginTop:18}}>Avoid clearing site storage until you have exported or synchronized any offline workouts.</p>
  </section>
 </main>;
}
