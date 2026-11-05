import type { Puzzle } from "@/services/fishApi";
import mascot from "@/assets/mascot.png";
import chest from "@/assets/counting-chest.png";
import lagoon from "@/assets/counting-lagoon.jpg";
import reef from "@/assets/counting-reef.jpg";
import { countingLayout } from './countingLayout';

/** Presentation only: the Fish API remains the source of the correct count. */
export function FishCountingScene({ puzzle, round }: { puzzle: Puzzle; round: number }) {
  const objects = countingLayout(puzzle.fish, puzzle.chests, `${puzzle.imageUrl}:${round}`);
  return (
    <div className="counting-scene puzzle-img" role="img" aria-label="Count the fish in the underwater picture">
      <img src={round % 2 ? lagoon : reef} alt="" width={1024} height={1024} className="counting-backdrop" />
      <div className="counting-objects" aria-hidden="true">
        {objects.map((object, i) => <img key={i} src={object.kind === 'fish' ? mascot : chest} alt="" width={512} height={512} className={`counting-object counting-${object.kind}`} style={{ left: `${object.left}%`, top: `${object.top}%`, width: `${object.size}%`, height: `${object.size}%`, transform: `translate(-50%, -50%) rotate(${object.rotation}deg) scaleX(${object.kind === 'fish' && object.flipped ? -1 : 1})` }} />)}
      </div>
    </div>
  );
}