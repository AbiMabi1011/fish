/** Scores are saved by the backend game engine, never trusted from the browser. */
import {api} from './localApi';
export interface LeaderboardEntry{id:string;score:number;rounds:number;created_at:string;name:string}
export async function saveScore(_userId:string,_score:number,_rounds:number){await api('/solo/result');}
export function getLeaderboard(_limit=20):Promise<LeaderboardEntry[]>{return api('/scores');}
export async function getPersonalBest(_userId:string):Promise<number>{return (await api('/scores/best')).best;}
