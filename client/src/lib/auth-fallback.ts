import { supabase, getConnectionStatus } from './supabase';

interface AuthState {
  isAuthenticated: boolean;
  user: any;
  lastSync: number;
  expiresAt: number;
}

// Store a session for up to 24 hours in offline mode
const OFFLINE_SESSION_MAX_AGE = 24 * 60 * 60 * 1000; 

export const authFallback = {
  async initialize() {
    // Check if we're online first
    const isOnline = getConnectionStatus();
    if (!isOnline) {
      return this.getLocalAuthState();
    }
    return null;
  },

  setLocalAuthState(session: any) {
    if (!session) return;
    
    // Store minimal user data and an expiration timestamp
    const state: AuthState = {
      isAuthenticated: true,
      user: {
        id: session.user.id,
        email: session.user.email,
        user_metadata: session.user.user_metadata
      },
      lastSync: Date.now(),
      expiresAt: Date.now() + OFFLINE_SESSION_MAX_AGE
    };
    
    localStorage.setItem('auth_fallback', JSON.stringify(state));
  },

  getLocalAuthState(): AuthState | null {
    try {
      const state = localStorage.getItem('auth_fallback');
      if (!state) return null;
      
      const parsedState = JSON.parse(state) as AuthState;
      
      // Check if the session has expired
      if (parsedState.expiresAt < Date.now()) {
        this.clearLocalAuthState();
        return null;
      }
      
      return parsedState;
    } catch (e) {
      console.error("Failed to parse local auth state:", e);
      this.clearLocalAuthState();
      return null;
    }
  },

  clearLocalAuthState() {
    localStorage.removeItem('auth_fallback');
  },
  
  // Use this function in components that need auth state
  async getAuthState() {
    // Try to use Supabase's session first
    try {
      const { data, error } = await supabase.auth.getSession();
      if (!error && data.session) {
        // We're online and authenticated, sync local state
        this.setLocalAuthState(data.session);
        return {
          isAuthenticated: true,
          user: data.session.user,
          isOffline: false
        };
      }
    } catch (e) {
      // Supabase connection likely failed
      console.warn("Using fallback auth due to connection error:", e);
    }
    
    // Fall back to local state if online auth failed
    const localState = this.getLocalAuthState();
    if (localState) {
      return {
        isAuthenticated: true,
        user: localState.user,
        isOffline: true
      };
    }
    
    // Not authenticated in any way
    return {
      isAuthenticated: false,
      user: null,
      isOffline: !getConnectionStatus()
    };
  }
};

// Set up the listener for auth changes to sync with local storage
supabase.auth.onAuthStateChange((event, session) => {
  if (session && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
    authFallback.setLocalAuthState(session);
  } else if (event === 'SIGNED_OUT') {
    authFallback.clearLocalAuthState();
  }
});
