import { useAppStore } from '@/features/stores'
import { searchPeople as supabaseSearchPeople } from '@/features/supabase/search'
import { createClient } from '@supabase/supabase-js'

// Create Supabase client for search history operations
const supabaseUrl = process.env.EXPO_PUBLIC_SUPA_URL
const supabaseKey = process.env.EXPO_PUBLIC_SUPA_KEY

if (!supabaseUrl || !supabaseKey) {
  console.warn('Missing Supabase credentials - search history not available')
  // Return a mock client that does nothing
  const mockSupabase = {
    from: () => ({ 
      select: () => ({ eq: () => ({ order: () => ({ limit: async () => ({ data: [], error: null }) }) }) }),
      insert: async () => ({ data: null, error: new Error('Supabase not configured') }),
      delete: () => ({ eq: async () => ({ error: new Error('Supabase not configured') }) })
    })
  }
  var supabase = mockSupabase as any
} else {
  var supabase = createClient(supabaseUrl, supabaseKey)
}

export interface SearchRequest {
  item_ids: string[]
  user_id: string
  limit?: number
}

export interface PersonResult {
  id: string
  similarityScore: number
  exactMatches: number
  highSimilarityMatches: number
  sharedRefs: string[]
  tier: number
}

export interface SearchResponse {
  results: PersonResult[]
}

export interface SearchHistoryRecord {
  id: string
  user_id: string
  ref_ids: string[]
  ref_titles: string[]
  ref_images: string[]
  search_title: string
  search_subtitle: string
  result_count: number
  search_results: PersonResult[] | null
  created_at: string
  updated_at: string
}

export interface SearchHistoryItem {
  id: string
  user_id: string
  search_ref_ids: string[]
  results_count: number
  created_at: string
}

/**
 * Search for people based on selected items
 */
export async function searchPeople(request: SearchRequest): Promise<SearchResponse> {
  const { user } = useAppStore.getState()

  if (!user) {
    throw new Error('User not authenticated')
  }

  try {
    // Call Supabase search function directly
    const results = await supabaseSearchPeople(request.item_ids, request.user_id, request.limit || 60)
    
    return { results }
  } catch (error) {
    console.error('Error in searchPeople:', error)
    throw error
  }
}

/**
 * Get search history for a user
 */
export async function getSearchHistory(userId: string): Promise<SearchHistoryRecord[]> {
  try {
    const { data, error } = await supabase
      .from('search_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      throw new Error(`Failed to fetch search history: ${error.message}`)
    }

    return data || []
  } catch (error) {
    console.error('Error fetching search history:', error)
    throw error
  }
}

/**
 * Save search to history with ref titles, images, and cached results
 */
export async function saveSearchHistory(
  userId: string,
  searchItems: string[],
  searchRefTitles: string[],
  searchRefImages: string[],
  searchResults: PersonResult[],
  resultsCount: number
): Promise<void> {
  try {
    const { error } = await supabase
      .from('search_history')
      .insert({
        user_id: userId,
        ref_ids: searchItems,
        ref_titles: searchRefTitles,
        ref_images: searchRefImages,
        search_title: 'People into',
        search_subtitle: 'Browse, dm, or add to a group',
        result_count: resultsCount,
        search_results: searchResults,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

    if (error) {
      throw new Error(`Failed to save search history: ${error.message}`)
    }
  } catch (error) {
    console.error('Error saving search history:', error)
    throw error
  }
}

/**
 * Delete search history record
 */
export async function deleteSearchHistory(recordId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('search_history')
      .delete()
      .eq('id', recordId)

    if (error) {
      throw new Error(`Failed to delete search history: ${error.message}`)
    }
  } catch (error) {
    console.error('Error deleting search history:', error)
    throw error
  }
}

// Health check for Supabase connection
export async function checkSupabaseHealth(): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('search_history')
      .select('count')
      .limit(1)

    return !error
  } catch (error) {
    console.error('Supabase health check failed:', error)
    return false
  }
}
