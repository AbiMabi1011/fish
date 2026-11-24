/**
 * Pure helper functions for 2-player online duels.
 */
import type { Duel } from "@/services/duelService";

export const DUEL_ROUNDS = 10;

/** Maps the duel room into "me" and "opponent" from the current user's perspective. */
export function duelPlayers(duel: Duel, userId: string) {
  const isHost = userId === duel.host_id;

  const me = {
    name: isHost ? duel.host_name : duel.guest_name,
    score: isHost ? duel.host_score : duel.guest_score,
    round: isHost ? duel.host_round : duel.guest_round,
    lives: isHost ? duel.host_lives : duel.guest_lives,
  };

  const opponent = {
    name: isHost ? duel.guest_name : duel.host_name,
    score: isHost ? duel.guest_score : duel.host_score,
    round: isHost ? duel.guest_round : duel.host_round,
    lives: isHost ? duel.guest_lives : duel.host_lives,
  };

  return { host: isHost, me, opponent };
}

/** Returns the end-of-match message comparing both players' scores. */
export function duelResult(myScore: number, opponentScore: number) {
  if (myScore === opponentScore) return "It's a draw!";
  if (myScore > opponentScore) return "You won!";
  return "Your opponent won!";
}
