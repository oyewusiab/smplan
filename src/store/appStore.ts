/**
 * App Store — Zustand
 * 
 * Manages global UI state, notifications count, sync status.
 * This is UI/cache state only — Google Sheets is the source of truth.
 */

import { create } from 'zustand';
import type { SyncStatus } from '../types';

interface AppState {
  sidebarOpen: boolean;
  syncStatus: SyncStatus;
  unreadNotifications: number;
  currentPlannerId: string | null;
  theme: 'light' | 'dark';

  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setSyncStatus: (status: SyncStatus) => void;
  setUnreadNotifications: (count: number) => void;
  setCurrentPlannerId: (id: string | null) => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  sidebarOpen: true,
  syncStatus: 'saved',
  unreadNotifications: 0,
  currentPlannerId: null,
  theme: 'light',

  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set({ sidebarOpen: !get().sidebarOpen }),
  setSyncStatus: (status) => set({ syncStatus: status }),
  setUnreadNotifications: (count) => set({ unreadNotifications: count }),
  setCurrentPlannerId: (id) => set({ currentPlannerId: id }),
  setTheme: (theme) => set({ theme }),
}));
