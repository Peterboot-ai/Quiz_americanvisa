import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL!;
const anonKey = process.env.SUPABASE_ANON_KEY!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Client for public/anon operations (respects RLS)
export const supabaseAnon = createClient(url, anonKey);

// Client for server-side operations (bypasses RLS — always filter by tenant_id manually)
export const supabase = createClient(url, serviceRoleKey);
