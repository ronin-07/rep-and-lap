'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {Bell,CheckCheck,CheckCircle2,Droplets,Trophy,Waves,X} from 'lucide-react';
import type {Trainer} from '@/hooks/useTrainer';
import {activityNotifications,parseReadReceipts,readReceiptKey,type ActivityNotification} from '@/lib/activity-notifications';

const iconFor={session:CheckCircle2,hydration:Droplets,achievement:Trophy,'swim-pr':Waves};

/** A lightweight activity inbox; no browser push permission is requested. */
export default function NotificationBell({app,onOpen}:{app:Trainer;onOpen?:()=>void}){
 const accountId=app.accountId;
 const items=useMemo(()=>activityNotifications(app.data),[app.data]);
 const [open,setOpen]=useState(false);
 const [stored,setStored]=useState<{account:string;ids:string[]}>({account:'',ids:[]});
 const ref=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  let ids:string[]=[];
  try{ids=parseReadReceipts(localStorage.getItem(readReceiptKey(accountId)));}catch{}
  setStored({account:accountId,ids});setOpen(false);
 },[accountId]);
 useEffect(()=>{setOpen(false);},[app.view]);
 useEffect(()=>{
  if(!open)return;
  const outside=(event:PointerEvent)=>{
   if(event.target instanceof Node&&!ref.current?.contains(event.target))setOpen(false);
  };
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape')setOpen(false);};
  document.addEventListener('pointerdown',outside);
  document.addEventListener('keydown',escape);
  return ()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape);};
 },[open]);
 const read=new Set(stored.account===accountId?stored.ids:[]);
 const unread=stored.account===accountId?items.filter(item=>!read.has(item.id)).length:0;
 const markRead=(ids:string[])=>{
  const next=Array.from(new Set([...read,...ids])).slice(-500);
  setStored({account:accountId,ids:next});
  try{localStorage.setItem(readReceiptKey(accountId),JSON.stringify(next));}catch{}
 };
 const visit=(item:ActivityNotification)=>{
  markRead([item.id]);setOpen(false);
  if(item.destination==='water')app.goto('workout','water');
  else if(item.destination==='swimming'){app.setProgressTab('swimming');app.goto('progress');}
  else app.goto(item.destination);
 };
 return <div className="activity-bell" ref={ref}>
  <button type="button" className={`icon-btn activity-bell-trigger${open?' is-open':''}`}
   aria-label={unread?`Recent activity: ${unread} unread notifications`:'Recent activity notifications'}
   title="Recent activity" aria-expanded={open} aria-controls="activity-notification-panel"
   onClick={()=>{if(!open)onOpen?.();setOpen(x=>!x);}}>
   <Bell size={20} aria-hidden="true"/>
   {unread>0&&<span className="activity-bell-count" aria-hidden="true">{unread>9?'9+':unread}</span>}
  </button>
  {open&&<section className="activity-notification-panel" id="activity-notification-panel" role="dialog" aria-label="Recent activity notifications" aria-modal="false">
   <div className="activity-notification-head">
    <div><span className="eyebrow">YOUR HIGHLIGHTS</span><h2>Notifications</h2><p>Recent training wins and milestones</p></div>
    <button className="activity-panel-close" type="button" aria-label="Close notifications" onClick={()=>setOpen(false)}><X size={18}/></button>
   </div>
   <div className="activity-notification-tools">
    <span>{unread>0?`${unread} unread`:'All caught up'}</span>
    <button type="button" disabled={!unread} onClick={()=>markRead(items.map(item=>item.id))}><CheckCheck size={15}/> Mark all read</button>
   </div>
   <div className="activity-notification-list">
    {items.length===0?<div className="activity-notification-empty"><Bell size={28}/><strong>Your highlights will appear here</strong><p>Complete a session, hit your water goal, or unlock an achievement to start your timeline.</p></div>:
    items.map(item=>{
     const Icon=iconFor[item.kind];
     return <button type="button" key={item.id} className={`activity-notification-item${read.has(item.id)?' is-read':' is-unread'}`}
       onClick={()=>visit(item)} aria-label={`${item.title}. ${item.detail}. Open ${item.destination==='water'?'water log':item.destination}.`}>
      <span className={`activity-notification-icon kind-${item.kind}`}><Icon size={18}/></span>
      <span className="activity-notification-copy"><strong>{item.title}</strong><span>{item.detail}</span><small>{new Date(item.occurredAt).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}</small></span>
      {!read.has(item.id)&&<span className="activity-unread-dot" aria-label="Unread"/>}
     </button>;
    })}
   </div>
   <div className="activity-notification-foot">Recent 90 days · Read status is saved on this device</div>
  </section>}
 </div>;
}
