import express, { Request, Response } from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { searchPeople } from '../features/supabase/search'

dotenv.config()

const app = express()
const port = process.env.MATCHMAKING_PORT || 3001

// Middleware
app.use(cors())
app.use(express.json())

// Supabase setup
const supabaseUrl = process.env.SUPA_URL
const supabaseKey = process.env.SUPA_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Search people endpoint
app.post('/api/search-people', async (req: Request, res: Response) => {
  try {
    const { item_ids, user_id, limit = 60 } = req.body

    if (!item_ids || !Array.isArray(item_ids) || item_ids.length === 0) {
      return res.status(400).json({ error: 'item_ids array is required' })
    }

    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' })
    }

    console.log(`🔍 Searching for people with items: ${item_ids.join(', ')} for user: ${user_id}`)

    // Use the new Supabase search function
    const results = await searchPeople(item_ids, user_id, limit)
    
    res.json({ results })
  } catch (error) {
    console.error('Error searching people:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Search history endpoints
app.get('/api/search-history', async (req: Request, res: Response) => {
  try {
    const { user_id } = req.query

    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' })
    }

    const { data, error } = await supabase
      .from('search_history')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error('Error fetching search history:', error)
      return res.status(500).json({ error: 'Failed to fetch search history' })
    }

    res.json({ history: data || [] })
  } catch (error) {
    console.error('Error in search history:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.post('/api/search-history', async (req: Request, res: Response) => {
  try {
    const { 
      user_id, 
      ref_ids, 
      ref_titles, 
      search_title, 
      search_subtitle, 
      result_count, 
      search_results 
    } = req.body

    if (!user_id || !ref_ids || !Array.isArray(ref_ids)) {
      return res.status(400).json({ error: 'user_id and ref_ids array are required' })
    }

            const { data, error } = await supabase
          .from('search_history')
          .insert({
            user_id,
            ref_ids,
            ref_titles: ref_titles || ref_ids, // Fallback to ref_ids if no titles
            ref_images: req.body.ref_images || [], // Store ref images
            search_title: search_title || 'People into',
            search_subtitle: search_subtitle || 'browse, dm, or add to a group',
            result_count: result_count || 0,
            search_results: search_results || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()

    if (error) {
      console.error('Error saving search history:', error)
      return res.status(500).json({ error: 'Failed to save search history' })
    }

    res.json({ success: true, record: data?.[0] })
  } catch (error) {
    console.error('Error saving search history:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.delete('/api/search-history/:id', async (req: Request, res: Response) => {
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
    console.error('Error deleting search history:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Utility function to calculate cosine similarity
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    return 0
  }

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i]
    normA += vecA[i] * vecA[i]
    normB += vecB[i] * vecB[i]
  }

  if (normA === 0 || normB === 0) {
    return 0
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

// Start server
app.listen(port, () => {
  console.log(`Matchmaking server running on port ${port}`)
  console.log(`Health check: http://localhost:${port}/health`)
}) 