import { useAppStore } from '@/features/stores'

// Updated search API for new matchmaking system
const MATCHMAKING_API_URL = process.env.EXPO_PUBLIC_MATCHMAKING_API_URL || 'http://localhost:3001'

export interface SearchRequest {
  ref_ids: string[]
  user_id: string
  limit?: number
}

export interface PersonResult {
  user_id: string
  user_name: string
  user_image?: string
  user_location?: string
  similarity_score: number
  tier: number
  shared_refs: string[]
  shared_ref_titles: string[]
}

export interface SearchResponse {
  results: PersonResult[]
  total_count: number
  search_id: string
}

export interface SearchHistoryItem {
  id: string
  user_id: string
  search_ref_ids: string[]
  search_ref_titles: string[]
  search_results: PersonResult[]
  search_title: string
  search_subtitle: string
  created_at: string
}

// Search for people using the new matchmaking system
export async function searchPeople(request: SearchRequest): Promise<SearchResponse> {
  const response = await fetch(`${MATCHMAKING_API_URL}/api/search-people`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    throw new Error(`Search API error: ${response.status}`)
  }

  return response.json()
}

// Get search history for a user
export async function getSearchHistory(userId: string): Promise<SearchHistoryItem[]> {
  const response = await fetch(`${MATCHMAKING_API_URL}/api/search-history/${userId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Search history API error: ${response.status}`)
  }

  return response.json()
}

// Save search to history
export async function saveSearchHistory(
  userId: string,
  refIds: string[],
  refTitles: string[],
  results: PersonResult[],
  searchTitle: string,
  searchSubtitle: string
): Promise<void> {
  const response = await fetch(`${MATCHMAKING_API_URL}/api/search-history`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user_id: userId,
      ref_ids: refIds,
      ref_titles: refTitles,
      results,
      search_title: searchTitle,
      search_subtitle: searchSubtitle,
    }),
  })

  if (!response.ok) {
    throw new Error(`Save search history API error: ${response.status}`)
  }
}

// Delete search history item
export async function deleteSearchHistory(historyId: string): Promise<void> {
  const response = await fetch(`${MATCHMAKING_API_URL}/api/search-history/${historyId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Delete search history API error: ${response.status}`)
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
 
 
 