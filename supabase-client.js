// supabase-client.js (module)
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

export const SUPA_URL = 'https://uwpbzsqqsjdbglwpmfsu.supabase.co'
export const SUPA_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3cGJ6c3Fxc2pkYmdsd3BtZnN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4ODIyNDAsImV4cCI6MjA3OTQ1ODI0MH0.oMFQb9CTt63ipOJCtAlzyZ4qZiRLwIqiciobGZlmnHc'

export const supabase = createClient(SUPA_URL, SUPA_ANON)
