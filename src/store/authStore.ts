/**
 * SM Planner — Auth Store — Zustand
 * 
 * Manages the authenticated session in browser memory.
 * The session token is validated against Google Apps Script on protected calls.
 * 
 * Storage: sessionStorage (cleared on tab close) — NOT localStorage as authoritative DB.
 * Google Sheets remains the source of truth for all user data.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AuthSession, UserRole } from '../types';
import { can, canAccessRoute, type PermissionKey } from '../utils/permissions';

interface AuthState {
  session: AuthSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  setSession: (session: AuthSession) => void;
  updateSession: (partial: Partial<AuthSession>) => void;
  clearSession: () => void;
  setLoading: (loading: boolean) => void;
  hasRole: (roles: UserRole[]) => boolean;
  canAccess: (requiredRoles: UserRole[]) => boolean;
  can: (permission: PermissionKey) => boolean;
  canRoute: (path: string) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      session: null,
      isAuthenticated: false,
      isLoading: false,

      setSession: (session) =>
        set({ session, isAuthenticated: true, isLoading: false }),

      updateSession: (partial) =>
        set((state) => ({
          session: state.session ? { ...state.session, ...partial } : null,
        })),

      clearSession: () =>
        set({ session: null, isAuthenticated: false, isLoading: false }),

      setLoading: (loading) => set({ isLoading: loading }),

      hasRole: (roles) => {
        const { session } = get();
        if (!session) return false;
        return roles.includes(session.role);
      },

      canAccess: (requiredRoles) => {
        const { session } = get();
        if (!session) return false;
        if (session.role === 'ADMIN') return true; // ADMIN has full access
        return requiredRoles.includes(session.role);
      },

      can: (permission) => {
        const { session } = get();
        if (!session) return false;
        return can(session.role, permission);
      },

      canRoute: (path) => {
        const { session } = get();
        if (!session) return false;
        return canAccessRoute(session.role, path);
      },
    }),
    {
      name: 'sm-planner-auth',
      storage: createJSONStorage(() => sessionStorage),
      // Only persist session, not loading state
      partialize: (state) => ({
        session: state.session,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
