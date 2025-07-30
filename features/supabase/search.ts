import { createClient } from '@supabase/supabase-js'

export interface SearchResult {
  id: string
  name: string
  avatar_url: string
  userName: string
  similarityScore: number
  exactMatches: number
  highSimilarityMatches: number
  sharedRefs: string[]
  tier: number // 1 = exact matches, 2 = high similarity, 3 = closest hit
}

function createSupabaseClient() {
  const supabaseUrl = process.env.SUPA_URL
  const supabaseKey = process.env.SUPA_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials')
  }

  return createClient(supabaseUrl, supabaseKey)
}

export async function searchPeople(
  itemIds: string[],
  userId: string,
  limit: number = 60
): Promise<SearchResult[]> {
  try {
    console.log('🔍 Starting search with item IDs:', itemIds)
    const supabase = createSupabaseClient()

    // Get the search items from Supabase
    const { data: searchItems, error: itemsError } = await supabase
      .from('items')
      .select('id, ref, text, seven_string, seven_string_embedding, creator')
      .in('id', itemIds)

    if (itemsError) {
      console.error('❌ Error fetching search items:', itemsError)
      throw itemsError
    }

    if (!searchItems || searchItems.length === 0) {
      console.log('⚠️ No search items found')
      return []
    }

    console.log(`🔍 Found ${searchItems.length} search items`)

    // Extract search refs for exact matching
    const searchRefs = searchItems.map(item => item.ref).filter(Boolean)
    console.log(`🔍 Search refs: ${searchRefs.join(', ')}`)

    // Get search embeddings for semantic matching
    const searchEmbeddings = searchItems
      .map(item => item.seven_string_embedding)
      .filter(embedding => embedding && embedding.length > 0)

    if (searchEmbeddings.length === 0) {
      console.log('⚠️ No valid embeddings found in search items')
      return []
    }

    console.log(`🔍 Found ${searchEmbeddings.length} search embeddings`)

    // Find all items with embeddings (excluding current user)
    const { data: allItems, error: allItemsError } = await supabase
      .from('items')
      .select('id, ref, text, seven_string, seven_string_embedding, creator')
      .neq('creator', userId)
      .not('seven_string_embedding', 'is', null)

    if (allItemsError) {
      console.error('❌ Error fetching all items:', allItemsError)
      throw allItemsError
    }

    console.log(`🔍 Found ${allItems?.length || 0} items with embeddings`)

    if (!allItems || allItems.length === 0) {
      console.log('⚠️ No items with embeddings found')
      return []
    }

    // TIER 1: Find exact ref matches (hard matches)
    console.log('🎯 Tier 1: Finding exact ref matches...')
    const exactMatches = new Map<string, { items: any[], refs: string[] }>()
    
    allItems.forEach(item => {
      if (searchRefs.includes(item.ref)) {
        const creatorId = item.creator
        if (!exactMatches.has(creatorId)) {
          exactMatches.set(creatorId, { items: [], refs: [] })
        }
        const match = exactMatches.get(creatorId)!
        match.items.push(item)
        if (!match.refs.includes(item.ref)) {
          match.refs.push(item.ref)
        }
      }
    })

    console.log(`🎯 Found ${exactMatches.size} users with exact ref matches`)

    // TIER 2: Calculate semantic similarity for high similarity matches (>0.7)
    console.log('🎯 Tier 2: Calculating high similarity matches...')
    const highSimilarityUsers = new Map<string, { 
      items: any[], 
      totalSimilarity: number, 
      avgSimilarity: number,
      highSimilarityCount: number,
      maxSimilarity: number 
    }>()

    allItems.forEach(item => {
      if (!item.seven_string_embedding) return

      let maxSimilarity = 0
      searchEmbeddings.forEach(searchEmbedding => {
        try {
          // Standardize embedding lengths by truncating to the shorter length
          const minLength = Math.min(searchEmbedding.length, item.seven_string_embedding.length)
          const standardizedSearchEmbedding = searchEmbedding.slice(0, minLength)
          const standardizedItemEmbedding = item.seven_string_embedding.slice(0, minLength)
          
          if (minLength === 0) {
            console.warn('⚠️ Empty embedding after standardization')
            return
          }
          
          const similarity = calculateCosineSimilarity(
            standardizedSearchEmbedding,
            standardizedItemEmbedding
          )
          maxSimilarity = Math.max(maxSimilarity, similarity)
        } catch (error) {
          console.warn('⚠️ Error calculating similarity:', error)
        }
      })

      if (maxSimilarity > 0.7) { // High similarity threshold (back to 0.7 as requested)
        const creatorId = item.creator
        if (!exactMatches.has(creatorId)) { // Skip if already in exact matches
          if (!highSimilarityUsers.has(creatorId)) {
            highSimilarityUsers.set(creatorId, {
              items: [],
              totalSimilarity: 0,
              avgSimilarity: 0,
              highSimilarityCount: 0,
              maxSimilarity: 0
            })
          }
          const userData = highSimilarityUsers.get(creatorId)!
          userData.items.push(item)
          userData.totalSimilarity += maxSimilarity
          userData.maxSimilarity = Math.max(userData.maxSimilarity, maxSimilarity)
        }
      }
    })

    // Calculate averages for high similarity users
    highSimilarityUsers.forEach(userData => {
      userData.avgSimilarity = userData.totalSimilarity / userData.items.length
      userData.highSimilarityCount = userData.items.length // All items in this tier are above threshold
    })

    console.log(`🎯 Found ${highSimilarityUsers.size} users with high similarity matches`)

    // TIER 3: Find closest hit for remaining users
    console.log('🎯 Tier 3: Finding closest hits...')
    const closestHitUsers = new Map<string, { 
      items: any[], 
      maxSimilarity: number,
      bestItem: any 
    }>()

    allItems.forEach(item => {
      if (!item.seven_string_embedding) return

      const creatorId = item.creator
      // Skip if already in exact matches or high similarity
      if (exactMatches.has(creatorId) || highSimilarityUsers.has(creatorId)) {
        return
      }

      let maxSimilarity = 0
      searchEmbeddings.forEach(searchEmbedding => {
        try {
          // Standardize embedding lengths by truncating to the shorter length
          const minLength = Math.min(searchEmbedding.length, item.seven_string_embedding.length)
          const standardizedSearchEmbedding = searchEmbedding.slice(0, minLength)
          const standardizedItemEmbedding = item.seven_string_embedding.slice(0, minLength)
          
          if (minLength === 0) {
            console.warn('⚠️ Empty embedding after standardization')
            return
          }
          
          const similarity = calculateCosineSimilarity(
            standardizedSearchEmbedding,
            standardizedItemEmbedding
          )
          maxSimilarity = Math.max(maxSimilarity, similarity)
        } catch (error) {
          console.warn('⚠️ Error calculating similarity:', error)
        }
      })

      if (maxSimilarity > 0) {
        if (!closestHitUsers.has(creatorId)) {
          closestHitUsers.set(creatorId, {
            items: [],
            maxSimilarity: 0,
            bestItem: null
          })
        }
        const userData = closestHitUsers.get(creatorId)!
        userData.items.push(item)
        if (maxSimilarity > userData.maxSimilarity) {
          userData.maxSimilarity = maxSimilarity
          userData.bestItem = item
        }
      }
    })

    console.log(`🎯 Found ${closestHitUsers.size} users with closest hits`)

    // Get all user IDs and fetch user information
    const allUserIds = [
      ...exactMatches.keys(),
      ...highSimilarityUsers.keys(),
      ...closestHitUsers.keys()
    ]

    // Get all users to ensure we can fill up to the limit
    const { data: allUsers, error: allUsersError } = await supabase
      .from('users')
      .select('id, name, avatarurl, username, spirit_vector_embedding')
      .neq('id', userId) // Exclude the searching user

    if (allUsersError) {
      console.error('❌ Error fetching all users:', allUsersError)
      throw allUsersError
    }

    // Get users that are already in our tiers
    const { data: tierUsers, error: usersError } = await supabase
      .from('users')
      .select('id, name, avatarurl, username, spirit_vector_embedding')
      .in('id', allUserIds)

    if (usersError) {
      console.error('❌ Error fetching users:', usersError)
      throw usersError
    }

    // Build results with proper tier ranking
    const results: SearchResult[] = []

    // TIER 1: Exact matches (highest priority)
    tierUsers?.forEach(user => {
      const exactMatch = exactMatches.get(user.id)
      if (exactMatch) {
        results.push({
          id: user.id,
          name: user.name || user.username || 'Unknown',
          avatar_url: user.avatarurl || '',
          userName: user.username || user.name || 'Unknown',
          similarityScore: 1.0, // Perfect match
          exactMatches: exactMatch.refs.length,
          highSimilarityMatches: exactMatch.items.length,
          sharedRefs: exactMatch.refs,
          tier: 1
        })
      }
    })

    // TIER 2: High similarity users (ranked by hits, then by spirit vector)
    const tier2Results: SearchResult[] = []
    tierUsers?.forEach(user => {
      const highSimilarity = highSimilarityUsers.get(user.id)
      if (highSimilarity) {
        tier2Results.push({
          id: user.id,
          name: user.name || user.username || 'Unknown',
          avatar_url: user.avatarurl || '',
          userName: user.username || user.name || 'Unknown',
          similarityScore: highSimilarity.avgSimilarity,
          exactMatches: 0,
          highSimilarityMatches: highSimilarity.highSimilarityCount,
          sharedRefs: highSimilarity.items.map(item => item.ref).filter(Boolean),
          tier: 2
        })
      }
    })

    // Sort tier 2 by hits (highSimilarityMatches), then by spirit vector if available
    tier2Results.sort((a, b) => {
      // First by number of hits (descending)
      if (a.highSimilarityMatches !== b.highSimilarityMatches) {
        return b.highSimilarityMatches - a.highSimilarityMatches
      }
      // Then by similarity score (descending)
      return b.similarityScore - a.similarityScore
    })

    results.push(...tier2Results)

    // TIER 3: Closest hit users (ranked by spirit vector)
    const tier3Results: SearchResult[] = []
    tierUsers?.forEach(user => {
      const closestHit = closestHitUsers.get(user.id)
      if (closestHit) {
        tier3Results.push({
          id: user.id,
          name: user.name || user.username || 'Unknown',
          avatar_url: user.avatarurl || '',
          userName: user.username || user.name || 'Unknown',
          similarityScore: closestHit.maxSimilarity,
          exactMatches: 0,
          highSimilarityMatches: 0,
          sharedRefs: closestHit.items.map(item => item.ref).filter(Boolean),
          tier: 3
        })
      }
    })

    // Sort tier 3 by similarity score (descending)
    tier3Results.sort((a, b) => b.similarityScore - a.similarityScore)

    results.push(...tier3Results)

    // TIER 4: Spirit vector fallback to fill up to limit
    console.log('🎯 Tier 4: Spirit vector fallback...')
    
    // Get users not already in results
    const resultUserIds = new Set(results.map(r => r.id))
    const remainingUsers = allUsers?.filter(user => !resultUserIds.has(user.id)) || []
    
    console.log(`🎯 Found ${remainingUsers.length} remaining users for spirit vector ranking`)
    
    // Get the searching user's spirit vector for comparison
    const searchingUser = allUsers?.find(user => user.id === userId)
    const searchingUserSpiritVector = searchingUser?.spirit_vector_embedding
    
    if (searchingUserSpiritVector) {
      console.log('🎯 Calculating spirit vector similarities...')
      
      // Calculate spirit vector similarity for each remaining user
      const usersWithSpiritSimilarity = remainingUsers.map(user => {
        let spiritSimilarity = 0.0
        
        if (user.spirit_vector_embedding) {
          try {
            // Standardize embedding lengths by truncating to the shorter length
            const minLength = Math.min(searchingUserSpiritVector.length, user.spirit_vector_embedding.length)
            const standardizedSearchingVector = searchingUserSpiritVector.slice(0, minLength)
            const standardizedUserVector = user.spirit_vector_embedding.slice(0, minLength)
            
            if (minLength > 0) {
              spiritSimilarity = calculateCosineSimilarity(
                standardizedSearchingVector,
                standardizedUserVector
              )
            }
          } catch (error) {
            console.warn(`⚠️ Error calculating spirit vector similarity for user ${user.id}:`, error)
          }
        }
        
        return {
          user,
          spiritSimilarity
        }
      })
      
      // Sort by spirit vector similarity (descending)
      usersWithSpiritSimilarity.sort((a, b) => b.spiritSimilarity - a.spiritSimilarity)
      
      console.log(`🎯 Spirit vector similarities calculated for ${usersWithSpiritSimilarity.length} users`)
      console.log(`🎯 Top 5 spirit similarities: ${usersWithSpiritSimilarity.slice(0, 5).map(u => `${u.user.username}: ${u.spiritSimilarity.toFixed(3)}`).join(', ')}`)
      
      // Create Tier 4 results with spirit vector similarity scores
      const tier4Results: SearchResult[] = usersWithSpiritSimilarity.map(({ user, spiritSimilarity }) => ({
        id: user.id,
        name: user.name || user.username || 'Unknown',
        avatar_url: user.avatarurl || '',
        userName: user.username || user.name || 'Unknown',
        similarityScore: spiritSimilarity, // Use spirit vector similarity
        exactMatches: 0,
        highSimilarityMatches: 0,
        sharedRefs: [],
        tier: 4
      }))
      
      results.push(...tier4Results)
      
    } else {
      console.log('⚠️ No spirit vector found for searching user, using random order for Tier 4')
      
      // Fallback: just add remaining users in order
      const tier4Results: SearchResult[] = remainingUsers.map(user => ({
        id: user.id,
        name: user.name || user.username || 'Unknown',
        avatar_url: user.avatarurl || '',
        userName: user.username || user.name || 'Unknown',
        similarityScore: 0.0, // No spirit vector similarity
        exactMatches: 0,
        highSimilarityMatches: 0,
        sharedRefs: [],
        tier: 4
      }))
      
      results.push(...tier4Results)
    }

    // Limit results
    const limitedResults = results.slice(0, limit)

    console.log(`✅ Search completed with 4-tier ranking:`)
    console.log(`   - Tier 1 (exact matches): ${results.filter(r => r.tier === 1).length}`)
    console.log(`   - Tier 2 (high similarity): ${results.filter(r => r.tier === 2).length}`)
    console.log(`   - Tier 3 (closest hit): ${results.filter(r => r.tier === 3).length}`)
    console.log(`   - Tier 4 (spirit vector fallback): ${results.filter(r => r.tier === 4).length}`)
    console.log(`   - Total results: ${limitedResults.length}`)

    return limitedResults

  } catch (error) {
    console.error('❌ Error in searchPeople:', error)
    throw error
  }
}

// Helper function to calculate cosine similarity between two vectors
export function calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same length')
  }

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i]
    normA += vecA[i] * vecA[i]
    normB += vecB[i] * vecB[i]
  }

  normA = Math.sqrt(normA)
  normB = Math.sqrt(normB)

  if (normA === 0 || normB === 0) {
    return 0
  }

  return dotProduct / (normA * normB)
} 