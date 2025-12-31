import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://ymrfvqzzbpyxssziovdx.supabase.co'
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InltcmZ2cXp6YnB5eHNzemlvdmR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNjEwNDMsImV4cCI6MjA4MjczNzA0M30.gPNWfORMbl1rNycn6pwjLKxZ9XkxEXJHfZkj_VNl_1A'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

