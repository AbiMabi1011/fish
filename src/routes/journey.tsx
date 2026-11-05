/** Journey screen — presentation of saved progress: XP level, coins, seashells, daily quests and the level map. */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Home, Play, Lock, Star, Check, Gem, Sparkles, Shell, Coins, Compass, Trophy, RotateCcw, ChevronRight, Fish, Flame, Timer, Anchor } from "lucide-react";
import { claimGift, claimDailyGift, type GiftReward } from "@/services/progressService";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAuth } from "@/identity/AuthProvider";
import { useProgress } from "@/hooks/useProgress";
import { playerLevel, QUESTS, MAP_STAGES } from "@/game/progression";
import { ReefWorkshop } from "@/components/ReefWorkshop";
import { stageGoal } from "@/game/stageRules";
import ocean from "@/assets/welcome-ocean.jpg";
import chest from "@/assets/counting-chest.png";

export const Route = createFileRoute("/journey")({
  head: () => ({ meta: [
    { title: "Your Journey — Treasure Count" },
    { name: "description", content: "Track your XP, coins, seashells, daily quests and unlocked levels." },
    { property: "og:title", content: "Your Journey — Treasure Count" },
    { property: "og:description", content: "XP, daily quests and the ocean level map." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: JourneyPage,
});

// Winding path positions (percent) for map stages 1..8, bottom to top.
const SPOTS: [number, number][] = [[16, 83], [48, 83], [80, 83], [80, 52], [48, 52], [16, 52], [28, 17], [72, 17]];
const REEFS = ['Coral Cove', 'Sunlit Shallows', 'Pearl Passage', 'Kelp Gardens', 'Sunken Ruins', 'Crystal Current', 'Midnight Reef', 'Crown of the Deep'];
function trailPath(points: [number, number][]) {
  return points.reduce((path, [x,y], i) => i === 0 ? `M ${x} ${y}` : `${path} C ${(points[i-1]![0]+x)/2} ${points[i-1]![1]}, ${(points[i-1]![0]+x)/2} ${y}, ${x} ${y}`, '');
}
function AnimatedValue({value}:{value:number}) {
  const [shown,setShown]=useState(value);const previous=useRef(value);
  useEffect(()=>{const from=previous.current;previous.current=value;if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){setShown(value);return;}
    let frame=0;const start=performance.now();const tick=(time:number)=>{const t=Math.min(1,(time-start)/650);setShown(Math.round(from+(value-from)*(1-Math.pow(1-t,3))));if(t<1)frame=requestAnimationFrame(tick);};frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);
  },[value]);
  return <span aria-label={value.toLocaleString()}><span aria-hidden="true">{shown.toLocaleString()}</span></span>;
}

function JourneyPage() {
  const { user, displayName, avatar, loading } = useAuth();
  const { progress, refresh } = useProgress();
  const [mapPage,setMapPage]=useState(0);
  const [selectedStage,setSelectedStage]=useState(1);
  const [opening, setOpening] = useState<number | null>(null);
  const [reveal, setReveal] = useState<(GiftReward & { label: string }) | null>(null);
  const [preview, setPreview] = useState<number | null>(null);
  const [now,setNow] = useState(Date.now());
  const lastDay=useRef(new Date().toISOString().slice(0,10));
  const openingTimer=useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(()=>{const t=setInterval(()=>setNow(Date.now()),1000);return()=>{clearInterval(t);clearTimeout(openingTimer.current);};},[]);
  useEffect(()=>{const today=new Date(now).toISOString().slice(0,10);if(user&&today!==lastDay.current){lastDay.current=today;void refresh();}},[now,user,refresh]);
  const navigate = useNavigate();
  if (!user) return <main className="journey-page"><section className="journey-landing"><img src={ocean} alt=""/><div><span className="journey-eyebrow">YOUR NEXT GREAT ADVENTURE</span><h1>Ocean Journey</h1><p>100 stages. Hidden treasures.<br/>An adventure that grows with you.</p><img src={chest} alt="A treasure chest waiting to be discovered"/><Button asChild className="journey-main-cta"><Link to="/auth">{loading?'Loading your adventure…':'Start your journey'}<ChevronRight/></Link></Button><span className="journey-landing-note">Sign in to save your progress and collect rewards.</span></div></section></main>;
  const xp = progress?.xp ?? 0;
  const lv = playerLevel(xp);
  const unlocked = Math.min(progress?.max_stage ?? 1, MAP_STAGES);
  const pageStart=mapPage*8;
  const visibleSpots=SPOTS.slice(0,Math.min(8,MAP_STAGES-pageStart));
  const reefName=(stage:number)=>REEFS[(stage-1)%REEFS.length]+(stage>8?` · Depth ${Math.ceil(stage/8)}`:"");
  const claimed = progress?.claimed_gifts ?? [];
  const dailyDone = progress?.daily_gift_date === new Date(now).toISOString().slice(0, 10);
  const date=new Date(now);const untilReset=Math.max(0,Math.ceil((Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate()+1)-now)/1000));
  const resetTime=[Math.floor(untilReset/3600),Math.floor(untilReset%3600/60),untilReset%60].map(n=>String(n).padStart(2,'0')).join(':');
  const completedQuests = progress?.quests_done.length ?? 0;
  const readyGifts = Math.max(0, (unlocked - 1) * 2 - claimed.length);
  const openGift = async (gift: number) => {
    setOpening(gift);
    try {
      const r = gift === 0 ? await claimDailyGift() : await claimGift(gift);
      setPreview(null);
      openingTimer.current=setTimeout(() => { setReveal({ label: gift === 0 ? "Daily treasure chest" : `Treasure gift ${gift}`, ...r }); setOpening(null); void refresh(); }, 700);
    } catch { setOpening(null); toast.error(gift === 0 ? "Come back tomorrow for a new daily chest" : "This gift can't be opened yet"); }
  };
  const play = (stage: number) => void navigate({ to: "/", search: { stage } });
  return (
    <main className="journey-page">
      <section className="journey-board journey-pro fade-up">
        <img src={ocean} alt="" className="welcome-background" /><div className="welcome-shade" />
        <div className="journey-motes" aria-hidden="true">{Array.from({length:12},(_,i)=><span key={i} style={{left:`${(i*31+7)%100}%`,top:`${(i*23+11)%100}%`,animationDelay:`-${i*1.3}s`,animationDuration:`${6+i%4}s`}}/>)}</div>
        <div className="journey-top">
          <div className="journey-heading"><Button variant="ghost" size="icon" asChild className="journey-round" aria-label="Home"><Link to="/"><Home /></Link></Button><div><p className="journey-eyebrow">YOUR ADVENTURE, BELOW THE SURFACE</p><h1>Ocean Journey<span className="journey-heading-star" aria-hidden="true">✦</span></h1></div></div>
          <div className="journey-wallet"><span className="journey-chip"><Coins /><span><b><AnimatedValue value={progress?.coins??0}/></b><small>Coins</small></span></span><span className="journey-chip"><Shell /><span><b><AnimatedValue value={progress?.shells??0}/></b><small>Seashells</small></span></span></div>
        </div>
        <aside className="journey-card">
          <section className="journey-stage-preview"><h2>STAGE {selectedStage}: {reefName(selectedStage).toUpperCase()}</h2><img src={ocean} alt="Underwater reef expedition"/><div><p className="journey-eyebrow">YOUR EXPEDITION</p><p>Count fish before time runs out. Build a streak to advance through the reef.</p><ul><li><Check/>Stage {selectedStage} unlocked</li><li><Timer/>Solve {stageGoal(selectedStage)} puzzles to advance</li><li><Star/>Earn XP, coins and quest rewards</li></ul><Button className="journey-start-dive" disabled={!progress} onClick={()=>play(selectedStage)}><Play fill="currentColor"/>Start Dive</Button></div></section>
          <nav className="journey-quick-links" aria-label="Journey shortcuts"><Link to="/aquarium">My Aquarium</Link><a href="#living-reef">Decorate reef</a><Link to="/leaderboard">Leaderboard</Link><Link to="/online">Play with a friend</Link></nav>
          <div className="journey-profile">
          <div className="journey-avatar-frame"><img src={avatar.image} alt={avatar.name} className="journey-avatar"/><span>{lv.level}</span></div>
          <div><h2 className="journey-name">{displayName ?? "Player"}</h2><p className="journey-rank">Ocean explorer · Level {lv.level}</p></div></div>
          <div className="journey-xp"><div className="journey-xp-bar"><span style={{ width: `${lv.progress * 100}%` }} /></div><b className="journey-lv">{lv.level}</b></div>
          <p className="journey-level-target">{Math.max(0,lv.nextAt-xp).toLocaleString()} XP to your next explorer level</p>
          <p className="journey-xp-caption"><b><AnimatedValue value={xp}/> XP</b><span>{lv.nextAt.toLocaleString()} to level {lv.level+1}</span></p>
          <Button variant="ghost" onClick={() => void openGift(0)} disabled={!progress || dailyDone || opening !== null} className={`journey-daily ${dailyDone ? "is-collected" : "is-ready"}`}>
            <img src={chest} alt="" className={opening === 0 ? "daily-opening" : ""} /><span><small>DAILY TREASURE</small><b>{dailyDone ? "Treasure collected" : "A chest awaits!"}</b><em>{dailyDone ? "Returns tomorrow" : "Open your daily reward"}</em></span>{dailyDone ? <Check /> : <ChevronRight />}
          </Button>
          <div className="journey-quests">
            <div className="journey-section-heading"><h2><Compass />Daily quests</h2><span>{completedQuests}/{QUESTS.length}</span></div>
            {QUESTS.map((q) => {
              const value = Math.min(progress?.[q.field] ?? 0, q.goal);
              const done = progress?.quests_done.includes(q.id) ?? false;
              return <div key={q.id} className="journey-quest">
                <span className={`journey-box ${done ? "is-done" : ""}`}>{done ? <Check className="size-3" /> : q.id===1?<Fish/>:q.id===2?<Flame/>:<Timer/>}</span>
                <div className="min-w-0 flex-1">
                  <p className="journey-quest-title">{q.title}</p>
                  <div className="journey-qbar"><span style={{ width: `${(value / q.goal) * 100}%` }} /></div>
                  <div className="journey-quest-meta"><b>{done ? "Completed" : q.reward}</b><span>{q.field === "quest_seconds" ? `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")} / 2:00` : `${value} / ${q.goal}`}</span></div>
                </div>
              </div>;
            })}
            <p className="journey-reset"><Timer/>Resets in <span>{resetTime}</span></p>
          </div>
          <div className="journey-collection"><Trophy /><div><b>{claimed.length} / 14 treasures</b><p>{readyGifts ? `${readyGifts} ready to open` : "Your collection is growing"}</p></div><span>{unlocked}/{MAP_STAGES}<small>Stages</small></span></div>
        </aside>
        <section className="journey-trail"><div className="journey-trail-heading"><div><p className="journey-eyebrow">CHAPTER {mapPage+1} · STAGES {pageStart+1}–{Math.min(pageStart+8,MAP_STAGES)}</p><h2>A little further. A little deeper.</h2></div><span className="journey-trail-status"><span />{unlocked}/{MAP_STAGES} reefs unlocked</span></div>
        <div className="journey-chapters"><Button variant="outline" disabled={mapPage===0} onClick={()=>setMapPage(v=>v-1)}>← Previous</Button><span>Chapter {mapPage+1} / {Math.ceil(MAP_STAGES/8)}</span><Button variant="outline" disabled={pageStart+8>=MAP_STAGES} onClick={()=>setMapPage(v=>v+1)}>Next →</Button></div><div className="journey-map" role="group" aria-label="Level map">
          <div className="journey-caustics" aria-hidden="true"/><div className="journey-map-rays" aria-hidden="true"/><div className="journey-map-grid" aria-hidden="true"/><span className="journey-zone-label zone-deep" aria-hidden="true">THE TWILIGHT WATERS</span><span className="journey-zone-label zone-shallows" aria-hidden="true">THE CORAL SHELF</span>
          <svg className="journey-path" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path className="journey-path-shadow" d={trailPath(visibleSpots)}/><path className="journey-path-dots" d={trailPath(visibleSpots)}/><path className="journey-path-complete" d={trailPath(visibleSpots.slice(0,Math.max(0,unlocked-pageStart)))}/></svg>
          <span className="journey-map-compass" aria-hidden="true"><Compass/><b>N</b></span>
          {mapPage===0&&SPOTS.slice(0, -1).flatMap(([x, y], i) => {
            const [nx, ny] = SPOTS[i + 1] ?? [x, y];
            return [1, 2].map((part) => {
              const gift = i * 2 + part, t = part / 3;
              const ready = unlocked > i + 1, done = claimed.includes(gift);
              const kind = gift % 5 === 0 ? "rare" : gift % 3 === 0 ? "xp" : "coin";
               return <Button variant="ghost" size="icon" key={`g${gift}`} disabled={!progress || opening !== null} onClick={() => setPreview(gift)}
                 aria-label={done ? `Gift ${gift} opened` : ready ? `Open gift ${gift}` : `Preview gift ${gift} — finish level ${i + 2}`}
                className={`journey-gift gift-${kind} ${ready && !done ? "is-ready" : ""} ${done ? "is-done" : ""} ${opening === gift ? "is-opening" : ""}`}
                 style={{ left: `${x + (nx - x) * t}%`, top: `${y + (ny - y) * t}%` }}>
                 {done ? <Check /> : <><img src={chest} alt="" />{kind !== "coin" && <span className="journey-gift-badge">{kind === "rare" ? <Gem /> : <Sparkles />}</span>}{!ready && <Lock className="journey-gift-lock" />}</>}
               </Button>;
            });
          })}
          {visibleSpots.map(([x, y], i) => {
            const stage = pageStart+i + 1, open = stage <= unlocked;
             return <Button variant="ghost" size="icon" key={stage} disabled={!open || !progress} onClick={() => setSelectedStage(stage)} aria-label={open ? `Select level ${stage}` : `Level ${stage} locked`}
              className={`journey-stage ${stage===selectedStage?"is-selected":""} ${stage === unlocked ? "is-current" : ""} ${open ? "" : "is-locked"}`} style={{ left: `${x}%`, top: `${y}%` }}>
              <span className="journey-stage-island" aria-hidden="true"/>{stage===unlocked&&<span className="journey-current-avatar" aria-hidden="true"><img src={avatar.image} alt=""/></span>}
              <span className="journey-stage-number">{stage<unlocked?<Check/>:open?stage:<Lock className="size-4"/>}</span>{stage < unlocked && <Star className="journey-star" fill="currentColor" />}
               <span className="journey-stage-label">{stage === unlocked ? "YOU ARE HERE" : `REEF ${stage}`}<b>{reefName(stage)}</b></span>
             </Button>;
          })}
        </div>
        <div className="journey-map-legend"><span><i className="legend-current"/>Your next dive</span><span><i className="legend-locked"/>Undiscovered reef</span><span><img src={chest} alt=""/>Hidden rewards</span></div>
        <div className="journey-actions">
          <div className="journey-next-dive"><span><Anchor/></span><div><small>YOUR NEXT EXPEDITION</small><b>{reefName(unlocked)}</b><p>{unlocked<MAP_STAGES?`Reach level ${unlocked+1} in a completed dive to discover ${reefName(unlocked+1)}.`:'Every reef discovered. Keep diving for a new personal best.'}</p></div></div>
          <Button onClick={() => play(unlocked)} disabled={!progress} className="journey-main-cta"><Play fill="currentColor"/>Dive into reef {unlocked}<ChevronRight /></Button>
        </div>
        <button type="button" onClick={()=>play(selectedStage)} disabled={!progress} className="journey-replay"><RotateCcw/>Restart selected stage</button>
        </section>
        <ReefWorkshop progress={progress} refresh={refresh}/>
      </section>
      <Dialog open={preview !== null} onOpenChange={(open) => { if (!open) setPreview(null); }}><DialogContent className="journey-preview">
        <img src={chest} alt="Treasure chest" />
        <p className="journey-eyebrow">TREASURE {preview}</p>
        <DialogTitle>{preview !== null && preview % 5 === 0 ? "Seashell treasure" : preview !== null && preview % 3 === 0 ? "Explorer’s XP chest" : "Golden coin chest"}</DialogTitle>
        {preview!==null&&<div className="journey-preview-value">{preview%5===0?<><Shell/>1 Seashell</>:preview%3===0?<><Sparkles/>150 XP</>:<><Coins/>{30+preview*10} Coins</>}<small>ONE-TIME TREASURE</small></div>}
        <DialogDescription>{preview !== null && claimed.includes(preview) ? "This treasure is already in your collection." : preview !== null && unlocked > Math.ceil(preview / 2) ? "Your treasure is ready to open." : `Reach stage ${Math.ceil((preview ?? 1) / 2) + 1} to unlock this treasure.`}</DialogDescription>
        {preview !== null && !claimed.includes(preview) && unlocked > Math.ceil(preview / 2) ? <Button className="btn-gold h-auto" disabled={opening !== null} onClick={() => void openGift(preview)}>Open treasure<Sparkles /></Button> : <Button variant="outline" onClick={() => setPreview(null)}>Back to trail</Button>}
      </DialogContent></Dialog>
      <Dialog open={reveal!==null} onOpenChange={open=>{if(!open)setReveal(null);}}><DialogContent className="gift-card journey-reward-card">
        {reveal&&<>
            <div className="gift-burst" aria-hidden="true" />
            <div className="journey-confetti" aria-hidden="true">{Array.from({length:16},(_,i)=><span key={i} style={{'--i':i} as React.CSSProperties}/>)}</div>
            <p className="gift-kicker">{reveal.label}</p>
            <div className="gift-prize">{reveal.shells ? "🐚" : reveal.xp ? "✨" : "🪙"}</div>
            <DialogTitle className="gift-title">{[reveal.coins && `+${reveal.coins} Coins`, reveal.shells && `+${reveal.shells} Seashell`, reveal.xp && `+${reveal.xp} XP`].filter(Boolean).join(" · ")}</DialogTitle>
            <DialogDescription>{reveal.shells ? "Rare find! Use seashells to unlock legendary avatars." : reveal.xp ? "Bonus XP pushes you toward your next player level." : "Spend coins to unlock new avatars."}</DialogDescription>
            <Button onClick={() => setReveal(null)} className="journey-main-cta">Treasure collected<Check/></Button>
        </>}
      </DialogContent></Dialog>
    </main>
  );
}
