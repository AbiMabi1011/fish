import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import mascot from "@/assets/mascot.png";
import blueFish from "@/assets/duel-blue-fish.png";
import ocean from "@/assets/welcome-ocean.jpg";

export function GameModeChooser({ onSingle, onBack }: { onSingle: () => void; onBack: () => void }) {
  return (
    <section className="mode-ocean">
      <img src={ocean} alt="" width={1536} height={1024} className="welcome-background" />
      <div className="welcome-shade" />
      <span className="number-bubble mode-bubble-left" aria-hidden="true">3</span>
      <span className="number-bubble mode-bubble-right" aria-hidden="true">7</span>
      <div className="mode-panel fade-up">
        <h1 className="mode-title">Choose game mode</h1>
        <Button variant="ghost" type="button" onClick={onSingle} className="mode-shield h-auto p-0" aria-label="Single Play">
          <span className="mode-art"><img src={mascot} alt="" width={1024} height={1024} className="mode-solo-fish" /></span>
          <span className="mode-name">Single Play</span>
        </Button>
        <Button variant="ghost" asChild className="mode-shield h-auto p-0"><Link to="/online" aria-label="2 Players">
          <span className="mode-art mode-duel-art"><img src={mascot} alt="" width={1024} height={1024} className="mode-duel-fish" /><img src={blueFish} alt="" width={1024} height={1024} className="mode-duel-fish mode-blue-fish" /><b className="player-badge player-one">1P</b><b className="player-badge player-two">2P</b></span>
          <span className="mode-name">2 Players</span>
        </Link></Button>
        <Button variant="ghost" onClick={onBack} className="mode-back"><ArrowLeft />Back home</Button>
      </div>
    </section>
  );
}