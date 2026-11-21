/** Shared, backward-compatible session clock operations for gym and swim.
 * A stopped/finished session may be continued after Undo completion; the gap
 * between stop and resume is treated as paused, not workout time. */
import type {SessionTiming} from './types';

export type SessionClockState = 'ready'|'running'|'paused'|'stopped';

function ms(timestamp: string|undefined):number|null {
 if(!timestamp)return null;
 const value=Date.parse(timestamp);
 return Number.isFinite(value)?value:null;
}
function pauseTotal(timing:SessionTiming):number|null {
 const value=timing.pausedDurationMs??0;
 return Number.isSafeInteger(value)&&value>=0?value:null;
}

export function sessionClockState(timing?:SessionTiming):SessionClockState {
 if(!timing?.startedAt)return 'ready';
 if(timing.endedAt)return 'stopped';
 return timing.pausedAt?'paused':'running';
}

/** Null means missing/invalid timing. A running clock requires an explicit `now`.
 * This keeps unfinished sessions out of historical aggregate time calculations. */
export function elapsedSessionMs(timing?:SessionTiming,now?:number):number|null {
 if(!timing||(!timing.endedAt&&now===undefined))return null;
 const start=ms(timing.startedAt),paused=timing.pausedAt?ms(timing.pausedAt):null;
 const end=timing.endedAt?ms(timing.endedAt):paused??now;
 const deducted=pauseTotal(timing);
 if(start===null||end===null||end===undefined||deducted===null||end<start)return null;
 if(timing.pausedAt&&(paused===null||paused<start||!!timing.endedAt))return null;
 const gross=end-start;
 if(deducted>gross)return null;
 return gross-deducted;
}

/** Format an actual ticking stopwatch; unlike minute totals it shows seconds. */
export function formatSessionClock(timing:SessionTiming|undefined,now?:number):string {
 const elapsed=elapsedSessionMs(timing,now);
 if(elapsed===null)return 'Not tracked';
 const seconds=Math.floor(elapsed/1000),h=Math.floor(seconds/3600),m=Math.floor((seconds%3600)/60),s=seconds%60;
 return h>0?`${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`:`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

export function pauseSessionTiming(timing:SessionTiming|undefined,at:string):SessionTiming|null {
 if(sessionClockState(timing)!=='running'||!timing)return null;
 const when=ms(at),start=ms(timing.startedAt);
 if(when===null||start===null||when<start||elapsedSessionMs(timing,when)===null)return null;
 return {...timing,pausedAt:at};
}

export function resumeSessionTiming(timing:SessionTiming|undefined,at:string):SessionTiming|null {
 if(!timing)return null;
 const state=sessionClockState(timing);
 if(state!=='paused'&&state!=='stopped')return null;
 const when=ms(at),from=ms(state==='paused'?timing.pausedAt:timing.endedAt),oldTotal=pauseTotal(timing);
 if(when===null||from===null||oldTotal===null||when<from||elapsedSessionMs(timing,from)===null)return null;
 const nextPause=oldTotal+(when-from);
 if(!Number.isSafeInteger(nextPause))return null;
 const {pausedAt:_pausedAt,endedAt:_endedAt,...rest}=timing;
 return {...rest,pausedDurationMs:nextPause};
}

/** Finalizing while paused excludes the remaining pause (including time
 * spent away from the phone), rather than silently counting that break. */
export function stopSessionTiming(timing:SessionTiming|undefined,at:string):SessionTiming|null {
 if(!timing)return null;
 const state=sessionClockState(timing),when=ms(at),start=ms(timing.startedAt);
 if((state!=='running'&&state!=='paused')||when===null||start===null||when<start)return null;
 const oldTotal=pauseTotal(timing);
 if(oldTotal===null||elapsedSessionMs(timing,state==='paused'?ms(timing.pausedAt)??undefined:when)===null)return null;
 const pauseStart=state==='paused'?ms(timing.pausedAt):null;
 if(state==='paused'&&(pauseStart===null||pauseStart>when))return null;
 const total=oldTotal+(pauseStart===null?0:when-pauseStart);
 if(!Number.isSafeInteger(total))return null;
 const {pausedAt:_pausedAt,...rest}=timing;
 return {...rest,...(total||timing.pausedDurationMs!==undefined?{pausedDurationMs:total}:{}),endedAt:at};
}

/** Reset only clock fields; exercise sets, stroke segments and notes are separate. */
export function restartSessionTiming(timing:SessionTiming|undefined,at:string):SessionTiming|null {
 if(sessionClockState(timing)!=='stopped'||ms(at)===null||elapsedSessionMs(timing)===null)return null;
 return {startedAt:at};
}
