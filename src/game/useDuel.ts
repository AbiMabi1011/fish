import { useCallback, useEffect, useRef, useState } from "react";
import { answerDuel, readDuel, readDuelPuzzle, watchDuel, type Duel, type DuelPuzzle } from "@/services/duelService";
import { duelPlayers, DUEL_ROUNDS } from "./duelRules";

export function useDuel(id: string | null, userId: string | undefined) {
  const [duel, setDuel] = useState<Duel | null>(null);
  const [puzzle, setPuzzle] = useState<DuelPuzzle | null>(null);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());
  const lock = useRef(false);
  const activeId = useRef(id);
  activeId.current = id;
  const refresh = useCallback(async () => {
    if (!id) return;
    try {
      const room = await readDuel(id);
      if (activeId.current !== id) return;
      setDuel(room);
      setError("");
    } catch (e) { setError(e instanceof Error ? e.message : "Connection lost. Reconnecting…"); }
  }, [id]);
  useEffect(() => {
    setDuel(null); setPuzzle(null); setFeedback("");
    if (!id) return;
    void refresh();
  }, [id, refresh]);
  const players = duel && userId ? duelPlayers(duel, userId) : null;
  const round = players?.me.round;
  const status = duel?.status;
  const lives = players?.me.lives;
  useEffect(() => {
    if (!id || status === "finished") return;
    return watchDuel(id, () => void refresh());
  }, [id, status, refresh]);
  useEffect(() => {
    setPuzzle(null);
    if (!id || status !== "playing" || !lives || round === undefined || round >= DUEL_ROUNDS) return;
    let cancelled = false;
    const load = async () => {
      try { const p = await readDuelPuzzle(id); if (!cancelled) { setPuzzle(p); setError(""); } }
      catch { if (!cancelled) setError("Couldn't load the picture. Retrying…"); }
    };
    void load();
    const retry = setInterval(() => void load(), 5000);
    return () => { cancelled = true; clearInterval(retry); };
  }, [id, status, round, lives]);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 200); return () => clearInterval(timer); }, []);
  const startsAt = puzzle ? Date.parse(puzzle.startsAt) : 0;
  const countdown = Math.max(0, Math.ceil((startsAt - now) / 1000));
  const timeLeft = puzzle ? Math.max(0, Math.ceil((startsAt + puzzle.seconds * 1000 - now) / 1000)) : 0;
  const submit = useCallback(async (answer: number) => {
    if (!id || !puzzle || lock.current || countdown > 0) return;
    lock.current = true; setBusy(true);
    try {
      const result = await answerDuel(id, puzzle.round, answer);
      setFeedback(result.correct ? `Correct! +${result.points}` : `Not quite. There were ${result.expected} fish.`);
      setPuzzle(null);
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Couldn't submit. Try again."); }
    finally { lock.current = false; setBusy(false); }
  }, [id, puzzle, countdown, refresh]);
  useEffect(() => { if (puzzle && timeLeft === 0 && countdown === 0 && !busy) void submit(-1); }, [puzzle, timeLeft, countdown, busy, submit]);
  const accepting = !!puzzle && countdown === 0 && timeLeft > 0 && !busy && status === "playing";
  useEffect(() => {
    if (!accepting) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || !/^[0-9]$/.test(event.key)) return;
      event.preventDefault(); void submit(Number(event.key));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [accepting, submit]);
  return { duel, players, puzzle, countdown, timeLeft, error, feedback, accepting, submit, refresh };
}