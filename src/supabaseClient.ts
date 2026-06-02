import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://bdgabcybokolveidmelo.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZ2FiY3lib2tvbHZlaWRtZWxvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzNzIzOTAsImV4cCI6MjA5NTk0ODM5MH0.gUgjgB8idncNJklufEhdFUHP92Bjcmc6hPprGCgQBKs';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
