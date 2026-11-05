import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getLeaderboard } from "@/services/scoreService";
import { useAuth } from "@/identity/AuthProvider";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Leaderboard — Treasure Count" },
      { name: "description", content: "Top scores from Treasure Count players." },
      { property: "og:title", content: "Leaderboard — Treasure Count" },
      { property: "og:description", content: "Top scores from Treasure Count players." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LeaderboardPage,
});

function LeaderboardPage() {
  const { displayName } = useAuth();
  const { data, isLoading, error } = useQuery({ queryKey: ["leaderboard"], queryFn: () => getLeaderboard() });
  return (
    <main className="mx-auto max-w-3xl px-4 pb-16">
      <div className="fade-up mb-8 text-center">
        <span className="pill">🏆 Hall of fame</span>
        <h1 className="mt-3 font-display text-6xl text-gold">Leaderboard</h1>
        <p className="mt-2 text-muted-foreground">The sharpest fish-spotters in the sea.</p>
      </div>
      <section className="hero-card fade-up p-4 md:p-6">
        {isLoading && <p className="text-center text-muted-foreground">Loading…</p>}
        {error && <p className="text-center text-destructive">Couldn't load scores.</p>}
        {data?.length === 0 && <p className="text-center text-muted-foreground">No scores yet — be the first!</p>}
        <ol className="space-y-1">
          {data?.map((e, i) => (
            <li key={e.id} className={`lb-row ${i < 3 ? "lb-top" : ""} ${e.name === displayName ? "lb-me" : ""}`}>
              <span className="flex items-center gap-3 font-bold">
                <span className="rank">{i < 3 ? ["🥇", "🥈", "🥉"][i] : i + 1}</span>
                {e.name}
              </span>
              <span className="text-muted-foreground">{e.rounds} rounds · <b className="font-display text-xl text-gold">{e.score}</b></span>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
