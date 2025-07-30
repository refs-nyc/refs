import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

// Load environment variables
config()

// Supabase setup
const supabaseUrl = process.env.SUPA_URL!
const supabaseKey = process.env.SUPA_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: text,
        model: 'text-embedding-3-small',
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const data = await response.json()
    return data.data[0].embedding
  } catch (error) {
    console.error('Error generating embedding:', error)
    // Return zero vector as fallback
    return new Array(1536).fill(0)
  }
}

async function fixEmbeddingsSimple() {
  console.log('🔄 Fixing embeddings (simple approach)...')

  try {
    // First, clear all existing embeddings
    console.log('🧹 Clearing existing embeddings...')
    const { error: clearError } = await supabase
      .from('items')
      .update({
        seven_string_embedding: null,
      })
      .is('deleted', null)

    if (clearError) {
      console.error('❌ Error clearing embeddings:', clearError)
    } else {
      console.log('✅ Cleared existing embeddings')
    }

    // Get all items that have seven_string
    const { data: items, error: itemsError } = await supabase
      .from('items')
      .select(`
        id,
        text,
        seven_string
      `)
      .is('deleted', null)
      .not('seven_string', 'is', null)

    if (itemsError) {
      throw new Error(`Error fetching items: ${itemsError.message}`)
    }

    console.log(`📝 Found ${items?.length || 0} items to process`)

    if (!items || items.length === 0) {
      console.log('✅ No items to process')
      return
    }

    // Process items
    for (const item of items) {
      try {
        console.log(`🔄 Processing item ${item.id}: "${item.text?.substring(0, 50)}..."`)

        // Generate embedding
        const embedding = await generateEmbedding(item.seven_string)
        console.log(`🔢 Generated embedding (${embedding.length} dimensions)`)

        // Update item in Supabase
        const { error: updateError } = await supabase
          .from('items')
          .update({
            seven_string_embedding: embedding,
          })
          .eq('id', item.id)

        if (updateError) {
          console.error(`❌ Error updating item ${item.id}:`, updateError)
        } else {
          console.log(`✅ Updated embedding for item ${item.id}`)
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000))

      } catch (error) {
        console.error(`❌ Error processing item ${item.id}:`, error)
      }
    }

    console.log('🎉 Embedding fix completed!')

  } catch (error) {
    console.error('❌ Fatal error:', error)
  }
}

// Run the script
fixEmbeddingsSimple() 