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

async function fixEmbeddingsWithSQL() {
  console.log('🔄 Fixing embeddings with SQL...')

  try {
    // Get all items that have seven_string but need embedding fix
    const { data: items, error: itemsError } = await supabase
      .from('items')
      .select(`
        id,
        text,
        seven_string,
        seven_string_embedding
      `)
      .is('deleted', null)
      .not('seven_string', 'is', null)

    if (itemsError) {
      throw new Error(`Error fetching items: ${itemsError.message}`)
    }

    console.log(`📝 Found ${items?.length || 0} items to fix`)

    if (!items || items.length === 0) {
      console.log('✅ No items to fix')
      return
    }

    // Process items
    for (const item of items) {
      try {
        console.log(`🔄 Fixing embedding for item ${item.id}: "${item.text?.substring(0, 50)}..."`)

        // Check if embedding is already correct (should be 1536 dimensions)
        if (Array.isArray(item.seven_string_embedding) && item.seven_string_embedding.length === 1536) {
          console.log(`✅ Item ${item.id} already has correct embedding`)
          continue
        }

        // Regenerate embedding
        const embedding = await generateEmbedding(item.seven_string)
        console.log(`🔢 Generated embedding (${embedding.length} dimensions)`)

        // Use raw SQL to properly store the vector
        const { error: sqlError } = await supabase.rpc('exec_sql', {
          sql_query: `
            UPDATE items 
            SET seven_string_embedding = '[${embedding.join(',')}]'::vector(1536)
            WHERE id = '${item.id}'
          `
        })

        if (sqlError) {
          console.error(`❌ SQL Error updating item ${item.id}:`, sqlError)
          
          // Fallback: try direct update
          const { error: updateError } = await supabase
            .from('items')
            .update({
              seven_string_embedding: embedding,
            })
            .eq('id', item.id)

          if (updateError) {
            console.error(`❌ Error updating item ${item.id}:`, updateError)
          } else {
            console.log(`✅ Fixed embedding for item ${item.id} (fallback)`)
          }
        } else {
          console.log(`✅ Fixed embedding for item ${item.id}`)
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
fixEmbeddingsWithSQL() 