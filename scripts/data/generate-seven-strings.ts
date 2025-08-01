import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

// Load environment variables
config()

// Supabase setup
const supabaseUrl = process.env.SUPA_URL!
const supabaseKey = process.env.SUPA_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function generateSevenString(itemText: string, refTitle: string): Promise<string> {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content:
              'You are a helpful assistant that generates concise, descriptive 7-word strings that capture the essence of content.',
          },
          {
            role: 'user',
            content: `Generate a 7-word string that describes this content: "${itemText}" from "${refTitle}". The string should be exactly 7 words, descriptive, and capture the key themes or essence.`,
          },
        ],
        max_tokens: 50,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const data = await response.json()
    const sevenString = data.choices[0].message.content.trim()

    // Ensure it's exactly 7 words
    const words = sevenString.split(' ').filter((word: string) => word.length > 0)
    if (words.length !== 7) {
      console.warn(`Generated string has ${words.length} words, expected 7: "${sevenString}"`)
      // Pad or truncate to exactly 7 words
      if (words.length < 7) {
        while (words.length < 7) words.push('content')
      } else {
        words.splice(7)
      }
      return words.join(' ')
    }

    return sevenString
  } catch (error) {
    console.error('Error generating 7-string:', error)
    return 'user shared interesting content from reference'
  }
}

async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
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

async function processItems() {
  console.log('🔄 Starting 7-string generation for items...')

  try {
    // Get all active items (not deleted) that don't have seven_string yet
    const { data: items, error: itemsError } = await supabase
      .from('items')
      .select(
        `
        id,
        text,
        ref,
        seven_string,
        seven_string_embedding
      `
      )
      .is('deleted', null)
      .is('seven_string', null)

    if (itemsError) {
      throw new Error(`Error fetching items: ${itemsError.message}`)
    }

    console.log(`📝 Found ${items?.length || 0} items to process`)

    if (!items || items.length === 0) {
      console.log('✅ No items need processing')
      return
    }

    // Get ref titles for all items
    const refIds = [...new Set(items.map((item: any) => item.ref).filter(Boolean))]
    const { data: refs, error: refsError } = await supabase
      .from('refs')
      .select('id, title')
      .in('id', refIds)

    if (refsError) {
      throw new Error(`Error fetching refs: ${refsError.message}`)
    }

    const refTitles = new Map(refs?.map((ref: any) => [ref.id, ref.title]) || [])

    // Process items in batches
    const batchSize = 5
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize)
      console.log(
        `🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(
          items.length / batchSize
        )}`
      )

      for (const item of batch) {
        try {
          const refTitle = refTitles.get(item.ref) || 'Unknown Reference'
          console.log(`📝 Processing item ${item.id}: "${item.text?.substring(0, 50)}..."`)

          // Generate 7-string
          const sevenString = await generateSevenString(item.text || '', refTitle)
          console.log(`✨ Generated 7-string: "${sevenString}"`)

          // Generate embedding
          const embedding = await generateEmbedding(sevenString)
          console.log(`🔢 Generated embedding (${embedding.length} dimensions)`)

          // Update item in Supabase
          const { error: updateError } = await supabase
            .from('items')
            .update({
              seven_string: sevenString,
              seven_string_embedding: embedding,
            })
            .eq('id', item.id)

          if (updateError) {
            console.error(`❌ Error updating item ${item.id}:`, updateError)
          } else {
            console.log(`✅ Updated item ${item.id}`)
          }

          // Rate limiting - wait a bit between items
          await new Promise((resolve) => setTimeout(resolve, 1000))
        } catch (error) {
          console.error(`❌ Error processing item ${item.id}:`, error)
        }
      }

      // Wait between batches
      if (i + batchSize < items.length) {
        console.log('⏳ Waiting between batches...')
        await new Promise((resolve) => setTimeout(resolve, 2000))
      }
    }

    console.log('🎉 7-string generation completed!')
  } catch (error) {
    console.error('❌ Fatal error:', error)
  }
}

// Run the script
processItems()
