/** Same-server duels; the backend owns puzzles, deadlines, membership and scores. */
import {api} from './localApi';
import type { CountingObject } from '@/components/countingLayout';
export interface Duel{id:string;code:string;created_at:string;status:string;host_id:string;guest_id:string|null;host_name:string;guest_name:string|null;host_score:number;guest_score:number;host_lives:number;guest_lives:number;host_round:number;guest_round:number;host_started:string|null;guest_started:string|null}
export interface DuelPuzzle{imageUrl:string;round:number;startsAt:string;seconds:number;scene?:CountingObject[]}
export interface DuelAnswer{correct:boolean;points:number;expected:number}
export async function createDuel(onProgress:(n:number)=>void){onProgress(1);const r=await api('/duels/create',{});onProgress(10);return r.id as string;}
export async function joinDuel(code:string){return (await api('/duels/join',{code})).id as string;}
export function readDuel(id:string):Promise<Duel>{return api('/duels/'+id);}
export function readDuelPuzzle(id:string):Promise<DuelPuzzle|null>{return api('/duels/'+id+'/puzzle');}
export function answerDuel(id:string,round:number,answer:number):Promise<DuelAnswer>{return api('/duels/'+id+'/answer',{round,answer});}
export async function startDuel(id:string){await api('/duels/'+id+'/start',{});}
export async function leaveDuel(id:string){await api('/duels/'+id+'/leave',{});}
export function watchDuel(_id:string,refresh:()=>void){const timer=setInterval(refresh,1000);return()=>clearInterval(timer);}
