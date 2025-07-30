import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.MATCHMAKING_PORT || 3001

// Middleware
app.use(cors())
app.use(express.json())

// Initialize Supabase client
const supabaseUrl = process.env.SUPA_URL
const supabaseKey = process.env.SUPA_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Search people endpoint
app.post('/api/search-people', async (req, res) => {
  try {
    const { ref_ids, user_id, limit = 20 } = req.body
    
    console.log('Searching for people with refs:', ref_ids, 'for user:', user_id)
    
    if (!ref_ids || ref_ids.length === 0) {
      return res.status(400).json({ error: 'No ref IDs provided' })
    }

    // Find users who have items with the same ref_ids
    const { data: items, error: itemsError } = await supabase
      .from('items')
      .select('creator, ref_id, text')
      .in('ref_id', ref_ids)
      .neq('creator', user_id)

    if (itemsError) {
      console.error('Error fetching items:', itemsError)
      return res.status(500).json({ error: 'Failed to fetch items' })
    }

    // Get unique user IDs from the items
    const userIds = [...new Set(items.map(item => item.creator))]
    
    if (userIds.length === 0) {
      return res.json({
        results: [],
        total_count: 0,
        search_id: Date.now().toString()
      })
    }

    // Get user details
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('user_id, name, avatar_url, username')
      .in('user_id', userIds)
      .limit(limit)

    if (usersError) {
      console.error('Error fetching users:', usersError)
      return res.status(500).json({ error: 'Failed to fetch users' })
    }

    // Create results with shared refs info
    const results = users.map(user => {
      const userItems = items.filter(item => item.creator === user.user_id)
      const sharedRefs = [...new Set(userItems.map(item => item.ref_id))]
      
      return {
        user_id: user.user_id,
        user_name: user.name || user.username || 'Unknown User',
        user_image: user.avatar_url || '',
        user_location: '', // Location is not in Supabase users table, needs to be derived or fetched
        similarity_score: sharedRefs.length / ref_ids.length,
        tier: sharedRefs.length > 0 ? 0 : 2, // 0 = direct match, 2 = fallback
        shared_refs: sharedRefs,
        shared_ref_titles: sharedRefs // We'll need to fetch ref titles separately
      }
    })

    // Sort by similarity score (highest first)
    results.sort((a, b) => b.similarity_score - a.similarity_score)

    res.json({
      results,
      total_count: results.length,
      search_id: Date.now().toString()
    })

  } catch (error) {
    console.error('Search error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Search history endpoints
app.get('/api/search-history/:userId', async (req, res) => {
  try {
    const { userId } = req.params
    
    const { data, error } = await supabase
      .from('search_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) {
      console.error('Error fetching search history:', error)
      return res.status(500).json({ error: 'Failed to fetch search history' })
    }

    res.json(data || [])
  } catch (error) {
    console.error('Search history error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.post('/api/search-history', async (req, res) => {
  try {
    const { user_id, ref_ids, ref_titles, results, search_title, search_subtitle } = req.body
    
    const { error } = await supabase
      .from('search_history')
      .insert({
        user_id,
        search_ref_ids: ref_ids,
        search_ref_titles: ref_titles,
        search_results: results,
        search_title,
        search_subtitle
      })

    if (error) {
      console.error('Error saving search history:', error)
      return res.status(500).json({ error: 'Failed to save search history' })
    }

    res.json({ success: true })
  } catch (error) {
    console.error('Save search history error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.delete('/api/search-history/:id', async (req, res) => {
  try {
    const { id } = req.params
    
    const { error } = await supabase
      .from('search_history')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting search history:', error)
      return res.status(500).json({ error: 'Failed to delete search history' })
    }

    res.json({ success: true })
  } catch (error) {
    console.error('Delete search history error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Start server
app.listen(PORT, () => {
  console.log(`Matchmaking server running on port ${PORT}`)
  console.log(`Health check: http://localhost:${PORT}/health`)
}) 