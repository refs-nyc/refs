import { useUserStore } from '../stores/users'

const SEARCH_API_URL = 'http://localhost:8000'

export interface SearchRequest {
  user_id: string
  ref_ids: string[]
  page?: number
  page_size?: number
}

export interface PersonResult {
  user_id: string
  name: string
  username: string
  avatar_url: string
  shared_refs: number
  score: number
  personality_insight: string
}

export interface SearchResponse {
  people: PersonResult[]
  total_results: number
  page: number
  page_size: number
  has_more: boolean
  title: string
  subtitle: string
}

export async function searchPeople(request: SearchRequest): Promise<SearchResponse> {
  try {
    const response = await fetch(`${SEARCH_API_URL}/search_people`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      throw new Error(`Search API error: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Search API error:', error)
    throw error
  }
}

export async function getSearchHistory(userId: string, limit: number = 20) {
  try {
    const response = await fetch(`${SEARCH_API_URL}/search-history/${userId}?limit=${limit}`)
    
    if (!response.ok) {
      throw new Error(`Search history API error: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Search history API error:', error)
    throw error
  }
} 
 
 
 