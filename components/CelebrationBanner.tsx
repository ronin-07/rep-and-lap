'use client';
import {useEffect,useEffectEvent} from 'react';
import {Check,Dumbbell,Droplets,Sparkles,Trophy,Waves,X} from 'lucide-react';
import type {Trainer} from '@/hooks/useTrainer';
/** A genuine locally completed workout may celebrate without interrupting logging. */
export default function CelebrationBanner({app}:{app:Trainer}){
 const celebration=app.celebration,prompt=app.recoveryPrompt;
 const close=useEffectEvent(()=>app.dismissCelebration());
 useEffect(()=>{
  if(!celebration||prompt)return;
  const id=setTimeout(()=>close(),celebration.kind==='session'?2600:4200);
  return ()=>clearTimeout(id);
 },[celebration,prompt]);
 if(!celebration||prompt)return null;
 const water=celebration.kind==='hydration',session=celebration.kind==='session',swim=session&&celebration.discipline==='swim';
 return <div className={`phaseb-celebration-banner ${session?(swim?'is-swim':'is-gym'):water?'is-water':'is-achievement'}`} role="status" aria-live="polite">
  <span className="phaseb-celebration-graphic" aria-hidden="true">{water?<Droplets size={29}/>:session?swim?<Waves size={29}/>:<Dumbbell size={29}/>:<Trophy size={29}/>}<span className="phaseb-celebration-check"><Check size={15}/></span></span>
  <div className="phaseb-celebration-copy"><span><Sparkles size={13}/> {session?swim?'SWIM COMPLETED':'GYM COMPLETED':water?'GOAL REACHED':'NEW MILESTONE'}</span><strong>{celebration.title}</strong><p>{celebration.body}</p></div>
  <button type="button" className="phaseb-celebration-close" onClick={()=>app.dismissCelebration()} aria-label="Dismiss celebration"><X size={17}/></button>
  <span className="phaseb-celebration-particles" aria-hidden="true">{Array.from({length:9},(_,i)=><i key={i}/>)}</span>
 </div>;
}
