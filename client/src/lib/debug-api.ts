// Debug utility for auth and API issues
import { supabase } from './supabase';
import { authFallback } from './auth-fallback';

export async function debugAuth() {
  console.group('Auth Debugging Information');
  
  // Check Supabase session
  const { data: { session } } = await supabase.auth.getSession();
  console.log('Supabase Session:', {
    exists: !!session,
    userId: session?.user?.id,
    email: session?.user?.email,
    expiresAt: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
  });

  // Check local auth fallback
  const localAuth = authFallback.getLocalAuthState();
  console.log('Local Auth Fallback:', {
    exists: !!localAuth,
    userId: localAuth?.user?.id,
    email: localAuth?.user?.email,
    expiresAt: localAuth?.expiresAt ? new Date(localAuth.expiresAt).toISOString() : null,
  });

  // Check auth state from the combined method
  const authState = await authFallback.getAuthState();
  console.log('Combined Auth State:', {
    isAuthenticated: authState.isAuthenticated,
    isOffline: authState.isOffline,
    userId: authState.user?.id,
    email: authState.user?.email,
  });

  console.groupEnd();
  
  return {
    hasSupabaseSession: !!session,
    hasLocalAuth: !!localAuth,
    isAuthenticated: authState.isAuthenticated,
    isOffline: authState.isOffline,
    userId: session?.user?.id || localAuth?.user?.id || authState.user?.id,
  };
}

// Test API endpoints with auth headers
export async function testApiEndpoints() {
  console.group('API Endpoint Tests');
  
  // Get userId for headers
  const { data: { session } } = await supabase.auth.getSession();
  const authState = await authFallback.getAuthState();
  const userId = session?.user?.id || authState.user?.id;
  
  if (!userId) {
    console.error('No user ID available for API tests');
    console.groupEnd();
    return { success: false, error: 'No user ID available' };
  }
  
  // Define test endpoints
  const endpoints = [
    '/api/projects',
    '/api/projects/550e8400-e29b-41d4-a716-446655440000/conversations',
  ];
  
  const results = {};
  
  for (const endpoint of endpoints) {
    try {
      console.log(`Testing endpoint: ${endpoint}`);
      const response = await fetch(endpoint, {
        headers: {
          'X-User-ID': userId,
        },
      });
      
      const status = response.status;
      const ok = response.ok;
      let body = null;
      
      try {
        body = await response.json();
      } catch (e) {
        // Ignore JSON parse errors
      }
      
      results[endpoint] = { status, ok, body };
      console.log(`Result for ${endpoint}:`, { status, ok });
    } catch (error) {
      results[endpoint] = { error: error.message };
      console.error(`Error testing ${endpoint}:`, error);
    }
  }
  
  console.groupEnd();
  return { success: true, results };
}
