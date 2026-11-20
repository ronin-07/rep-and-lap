'use client';
import {Trophy} from 'lucide-react';
import type {Trainer} from '@/hooks/useTrainer';
import {achievements} from '@/lib/insights';
import {AchievementTile} from './Insights';
export default function Achievements({app}:{app:Trainer}) {
 const badges=achievements(app.data),earned=badges.filter(b=>b.unlocked).length;
 return <section className="card pane-pad insight-section" aria-labelledby="achievement-heading">
  <div className="section-title insight-title"><div><span className="eyebrow">ACHIEVEMENT CABINET</span><h2 id="achievement-heading">Small wins. Real progress.</h2><p className="muted small">Achievements unlock from real gym, pool and hydration entries.</p></div><span className="achievement-counter"><Trophy size={17}/> {earned} / {badges.length} unlocked</span></div>
  <div className="achievement-grid">{badges.map(b=><AchievementTile key={b.id} achievement={b}/>)}</div>
 </section>;
}
