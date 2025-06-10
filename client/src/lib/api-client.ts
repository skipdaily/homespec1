import { authFallback } from './auth-fallback';
import { supabase } from './supabase';

/**
 * Custom fetch wrapper that automatically adds auth headers
 * including the X-User-ID header required by the server
 */
export async function apiFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // Get current session from supabase first, with fallback to local storage
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  
  // Use fallback if no active session
  let authState = null;
  if (!userId) {
    authState = await authFallback.getAuthState();
  }
  
  // Prepare headers
  const headers = new Headers(options.headers);
  
  // Add user ID header - first try supabase session, then fallback
  if (userId) {
    headers.set('X-User-ID', userId);
    console.log('Using Supabase session user ID:', userId);
  } else if (authState?.isAuthenticated && authState?.user?.id) {
    headers.set('X-User-ID', authState.user.id);
    console.log('Using fallback auth user ID:', authState.user.id);
  } else {
    console.warn('No user ID available for API request');
  }
  
  // Create new options with updated headers
  const newOptions = {
    ...options,
    headers,
    credentials: 'include' as RequestCredentials
  };

  try {
    console.log(`API Request: ${url}`, { 
      method: options.method || 'GET',
      hasUserId: headers.has('X-User-ID')
    });
    const response = await fetch(url, newOptions);
    
    if (!response.ok) {
      console.error(`API Error: ${response.status} ${response.statusText}`, { url });
      const errorText = await response.text();
      console.error('API Error Details:', errorText);
    }
    
    return response;
  } catch (error) {
    console.error('API request failed:', error, { url });
    throw error;
  }
}

/**
 * Helper method for GET requests
 */
export async function apiGet<T = any>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await apiFetch(url, {
    ...options,
    method: 'GET'
  });
  
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Helper method for POST requests
 */
export async function apiPost<T = any>(
  url: string, 
  data: any,
  options: RequestInit = {}
): Promise<T> {
  const response = await apiFetch(url, {
    ...options,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    body: JSON.stringify(data)
  });
  
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Helper method for PUT requests
 */
export async function apiPut<T = any>(
  url: string, 
  data: any,
  options: RequestInit = {}
): Promise<T> {
  const response = await apiFetch(url, {
    ...options,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    body: JSON.stringify(data)
  });
  
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Helper method for DELETE requests
 */
export async function apiDelete<T = any>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await apiFetch(url, {
    ...options,
    method: 'DELETE'
  });
  
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}
