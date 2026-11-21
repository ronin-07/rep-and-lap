'use client';
import {Trophy} from 'lucide-react';
import type {Trainer} from '@/hooks/useTrainer';
import {achievements} from '@/lib/insights';
import {AchievementTile} from './Insights';
export default function Achievements({app}:{app:Trainer}) {
 const badges=achievements(app.data);
 const earnedItems=badges.filter(b=>b.unlocked),lockedItems=badges.filter(b=>!b.unlocked).sort((a,b)=>b.value/b.target-a.value/a.target),earned=earnedItems.length;
 const next=lockedItems[0];
 return <section className="card pane-pad insight-section" aria-labelledby="achievement-heading">
  <div className="section-title insight-title"><div><span className="eyebrow">ACHIEVEMENT CABINET</span><h2 id="achievement-heading">Small wins. Real progress.</h2><p className="muted small">Achievements unlock from real gym, pool and hydration entries.</p></div><span className="achievement-counter"><Trophy size={17}/> {earned} / {badges.length} unlocked</span></div>
  <div className="phaseb-achievement-summary" aria-live="polite"><span className="phaseb-trophy"><Trophy size={32}/></span><div><strong>{earned} achievements earned</strong><p>{next?`Next: ${next.name} · ${next.value.toLocaleString()} / ${next.target.toLocaleString()} ${next.unit}`:'All available achievements unlocked!'}</p></div></div>
  {earnedItems.length>0&&<><h3>Earned milestones</h3><div className="achievement-grid">{earnedItems.map(b=><AchievementTile key={b.id} achievement={b}/>)}</div></>}
  {lockedItems.length>0&&<><h3>Coming up next</h3><div className="achievement-grid">{lockedItems.map(b=><AchievementTile key={b.id} achievement={b}/>)}</div></>}
 </section>;
}
