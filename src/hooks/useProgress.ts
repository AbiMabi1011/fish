import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/identity/AuthProvider";
import { getProgress } from "@/services/progressService";
export function useProgress() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["progress", user?.id], queryFn: getProgress, enabled: !!user });
  return { progress: user ? q.data ?? null : null, refresh: () => qc.invalidateQueries({ queryKey: ["progress"] }) };
}
