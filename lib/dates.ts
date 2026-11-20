import type {Day} from './types';
import {DAYS} from './types';
export function keyOf(d:Date):string {return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');}
export function dateFor(key:string):Date {const [y,m,d]=key.split('-').map(Number);return new Date(y,m-1,d,12);}
export function weekOf(date:Date):string {const d=new Date(date.getFullYear(),date.getMonth(),date.getDate(),12);d.setDate(d.getDate()-((d.getDay()+6)%7));return keyOf(d);}
export function shiftWeek(key:string,n:number):string {const d=dateFor(key);d.setDate(d.getDate()+n*7);return keyOf(d);}
export function daysAgo(n:number,from=new Date()):string {const d=new Date(from);d.setDate(d.getDate()-n);return keyOf(d);}
export function labelWeek(key:string):string {const start=dateFor(key),end=dateFor(key);end.setDate(end.getDate()+6);const f=new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short'});return `${f.format(start)} – ${f.format(end)}`;}
export function activeDay(date=new Date()):Day|null {return DAYS[(date.getDay()+6)%7]??null;}
export function dateInWeek(week:string,day:Day):string {const d=dateFor(week);d.setDate(d.getDate()+DAYS.indexOf(day));return keyOf(d);}
export function formatDate(key:string):string {return dateFor(key).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});}
