import { Link } from "@tanstack/react-router";
import { Play, Trophy, Users, LogIn, Heart, Timer, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import mascot from "@/assets/mascot.png";
import ocean from "@/assets/welcome-ocean.jpg";

export function GameWelcome({ onPlay, signedIn, best }: { onPlay: () => void; signedIn: boolean; best: number }) {
  return (
    <section className="game-welcome">
      <img src={ocean} alt="Sunlight streaming into a colorful underwater coral reef" width={1536} height={1024} className="welcome-background" />
      <div className="welcome-shade" />
      <div className="welcome-content">
        <p className="welcome-eyebrow">A little ocean. A big adventure.</p>
        <h1 className="welcome-title">Treasure Count</h1>
        <p className="welcome-subtitle">Ready, set… count the fish!</p>
        <div className="welcome-character">
          <span className="number-bubble bubble-one" aria-hidden="true">3</span>
          <span className="number-bubble bubble-two" aria-hidden="true">7</span>
          <span className="number-bubble bubble-three" aria-hidden="true">5</span>
          <img src={mascot} alt="Goldie the smiling goldfish waves hello" width={1024} height={1024} className="welcome-mascot mascot" />
        </div>
        <div className="welcome-actions">
          <Button onClick={onPlay} className="welcome-play h-auto"><Play className="size-6" fill="currentColor" />Play game</Button>
          {!signedIn && <Button variant="ghost" asChild className="welcome-signin h-auto"><Link to="/auth"><LogIn className="size-4" />Sign in</Link></Button>}
        </div>
        <div className="welcome-bottom">
          <div className="welcome-details"><span><Heart className="size-4" />3 lives</span><span><Timer className="size-4" />20s to start</span></div>
          <p className="font-display text-xl text-gold">High scores await!</p>
          <div className="welcome-links"><Button variant="ghost" asChild><Link to="/leaderboard"><Trophy />{signedIn && best > 0 ? `Best: ${best}` : "Leaderboard"}</Link></Button><Button variant="ghost" asChild><Link to="/journey"><Star />Journey</Link></Button><Button variant="ghost" asChild><Link to="/online"><Users />Online duel</Link></Button></div>
        </div>
      </div>
    </section>
  );
}