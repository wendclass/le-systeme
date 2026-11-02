import { createClient, SupabaseClient } from '@supabase/supabase-js';

const getEnvVar = (name: string, fallback: string = ''): string => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[name]) {
      return import.meta.env[name];
    }
  } catch {
    // Silencieux
  }
  try {
    if (typeof process !== 'undefined' && process.env && process.env[name]) {
      return process.env[name];
    }
  } catch {
    // Silencieux
  }
  return fallback;
};

export const DEFAULT_SUPABASE_URL =
  getEnvVar('VITE_SUPABASE_URL', 'https://mtinydrkpxffrlsuwpzh.supabase.co');

const ENV_SUPABASE_KEY = getEnvVar('VITE_SUPABASE_ANON_KEY', '');

let cachedClient: SupabaseClient | null = null;
let cachedKey = '';
let cachedUrl = '';

export function getSupabaseClient(customUrl?: string, customKey?: string): SupabaseClient | null {
  const url = customUrl || localStorage.getItem('class_s_supabase_url') || DEFAULT_SUPABASE_URL;
  const key = customKey || localStorage.getItem('class_s_supabase_key') || ENV_SUPABASE_KEY;

  if (!key || key.trim() === '') {
    return null;
  }

  // Return cached client if URL and key haven't changed
  if (cachedClient && cachedKey === key && cachedUrl === url) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    cachedKey = key;
    cachedUrl = url;
  } catch (err) {
    console.warn('Failed to initialize Supabase client:', err);
    return null;
  }

  return cachedClient;
}

export function saveSupabaseConfig(url: string, key: string) {
  if (url) localStorage.setItem('class_s_supabase_url', url);
  if (key) localStorage.setItem('class_s_supabase_key', key);
  // Invalidate cache so next call creates fresh client
  cachedClient = null;
  cachedKey = '';
  cachedUrl = '';
}
