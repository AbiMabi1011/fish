/** React adapter for server-authoritative GameEngine events. */
import {useEffect,useRef,useState} from 'react';
import {GameEngine,type GameEvents,type GameState} from './GameEngine';
import {api} from '@/services/localApi';
import {useAuth} from '@/identity/AuthProvider';
import {toast} from 'sonner';
export function useGame(handlers:{onAnswered?:(r:GameEvents['answered'])=>void;onGameOver?:(r:GameEvents['gameOver'])=>void}){
 const {user}=useAuth();const [state,setState]=useState<GameState>(GameEngine.initialState());
 const current=useRef<any>(null),revision=useRef(-1),answerEvent=useRef(0),over=useRef(''),busy=useRef(false),handler=useRef(handlers);handler.current=handlers;
 const apply=(r:any)=>{if(r.revision<revision.current)return;revision.current=r.revision;current.current=r;setState(r.state);if(r.answer&&r.eventId>answerEvent.current){answerEvent.current=r.eventId;handler.current.onAnswered?.(r.answer);}if(r.state.phase==='over'&&over.current!==r.gameId){over.current=r.gameId;handler.current.onGameOver?.({...r.state,rounds:r.state.round});}};
 useEffect(()=>{let alive=true;revision.current=-1;answerEvent.current=0;over.current='';current.current=null;setState(GameEngine.initialState());if(!user)return;
 const poll=async()=>{if(busy.current)return;try{const r=await api('/solo');if(alive)apply(r);}catch{/* A user action exposes connection errors; polling retries automatically. */}};void poll();const t=setInterval(poll,400);return()=>{alive=false;clearInterval(t);};},[user?.id]);
 const command=async(path:string,data:unknown)=>{if(busy.current)return;busy.current=true;try{apply(await api(path,data));}catch(e){toast.error(e instanceof Error?e.message:'Could not contact the game server.');}finally{busy.current=false;}};
 const action=(name:string,fish?:number)=>void command('/solo/action',{action:name,gameId:current.current?.gameId,round:current.current?.state.round,fish});
 return {state,start:(stage=1)=>void command('/solo/start',{stage}),pause:()=>action('pause'),resume:()=>action('resume'),quit:()=>action('quit'),retry:()=>action('retry'),submit:(fish:number)=>action('answer',fish)};
}
