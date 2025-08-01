import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPA_URL
const supabaseKey = process.env.EXPO_PUBLIC_SUPA_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials')
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

// Export types for user management
export interface SupabaseUser {
  id: string
  email: string
  name?: string
  username?: string
  avatar_url?: string
  created_at: string
  updated_at: string
}

export interface SupabaseProfile {
  id: string
  email: string
  name?: string
  username?: string
  avatar_url?: string
  created_at: string
  updated_at: string
  spirit_vector?: string
} 