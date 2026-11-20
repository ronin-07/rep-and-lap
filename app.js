/* Rep & Lap — local-first, zero-dependency workout tracker. */
(()=>{
  'use strict';
  const STORAGE_KEY='rep-and-lap-tracker-v2';
  const OLD_STORAGE_KEY='rep-and-lap-tracker-v1';
  const THEME_KEY='rep-and-lap-theme';
  const SHEET_URL='https://docs.google.com/spreadsheets/d/1wXWgc62YyYDiqV9XPjyDYlgbsHwoxJQeUpl6htIvSew/edit?usp=drivesdk';
  const DAYS=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const PLAN={
    Monday:{kind:'gym',name:'Push day',short:'Push',subtitle:'Chest · Shoulders · Triceps',color:'violet',exercises:[
      ['Barbell bench press',3,'6–10','Chest · triceps'],
      ['Incline dumbbell press',3,'8–12','Upper chest'],
      ['Seated dumbbell shoulder press',2,'8–12','Front delts · triceps'],
      ['Cable lateral raises',3,'12–20','Side delts'],
      ['Cable triceps pushdowns',3,'10–15','Triceps'],
      ['Overhead cable triceps extensions',2,'10–15','Triceps · long head']
    ]},
    Tuesday:{kind:'gym',name:'Pull day',short:'Pull',subtitle:'Back · Rear delts · Biceps',color:'violet',exercises:[
      ['Lat pulldown',3,'8–12','Lats'],
      ['Seated cable row (neutral grip)',3,'8–12','Lats · middle back'],
      ['Chest-supported dumbbell row',2,'10–12','Upper / middle back'],
      ['Cable rear delt fly',3,'12–20','Rear delts'],
      ['Incline dumbbell biceps curls',3,'8–12','Biceps'],
      ['Dumbbell hammer curls',2,'10–15','Brachialis · forearms']
    ]},
    Wednesday:{kind:'gym',name:'Legs + core',short:'Legs',subtitle:'Quads · Hamstrings · Glutes · Core',color:'violet',exercises:[
      ['Barbell back squats',3,'6–10','Quads · glutes'],
      ['Romanian deadlifts',3,'8–10','Hamstrings · glutes'],
      ['Leg press',3,'10–12','Quads · glutes'],
      ['Hamstring curl machine',2,'10–15','Hamstrings'],
      ['Standing calf raises',3,'12–20','Calves'],
      ['Cable crunches',3,'10–15','Abs']
    ]},
    Thursday:{kind:'swim',name:'Freestyle technique',short:'Technique',subtitle:'Easy · 30–45 minutes',icon:'waves',description:'Slow down, settle your breathing and make each 25 m feel easier.',drills:['Relaxed 25 m repeats','Streamline + flutter-kick drill','Side breathing + body rotation','Easy cooldown']},
    Friday:{kind:'swim',name:'Breaststroke + sculling',short:'Skills',subtitle:'Easy–moderate · 30–45 minutes',icon:'droplets',description:'Learn breaststroke coordination and safe, supported sculling before deep water.',drills:['Breaststroke kick + glide','Arm / kick coordination','Supported sculling practice','Floating or supervised treading']},
    Saturday:{kind:'swim',name:'Freestyle endurance',short:'Endurance',subtitle:'Moderate · 35–50 minutes',icon:'activity',description:'Build comfortable 25 m repeats, then progress to 50 m and 100 m continuously.',drills:['Easy 4 × 25 m warm-up','4–8 × 25 m with controlled rests','Continuous distance attempt','Easy cooldown']}
  };
  const ICONS={
    grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    dumbbell:'<path d="m6.5 6.5 11 11M4 9 9 4M15 20l5-5M2 11l9-9M13 22l9-9"/>',
    waves:'<path d="M2 6c2 0 2 2 5 2s3-2 5-2 3 2 5 2 3-2 5-2M2 12c2 0 2 2 5 2s3-2 5-2 3 2 5 2 3-2 5-2M2 18c2 0 2 2 5 2s3-2 5-2 3 2 5 2 3-2 5-2"/>',
    chart:'<path d="M3 3v18h18"/><path d="m7 16 5-6 4 3 5-8"/>',
    settings:'<path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path d="M19.4 15a1.8 1.8 0 0 0 .36 1.98l.07.07-2.78 2.78-.07-.07A1.8 1.8 0 0 0 15 19.4a1.8 1.8 0 0 0-1.4 1.6V21h-3.2v-.1A1.8 1.8 0 0 0 9 19.4a1.8 1.8 0 0 0-1.98.36l-.07.07-2.78-2.78.07-.07A1.8 1.8 0 0 0 4.6 15 1.8 1.8 0 0 0 3 13.6H2.9v-3.2H3A1.8 1.8 0 0 0 4.6 9a1.8 1.8 0 0 0-.36-1.98l-.07-.07 2.78-2.78.07.07A1.8 1.8 0 0 0 9 4.6 1.8 1.8 0 0 0 10.4 3h3.2A1.8 1.8 0 0 0 15 4.6a1.8 1.8 0 0 0 1.98-.36l.07-.07 2.78 2.78-.07.07A1.8 1.8 0 0 0 19.4 9a1.8 1.8 0 0 0 1.6 1.4h.1v3.2H21A1.8 1.8 0 0 0 19.4 15Z"/>',
    chevronLeft:'<path d="m15 18-6-6 6-6"/>',chevronRight:'<path d="m9 18 6-6-6-6"/>',
    check:'<path d="m5 12 4 4L19 6"/>',spark:'<path d="m12 3 2.1 6.9L21 12l-6.9 2.1L12 21l-2.1-6.9L3 12l6.9-2.1z"/>',
    calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
    droplet:'<path d="M12 22a8 8 0 0 0 8-8c0-5-8-12-8-12S4 9 4 14a8 8 0 0 0 8 8Z"/>',
    activity:'<path d="M22 12h-4l-3 9-6-18-3 9H2"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    arrowUp:'<path d="M12 19V5m-6 6 6-6 6 6"/>',download:'<path d="M12 3v12m-4-4 4 4 4-4M4 17v4h16v-4"/>',
    upload:'<path d="M12 16V4m-4 4 4-4 4 4M4 17v4h16v-4"/>',
    shield:'<path d="M12 22s9-4 9-11V5l-9-3-9 3v6c0 7 9 11 9 11Z"/>',
    rotate:'<path d="M3 11a9 9 0 1 1 2.4 6.1M3 4v7h7"/>',
    external:'<path d="M13 5h6v6M19 5l-9 9"/><path d="M19 14v5H5V5h5"/>',
    list:'<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    scale:'<path d="M6 4h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"/><path d="M8 11a4 4 0 0 1 8 0M12 10l2-2"/>',
    moon:'<path d="M20.9 13a9 9 0 0 1-9.9-9.9A9 9 0 1 0 20.9 13Z"/>',
    sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',minus:'<path d="M5 12h14"/>',cloud:'<path d="M20 16a4 4 0 0 0-3.9-4A6 6 0 0 0 4 13a4 4 0 0 0 1 8h14a4 4 0 0 0 1-5Z"/>',
    timer:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/>',
    trophy:'<path d="M8 21h8M12 17v4M7 3h10v7a5 5 0 0 1-10 0V3ZM7 5H3v3a4 4 0 0 0 4 4M17 5h4v3a4 4 0 0 1-4 4"/>'
  };
  const ico=(name,size=18)=>`<svg aria-hidden="true" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]||ICONS.spark}</svg>`;
  const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const todayWeek=()=>weekOf(new Date());
  function weekOf(date){const d=new Date(date.getFullYear(),date.getMonth(),date.getDate(),12);d.setDate(d.getDate()-((d.getDay()+6)%7));return keyOf(d);}
  function keyOf(d){return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');}
  function dateFor(key){const [y,m,d]=key.split('-').map(Number);return new Date(y,m-1,d,12);}
  function shiftWeek(key,n){const d=dateFor(key);d.setDate(d.getDate()+7*n);return keyOf(d);}
  const weekLabel=k=>{const a=dateFor(k),b=new Date(a);b.setDate(a.getDate()+6);const fmt=new Intl.DateTimeFormat('en-GB',{month:'short',day:'numeric'});return `${fmt.format(a)} – ${fmt.format(b)}`;};
  const wkShort=k=>new Intl.DateTimeFormat('en-GB',{month:'short',day:'numeric'}).format(dateFor(k));
  function blankData(){return {version:2,weeks:{},weights:{},waterLogs:{},targetWeight:'',setOverrides:{},restSeconds:90,recordUpdates:{}};}
  function load(){
    try {
      const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||localStorage.getItem(OLD_STORAGE_KEY)||'null');
      if(!saved||!saved.weeks||typeof saved.weeks!=='object')return blankData();
      const result={...blankData(),...saved,version:2};
      result.weights ||= {};result.waterLogs ||= {};result.setOverrides ||= {};result.restSeconds ||= 90;result.recordUpdates ||= {};
      if(!Object.keys(result.recordUpdates).length){
        const stamp=Date.now()-60000;
        for(const [wk,w] of Object.entries(result.weeks))for(const day of DAYS)if(w.done?.[day]!==undefined||w.gym?.[day]||w.swim?.[day])result.recordUpdates[`session:${wk}:${day}`]=stamp;
        for(const day of Object.keys(result.weights))result.recordUpdates[`weight:${day}`]=stamp;
        for(const id of Object.keys(result.waterLogs))result.recordUpdates[`water:${id}`]=stamp;
        if(result.targetWeight||Object.keys(result.setOverrides).length)result.recordUpdates.preferences=stamp;
      }
      return result;
    }catch{return blankData();}
  }
  let data=load();let week=todayWeek(),view='dashboard',gymDay='Monday',swimDay='Thursday';let toastTimer, syncTimer, syncing=false,waterDate=keyOf(new Date()),exerciseChoice='Barbell bench press';
  let restEnd=0,restDuration=90,restTick=null;
  const configured=!!(window.REP_AND_LAP_SUPABASE?.url&&window.REP_AND_LAP_SUPABASE?.publishableKey);
  const cloud={client:null,user:null,state:configured?'Not connected':'Not configured'};
  let theme=localStorage.getItem(THEME_KEY)|| (matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');
  function applyTheme(){document.documentElement.dataset.theme=theme;localStorage.setItem(THEME_KEY,theme);document.querySelector('meta[name="theme-color"]').content=theme==='dark'?'#0c1324':'#f6f8fc';const t=document.getElementById('themeToggle');if(t){t.innerHTML=ico(theme==='dark'?'sun':'moon',18);t.title=theme==='dark'?'Switch to light mode':'Switch to dark mode';}}
  function save(keys){
    if(keys){for(const key of (Array.isArray(keys)?keys:[keys]))data.recordUpdates[key]=Date.now();}
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(data));}catch{notify('Could not save. Check browser storage settings.');}
    if(keys&&cloud.user){clearTimeout(syncTimer);syncTimer=setTimeout(syncAll,1400);}
  }
  function getWeek(k=week){return data.weeks[k]||{done:{},gym:{},swim:{}};}
  function ensureWeek(k=week){return data.weeks[k] ||= {done:{},gym:{},swim:{}};}
  function ensureExercise(day,name){const w=ensureWeek(); w.gym ||= {}; w.gym[day] ||= {};return w.gym[day][name] ||= {sets:[],setCount:setCountFor(day,name),notes:''};}
  function ensureSwim(day){const w=ensureWeek();w.swim ||= {};return w.swim[day] ||= {drills:{}};}
  const number=v=>Number.isFinite(Number(v))?Number(v):0;
  const hasValue=x=>x!==''&&x!==null&&x!==undefined&&Number.isFinite(Number(x));
  const validSet=s=>s&&hasValue(s.kg)&&hasValue(s.reps)&&number(s.reps)>0&&number(s.kg)>=0;
  const validLoggedSet=s=>validSet(s)&&s.done!==false;
  function setCountFor(day,name,k=week){const e=getWeek(k).gym?.[day]?.[name];const base=PLAN[day].exercises.find(x=>x[0]===name)?.[1]||3;return Math.max(1,Math.min(10,Number(e?(e.setCount??base):(data.setOverrides[`${day}|${name}`]||base))));}
  function gymDayStats(day,k=week){const w=getWeek(k),entries=w.gym?.[day]||{};let volume=0,logged=0,total=0;for(const e of PLAN[day].exercises){const t=entries[e[0]]||{},count=setCountFor(day,e[0],k);total+=count;for(let i=0;i<count;i++){const set=t.sets?.[i];if(validLoggedSet(set)){logged++;volume+=number(set.kg)*number(set.reps);}}}return {volume,logged,total};}
  function weightEntries(){return Object.entries(data.weights||{}).filter(([date,e])=>/^\d{4}-\d{2}-\d{2}$/.test(date)&&e&&!e.deleted&&hasValue(e.kg)&&Number(e.kg)>0).sort((a,b)=>a[0].localeCompare(b[0]));}
  function weightMetrics(){const entries=weightEntries(),first=entries[0],last=entries.at(-1);const recent=entries.slice(-7);return {first,last,change:first&&last?Number((number(last[1].kg)-number(first[1].kg)).toFixed(1)):null,average:recent.length?recent.reduce((s,[,x])=>s+number(x.kg),0)/recent.length:null};}
  function sessionKey(day,k=week){return `session:${k}:${day}`;}
  function weekMetrics(k=week){const w=getWeek(k),completed=DAYS.filter(d=>w.done?.[d]);const gymCompleted=completed.filter(d=>PLAN[d].kind==='gym').length;const swimCompleted=completed.length-gymCompleted;const gymVolume=['Monday','Tuesday','Wednesday'].reduce((s,d)=>s+gymDayStats(d,k).volume,0);const swimDist=['Thursday','Friday','Saturday'].reduce((s,d)=>s+number(w.swim?.[d]?.distance),0);const freestyleBest=['Thursday','Friday','Saturday'].reduce((m,d)=>Math.max(m,number(w.swim?.[d]?.longest)),0);return {completed:completed.length,gymCompleted,swimCompleted,gymVolume,swimDist,freestyleBest};}
  function allSwimBest(prop){let n=0;Object.values(data.weeks).forEach(w=>Object.values(w.swim||{}).forEach(s=>n=Math.max(n,number(s[prop]))));return n;}
  // Recommended drink amounts, NOT medical fluid prescriptions. Based on the planned weekly activity.
  // EFSA's 2.5 L adult male adequate intake is TOTAL water, including food, not 2.5 L of drinks.
  function waterSuggestion(date){const day=dateFor(date).getDay();return day===0?{ml:2000,label:'Recovery day',reason:'General drinks suggestion'}:day>=1&&day<=3?{ml:2500,label:'Gym day',reason:'Includes a modest training-day allowance'}:{ml:2400,label:'Swimming day',reason:'Includes a modest swim-day allowance'};}
  function waterEntries(date){return Object.entries(data.waterLogs||{}).filter(([id,item])=>item&&!item.deleted&&item.date===date&&Number.isFinite(Number(item.ml))&&Number(item.ml)>0).sort((a,b)=>String(b[1].at||'').localeCompare(String(a[1].at||'')));}
  function waterTotal(date){return waterEntries(date).reduce((sum,[,entry])=>sum+Number(entry.ml),0);}
  function datesBefore(date,days=7){const base=dateFor(date);return Array.from({length:days},(_,index)=>{const d=new Date(base);d.setDate(d.getDate()-(days-1-index));return keyOf(d);});}
  function waterNewId(){return (typeof crypto!=='undefined'&&crypto.randomUUID)?crypto.randomUUID():`${Date.now().toString(36)}-${Math.random().toString(36).slice(2,12)}`;}
  function addWater(ml,date=waterDate){if(!Number.isFinite(Number(ml))||Number(ml)<25||Number(ml)>2000){notify('Enter 25–2000 mL for one drink');return;}
    const id=waterNewId();data.waterLogs[id]={date,ml:Math.round(Number(ml)),at:new Date().toISOString()};save(`water:${id}`);render();notify(`+${Math.round(Number(ml))} mL logged`);}
  function removeWater(id){const entry=data.waterLogs[id];if(!entry||entry.deleted)return;entry.deleted=true;save(`water:${id}`);render();notify('Water entry removed');}
  function exerciseHistory(day,name){return Object.keys(data.weeks||{}).filter(k=>/^\d{4}-\d{2}-\d{2}$/.test(k)).sort().map(k=>{
    const sets=(getWeek(k).gym?.[day]?.[name]?.sets||[]).filter(validLoggedSet);if(!sets.length)return null;
    return {week:k,sets,bestWeight:Math.max(...sets.map(x=>number(x.kg))),volume:sets.reduce((sum,x)=>sum+number(x.kg)*number(x.reps),0)};
  }).filter(Boolean);}
  function previousExercise(day,name,k=week){return exerciseHistory(day,name).filter(x=>x.week<k).at(-1)||null;}
  function exercisePersonalBest(day,name){const logs=exerciseHistory(day,name);return logs.length?Math.max(...logs.map(x=>x.bestWeight)):null;}
  function currentExerciseChoice(){for(const day of DAYS.slice(0,3))for(const x of PLAN[day].exercises)if(x[0]===exerciseChoice)return {day,name:exerciseChoice};return {day:'Monday',name:'Barbell bench press'};}
  function timerDisplay(){const left=Math.max(0,Math.ceil((restEnd-Date.now())/1000));return `${String(Math.floor(left/60)).padStart(2,'0')}:${String(left%60).padStart(2,'0')}`;}
  function renderRestTimer(){const dock=document.getElementById('restDock');if(!dock)return;
    const left=Math.max(0,restEnd-Date.now());dock.hidden=!left;if(!left){if(restTick){clearInterval(restTick);restTick=null;}return;}
    const label=document.getElementById('restCountdown');if(label)label.textContent=timerDisplay();
    const progress=document.getElementById('restProgress');if(progress)progress.style.width=`${Math.max(0,Math.min(100,100*left/(restDuration*1000)))}%`;
  }
  function startRest(seconds=Number(data.restSeconds)||90){restDuration=seconds;restEnd=Date.now()+seconds*1000;if(!restTick)restTick=setInterval(renderRestTimer,500);renderRestTimer();}
  function stopRest(){restEnd=0;renderRestTimer();}

  function thisWeekCompleted(day){return !!getWeek().done?.[day];}
  function getLastWeekSets(day,name){return previousExercise(day,name)?.sets||[];}
  const nfmt=n=>Math.round(n).toLocaleString('en-GB');
  function setView(v){view=v;render();window.scrollTo({top:0,behavior:'instant'});}
  function menu(){const items=[['dashboard','Overview','grid'],['gym','Gym log','dumbbell'],['swim','Swim log','waves'],['water','Hydration','droplet'],['weight','Body weight','scale'],['insights','Progress','chart'],['settings','Settings','settings']];document.getElementById('sideNav').innerHTML=items.map(([id,label,icon])=>`<button class="nav-button ${view===id?'active':''}" data-view="${id}" type="button" aria-current="${view===id?'page':'false'}">${ico(icon)}<span>${label}</span></button>`).join('');document.getElementById('mobileNav').innerHTML=items.filter(([id])=>id!=='settings').map(([id,label,icon])=>`<button class="${view===id?'active':''}" data-view="${id}" type="button" aria-label="${label}" aria-current="${view===id?'page':'false'}">${ico(icon)}<span>${({dashboard:'Home',gym:'Gym',swim:'Swim',water:'Water',weight:'Weight',insights:'Stats'})[id]||label}</span></button>`).join('');document.getElementById('breadcrumbName').textContent=({dashboard:'Overview',gym:'Gym log',swim:'Swim log',water:'Hydration',weight:'Body weight',insights:'Progress',settings:'Settings'})[view];}
  const weekSwitcher=()=>`<div class="week-switcher" aria-label="Select training week"><button type="button" data-action="prev-week" aria-label="Previous week">${ico('chevronLeft',17)}</button><span>${weekLabel(week)}</span><button type="button" data-action="next-week" aria-label="Next week">${ico('chevronRight',17)}</button></div>`;
  const heading=(eyebrow,title,subtitle,showWeek=true)=>`<div class="page-heading"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${subtitle}</p></div>${showWeek?weekSwitcher():''}</div>`;
  function stat(label,val,unit,foot,icon,variant=''){return `<article class="stat-card"><div class="stat-top"><div class="stat-label">${label}</div><div class="stat-icon ${variant}">${ico(icon)}</div></div><div class="stat-value">${val}<small>${unit?` ${unit}`:''}</small></div><div class="stat-foot">${foot}</div></article>`;}
  function dashboard(){const m=weekMetrics(),wm=weightMetrics();return `${heading('YOUR WEEK AT A GLANCE','Make every session count.','A simple rhythm: lift strong, swim smart, recover well.')}
    <section class="hero"><div><div class="eyebrow">THE 3 + 3 METHOD</div><h2>Build strength.<br>Own the water.</h2><p>Six intentional training days, one well-earned recovery day. Every small session adds up.</p></div><div class="hero-art" aria-hidden="true"><i></i><i></i><i></i><i></i></div></section>
    <section class="stats-grid" aria-label="Weekly statistics">
      ${stat('Sessions done',m.completed,'/ 6',`${Math.round(m.completed/6*100)}% weekly adherence`,'calendar')}
      ${stat('Logged gym volume',nfmt(m.gymVolume),'kg','Sum of entered kg × reps','dumbbell','orange')}
      ${stat('Swim distance',nfmt(m.swimDist),'m',`${m.swimCompleted} swimming sessions done`,'waves','mint')}
      ${stat('Freestyle best',nfmt(Math.max(25,allSwimBest('longest'))),'m','Your longest continuous swim','trophy','blue')}
      ${stat('Body weight',wm.last?Number(wm.last[1].kg).toFixed(1):'—','kg',wm.last?`Recorded ${wm.last[0]}`:'Log your first weigh-in','scale','mint')}
    </section>
    ${waterMiniDashboard()}
    <div class="section-heading"><div><h2>Your training week</h2><p>Tap a session to log it or tick when finished.</p></div><button type="button" class="text-button" data-view="insights">See progress ${ico('chevronRight',13)}</button></div>
    <section class="day-grid" aria-label="Six planned sessions">${DAYS.map(d=>{const p=PLAN[d],done=thisWeekCompleted(d),summary=p.kind==='gym'?gymDayStats(d):null;return `<article class="day-card ${done?'done':''}"><div><div class="day-top"><span class="day-name">${d}</span><span class="category-pill ${p.kind==='swim'?'swim':''}">${p.kind==='gym'?'GYM':'SWIMMING'}</span></div><h3>${p.name}</h3><p>${p.kind==='gym'?`${p.subtitle} · ${summary.logged}/${summary.total} sets logged`:p.subtitle}</p></div><div class="day-bottom"><label class="done-check"><input type="checkbox" data-done-day="${d}" ${done?'checked':''} aria-label="Mark ${d} workout complete">${done?'Completed':'Mark complete'}</label><button type="button" class="day-open" data-action="open-session" data-day="${d}" aria-label="Open ${d} workout">Open →</button></div></article>`}).join('')}</section>
    <div class="rest-day"><div class="rest-icon">${ico('clock',17)}</div><div><strong>Sunday · Rest & reset</strong><p>Let your muscles recover and get ready for another week.</p></div><span class="rest-label">RECOVERY DAY</span></div>`;}
  function waterMiniDashboard(){const today=keyOf(new Date()),goal=waterSuggestion(today),total=waterTotal(today),pct=Math.min(100,Math.round(total/goal.ml*100));
    return `<section class="hydration-mini"><div class="hydration-mini-icon">${ico('droplet',23)}</div><div class="hydration-mini-main"><div class="eyebrow">TODAY'S HYDRATION</div><strong>${(total/1000).toFixed(2)} <span>/ ${(goal.ml/1000).toFixed(1)} L suggested</span></strong><div class="water-track"><span style="width:${pct}%"></span></div><small>${goal.label} · ${(Math.max(0,goal.ml-total)/1000).toFixed(2)} L to suggestion</small></div><div class="hydration-mini-actions"><button class="outline-btn" data-action="add-water-today" data-ml="250" type="button">${ico('plus',14)} 250 mL</button><button class="primary-btn" data-view="water" type="button">Open water log →</button></div></section>`;
  }
  function water(){const goal=waterSuggestion(waterDate),total=waterTotal(waterDate),entries=waterEntries(waterDate),pct=Math.min(100,Math.round(total/goal.ml*100)),remaining=Math.max(0,goal.ml-total),history=datesBefore(waterDate);
    const today=keyOf(new Date());const suggested=(goal.ml/1000).toFixed(1),current=(total/1000).toFixed(2);
    const data7=history.map(d=>({day:d,ml:waterTotal(d),goal:waterSuggestion(d).ml}));
    return `${heading('V2.1 · DAILY WATER LOG','Hydrate with intention.','Log drinks in seconds. Your suggested target follows your training schedule.',false)}
      <div class="water-layout"><section class="water-main">
        <div class="pane pane-pad water-card"><div class="water-date-row"><div><div class="eyebrow">DRINK TRACKER</div><h2>${waterDate===today?'Today':escapeHTML(waterDate)}</h2></div><div class="water-date-actions"><button type="button" class="outline-btn compact" data-action="prev-water-day" aria-label="Previous day">${ico('chevronLeft',16)}</button><input type="date" id="water-date" aria-label="Water log date" value="${escapeHTML(waterDate)}"/><button type="button" class="outline-btn compact" data-action="next-water-day" aria-label="Next day">${ico('chevronRight',16)}</button></div></div>
          <div class="water-focus"><div class="water-ring" style="--water-pct:${pct}%"><div class="water-ring-inner"><span>${pct}%</span><small>of suggested</small></div></div><div class="water-focus-text"><span class="water-kicker">${escapeHTML(goal.label.toUpperCase())}</span><div class="water-big">${current} <small>/ ${suggested} L</small></div><p>${remaining>0?`${remaining.toLocaleString('en-GB')} mL until suggested amount`:'You have met the suggested amount. Drink according to thirst.'}</p><div class="water-subline">${escapeHTML(goal.reason)} · Suggested, not a limit</div></div></div>
          <div class="water-track"><span style="width:${pct}%"></span></div>
          <div class="subheading">QUICK ADD</div><div class="water-quick">${[150,250,500,750].map(n=>`<button type="button" class="water-quick-btn" data-action="add-water" data-ml="${n}"><span>${ico('plus',14)} ${n} mL</span><small>${n===150?'Small glass':n===250?'Glass':n===500?'Bottle':'Large bottle'}</small></button>`).join('')}</div>
          <form id="waterForm" class="water-form"><div class="field"><label for="water-custom">Other amount (mL)</label><input id="water-custom" type="number" inputmode="numeric" step="1" min="25" max="2000" placeholder="e.g. 350" required/></div><button class="primary-btn" type="submit">${ico('plus',15)} Add water</button></form>
        </div>
        <section class="pane pane-pad water-list"><div class="section-heading" style="margin-top:0"><div><h2>Drink history</h2><p>${entries.length} ${entries.length===1?'entry':'entries'} on this date</p></div></div>
          ${entries.length?entries.map(([id,e])=>`<div class="water-entry"><span class="water-entry-icon">${ico('droplet',17)}</span><div><strong>${Number(e.ml).toLocaleString('en-GB')} mL</strong><small>${new Date(e.at).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}</small></div><button type="button" class="ghost-delete" data-action="delete-water" data-id="${escapeHTML(id)}" aria-label="Remove ${e.ml} mL entry">Remove</button></div>`).join(''):'<p class="water-empty">No drinks logged yet. Tap a glass or bottle above to get started.</p>'}
        </section>
      </section><aside class="water-aside"><section class="pane pane-pad"><div class="mini-title">SUGGESTED DAILY DRINKS</div><div class="water-goal-number">${suggested} <small>L</small></div><p class="panel-text">The suggestion changes automatically using your training schedule:</p><div class="water-goal-rows"><div>Gym day <b>2.5 L</b></div><div>Swim day <b>2.4 L</b></div><div>Rest day <b>2.0 L</b></div></div><p class="water-fine">These are practical starting points for drinks, not exact personal requirements or medical targets. They exclude water from food. Exercise, heat and sweat can change needs. Drink to thirst and avoid forcing excessive water.</p><div class="water-v3">${ico('spark',15)} Custom water goals + calorie tracking are planned for V3.</div></section>
          <section class="pane pane-pad"><div class="mini-title">LAST 7 DAYS</div><div class="water-bars">${data7.map(v=>`<div class="water-bar-item"><div class="water-bar" title="${v.day}: ${v.ml} mL"><span style="height:${Math.min(100,v.ml/v.goal*100)}%"></span></div><small>${new Intl.DateTimeFormat('en-GB',{weekday:'short'}).format(dateFor(v.day))}</small><b>${(v.ml/1000).toFixed(1)}L</b></div>`).join('')}</div><p class="water-fine">Bars are relative to each day's recommended amount.</p></section>
        </aside></div>`;
  }
  function tabs(days,active){return `<div class="pills" role="tablist" aria-label="Choose workout day">${days.map(d=>`<button type="button" role="tab" aria-selected="${active===d}" class="pill ${active===d?'active':''}" data-action="choose-day" data-day="${d}">${d==='Monday'?'Push · Mon':d==='Tuesday'?'Pull · Tue':d==='Wednesday'?'Legs · Wed':d==='Thursday'?'Technique · Thu':d==='Friday'?'Skills · Fri':'Endurance · Sat'}</button>`).join('')}</div>`;}
  function gym(){
    const p=PLAN[gymDay],w=getWeek(),stats=gymDayStats(gymDay);
    return `${heading('GYM TRACKING','Own the next rep.','Each exercise has its own editable set count. No RIR field.')}
    ${tabs(['Monday','Tuesday','Wednesday'],gymDay)}
    <div class="program-layout"><div><div class="small-meta"><strong>${gymDay} · ${p.short}</strong> · ${p.subtitle} · ${stats.total} planned working sets</div>
    <div class="workout-list">${p.exercises.map((exercise,index)=>{
      const [name,defaultSets,reps,muscle]=exercise,count=setCountFor(gymDay,name),e=w.gym?.[gymDay]?.[name]||{},prevSession=previousExercise(gymDay,name),prev=getLastWeekSets(gymDay,name),prevValid=prev.filter(validLoggedSet),prevMax=prevValid.length?Math.max(...prevValid.map(s=>number(s.kg))):0,pr=exercisePersonalBest(gymDay,name);
      const volume=(e.sets||[]).slice(0,count).filter(validLoggedSet).reduce((sum,x)=>sum+number(x.kg)*number(x.reps),0);
      return `<article class="exercise-card"><div class="exercise-header"><div><div class="exercise-index">EXERCISE ${String(index+1).padStart(2,'0')}</div><h3>${escapeHTML(name)}</h3><p class="exercise-sub">${muscle}${prevMax?` · Previous ${prevMax} kg (${prevSession.week})`:''}${pr!==null?` · PR ${pr} kg`:''}</p></div><div class="exercise-controls"><span class="target-tag">${reps} reps</span><div class="set-stepper" aria-label="Adjust working sets for ${escapeHTML(name)}"><button type="button" data-action="adjust-sets" data-day="${gymDay}" data-exercise="${escapeHTML(name)}" data-delta="-1" aria-label="Remove a set from ${escapeHTML(name)}" ${count<=1?'disabled':''}>${ico('minus',14)}</button><strong>${count} sets</strong><button type="button" data-action="adjust-sets" data-day="${gymDay}" data-exercise="${escapeHTML(name)}" data-delta="1" aria-label="Add a set to ${escapeHTML(name)}" ${count>=10?'disabled':''}>${ico('plus',14)}</button></div></div></div>
       <div class="sets-grid">${Array.from({length:count},(_,idx)=>{const s=e.sets?.[idx]||{},old=prev[idx],canReuse=validSet(old);return `<div class="set-box ${s.done?'is-done':''}"><div class="set-top"><span>SET ${idx+1}</span>${s.done?`<span class="mark">${ico('check',12)}</span>`:''}</div><div class="set-fields"><div class="field"><label for="kg-${gymDay}-${index}-${idx}">kg</label><input id="kg-${gymDay}-${index}-${idx}" type="number" inputmode="decimal" min="0" step="0.5" placeholder="—" value="${escapeHTML(s.kg??'')}" data-gym-day="${gymDay}" data-gym-exercise="${escapeHTML(name)}" data-set="${idx}" data-field="kg" /></div><div class="field"><label for="rep-${gymDay}-${index}-${idx}">reps</label><input id="rep-${gymDay}-${index}-${idx}" type="number" inputmode="numeric" min="0" max="100" step="1" placeholder="—" value="${escapeHTML(s.reps??'')}" data-gym-day="${gymDay}" data-gym-exercise="${escapeHTML(name)}" data-set="${idx}" data-field="reps" /></div></div><div class="previous-set">${canReuse?`Prev: ${escapeHTML(old.kg)} kg × ${escapeHTML(old.reps)}`:'No previous set'}</div><div class="set-actions">${canReuse?`<button type="button" data-action="use-previous" data-day="${gymDay}" data-exercise="${escapeHTML(name)}" data-set="${idx}" title="Copy only previous weight, not reps">Use kg</button>`:''}<button type="button" class="finish-set ${s.done?'finished':''}" data-action="finish-set" data-day="${gymDay}" data-exercise="${escapeHTML(name)}" data-set="${idx}">${s.done?'✓ Logged':'Log set'}</button></div></div>`}).join('')}</div>
       <div class="exercise-tail"><div class="field notes"><label>Notes (optional)</label><input type="text" placeholder="Form, effort, etc." maxlength="180" value="${escapeHTML(e.notes??'')}" data-gym-day="${gymDay}" data-gym-exercise="${escapeHTML(name)}" data-field="notes" /></div><div class="exercise-volume" id="volume-${index}"><b>${nfmt(volume)}</b> kg</div></div></article>`;
    }).join('')}</div></div>
    <aside class="sidebar-panel"><div class="pane pane-pad"><div class="mini-title">SESSION PROGRESS</div><div class="panel-number" id="gym-logged">${stats.logged}<span> / ${stats.total} sets</span></div><div class="bar-track"><span id="gym-fill" style="width:${stats.total?stats.logged/stats.total*100:0}%"></span></div><p class="panel-text">Enter kg per dumbbell. The +/− controls customize this exercise now and set a default for future weeks. Previous logged weeks retain their set counts.</p><button type="button" class="primary-btn full ${thisWeekCompleted(gymDay)?'done-btn':''}" data-action="toggle-session" data-day="${gymDay}">${ico('check')} ${thisWeekCompleted(gymDay)?'Workout completed':'Mark workout complete'}</button></div><div class="pane pane-pad rest-settings"><div class="mini-title">REST TIMER</div><p class="panel-text">Starts when you log a set. Choose a default rest length.</p><div class="timer-choices">${[60,90,120,180].map(sec=>`<button type="button" data-action="set-rest-duration" data-seconds="${sec}" class="${Number(data.restSeconds)===sec?'active':''}">${sec>=60?sec/60+' min':sec+' sec'}</button>`).join('')}</div><button type="button" class="outline-btn full" data-action="start-rest">${ico('timer',15)} Start timer</button></div><div class="tip-card"><strong>Progressive overload</strong><p>Increase load once you reliably reach the top of your rep range with controlled technique. Rest as needed between sets.</p></div></aside></div>`;
  }
  function swim(){const p=PLAN[swimDay],entry=getWeek().swim?.[swimDay]||{},best=Math.max(25,allSwimBest('longest'));const inputs=[['duration','Duration','min','45'],['distance','Total distance','metres','400'],['longest','Longest continuous freestyle','metres','25'],['rest','Typical rest after 25 m','seconds','45'],['rpe','Session effort · RPE','1–10','5'],['sculling','Sculling practice','seconds','20'],['treading','Treading water','seconds','20']];return `${heading('SWIMMING TRACKING','One length at a time.','Log technique, confidence and distance in the water.')}${tabs(['Thursday','Friday','Saturday'],swimDay)}<div class="program-layout"><div><div class="swim-top"><div><div class="eyebrow" style="color:#a6a3ff;margin:0">${swimDay.toUpperCase()} SESSION</div><h2>${p.name}</h2><p>${p.description}</p></div><div class="swim-bubble">${ico('waves',27)}</div></div><div class="pane pane-pad"><div class="subheading" style="margin-top:0">SESSION METRICS</div><div class="swim-inputs">${inputs.map(([field,label,unit,ph])=>`<div class="field"><label for="swim-${field}">${label} <span style="font-weight:400">(${unit})</span></label><input id="swim-${field}" type="number" inputmode="decimal" min="0" ${field==='rpe'?'max="10"':''} step="1" value="${escapeHTML(entry[field]??'')}" placeholder="e.g. ${ph}" data-swim-day="${swimDay}" data-field="${field}"></div>`).join('')}<div class="field"><label for="breaststroke">Breaststroke level</label><select id="breaststroke" data-swim-day="${swimDay}" data-field="breaststroke">${['Not started','Learning','Basic','Comfortable','Confident'].map(v=>`<option value="${v}" ${((entry.breaststroke||'Not started')===v)?'selected':''}>${v}</option>`).join('')}</select></div></div><div class="subheading">TODAY'S SKILL CHECKLIST</div><div class="drill-list">${p.drills.map((d,i)=>`<label class="drill"><input type="checkbox" data-drill-day="${swimDay}" data-drill="${i}" ${(entry.drills||{})[i]?'checked':''}>${escapeHTML(d)}</label>`).join('')}</div><div class="field swim-notes"><label for="swim-notes">Session notes / what felt easier today?</label><textarea id="swim-notes" data-swim-day="${swimDay}" data-field="notes" placeholder="e.g. Breathing is more relaxed; managed 4 × 25 m with 30 sec rest...">${escapeHTML(entry.notes??'')}</textarea></div></div></div><aside class="sidebar-panel"><div class="pane pane-pad"><div class="mini-title">FREESTYLE JOURNEY</div><div class="panel-number">${nfmt(best)}<span> m</span></div><div class="panel-text" style="margin-top:3px">Longest recorded continuous freestyle swim · 25 m initial baseline</div><div class="subheading">MILESTONES</div><div class="milestones">${[25,50,100,200].map(v=>`<div class="milestone ${best>=v?'reached':''}"><span class="milestone-icon">${best>=v?ico('check',13):v/25}</span><div class="milestone-text"><strong>${v} metres</strong><small>${v===25?'Baseline':v===50?'First big goal':v===100?'Endurance target':'Stretch goal'}</small></div><span class="tag">${best>=v?'Done':'Next'}</span></div>`).join('')}</div><button class="primary-btn full ${thisWeekCompleted(swimDay)?'done-btn':''}" style="margin-top:22px" type="button" data-action="toggle-session" data-day="${swimDay}">${ico('check')} ${thisWeekCompleted(swimDay)?'Swim completed':'Mark swim complete'}</button></div><div class="tip-card"><strong>Swim safely</strong><p>Practise sculling in shallow water or with a qualified instructor before trying deep water. Stop before technique breaks down.</p></div></aside></div>`;}
  function seriesWeeks(){return Array.from({length:8},(_,i)=>shiftWeek(week,i-7));}
  function lineChart(title,subtitle,points,color,unit=''){const w=620,h=240,p={t:22,r:20,b:40,l:50};const vals=points.map(p=>p.value),top=unit==='kg body'?Math.max(...vals,1)+2:Math.max(1,...vals)*1.18,bottom=unit==='kg body'?Math.max(0,Math.min(...vals)-2):0,iw=w-p.l-p.r,ih=h-p.t-p.b;const x=i=>p.l+(points.length===1?0:i/(points.length-1))*iw;const y=v=>p.t+ih-(v-bottom)/(top-bottom)*ih;const path=points.map((e,i)=>(i?'L':'M')+x(i).toFixed(1)+' '+y(e.value).toFixed(1)).join(' ');const area=path+` L ${x(points.length-1)} ${p.t+ih} L ${x(0)} ${p.t+ih} Z`;const ticks=[0,.25,.5,.75,1].map(f=>({y:p.t+ih-f*ih,n:Math.round((bottom+(top-bottom)*f))}));return `<div class="chart-panel"><div class="chart-title">${title}</div><div class="chart-caption">${subtitle}</div><svg class="chart-svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="${title} — ${points.map(pt=>`${pt.label}: ${unit==='kg body'?pt.value.toFixed(1):nfmt(pt.value)} ${unit}`).join('; ')}"><defs><linearGradient id="fill-${title.replace(/\W/g,'')}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".19"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>${ticks.map(t=>`<line class="chart-gridline" x1="${p.l}" y1="${t.y}" x2="${w-p.r}" y2="${t.y}"/><text x="${p.l-12}" y="${t.y+3}" class="chart-ticks" text-anchor="end">${nfmt(t.n)}</text>`).join('')}<path d="${area}" fill="url(#fill-${title.replace(/\W/g,'')})"/><path d="${path}" stroke="${color}" fill="none" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>${points.map((e,i)=>`<circle cx="${x(i)}" cy="${y(e.value)}" r="4" fill="${color}" stroke="white" stroke-width="2"><title>${e.label}: ${unit==='kg body'?e.value.toFixed(1):nfmt(e.value)} ${unit}</title></circle><text x="${x(i)}" y="${h-12}" text-anchor="middle" class="chart-ticks">${e.label}</text>`).join('')}</svg></div>`;}
  function weight(){
    const entries=weightEntries(),wm=weightMetrics(),latest=wm.last,goal=hasValue(data.targetWeight)?number(data.targetWeight):null;
    const points=entries.slice(-20).map(([d,v])=>({label:d.slice(5),value:number(v.kg)}));
    const delta=wm.change===null?'—':`${wm.change>0?'+':''}${wm.change.toFixed(1)}`;
    return `${heading('BODY-WEIGHT TRACKING','Make the trend visible.','Log your weight at a consistent time; daily fluctuations are normal.',false)}
      <div class="insight-strip weight-insights"><div class="insight-card"><div class="label">Latest weigh-in</div><div class="big">${latest?Number(latest[1].kg).toFixed(1):'—'} <small>kg</small></div><div class="sub">${latest?latest[0]:'Add your first measurement'}</div></div><div class="insight-card"><div class="label">Change since first entry</div><div class="big">${delta} <small>kg</small></div><div class="sub">Based on your logged measurements</div></div><div class="insight-card"><div class="label">Last 7 entries · average</div><div class="big">${wm.average!==null?wm.average.toFixed(1):'—'} <small>kg</small></div><div class="sub">Helps smooth out fluctuations</div></div></div>
      <div class="weight-layout"><div>
      <section class="pane pane-pad"><div class="section-heading" style="margin-top:0"><div><h2>Record a weigh-in</h2><p>One entry per date; re-enter a date to edit it.</p></div>${ico('scale',22)}</div>
      <form id="weightForm" class="weight-form"><div class="field"><label for="weight-date">Date</label><input id="weight-date" type="date" required value="${keyOf(new Date())}" /></div><div class="field"><label for="weight-kg">Weight (kg)</label><input id="weight-kg" type="number" min="20" max="400" step="0.1" inputmode="decimal" required placeholder="e.g. 82.0" /></div><div class="field weight-note"><label for="weight-note">Note (optional)</label><input id="weight-note" type="text" maxlength="160" placeholder="Morning, after waking up…" /></div><button class="primary-btn" type="submit">${ico('plus',15)} Save weight</button></form>
      </section>
      <section class="pane pane-pad weight-history"><div class="section-heading"><div><h2>Measurement history</h2><p>${entries.length} recorded dates</p></div></div>${entries.length?`<div class="weight-entries">${entries.slice().reverse().slice(0,30).map(([date,v])=>`<div class="weight-entry"><div><strong>${escapeHTML(date)}</strong><small>${escapeHTML(v.note||'')}</small></div><b>${Number(v.kg).toFixed(1)} kg</b><button type="button" class="ghost-delete" data-action="delete-weight" data-date="${escapeHTML(date)}" aria-label="Delete weigh-in for ${date}">Remove</button></div>`).join('')}</div>`:'<div class="empty-chart">No weigh-ins yet. Your first entry will appear here.</div>'}</section>
      </div><aside><section class="pane pane-pad"><div class="mini-title">YOUR TARGET</div><div class="field"><label for="target-weight">Goal weight (kg) · optional</label><input id="target-weight" type="number" inputmode="decimal" min="20" max="400" step="0.1" placeholder="Set your own target" value="${escapeHTML(data.targetWeight??'')}" /></div><button type="button" class="outline-btn full" data-action="save-target" style="margin-top:12px">Save target</button>${latest&&goal?`<p class="panel-text">${Math.abs(number(latest[1].kg)-goal).toFixed(1)} kg ${number(latest[1].kg)>goal?'above':'below'} your target.</p>`:''}</section><div class="tip-card"><strong>Look at the trend, not one day</strong><p>For a consistent comparison, weigh in under similar conditions. Progress can fluctuate from hydration, meals and activity.</p></div></aside></div>
      <div class="chart-grid weight-chart">${points.length>=2?lineChart('Body weight','Last 20 measurements',points,'#c77fb1','kg body'):'<div class="chart-panel"><div class="chart-title">Weight progress chart</div><div class="empty-chart">A chart will appear after two logged measurements.</div></div>'}</div>`;
  }
  function exerciseInsightPanel(){const {day,name}=currentExerciseChoice(),history=exerciseHistory(day,name),last=history.at(-1),pr=exercisePersonalBest(day,name);
    const opts=DAYS.slice(0,3).flatMap(day=>PLAN[day].exercises.map(([name])=>`<option value="${escapeHTML(name)}" ${exerciseChoice===name?'selected':''}>${escapeHTML(name)}</option>`)).join('');
    return `<section class="exercise-insight pane pane-pad"><div class="section-heading" style="margin-top:0"><div><h2>Exercise history & personal records</h2><p>Compare working-set loads across sessions.</p></div></div><div class="field"><label for="exercise-history-select">Choose exercise</label><select id="exercise-history-select" data-exercise-chart>${opts}</select></div><div class="exercise-pr-grid"><div><small>Heaviest recorded set</small><strong>${pr===null?'—':pr.toFixed(1)+' kg'}</strong></div><div><small>Last workout</small><strong>${last?last.bestWeight.toFixed(1)+' kg':'No entries yet'}</strong></div><div><small>Sessions logged</small><strong>${history.length}</strong></div></div>
      ${history.length?lineChart(`${escapeHTML(name)} · heaviest set`,'Last 10 logged sessions',history.slice(-10).map(v=>({label:wkShort(v.week),value:v.bestWeight})),'#766bf2','kg'):'<div class="empty-chart">Log a workout to see the exercise chart and personal record.</div>'}</section>`;
  }
  function insights(){const keys=seriesWeeks(),m=weekMetrics(),adherence=keys.reduce((s,k)=>s+weekMetrics(k).completed,0),pb=Math.max(25,allSwimBest('longest')),scull=allSwimBest('sculling'),tread=allSwimBest('treading');const mk=fn=>keys.map(k=>({label:wkShort(k),value:fn(k)}));const weightPoints=weightEntries().slice(-16).map(([day,e])=>({label:day.slice(5),value:number(e.kg)}));return `${heading('PERFORMANCE INSIGHTS','Progress tells the story.','Watch your training rhythm and swimming milestones improve.')}
     <div class="insight-strip"><div class="insight-card"><div class="label">Last 8 weeks · consistency</div><div class="big">${Math.round(adherence/48*100)}%</div><div class="sub">${adherence} of 48 possible sessions completed</div></div><div class="insight-card"><div class="label">Lifetime longest freestyle</div><div class="big">${nfmt(pb)} m</div><div class="sub">Target: 50 m → 100 m</div></div><div class="insight-card"><div class="label">Best sculling practice</div><div class="big">${nfmt(scull)} sec</div><div class="sub">Best treading: ${nfmt(tread)} sec</div></div></div>
     <div class="chart-grid">${lineChart('Gym volume','Weekly logged weight × reps',mk(k=>weekMetrics(k).gymVolume),'#7267f5','kg')}${lineChart('Swimming distance','Total metres per week',mk(k=>weekMetrics(k).swimDist),'#21bd97','m')}${lineChart('Session consistency','Sessions marked complete per week (out of 6)',mk(k=>weekMetrics(k).completed),'#df9e46','sessions')}${lineChart('Freestyle endurance','Longest continuous distance per week',mk(k=>weekMetrics(k).freestyleBest),'#5386db','m')}${weightPoints.length>=2?lineChart('Body weight trend','Last 16 weigh-ins (kg)',weightPoints,'#da85ad','kg body'):'<div class="chart-panel"><div class="chart-title">Body weight trend</div><p class="chart-caption">Log at least two weigh-ins to see a trend.</p></div>'}</div>
     ${exerciseInsightPanel()}
     <div class="rest-day" style="margin-top:20px"><div class="rest-icon">${ico('spark',18)}</div><div><strong>Small efforts become big numbers</strong><p>Keep logging. Trends get more useful once you've completed a few weeks.</p></div></div>`;}
  function settings(){
   const entries=Object.values(data.weeks).filter(w=>Object.keys(w.gym||{}).length||Object.keys(w.swim||{}).length||Object.values(w.done||{}).some(Boolean)).length;
   const cloudMessage=!configured?'Cloud syncing needs your Supabase project URL and publishable key in supabase-config.js.':cloud.user?`Signed in as ${escapeHTML(cloud.user.email||'your account')}. Automatic synchronization is active while online.`:'Sign in with Google once. Supabase remembers your session in this browser and automatically syncs workouts when online.';
   return `${heading('PREFERENCES & DATA','Make it yours.','Theme, backups and optional cross-device synchronization.',false)}
     <div class="settings-note">${ico('shield',17)} Your data is saved locally by default. Cloud sync is optional and requires an authenticated Supabase project. Never put a secret or service-role key in your website files.</div>
     <div class="settings-list">
       <article class="setting-card"><h3>Appearance</h3><p>Choose a clean light theme or a deep, low-glare dark mode. Motion effects respect reduced-motion settings.</p><div class="actions"><button class="outline-btn" type="button" data-action="toggle-theme">${ico(theme==='dark'?'sun':'moon',16)} Switch to ${theme==='dark'?'light':'dark'} mode</button></div></article>
       <article class="setting-card"><h3>Cloud sync (optional)</h3><p>${cloudMessage}<br><strong>Status:</strong> ${escapeHTML(cloud.state)}. This is separate from your Google Sheet.</p><div class="actions">${configured?cloud.user?`<button class="outline-btn" type="button" data-action="sync-now">${ico('cloud',15)} Sync now</button><button class="outline-btn" type="button" data-action="sign-out">Sign out</button>`:`<button class="google-signin-btn" type="button" data-action="sign-in-google"><span class="google-letter" aria-hidden="true">G</span><span>Continue with Google</span></button><details class="email-fallback"><summary>Prefer email? Use a one-time sign-in link</summary><div class="email-fallback-form"><label class="visually-hidden" for="sync-email">Email address</label><input type="email" id="sync-email" placeholder="you@example.com" autocomplete="email" /><button class="outline-btn" data-action="send-magic" type="button">Send link</button></div></details>`:'<span class="setup-hint">See SETUP-SUPABASE.md included with the site package.</span>'}</div></article>
       <article class="setting-card"><h3>Back up your tracker</h3><p>Download JSON with gym sets, swimming, water entries, weigh-ins and preferences. Restore it on another device.</p><div class="actions"><button class="primary-btn" type="button" data-action="export-json">${ico('download',15)} Download backup</button><button class="outline-btn" type="button" data-action="import-json">${ico('upload',15)} Restore backup</button></div></article>
       <article class="setting-card"><h3>Export CSV logs</h3><p>Download spreadsheet-friendly data for sets, swimming, weekly consistency and body-weight entries.</p><div class="actions"><button class="outline-btn" type="button" data-action="export-csv" data-csv="gym">Gym CSV</button><button class="outline-btn" type="button" data-action="export-csv" data-csv="swim">Swim CSV</button><button class="outline-btn" type="button" data-action="export-csv" data-csv="checklist">Checklist CSV</button><button class="outline-btn" type="button" data-action="export-csv" data-csv="weight">Body weight CSV</button><button class="outline-btn" type="button" data-action="export-csv" data-csv="water">Water CSV</button></div></article>
       <article class="setting-card"><h3>Original Google Sheet</h3><p>The original workout workbook is available for reporting, but this website does not automatically write into it.</p><div class="actions"><a href="${SHEET_URL}" class="primary-btn" target="_blank" rel="noopener noreferrer">${ico('external',15)} Open Google Sheet</a></div></article>
       <article class="setting-card"><h3>Clear local records</h3><p>${entries} weeks with activity. This also removes locally saved water entries. It does not delete cloud records. A connected cloud account retains its copy.</p><div class="actions"><button class="outline-btn danger" type="button" data-action="reset-data">Erase local records</button></div></article>
     </div>`;
  }
  function render(){menu();const app=document.getElementById('app');app.innerHTML=({dashboard,gym,swim,water,weight,insights,settings})[view]();}
  function notify(message){const t=document.getElementById('toast');t.textContent=message;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),2500);}
  function toggleDone(day,forced){const w=ensureWeek();w.done ||= {};w.done[day]=typeof forced==='boolean'?forced:!w.done[day];save(sessionKey(day));render();notify(`${day} ${w.done[day]?'marked complete':'marked incomplete'}`);}
  function updateLiveTotals(){if(view==='gym'){const stats=gymDayStats(gymDay);const count=document.getElementById('gym-logged');if(count)count.innerHTML=`${stats.logged}<span> / ${stats.total} sets</span>`;const fill=document.getElementById('gym-fill');if(fill)fill.style.width=`${100*stats.logged/stats.total}%`;PLAN[gymDay].exercises.forEach(([name],i)=>{const sets=getWeek().gym?.[gymDay]?.[name]?.sets||[];const vol=sets.slice(0,setCountFor(gymDay,name)).filter(validLoggedSet).reduce((s,x)=>s+number(x.kg)*number(x.reps),0);const el=document.getElementById(`volume-${i}`);if(el)el.innerHTML=`<b>${nfmt(vol)}</b> kg`;});}}
  function storeGym(el){const d=el.dataset,entry=ensureExercise(d.gymDay,d.gymExercise);if(d.set!==undefined){const i=Number(d.set);entry.sets[i] ||= {};entry.sets[i][d.field]=el.value;entry.sets[i].done=false;}else entry[d.field]=el.value;save(sessionKey(d.gymDay));updateLiveTotals();}
  function storeSwim(el){const d=el.dataset,entry=ensureSwim(d.swimDay);entry[d.field]=el.value;save(sessionKey(d.swimDay));}
  const download=(filename,body,type='application/octet-stream')=>{const blob=new Blob([body],{type}),url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1200);};
  function csvText(rows){return rows.map(r=>r.map(v=>{const s=String(v??'');return /[",\r\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s;}).join(',')).join('\r\n');}
  function exportCSV(kind){
   let rows=[];const weeks=Object.keys(data.weeks).sort();
   if(kind==='gym'){
    rows.push(['Week Start','Day','Exercise','Set','Weight kg','Reps','Target reps','Notes']);
    for(const w of weeks)for(const d of DAYS.slice(0,3))for(const [name,,reps] of PLAN[d].exercises){const e=data.weeks[w]?.gym?.[d]?.[name];if(!e)continue;for(const [i,s] of (e.sets||[]).slice(0,setCountFor(d,name,w)).entries()){if(!hasValue(s?.kg)&&!hasValue(s?.reps))continue;rows.push([w,d,name,i+1,s.kg??'',s.reps??'',reps,e.notes||'']);}}
   }else if(kind==='swim'){
    rows.push(['Week Start','Day','Focus','Duration min','Distance m','Longest freestyle m','Rest sec','RPE','Completed drills','Breaststroke level','Sculling sec','Treading sec','Notes']);
    for(const w of weeks)for(const d of DAYS.slice(3)){const e=data.weeks[w]?.swim?.[d];if(!e)continue;rows.push([w,d,PLAN[d].name,e.duration??'',e.distance??'',e.longest??'',e.rest??'',e.rpe??'',Object.entries(e.drills||{}).filter(x=>x[1]).map(x=>PLAN[d].drills[x[0]]).join('; '),e.breaststroke??'',e.sculling??'',e.treading??'',e.notes??'']);}
   }else if(kind==='weight'){
    rows=[['Date','Body weight kg','Notes'],...weightEntries().map(([date,e])=>[date,e.kg,e.note??''])];
   }else if(kind==='water'){
    rows=[['Date','Timestamp','Volume mL'],...Object.values(data.waterLogs||{}).filter(e=>e&&!e.deleted&&e.date&&Number(e.ml)>0).sort((a,b)=>a.date.localeCompare(b.date)).map(e=>[e.date,e.at||'',e.ml])];
   }else{
    rows.push(['Week Start','Day','Type','Session','Completed']);for(const w of weeks)for(const d of DAYS){if(data.weeks[w]?.done?.[d]===undefined)continue;rows.push([w,d,PLAN[d].kind,PLAN[d].name,data.weeks[w].done[d]?'TRUE':'FALSE']);}
   }
   download(`rep-and-lap-${kind}-${keyOf(new Date())}.csv`,csvText(rows),'text/csv;charset=utf-8');notify(`${kind} CSV downloaded`);
  }
  function adjustSets(day,name,delta){
    const count=setCountFor(day,name),next=count+delta;if(next<1||next>10)return;
    const entry=ensureExercise(day,name);
    if(delta<0&&entry.sets?.[count-1]&&(hasValue(entry.sets[count-1].kg)||hasValue(entry.sets[count-1].reps))&&!confirm('Remove the last set and its logged values?'))return;
    if(delta<0)entry.sets=entry.sets.slice(0,next);
    entry.setCount=next;data.setOverrides[`${day}|${name}`]=next;
    save([sessionKey(day),'preferences']);render();notify(`${name}: ${next} sets`);
  }
  function removeWeight(date){if(!confirm(`Delete your weigh-in for ${date}?`))return;data.weights[date]={deleted:true};save(`weight:${date}`);render();notify('Weigh-in removed');}
  function recordPayload(key){
    if(key==='preferences')return {setOverrides:data.setOverrides||{},targetWeight:data.targetWeight??'',restSeconds:data.restSeconds||90};
    if(key.startsWith('weight:'))return data.weights[key.slice(7)]||{deleted:true};
    if(key.startsWith('water:'))return data.waterLogs[key.slice(6)]||{deleted:true};
    if(key.startsWith('session:')){
      const [,wk,day]=key.split(':');const x=data.weeks[wk]||{};
      return {done:x.done?.[day]??null,gym:x.gym?.[day]||null,swim:x.swim?.[day]||null};
    }
    return null;
  }
  function applyRecord(key,value){
    if(key==='preferences'){data.setOverrides=value?.setOverrides||{};data.targetWeight=value?.targetWeight??'';data.restSeconds=value?.restSeconds||90;return;}
    if(key.startsWith('weight:')){data.weights[key.slice(7)]=value||{deleted:true};return;}
    if(key.startsWith('water:')){data.waterLogs[key.slice(6)]=value||{deleted:true};return;}
    if(key.startsWith('session:')){
      const [,wk,day]=key.split(':');if(!DAYS.includes(day)||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(wk))return;
      const w=ensureWeek(wk);w.done ||= {};w.gym ||= {};w.swim ||= {};
      if(value?.done!==null&&value?.done!==undefined)w.done[day]=value.done;
      if(value?.gym)w.gym[day]=value.gym;
      if(value?.swim)w.swim[day]=value.swim;
    }
  }
  async function initCloud(){
    if(!configured)return;
    try{
      if(!window.supabase?.createClient){cloud.state='Cloud library unavailable';return;}
      cloud.client=window.supabase.createClient(window.REP_AND_LAP_SUPABASE.url,window.REP_AND_LAP_SUPABASE.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
      const {data:sessionData,error}=await cloud.client.auth.getSession();if(error)throw error;
      if(sessionData?.session?.user){cloud.user=sessionData.session.user;cloud.state='Connected';await syncAll();}
      cloud.client.auth.onAuthStateChange((ev,session)=>{cloud.user=session?.user||null;cloud.state=cloud.user?'Connected':'Not connected';render();if(cloud.user)setTimeout(syncAll,300);});
      render();
    }catch(error){cloud.state='Cloud setup error';notify(error.message||'Unable to connect to cloud');render();}
  }
  async function signInWithGoogle(){
    if(!cloud.client){notify('Configure Supabase first');return;}
    if(location.protocol!=='https:' && location.hostname!=='localhost'){
      notify('Open the published HTTPS website to sign in with Google');return;
    }
    try{
      // GitHub Pages callback is the project root; this URL must be allowlisted in Supabase Auth.
      const redirectTo = new URL('./', location.href).href;
      const {error}=await cloud.client.auth.signInWithOAuth({
        provider:'google',
        options:{redirectTo}
      });
      if(error)throw error;
      // supabase-js redirects to Google; return completes automatically using detectSessionInUrl.
    }catch(error){notify(error.message||'Google sign-in failed. Check the Google provider settings.');}
  }
  async function sendMagicLink(){
    if(!cloud.client){notify('Configure Supabase first');return;}
    const email=document.getElementById('sync-email')?.value?.trim();if(!email||!email.includes('@')){notify('Enter a valid email');return;}
    const redirectTo=location.origin+location.pathname;
    try{const {error}=await cloud.client.auth.signInWithOtp({email,options:{emailRedirectTo:redirectTo}});if(error)throw error;notify('Check your email for the sign-in link.');}
    catch(e){notify(e.message||'Sign-in link failed');}
  }
  async function syncAll(){
    if(syncing||!cloud.client||!cloud.user||!navigator.onLine)return;
    syncing=true;cloud.state='Syncing';const user=cloud.user.id;
    try{
      let remote=[];
      for(let start=0;start<10000;start+=1000){const {data:page,error}=await cloud.client.from('training_records').select('record_key,payload,updated_at').eq('user_id',user).order('record_key',{ascending:true}).range(start,start+999);if(error)throw error;remote.push(...page);if(page.length<1000)break;}
      const rmap=new Map(remote.map(x=>[x.record_key,x]));let changed=false;const outgoing=[];
      for(const item of remote){const rdate=Date.parse(item.updated_at)||0,ldate=data.recordUpdates[item.record_key]||0;
        if(rdate>ldate){applyRecord(item.record_key,item.payload);data.recordUpdates[item.record_key]=rdate;changed=true;}}
      for(const [key,ts] of Object.entries(data.recordUpdates)){const server=rmap.get(key);if(!server||ts>(Date.parse(server.updated_at)||0)+100){outgoing.push({user_id:user,record_key:key,payload:recordPayload(key),updated_at:new Date(ts).toISOString()});}}
      if(outgoing.length){for(let i=0;i<outgoing.length;i+=100){const {error}=await cloud.client.from('training_records').upsert(outgoing.slice(i,i+100),{onConflict:'user_id,record_key'});if(error)throw error;}}
      if(changed){save();}
      cloud.state='Synced';
      if(changed)render();
    }catch(error){cloud.state='Sync error';notify(error.message||'Sync failed — local data is safe');}
    finally{syncing=false;const el=document.getElementById('saveState');if(el)el.textContent=cloud.user?cloud.state:'Saved on this device';}
  }
  document.addEventListener('click',event=>{
    const nav=event.target.closest('[data-view]');if(nav){setView(nav.dataset.view);return;}
    const target=event.target.closest('[data-action]');if(!target)return;
    const a=target.dataset.action;
    if(a==='prev-week'||a==='next-week'){week=shiftWeek(week,a==='prev-week'?-1:1);render();return;}
    if(a==='choose-day'){const d=target.dataset.day;if(PLAN[d].kind==='gym')gymDay=d;else swimDay=d;render();return;}
    if(a==='open-session'){const d=target.dataset.day;if(PLAN[d].kind==='gym'){gymDay=d;setView('gym');}else{swimDay=d;setView('swim');}return;}
    if(a==='toggle-session'){toggleDone(target.dataset.day);return;}
    if(a==='add-water'||a==='add-water-today'){addWater(Number(target.dataset.ml),a==='add-water-today'?keyOf(new Date()):waterDate);return;}
    if(a==='delete-water'){removeWater(target.dataset.id);return;}
    if(a==='prev-water-day'||a==='next-water-day'){const d=dateFor(waterDate);d.setDate(d.getDate()+(a==='prev-water-day'?-1:1));waterDate=keyOf(d);render();return;}
    if(a==='set-rest-duration'){data.restSeconds=Number(target.dataset.seconds);save('preferences');render();notify(`Rest set to ${data.restSeconds}s`);return;}
    if(a==='start-rest'){startRest();notify('Rest timer started');return;}
    if(a==='stop-rest'){stopRest();return;}
    if(a==='extend-rest'){restEnd+=15000;renderRestTimer();return;}
    if(a==='use-previous'){const {day,exercise,set}=target.dataset,previous=getLastWeekSets(day,exercise)[Number(set)];if(!validLoggedSet(previous))return;const entry=ensureExercise(day,exercise);entry.sets[Number(set)] ||= {};entry.sets[Number(set)].kg=previous.kg;entry.sets[Number(set)].done=false;save(sessionKey(day));render();notify('Previous weight copied; enter your reps');return;}
    if(a==='finish-set'){const {day,exercise,set}=target.dataset,entry=ensureExercise(day,exercise),current=entry.sets[Number(set)]||{};if(!validSet(current)){notify('Enter weight and reps before logging the set');return;}current.done=!current.done;entry.sets[Number(set)]=current;save(sessionKey(day));const completed=current.done;render();if(completed){startRest();notify('Set logged · rest timer started');}else notify('Set marked as not completed');return;}

    if(a==='adjust-sets'){adjustSets(target.dataset.day,target.dataset.exercise,Number(target.dataset.delta));return;}
    if(a==='delete-weight'){removeWeight(target.dataset.date);return;}
    if(a==='save-target'){
      const v=document.getElementById('target-weight').value;
      if(v&&(!Number.isFinite(Number(v))||Number(v)<20||Number(v)>400)){notify('Enter a weight between 20 and 400 kg');return;}
      data.targetWeight=v;save('preferences');render();notify('Target saved');return;
    }
    if(a==='toggle-theme'){theme=theme==='dark'?'light':'dark';applyTheme();render();return;}
    if(a==='sign-in-google'){signInWithGoogle();return;}
    if(a==='send-magic'){sendMagicLink();return;}
    if(a==='sync-now'){syncAll();return;}
    if(a==='sign-out'){cloud.client?.auth.signOut().then(()=>{cloud.user=null;cloud.state='Not connected';render();notify('Signed out');});return;}
    if(a==='export-json'){download(`rep-and-lap-v2.1-backup-${keyOf(new Date())}.json`,JSON.stringify({...data,exportedAt:new Date().toISOString()},null,2),'application/json');notify('Backup downloaded');return;}
    if(a==='import-json'){document.getElementById('importFile').click();return;}
    if(a==='export-csv'){exportCSV(target.dataset.csv);return;}
    if(a==='reset-data'&&confirm('Erase locally saved workouts, water and weights from this browser? This cannot be undone without a JSON backup. Cloud data, if any, will remain.')){data=blankData();save();render();notify('Local records erased');}
  });
  document.addEventListener('submit',event=>{
    if(event.target.id==='waterForm'){event.preventDefault();const amount=document.getElementById('water-custom')?.value;addWater(Number(amount));return;}
    if(event.target.id!=='weightForm')return;event.preventDefault();
    const date=document.getElementById('weight-date').value,kg=Number(document.getElementById('weight-kg').value),note=document.getElementById('weight-note').value.trim();
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(kg)||kg<20||kg>400){notify('Enter a valid date and weight (20–400 kg)');return;}
    data.weights[date]={kg, note};save(`weight:${date}`);render();notify('Weigh-in saved');
  });
  document.addEventListener('change',event=>{
    const el=event.target;
    if(el.matches('[data-done-day]')){toggleDone(el.dataset.doneDay,el.checked);return;}
    if(el.matches('[data-drill-day]')){const e=ensureSwim(el.dataset.drillDay);e.drills ||= {};e.drills[el.dataset.drill]=el.checked;save(sessionKey(el.dataset.drillDay));return;}
    if(el.matches('select[data-swim-day]')){storeSwim(el);return;}
    if(el.id==='water-date'&&/^\d{4}-\d{2}-\d{2}$/.test(el.value)){waterDate=el.value;render();return;}
    if(el.matches('[data-exercise-chart]')){exerciseChoice=el.value;render();return;}
  });
  document.addEventListener('input',event=>{const el=event.target;if(el.dataset.gymDay)storeGym(el);else if(el.dataset.swimDay)storeSwim(el);});
  document.getElementById('headerSettings').addEventListener('click',()=>setView('settings'));
  document.getElementById('headerToday').addEventListener('click',()=>{week=todayWeek();render();notify('Showing current week');});
  document.getElementById('themeToggle').addEventListener('click',()=>{theme=theme==='dark'?'light':'dark';applyTheme();render();});
  document.getElementById('importFile').addEventListener('change',async(event)=>{
    const file=event.target.files?.[0];if(!file)return;
    try{
      if(file.size>5_000_000)throw Error('Backup too large');
      const obj=JSON.parse(await file.text());if(!obj||typeof obj.weeks!=='object'||Array.isArray(obj.weeks)||obj.weeks===null||Object.keys(obj.weeks).some(k=>!/^\d{4}-\d{2}-\d{2}$/.test(k)))throw Error('Invalid backup');
      if(!confirm('Restore this backup? This replaces local workout and weight entries. Back up your current data first.'))return;
      data={...blankData(),...obj,version:2,recordUpdates:{}};data.waterLogs ||= {};data.weights ||= {};data.setOverrides ||= {};data.restSeconds ||= 90;
      const stamp=Date.now();for(const [wk,w] of Object.entries(data.weeks))for(const day of DAYS)if(w.done?.[day]!==undefined||w.gym?.[day]||w.swim?.[day])data.recordUpdates[sessionKey(day,wk)]=stamp;
      for(const d of Object.keys(data.weights||{}))data.recordUpdates[`weight:${d}`]=stamp;
      for(const id of Object.keys(data.waterLogs||{}))data.recordUpdates[`water:${id}`]=stamp;
      data.recordUpdates.preferences=stamp;save();render();notify('Backup restored');
      if(cloud.user)syncAll();
    }catch{notify('Could not import: invalid Rep & Lap JSON backup');}finally{event.target.value='';}
  });
  if('serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='localhost'))navigator.serviceWorker.register('sw.js').catch(()=>{});
  window.addEventListener('online',()=>{if(cloud.user)syncAll();});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&cloud.user)syncAll();});
  setInterval(()=>{if(!document.hidden&&cloud.user)syncAll();},90000);
  applyTheme();render();initCloud();
})();
