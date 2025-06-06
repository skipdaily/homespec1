import { useState, useEffect } from 'react';
import { authFallback } from '@/lib/auth-fallback';
import { getConnectionStatus, testSupabaseConnection } from '@/lib/supabase';

export function useAuthState() {
  const [authState, setAuthState] = useState({
    isAuthenticated: false,
    user: null,
    isOffline: false,
    isLoading: true
  });
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);

  // Update auth state
  const refreshAuthState = async () => {
    const state = await authFallback.getAuthState();
    setAuthState({
      ...state,
      isLoading: false
    });
  };

  // Manual connection check
  const checkConnection = async () => {
    if (isCheckingConnection) return;
    setIsCheckingConnection(true);
    
    try {
      await testSupabaseConnection();
      // If we're back online, refresh auth state to use online data
      refreshAuthState();
    } finally {
      setIsCheckingConnection(false);
    }
  };

  useEffect(() => {
    refreshAuthState();

    // Listen for connection errors
    const handleConnectionError = () => {
      setAuthState(prev => ({ ...prev, isOffline: true }));
    };

    window.addEventListener('supabase-connection-error', handleConnectionError);
    
    return () => {
      window.removeEventListener('supabase-connection-error', handleConnectionError);
    };
  }, []);

  return {
    ...authState,
    isOnline: getConnectionStatus(),
    isCheckingConnection,
    checkConnection,
    refreshAuthState
  };
}
