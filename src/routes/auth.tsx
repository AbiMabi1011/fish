/** Local sign-in and immediate registration; no third-party auth or email service. */
import {createFileRoute,Link,useNavigate} from '@tanstack/react-router';
import {useEffect,useState} from 'react';
import {api} from '@/services/localApi';
import {useAuth} from '@/identity/AuthProvider';
import {Button} from '@/components/ui/button';
import {Mail,LockKeyhole,UserRound,Eye,EyeOff,ArrowLeft} from 'lucide-react';
import mascot from '@/assets/mascot.png';
import ocean from '@/assets/welcome-ocean.jpg';
export const Route=createFileRoute('/auth')({component:AuthPage});
export function AuthPage(){
 const {user,refresh}=useAuth(),navigate=useNavigate();
 const [mode,setMode]=useState<'signin'|'signup'>('signin'),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[name,setName]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[show,setShow]=useState(false);
 useEffect(()=>{if(user)void navigate({to:'/'});},[user,navigate]);
 const submit=async(e:React.FormEvent)=>{e.preventDefault();if(busy)return;setBusy(true);setError('');try{await api(mode==='signup'?'/auth/register':'/auth/login',{email:email.trim(),password,name:name.trim()});await refresh();await navigate({to:'/'});}catch(e){setError(e instanceof Error?e.message:'Could not sign in. Please retry.');}finally{setBusy(false);}};
 return <main className="auth-ocean welcome-page auth-experience">
  <img src={ocean} alt="" width={1536} height={1024} className="welcome-background"/>
  <div className="welcome-shade"/>
  <div className="auth-layout">
   <Link to="/" className="auth-home-link"><ArrowLeft className="size-4"/>Back to the ocean</Link>
   <div className="auth-card">
    <aside className="auth-story">
     <span className="auth-kicker"><span/>A LITTLE OCEAN. A BIG ADVENTURE.</span>
     <h2>Find your flow.<br/><span>Make a splash.</span></h2>
     <p>Sharp eyes, hidden treasures, and a whole reef waiting to be explored.</p>
     <div className="auth-art"><span className="auth-orbit orbit-one"/><span className="auth-orbit orbit-two"/><span className="auth-art-spark">✦</span><img src={mascot} alt="Goldie welcomes you" className="mascot"/><span className="auth-art-caption">Your ocean adventure awaits</span></div>
     <div className="auth-perks"><span>✦ Save your progress</span><span>◈ Unlock treasures</span><span>↗ Challenge friends</span></div>
    </aside>
    <section className="auth-form-panel" aria-labelledby="auth-heading">
     <div className="auth-mode-tabs" aria-label="Account options"><button type="button" className={mode==='signin'?'is-selected':''} disabled={busy} onClick={()=>{setMode('signin');setPassword('');setError('');}}>Sign in</button><button type="button" className={mode==='signup'?'is-selected':''} disabled={busy} onClick={()=>{setMode('signup');setPassword('');setError('');}}>Register</button></div>
     <p className="auth-form-eyebrow">YOUR PLACE IN THE REEF</p>
     <h1 id="auth-heading">{mode==='signin'?'Welcome back.':'Make it your ocean.'}</h1>
     <p className="auth-intro">{mode==='signup'?'Create your player profile and dive straight in.':'Sign in and pick up your next adventure.'}</p>
     {error&&<p role="alert" className="auth-error">{error}</p>}
     <form aria-label="Account details" onSubmit={submit} className="auth-refined-form">
      {mode==='signup'&&<div><label htmlFor="player-name">Player name</label><div className="auth-field"><UserRound/><input id="player-name" aria-label="Player name" placeholder="What should we call you?" required maxLength={30} autoComplete="nickname" value={name} onChange={e=>setName(e.target.value)}/></div></div>}
      <div><label htmlFor="player-email">Email address</label><div className="auth-field"><Mail/><input id="player-email" aria-label="Email" type="email" placeholder="you@example.com" required maxLength={254} autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)}/></div></div>
      <div><label htmlFor="player-password">Password</label><div className="auth-field"><LockKeyhole/><input id="player-password" aria-label="Password" type={show?'text':'password'} placeholder={mode==='signup'?'Create a password':'Enter your password'} autoComplete={mode==='signup'?'new-password':'current-password'} required minLength={mode==='signup'?8:undefined} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)}/><Button type="button" variant="ghost" size="icon" aria-label={show?'Hide password':'Show password'} onClick={()=>setShow(!show)}>{show?<EyeOff/>:<Eye/>}</Button></div>{mode==='signup'&&<span className="auth-password-hint">At least 8 characters. Make it yours.</span>}</div>
      <Button disabled={busy} className="auth-submit">{busy?'Please wait…':mode==='signup'?'Create account':'Sign in'}<span aria-hidden="true">→</span></Button>
     </form>
     <div className="auth-switch"><span>{mode==='signin'?'New to the reef?':'Already part of the crew?'}</span><button type="button" disabled={busy} onClick={()=>{setMode(mode==='signin'?'signup':'signin');setPassword('');setError('');}}>{mode==='signin'?'Create an account':'Sign in instead'}</button></div>
     <div className="auth-reassurance"><span aria-hidden="true">✓</span>{mode==='signup'?'No confirmation email. Just register and play.':'Your progress. Your treasures. Your adventure.'}</div>
    </section>
   </div>
   <p className="auth-page-note">TREASURE COUNT <span>·</span> A little curiosity goes a long way.</p>
  </div>
 </main>;
}
