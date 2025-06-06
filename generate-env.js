// This file ensures that environment variables are correctly loaded in Vercel
// Place this in the root of your project
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env files
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env.production' });

const __dirname = dirname(fileURLToPath(import.meta.url));

// Create a file with environment variables for the client
const clientEnv = {
  VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY,
  NODE_ENV: process.env.NODE_ENV || 'production',
  FRONTEND_URL: process.env.FRONTEND_URL || 'https://homespec-skipdaily.vercel.app'
};

// Write the environment variables to a file that will be available to the client
writeFileSync(
  resolve(__dirname, './client/env.js'),
  `window.env = ${JSON.stringify(clientEnv)}`
);

console.log('Environment variables generated for client');
