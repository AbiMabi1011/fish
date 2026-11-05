// Decorative animated ocean ambience; purely presentational, no game state.
// Scroll parallax added with OpenAI Codex assistance.
import { useEffect, useRef } from "react";
import blueTang from "@/assets/bg-fish-b.png";
import yellowTang from "@/assets/bg-fish-yellow.png";
import clownfish from "@/assets/bg-fish-clown.png";

const BUBBLES = Array.from({ length: 18 }, (_, i) => ({
  left: (i * 37) % 100,
  size: 6 + ((i * 7) % 18),
  delay: -((i * 1.7) % 14),
  duration: 10 + ((i * 3) % 9),
}));
// Each fish swims alone: own lane, speed, start time and wave rhythm.
const FISH = [
  { top: 12, duration: 46, delay: -4, scale: 1.05, img: blueTang, bob: 7.5 },
  { top: 34, duration: 58, delay: -27, scale: 0.75, img: yellowTang, bob: 6.2 },
  { top: 55, duration: 39, delay: -15, scale: 0.6, img: clownfish, bob: 4.8 },
  { top: 74, duration: 67, delay: -48, scale: 0.9, img: yellowTang, bob: 8.4 },
  { top: 22, duration: 73, delay: -60, scale: 0.5, img: clownfish, bob: 5.6 },
  { top: 86, duration: 52, delay: -36, scale: 0.7, img: blueTang, bob: 6.9 },
];

export function OceanBackdrop() {
  const backdrop = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    const update = () => {
      frame = 0;
      backdrop.current?.style.setProperty("--ocean-scroll", `${motion.matches ? 0 : Math.max(0, window.scrollY)}px`);
    };
    const onScroll = () => {
      if (!motion.matches && !frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    motion.addEventListener("change", update);
    return () => {
      window.removeEventListener("scroll", onScroll);
      motion.removeEventListener("change", update);
      window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={backdrop} className="ocean-backdrop" aria-hidden="true">
      <div className="ocean-rays">
        {[0, 1, 2, 3, 4].map((i) => <span key={i} style={{ left: `${10 + i * 19}%`, animationDelay: `${-i * 2.3}s` }} />)}
      </div>
      <div className="ocean-caustics" />
      {FISH.map((f, i) => (
        <div key={i} className={`ocean-fish ${i % 2 ? "reverse" : ""}`}
          style={{ top: `${f.top}%`, animationDuration: `${f.duration}s`, animationDelay: `${f.delay}s`, ["--s" as string]: f.scale, ["--bob" as string]: `${f.bob}s`, ["--fin" as string]: `${1.3 + i * 0.17}s`, ["--phase" as string]: `${f.delay}s`, ["--drift" as string]: `${8 + f.scale * 6}px`, ["--depth" as string]: 0.55 + f.scale * 0.3 }}>
          <div className="fish-scroll" style={{ ["--scroll-lift" as string]: 0.12 + f.scale * 0.1 }}>
            <div className="fish-bob"><img src={f.img} alt="" width={992} height={672} loading="lazy" /></div>
          </div>
        </div>
      ))}
      {BUBBLES.map((b, i) => (
        <span key={i} className="ocean-bubble"
          style={{ left: `${b.left}%`, width: b.size, height: b.size, animationDelay: `${b.delay}s`, animationDuration: `${b.duration}s` }} />
      ))}
      <div className="ocean-vignette" />
    </div>
  );
}
