/** Persistence boundary: server-calculated XP, wallets, gifts and avatars. */
import {api} from './localApi';
export interface Progress{aquarium:{fish:string[];fedAt:number;feeds:number};reef_owned:string[];reef_equipped:string[];user_id:string;xp:number;coins:number;shells:number;max_stage:number;unlocked_avatars:string[];quest_date:string;quest_fish:number;quest_streak:number;quest_seconds:number;quests_done:number[];claimed_gifts:number[];daily_gift_date:string|null}
export interface GameReward{xp:number;coins:number;shells:number;quests:number[]}
export type GiftReward={coins:number;shells:number;xp:number};
export function getProgress():Promise<Progress>{return api('/progress');}
export function recordGame(_r:unknown):Promise<GameReward>{return api('/solo/result');}
export async function unlockAvatar(id:string){await api('/progress/avatar',{avatar:id});}
export function claimGift(gift:number):Promise<GiftReward>{return api('/progress/gift',{gift});}
export function claimDailyGift():Promise<GiftReward>{return claimGift(0);}

export function updateReef(item:string,action:"buy"|"show"|"hide"):Promise<Progress>{return api("/progress/reef",{item,action});}
