import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://demo.supabase.co' // replace later with your URL
const supabaseAnonKey = 'demo-anon-key' // replace later with your anon key

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
