import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

// Type definition for window.env
interface EnvVariables {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
  NODE_ENV?: string;
  FRONTEND_URL?: string;
  [key: string]: string | undefined;
}

declare global {
  interface Window {
    env?: EnvVariables;
  }
}

// Try to get environment variables from different sources
const getEnvVar = (key: string): string => {
  // Check if window.env exists (our generated env.js file)
  if (typeof window !== 'undefined' && window.env && window.env[key]) {
    return window.env[key] as string;
  }
  // Check Vite's import.meta.env
  if (import.meta.env && import.meta.env[key]) {
    return import.meta.env[key] as string;
  }
  // Fallback for Supabase URL and key for deployed environments
  if (key === 'VITE_SUPABASE_URL') {
    return 'https://dxzsvrxwpfqddatmelzb.supabase.co';
  }
  if (key === 'VITE_SUPABASE_ANON_KEY') {
    return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4enN2cnh3cGZxZGRhdG1lbHpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk3Njc0OTQsImV4cCI6MjA1NTM0MzQ5NH0.sOWDKWEN2DVEgCpdbHy7b8xYW4zTI71C4oirhczgPYM';
  }
  throw new Error(`Missing environment variable: ${key}`);
};

// Get Supabase credentials from environment
const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY');

// Allow local HTTP URL during development; in production require HTTPS.
if (import.meta.env.DEV) {
  if (!supabaseUrl.startsWith("http://") && !supabaseUrl.startsWith("https://")) {
    console.error("VITE_SUPABASE_URL must start with 'http://' or 'https://' in development");
  }
} else if (!supabaseUrl.startsWith("https://")) {
  console.error("VITE_SUPABASE_URL must start with 'https://' in production");
}

// Connectivity status tracking
let isSupabaseConnected = true;
export const getConnectionStatus = () => isSupabaseConnected;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce'
    },
    global: {
      headers: {
        'X-Client-Info': typeof import.meta.env.VITE_APP_NAME === 'string' ? import.meta.env.VITE_APP_NAME : 'homespec-tracker'
      },
      // Add custom fetch handler to track connection status with retries
      fetch: async (url, options = {}) => {
        // Configure retry logic for connection issues
        const MAX_RETRIES = 2;
        const RETRY_DELAY = 1000; // 1 second
        
        let retries = 0;
        let lastError: Error | null = null;
        
        while (retries <= MAX_RETRIES) {
          try {
            // Add a timeout to the fetch request
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
            
            const mergedOptions = {
              ...options,
              signal: controller.signal
            };
            
            const response = await fetch(url, mergedOptions);
            clearTimeout(timeoutId);
            
            if (response.ok) {
              isSupabaseConnected = true;
            }
            return response;
          } catch (error: any) {
            lastError = error;
            console.warn(`Supabase connection attempt ${retries + 1}/${MAX_RETRIES + 1} failed:`, error);
            
            // Don't retry if the error is an abort (timeout or user cancellation)
            if (error.name === 'AbortError') {
              break;
            }
            
            if (retries < MAX_RETRIES) {
              await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
              retries++;
            } else {
              break;
            }
          }
        }
        
        isSupabaseConnected = false;
        console.error('Supabase connection failed after retries:', lastError);
        
        // Emit a custom event that components can listen for
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('supabase-connection-error', { 
            detail: { error: lastError?.message } 
          }));
        }
        
        throw lastError;
      }
    }
});

export type SupabaseClient = typeof supabase;

export async function getCurrentSession() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession(); 
    if (error) {
      console.error("Session retrieval error:", error.message);
      return null;
    }
    return session;
  } catch (e) {
    console.error("Failed to get session:", e);
    return null;
  }
}

export async function testSupabaseConnection() {
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/`, { 
      headers: { apikey: supabaseAnonKey },
      // Add cache busting to prevent cached responses
      cache: 'no-store'
    });
    if (!res.ok) throw new Error(`Status: ${res.status}`);
    console.log("Supabase connection test: success");
    isSupabaseConnected = true;
    return true;
  } catch (e) {
    console.error("Supabase connection test failed:", e);
    isSupabaseConnected = false;
    return false;
  }
}

// DNS helper to check if connectivity issues might be DNS-related
export async function checkDnsResolution() {
  const domains = [
    'google.com',
    'cloudflare.com',
    'github.com'
  ];
  
  try {
    // Try to fetch multiple domains to test general DNS resolution
    await Promise.all(domains.map(domain => 
      fetch(`https://${domain}/favicon.ico`, { 
        mode: 'no-cors',
        cache: 'no-store'
      })
    ));
    return true;
  } catch (e) {
    console.error("DNS resolution test failed:", e);
    return false;
  }
}
