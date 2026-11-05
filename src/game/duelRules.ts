/** Pure presentation projections for a server-scored online duel. */
import type { Duel } from "@/services/duelService";
export const DUEL_ROUNDS = 10;
export function duelPlayers(duel: Duel, userId: string) {
  const host = userId === duel.host_id;
  return {
    host,
    me: { name: host ? duel.host_name : duel.guest_name, score: host ? duel.host_score : duel.guest_score, round: host ? duel.host_round : duel.guest_round, lives: host ? duel.host_lives : duel.guest_lives },
    opponent: { name: host ? duel.guest_name : duel.host_name, score: host ? duel.guest_score : duel.host_score, round: host ? duel.guest_round : duel.host_round, lives: host ? duel.guest_lives : duel.host_lives },
  };
}
export function duelResult(myScore: number, opponentScore: number) {
  return myScore === opponentScore ? "It's a draw!" : myScore > opponentScore ? "You won!" : "Your opponent won!";
}