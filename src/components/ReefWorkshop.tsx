import { useState } from 'react';
import { Coins, Shell, Sparkles, Check, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { type Progress, updateReef } from '@/services/progressService';
import { playerLevel } from '@/game/progression';
import items from '@/game/reef-items.json';
export function ReefWorkshop({progress,refresh}:{progress:Progress|null;refresh:()=>Promise<unknown>}) {
 const [pending,setPending]=useState<string|null>(null);
 const [confirm,setConfirm]=useState<string|null>(null);
 const level=playerLevel(progress?.xp??0).level;
 const selected=items.find(i=>i.id===confirm);
 async function change(id:string,action:'buy'|'show'|'hide'){
  if(pending)return;setPending(id);
  try{await updateReef(id,action);setConfirm(null);await refresh();toast.success(action==='buy'?'New treasure added to your reef!':action==='hide'?'Decoration stored in your collection':'Decoration placed in your reef');}
  catch(e){toast.error(e instanceof Error?e.message:'Please try again.');}finally{setPending(null);}
 }
 return <section id="living-reef" className="reef-workshop" aria-label="Personal reef and shop">
  <header><div><p className="journey-eyebrow">MAKE THE OCEAN YOUR OWN</p><h2>Your living reef</h2><p>Turn your discoveries into a little underwater home.</p></div><span className="reef-level"><Sparkles/>Explorer level {level}</span></header>
  <div className="reef-layout"><div className="reef-aquarium" role="img" aria-label={`Your reef with ${progress?.reef_equipped?.length??0} decorations`}>
   <span className="reef-sunbeam"/><span className="reef-bubbles" aria-hidden="true">◦<br/>°<br/>◦</span><span className="reef-swimmer" aria-hidden="true">🐠</span><span className="reef-swimmer second" aria-hidden="true">🐟</span>
   {items.filter(i=>progress?.reef_equipped?.includes(i.id)).map(i=><span key={i.id} className={`reef-decoration reef-${i.id}`} style={{left:`${i.x}%`,top:`${i.y}%`}} aria-hidden="true">{i.icon}</span>)}
   <div className="reef-sand"/><span className="reef-aquarium-label">{progress?.reef_equipped?.length?'A home built from your adventures':'Your first reef starts with a little coral'}</span>
  </div><div className="reef-guide"><h3>Give every reward a purpose</h3><p><Coins/><span><b>Coins · build your world</b>Buy plants, coral and sunken treasures.</span></p><p><Shell/><span><b>Seashells · invite rare life</b>Collect companions and special decorations.</span></p><p><Sparkles/><span><b>XP · unlock new possibilities</b>Level up to access more items. XP is never spent.</span></p></div></div>
  <div className="reef-shop">{items.map(i=>{const owned=progress?.reef_owned?.includes(i.id);const visible=progress?.reef_equipped?.includes(i.id);const locked=level<i.level;const affordable=!!progress&&progress.coins>=i.coins&&progress.shells>=i.shells;return <article key={i.id} className={`reef-product ${owned?'is-owned':''}`}><div className="reef-product-art" aria-hidden="true">{i.icon}</div><span className="reef-product-tier">{owned?'IN YOUR COLLECTION':i.shells?'RARE FIND':'REEF ESSENTIAL'}</span><h3>{i.name}</h3><p>{i.description}</p><div className="reef-price">{i.coins>0&&<span><Coins/>{i.coins}</span>}{i.shells>0&&<span><Shell/>{i.shells}</span>}<small>Level {i.level}</small></div><Button variant={owned?'outline':'default'} disabled={!progress||pending!==null||(!owned&&(locked||!affordable))} onClick={()=>owned?void change(i.id,visible?'hide':'show'):setConfirm(i.id)}>{pending===i.id?'Saving…':owned?<>{visible?<Check/>:<Sparkles/>}{visible?'Store decoration':'Place in reef'}</>:locked?<><Lock/>Reach level {i.level}</>:!affordable?'Keep exploring':'Add to my reef'}</Button></article>;})}</div>
  <p className="reef-footnote">One purchase, yours forever. Store and place decorations freely. Your existing avatar collection also uses coins and seashells.</p>
  <Dialog open={!!selected} onOpenChange={open=>{if(!open&&!pending)setConfirm(null);}}><DialogContent className="reef-confirm"><DialogTitle>Welcome {selected?.name}?</DialogTitle><DialogDescription>Spend {selected?.coins?`${selected.coins} coins`:''}{selected?.coins&&selected?.shells?' and ':''}{selected?.shells?`${selected.shells} seashells`:''} to add this permanent decoration to your reef. Your XP stays unchanged.</DialogDescription><div className="reef-confirm-art" aria-hidden="true">{selected?.icon}</div><Button disabled={!!pending} onClick={()=>selected&&void change(selected.id,'buy')}>{pending?'Adding to your reef…':'Confirm purchase'}</Button></DialogContent></Dialog>
 </section>;
}
