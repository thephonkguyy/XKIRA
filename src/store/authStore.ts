import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface UserInfo {
  id: string;
  username: string;
  email: string;
}

export interface ActiveSession {
  id: string;
  userAgent: string;
  ip: string;
  createdAt: number;
  lastActive: number;
  isCurrent: boolean;
}

interface AuthState {
  token: string | null;
  user: UserInfo | null;
  sessions: ActiveSession[];
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  signUp: (username: string, email: string, password: string) => Promise<boolean>;
  signIn: (usernameOrEmail: string, password: string) => Promise<boolean>;
  guestSignIn: () => Promise<void>;
  signOut: () => Promise<void>;
  checkAuth: () => Promise<void>;
  fetchSessions: () => Promise<void>;
  revokeSession: (sessionId: string) => Promise<void>;
  revokeOtherSessions: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      sessions: [],
      isLoading: false,
      isInitialized: false,
      error: null,

      clearError: () => set({ error: null }),

      signUp: async (username, email, password) => {
        set({ isLoading: true, error: null });
        try {
          const res = await fetch("/api/auth/signup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, email, password }),
          });
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || "Sign up failed.");
          }
          set({ token: data.token, user: data.user, isLoading: false, isInitialized: true });
          return true;
        } catch (err: any) {
          set({ error: err.message || "Sign up failed.", isLoading: false });
          return false;
        }
      },

      signIn: async (usernameOrEmail, password) => {
        set({ isLoading: true, error: null });
        try {
          const res = await fetch("/api/auth/signin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ usernameOrEmail, password }),
          });
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || "Sign in failed.");
          }
          set({ token: data.token, user: data.user, isLoading: false, isInitialized: true });
          return true;
        } catch (err: any) {
          set({ error: err.message || "Sign in failed.", isLoading: false });
          return false;
        }
      },

      guestSignIn: async () => {
        set({ isLoading: true, error: null });
        try {
          const res = await fetch("/api/auth/guest", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          });
          const data = await res.json();
          if (res.ok && data.success) {
            set({ token: data.token, user: data.user, isLoading: false, isInitialized: true });
          } else {
            throw new Error(data.error || "Guest initialization failed.");
          }
        } catch (err: any) {
          console.error("Local Guest Session fallback initialization failed:", err);
          // Hard fallback token in memory if backend itself is loading/restarting
          set({
            token: "guest_local_memory_fallback",
            user: { id: "guest_user", username: "Local Guest", email: "guest@xkira.local" },
            isLoading: false,
            isInitialized: true,
          });
        }
      },

      signOut: async () => {
        const { token } = get();
        if (token && !token.startsWith("guest_")) {
          try {
            await fetch("/api/auth/signout", {
              method: "POST",
              headers: { Authorization: `Bearer ${token}` },
            });
          } catch (err) {
            console.error("Sign out api call failed:", err);
          }
        }
        
        // Reset state, but immediately boot back up a fresh local Guest session!
        set({ token: null, user: null, sessions: [], error: null, isInitialized: false });
        await get().guestSignIn();
      },

      checkAuth: async () => {
        const { token } = get();
        
        if (!token) {
          // If no token exists, immediately trigger guest session
          await get().guestSignIn();
          return;
        }

        if (token.startsWith("guest_")) {
          // Guest token is already valid local-first
          set({
            user: { id: "guest_user", username: "Local Guest", email: "guest@xkira.local" },
            isInitialized: true,
          });
          return;
        }

        try {
          const res = await fetch("/api/auth/me", {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json();
          if (res.ok && data.success) {
            set({ user: data.user, isInitialized: true });
          } else {
            // Token is invalid or expired - fall back to fresh guest session!
            await get().guestSignIn();
          }
        } catch (err) {
          console.error("Failed to check auth state on startup. Retrying local fallback:", err);
          await get().guestSignIn();
        }
      },

      fetchSessions: async () => {
        const { token } = get();
        if (!token || token.startsWith("guest_")) return;

        try {
          const res = await fetch("/api/auth/sessions", {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json();
          if (res.ok && data.success) {
            set({ sessions: data.sessions });
          }
        } catch (err) {
          console.error("Failed to fetch sessions:", err);
        }
      },

      revokeSession: async (sessionId) => {
        const { token, fetchSessions } = get();
        if (!token) return;

        try {
          const res = await fetch("/api/auth/sessions/revoke", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ sessionId }),
          });
          if (res.ok) {
            await fetchSessions();
          }
        } catch (err) {
          console.error("Failed to revoke session:", err);
        }
      },

      revokeOtherSessions: async () => {
        const { token, fetchSessions } = get();
        if (!token) return;

        try {
          const res = await fetch("/api/auth/sessions/revoke-others", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            await fetchSessions();
          }
        } catch (err) {
          console.error("Failed to revoke other sessions:", err);
        }
      },
    }),
    {
      name: "xkira_auth_storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ token: state.token, user: state.user }),
    }
  )
);
