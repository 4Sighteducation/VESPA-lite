import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.warn('[VESPA Lite] Supabase env vars missing. Check .env.local or Vercel.')
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '')
