import { createClient } from '@supabase/supabase-js';

const defaultUrl = 'https://ivyujdcwvbjoaqpzvuyv.supabase.co';
const defaultKey = 'sb_publishable_KVZzm404mrwKsWyuqaeCNg_3nUoz84N';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_URL.startsWith('http') 
  ? import.meta.env.VITE_SUPABASE_URL 
  : defaultUrl;
  
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY && import.meta.env.VITE_SUPABASE_ANON_KEY.length > 10
  ? import.meta.env.VITE_SUPABASE_ANON_KEY 
  : defaultKey;

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);