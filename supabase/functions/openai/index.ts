import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GenerateSevenStringRequest {
  ref_title: string
  caption: string
}

interface GenerateEmbeddingRequest {
  text: string
}

interface ProcessItemRequest {
  item_id: string
  ref_id: string
  creator: string
  item_text: string
  ref_title: string
}

interface RegenerateSpiritVectorRequest {
  user_id: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action, ...data } = await req.json()

    // Get OpenAI API key from environment
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    switch (action) {
      case 'generate_seven_string':
        return await handleGenerateSevenString(data as GenerateSevenStringRequest, openaiApiKey)

      case 'generate_embedding':
        return await handleGenerateEmbedding(data as GenerateEmbeddingRequest, openaiApiKey)

      case 'process_item':
        return await handleProcessItem(data as ProcessItemRequest, supabase, openaiApiKey)

      case 'regenerate_spirit_vector':
        return await handleRegenerateSpiritVector(
          data as RegenerateSpiritVectorRequest,
          supabase,
          openaiApiKey
        )

      default:
        throw new Error(`Unknown action: ${action}`)
    }
  } catch (error) {
    console.error('Error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function handleGenerateSevenString(data: GenerateSevenStringRequest, apiKey: string) {
  const { ref_title, caption } = data

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content:
            'You are a matchmaking descriptor engine. Generate one seven‑slot line, pipes between slots, ≤ 5 words per slot. 1. Intellectual signal – domain or thinking style (e.g., "Constraint‑fiction fan") 2. Aesthetic vibe – sensory or stylistic flavour (e.g., "cozy nordic minimalism") 3. Likely skill or habit – action they might practise (e.g., "hosts themed potlucks") 4. Conversation‑starter keyword – quick hook (e.g., "Oulipo") 5. Core value – guiding principle (e.g., "Rules as creative fuel") 6. Social‑energy cue – preferred social setting (e.g., "Thrives in micro‑salons") 7. Ideal‑match trait – quality a partner should have (e.g., "Loves playful debate") Return the line only. No extra commentary.',
        },
        {
          role: 'user',
          content: `Ref title: «${ref_title}» Caption: «${caption || ''}»`,
        },
      ],
      temperature: 0.7,
      max_tokens: 100,
    }),
  })

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`)
  }

  const result = await response.json()
  const sevenString = result.choices[0]?.message?.content?.trim() || ''

  return new Response(JSON.stringify({ seven_string: sevenString }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function handleGenerateEmbedding(data: GenerateEmbeddingRequest, apiKey: string) {
  const { text } = data

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text,
    }),
  })

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`)
  }

  const result = await response.json()
  const embedding = result.data[0]?.embedding || []

  return new Response(JSON.stringify({ embedding }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function handleProcessItem(data: ProcessItemRequest, supabase: any, apiKey: string) {
  const { item_id, ref_id, creator, item_text, ref_title } = data

  let sevenString = ''
  let embedding = []

  // Check if user added a caption
  if (item_text && item_text.trim() !== '') {
    // User added a caption - generate 7-string
    console.log(`🔄 Generating 7-string for item ${item_id} with caption: "${item_text}"`)

    const sevenStringResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
              body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content:
                'You are a matchmaking descriptor engine. Generate one seven‑slot line, pipes between slots, ≤ 5 words per slot. 1. Intellectual signal – domain or thinking style (e.g., "Constraint‑fiction fan") 2. Aesthetic vibe – sensory or stylistic flavour (e.g., "cozy nordic minimalism") 3. Likely skill or habit – action they might practise (e.g., "hosts themed potlucks") 4. Conversation‑starter keyword – quick hook (e.g., "Oulipo") 5. Core value – guiding principle (e.g., "Rules as creative fuel") 6. Social‑energy cue – preferred social setting (e.g., "Thrives in micro‑salons") 7. Ideal‑match trait – quality a partner should have (e.g., "Loves playful debate") Return the line only. No extra commentary.',
            },
            {
              role: 'user',
              content: `Ref title: «${ref_title}» Caption: «${item_text}»`,
            },
          ],
          temperature: 0.7,
          max_tokens: 100,
        }),
    })

    if (!sevenStringResponse.ok) {
      throw new Error(`OpenAI API error generating 7-string: ${sevenStringResponse.statusText}`)
    }

    const sevenStringResult = await sevenStringResponse.json()
    sevenString = sevenStringResult.choices[0]?.message?.content?.trim() || ''

    console.log(`✅ Generated 7-string: "${sevenString}"`)
  } else {
    // No caption - use ref title as the text to embed
    console.log(`🔄 No caption provided for item ${item_id}, using ref title: "${ref_title}"`)
    sevenString = ref_title
  }

  // Generate embedding for the text (either 7-string or ref title)
  const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: sevenString,
    }),
  })

  if (!embeddingResponse.ok) {
    throw new Error(`OpenAI API error generating embedding: ${embeddingResponse.statusText}`)
  }

  const embeddingResult = await embeddingResponse.json()
  embedding = embeddingResult.data[0]?.embedding || []

  console.log(`✅ Generated embedding for: "${sevenString}"`)

  // Store in Supabase
  const { error } = await supabase.from('items').upsert({
    id: item_id,
    ref: ref_id,
    creator,
    text: item_text,
    seven_string: sevenString,
    seven_string_embedding: embedding,
    updated: new Date().toISOString(),
  })

  if (error) {
    throw new Error(`Supabase error: ${error.message}`)
  }

  return new Response(
    JSON.stringify({
      success: true,
      item_id,
      seven_string: sevenString,
      had_caption: item_text && item_text.trim() !== '',
      processed_text: sevenString,
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  )
}

async function handleRegenerateSpiritVector(
  data: RegenerateSpiritVectorRequest,
  supabase: any,
  apiKey: string
) {
  const { user_id } = data

  // Get user's top 12 items
  const { data: items, error: itemsError } = await supabase
    .from('items')
    .select('seven_string')
    .eq('creator', user_id)
    .order('created_at', { ascending: false })
    .limit(12)

  if (itemsError) {
    throw new Error(`Error fetching items: ${itemsError.message}`)
  }

  if (!items || items.length === 0) {
    throw new Error('No items found for user')
  }

  // Combine 7-strings
  const sevenStrings = items.map((item) => item.seven_string).filter(Boolean)
  const combinedString = sevenStrings.join(' | ')

  // Generate embedding for the combined spirit vector
  const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: combinedString,
    }),
  })

  if (!embeddingResponse.ok) {
    throw new Error(`OpenAI API error generating spirit vector: ${embeddingResponse.statusText}`)
  }

  const embeddingResult = await embeddingResponse.json()
  const embedding = embeddingResult.data[0]?.embedding || []

  // Update user's spirit vector
  const { error: updateError } = await supabase.from('users').upsert({
    id: user_id,
    spirit_vector: combinedString,
    spirit_vector_embedding: embedding,
    updated_at: new Date().toISOString(),
  })

  if (updateError) {
    throw new Error(`Error updating spirit vector: ${updateError.message}`)
  }

  return new Response(
    JSON.stringify({
      success: true,
      user_id,
      spirit_vector: combinedString,
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  )
}
