import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

let supabaseInstance: any = null

const getSupabaseClient = () => {
  if (supabaseInstance) {
    return supabaseInstance
  }

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPA_URL
  const supabaseKey = process.env.EXPO_PUBLIC_SUPA_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.warn('Missing Supabase credentials - client not initialized')
    return null
  }

  supabaseInstance = createClient(supabaseUrl, supabaseKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  })

  return supabaseInstance
}

export const supabase = {
  get client() {
    return getSupabaseClient()
  },
}

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