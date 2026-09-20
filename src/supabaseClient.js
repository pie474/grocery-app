import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Simplified auth model: everyone in the family uses the same household
// id (set in .env), so there's no login screen. See schema.sql notes on
// RLS if you want to lock this down further later.
export const HOUSEHOLD_ID = import.meta.env.VITE_HOUSEHOLD_ID
