/** Independent virtual identity: server sessions in HttpOnly cookies. */
import { createContext,useContext,useEffect,useState,type ReactNode } from 'react';
import { api } from '@/services/localApi';
import { getAvatar,type AvatarId } from './avatars';
export interface LocalUser { id:string;email:string;display_name:string;avatar_id:string }
interface AuthContextValue { user:LocalUser|null;displayName:string|null;avatar:ReturnType<typeof getAvatar>;loading:boolean;refresh:()=>Promise<void>;signOut:()=>Promise<void>;selectAvatar:(id:AvatarId)=>Promise<void> }
const Context=createContext<AuthContextValue|null>(null);
export function AuthProvider({children}:{children:ReactNode}) {
 const [user,setUser]=useState<LocalUser|null>(null),[loading,setLoading]=useState(true);
 const refresh=async()=>{const data=await api('/auth/me');setUser(data.user);};
 useEffect(()=>{refresh().catch(()=>setUser(null)).finally(()=>setLoading(false));},[]);
 const signOut=async()=>{await api('/auth/logout',{});setUser(null);};
 const selectAvatar=async(id:AvatarId)=>{setUser(await api('/auth/avatar',{avatar:id}));};
 return <Context.Provider value={{user,displayName:user?.display_name??null,avatar:getAvatar(user?.avatar_id),loading,refresh,signOut,selectAvatar}}>{children}</Context.Provider>;
}
export function useAuth(){const c=useContext(Context);if(!c)throw new Error('Missing AuthProvider');return c;}
