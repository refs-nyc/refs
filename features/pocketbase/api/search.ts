import { useAppStore } from '@/features/stores'

const MATCHMAKING_API_URL = process.env.EXPO_PUBLIC_MATCHMAKING_API_URL || 'http://localhost:3001'

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
    const response = await fetch(`${MATCHMAKING_API_URL}/api/search-people`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Search API error:', response.status, errorText)
      throw new Error(`Search API error: ${response.status}`)
    }

    const data = await response.json()

    return data
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
    const response = await fetch(`${MATCHMAKING_API_URL}/api/search-history?user_id=${userId}`)

    if (!response.ok) {
      throw new Error(`Failed to fetch search history: ${response.status}`)
    }

    const data = await response.json()
    return data.history || []
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
    const requestBody = {
      user_id: userId,
      ref_ids: searchItems,
      ref_titles: searchRefTitles,
      ref_images: searchRefImages, // Add ref_images to the request
      search_title: 'People into',
      search_subtitle: 'Browse, dm, or add to a group',
      result_count: resultsCount,
      search_results: searchResults, // Cache the actual search results
    }

    const response = await fetch(`${MATCHMAKING_API_URL}/api/search-history`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      throw new Error(`Failed to save search history: ${response.status}`)
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
    const response = await fetch(`${MATCHMAKING_API_URL}/api/search-history/${recordId}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      throw new Error(`Failed to delete search history: ${response.status}`)
    }
  } catch (error) {
    console.error('Error deleting search history:', error)
    throw error
  }
}

// Health check for matchmaking server
export async function checkMatchmakingHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${MATCHMAKING_API_URL}/health`, {
      method: 'GET',
    })
    return response.ok
  } catch (error) {
    console.error('Matchmaking server health check failed:', error)
    return false
  }
}
