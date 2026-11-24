/**
 * AuthProvider: keeps track of the signed-in user using server HttpOnly cookies.
 */
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api } from "@/services/localApi";
import { getAvatar, type AvatarId } from "./avatars";

export interface LocalUser {
  id: string;
  email: string;
  display_name: string;
  avatar_id: string;
}

interface AuthContextValue {
  user: LocalUser | null;
  displayName: string | null;
  avatar: ReturnType<typeof getAvatar>;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
  selectAvatar: (id: AvatarId) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    const data = await api("/auth/me");
    setUser(data.user);
  }

  useEffect(() => {
    refresh()
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  async function signOut() {
    await api("/auth/logout", {});
    setUser(null);
  }

  async function selectAvatar(id: AvatarId) {
    const updatedUser = await api("/auth/avatar", { avatar: id });
    setUser(updatedUser);
  }

  const value: AuthContextValue = {
    user,
    displayName: user?.display_name ?? null,
    avatar: getAvatar(user?.avatar_id),
    loading,
    refresh,
    signOut,
    selectAvatar,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("Missing AuthProvider");
  }
  return context;
}
