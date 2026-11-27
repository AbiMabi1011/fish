/**
 * React hook for 2-Player Online Duel mode.
 * Polls the room state, loads the current round's Fish API puzzle,
 * manages the 15-second countdown timer, and handles answer submission.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  answerDuel,
  readDuel,
  readDuelPuzzle,
  watchDuel,
  type Duel,
  type DuelPuzzle,
} from "@/services/duelService";
import { duelPlayers, DUEL_ROUNDS } from "./duelRules";

export function useDuel(roomId: string | null, userId: string | undefined) {
  const [duel, setDuel] = useState<Duel | null>(null);
  const [puzzle, setPuzzle] = useState<DuelPuzzle | null>(null);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());

  const submitLock = useRef(false);
  const activeRoomId = useRef(roomId);
  activeRoomId.current = roomId;

  // Fetch the latest room scoreboard and status from the backend.
  const refresh = useCallback(async () => {
    if (!roomId) return;
    try {
      const room = await readDuel(roomId);
      if (activeRoomId.current !== roomId) return;
      setDuel(room);
      setError("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Connection lost. Reconnecting…",
      );
    }
  }, [roomId]);

  // Reset local state whenever the player enters or leaves a room.
  useEffect(() => {
    setDuel(null);
    setPuzzle(null);
    setFeedback("");
    if (!roomId) return;
    void refresh();
  }, [roomId, refresh]);

  // Keep polling the room every 1 second so both players stay in sync
  // (including Play Again / rematch requests after a match ends).
  useEffect(() => {
    if (!roomId) return;
    return watchDuel(roomId, () => void refresh());
  }, [roomId, refresh]);

  const players = duel && userId ? duelPlayers(duel, userId) : null;
  const round = players?.me.round;
  const status = duel?.status;
  const lives = players?.me.lives;

  // Fetch the current round's puzzle whenever the round or match status changes.
  useEffect(() => {
    setPuzzle(null);
    const canPlayRound =
      !!roomId &&
      status === "playing" &&
      !!lives &&
      round !== undefined &&
      round < DUEL_ROUNDS;

    if (!canPlayRound) return;

    let cancelled = false;

    async function loadPuzzle() {
      try {
        const nextPuzzle = await readDuelPuzzle(roomId!);
        if (!cancelled) {
          setPuzzle(nextPuzzle);
          setError("");
        }
      } catch {
        if (!cancelled) setError("Couldn't load the picture. Retrying…");
      }
    }

    void loadPuzzle();
    const retryTimer = setInterval(() => void loadPuzzle(), 5000);

    return () => {
      cancelled = true;
      clearInterval(retryTimer);
    };
  }, [roomId, status, round, lives]);

  // Update the local clock every 200ms so the countdown and timer bar stay smooth.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(timer);
  }, []);

  const startsAt = puzzle ? Date.parse(puzzle.startsAt) : 0;
  const countdown = Math.max(0, Math.ceil((startsAt - now) / 1000));
  const timeLeft = puzzle
    ? Math.max(0, Math.ceil((startsAt + puzzle.seconds * 1000 - now) / 1000))
    : 0;

  const submit = useCallback(
    async (answer: number) => {
      if (!roomId || !puzzle || submitLock.current || countdown > 0) return;

      submitLock.current = true;
      setBusy(true);
      try {
        const result = await answerDuel(roomId, puzzle.round, answer);
        setFeedback(
          result.correct
            ? `Correct! +${result.points}`
            : `Not quite. There were ${result.expected} fish.`,
        );
        setPuzzle(null);
        await refresh();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Couldn't submit. Try again.",
        );
      } finally {
        submitLock.current = false;
        setBusy(false);
      }
    },
    [roomId, puzzle, countdown, refresh],
  );

  // Automatically submit a timeout (-1) when the round timer hits 0.
  useEffect(() => {
    if (puzzle && timeLeft === 0 && countdown === 0 && !busy) {
      void submit(-1);
    }
  }, [puzzle, timeLeft, countdown, busy, submit]);

  const accepting =
    !!puzzle &&
    countdown === 0 &&
    timeLeft > 0 &&
    !busy &&
    status === "playing";

  // Allow pressing 0-9 on the keyboard to answer quickly during a round.
  useEffect(() => {
    if (!accepting) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (
        event.repeat ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        !/^[0-9]$/.test(event.key)
      ) {
        return;
      }
      event.preventDefault();
      void submit(Number(event.key));
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [accepting, submit]);

  return {
    duel,
    players,
    puzzle,
    countdown,
    timeLeft,
    error,
    feedback,
    accepting,
    submit,
    refresh,
  };
}
