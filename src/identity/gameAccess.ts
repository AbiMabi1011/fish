/** Access rule shared by play actions and tests; identity validation lives in auth. */
export function canPlayGame(user: { id: string } | null | undefined): boolean {
  return !!user?.id;
}