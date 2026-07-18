import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { setAuthToken, setUnauthorizedHandler } from "@/lib/api/client";
import { authApi } from "@/lib/api/auth";
import { decodeJwt, isExpired } from "./jwt";

const TOKEN_KEY = "replyon.token";

interface AuthUser {
  email: string | null;
  userId: number | null;
  tenantId: number | null;
}

interface AuthContextValue {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  /** True until the token is hydrated from storage on the client. */
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) return null;
    if (isExpired(decodeJwt(token))) {
      window.localStorage.removeItem(TOKEN_KEY);
      return null;
    }
    return token;
  } catch {
    return null;
  }
}

function userFromToken(token: string | null): AuthUser | null {
  if (!token) return null;
  const claims = decodeJwt(token);
  if (!claims) return null;
  return {
    email: claims.sub ?? null,
    userId: claims.user_id ?? null,
    tenantId: claims.tenant_id ?? null,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Avoid re-running the logout side effects redundantly.
  const tokenRef = useRef<string | null>(null);

  const applyToken = useCallback((next: string | null) => {
    tokenRef.current = next;
    setToken(next);
    setAuthToken(next);
    if (typeof window !== "undefined") {
      if (next) window.localStorage.setItem(TOKEN_KEY, next);
      else window.localStorage.removeItem(TOKEN_KEY);
    }
  }, []);

  const logout = useCallback(() => {
    if (tokenRef.current === null) return;
    applyToken(null);
  }, [applyToken]);

  // Hydrate from storage on the client after mount.
  useEffect(() => {
    applyToken(readStoredToken());
    setIsLoading(false);
    setUnauthorizedHandler(logout);
    return () => setUnauthorizedHandler(null);
  }, [applyToken, logout]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await authApi.login({ email, password });
      applyToken(res.access_token);
    },
    [applyToken],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      user: userFromToken(token),
      isAuthenticated: token !== null,
      isLoading,
      login,
      logout,
    }),
    [token, isLoading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
