import { createClient } from '@supabase/supabase-js'
import { env } from './env.js'

// Gunakan Service Role Key untuk operasi backend yang aman (bypasses RLS di server)
export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

