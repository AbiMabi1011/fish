/**
 * React hook for Single-Player mode.
 * Connects the UI to the backend GameEngine via /api/solo endpoints.
 */
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { GameEngine, type GameEvents, type GameState } from "./GameEngine";
import { api } from "@/services/localApi";
import { useAuth } from "@/identity/AuthProvider";

interface GameHandlers {
  onAnswered?: (result: GameEvents["answered"]) => void;
  onGameOver?: (result: GameEvents["gameOver"]) => void;
}

export function useGame(handlers: GameHandlers) {
  const { user } = useAuth();
  const [state, setState] = useState<GameState>(GameEngine.initialState());

  const snapshotRef = useRef<any>(null);
  const revisionRef = useRef(-1);
  const lastAnswerEventRef = useRef(0);
  const finishedGameIdRef = useRef("");
  const busyRef = useRef(false);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  function applyServerSnapshot(snapshot: any) {
    if (snapshot.revision < revisionRef.current) return;

    revisionRef.current = snapshot.revision;
    snapshotRef.current = snapshot;
    setState(snapshot.state);

    if (snapshot.answer && snapshot.eventId > lastAnswerEventRef.current) {
      lastAnswerEventRef.current = snapshot.eventId;
      handlersRef.current.onAnswered?.(snapshot.answer);
    }

    if (
      snapshot.state.phase === "over" &&
      finishedGameIdRef.current !== snapshot.gameId
    ) {
      finishedGameIdRef.current = snapshot.gameId;
      handlersRef.current.onGameOver?.({
        ...snapshot.state,
        rounds: snapshot.state.round,
      });
    }
  }

  // Poll the backend every 400ms to keep the timer and game state up to date.
  useEffect(() => {
    let alive = true;
    revisionRef.current = -1;
    lastAnswerEventRef.current = 0;
    finishedGameIdRef.current = "";
    snapshotRef.current = null;
    setState(GameEngine.initialState());

    if (!user) return;

    async function poll() {
      if (busyRef.current) return;
      try {
        const snapshot = await api("/solo");
        if (alive) applyServerSnapshot(snapshot);
      } catch {
        // Polling retries automatically; user actions show errors via toast.
      }
    }

    void poll();
    const timer = setInterval(poll, 400);

    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [user?.id]);

  async function sendCommand(path: string, body: unknown) {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      const snapshot = await api(path, body);
      applyServerSnapshot(snapshot);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not contact the game server.",
      );
    } finally {
      busyRef.current = false;
    }
  }

  function sendAction(action: string, fish?: number) {
    void sendCommand("/solo/action", {
      action,
      gameId: snapshotRef.current?.gameId,
      round: snapshotRef.current?.state.round,
      fish,
    });
  }

  return {
    state,
    start: (stage = 1) => void sendCommand("/solo/start", { stage }),
    pause: () => sendAction("pause"),
    resume: () => sendAction("resume"),
    quit: () => sendAction("quit"),
    retry: () => sendAction("retry"),
    submit: (fish: number) => sendAction("answer", fish),
  };
}
