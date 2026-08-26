/**
 * SM Planner — Inactivity Timeout Hook
 * 
 * Automatically logs out user after 30 minutes of idle time to safeguard
 * sacred and sensitive ecclesiastical data.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

const INACTIVITY_LIMIT_MS = 30 * 60 * 1000; // 30 minutes

export function useInactivityTimeout() {
  const { isAuthenticated, clearSession } = useAuthStore();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleLogout = useCallback(() => {
    if (!isAuthenticated) return;
    toast.error('Session expired due to 30 minutes of inactivity. Please sign in again.', {
      duration: 6000,
      id: 'inactivity-timeout-toast',
    });
    clearSession();
    if (window.location.pathname !== '/login') {
      window.location.href = '/login?reason=inactivity';
    }
  }, [isAuthenticated, clearSession]);

  const resetTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    if (isAuthenticated) {
      timerRef.current = setTimeout(handleLogout, INACTIVITY_LIMIT_MS);
    }
  }, [isAuthenticated, handleLogout]);

  useEffect(() => {
    if (!isAuthenticated) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    // List of active user interaction events
    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    
    // Reset timer on any event
    const handleActivity = () => {
      resetTimer();
    };

    events.forEach((evt) => {
      window.addEventListener(evt, handleActivity, { passive: true });
    });

    // Start initial timer
    resetTimer();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach((evt) => {
        window.removeEventListener(evt, handleActivity);
      });
    };
  }, [isAuthenticated, resetTimer]);
}
