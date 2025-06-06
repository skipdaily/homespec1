// This file adds the env property to the Window interface
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

export {};
