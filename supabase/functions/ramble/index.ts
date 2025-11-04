import { serve } from 'https://deno.land/std@0.200.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.46.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type StageStatus = 'done' | 'running' | 'skipped' | 'failed'
type PromptMode = 'places_only' | 'movies_only'

interface StageDetail {
  stage: string
  status?: StageStatus
  detail?: string
}

interface RamblePayload {
  promptId?: string
  promptTitle?: string
  promptCue?: string
  promptText?: string
  mode?: PromptMode | null
  modeInstruction?: string | null
  agentPrompt: string
  transcript: string
  appUserId?: string | null
}

interface ModelItem {
  title?: string
  subtitle?: string | null
  link?: string | null
  image?: string | null
  context?: string | null
  type?: string | null
  type_hint?: string | null
  confidence?: number | string | null
  escalated?: boolean
  source_notes?: unknown
  justification?: string | null
}

const SHARED_PROMPT = [
  'You are parsing a casual voice note from a friend who is listing things they’re into in response to a prompt. Expect slang, fragments, and fuzzy names.',
  '',
  '**Core behaviors** (always apply):',
  '',
  '- **Combine fragmented or evolving descriptions** into one coherent reference.',
  '- Use context and world knowledge to correct or complete fuzzy names (phonetics allowed).',
  '- Normalize names to their canonical forms.',
  '- Capture any personal or emotional commentary verbatim in `context`.',
].join('\n')

const JSON_SCHEMA_PROMPT = [
  'Output valid JSON only:',
  '[',
  '  {',
  '    "title": "",',
  '    "subtitle": "",',
  '    "link": "",',
  '    "image": "",',
  '    "context": ""',
  '  }',
  ']',
].join('\n')

const DEFAULT_MODE_INSTRUCTIONS: Record<PromptMode, string> = {
  places_only: [
    'Task (MODE = places_only):',
    '- Every item must be a real physical venue or geographic location.',
    '- Subtitle = neighborhood/arrondissement + city.',
    '- Links must be Google Maps URLs (place IDs or search URLs).',
    '- Images must be storefront or interior photos, preferring Google Maps sources.',
    '- If the transcript mentions a dish/person/object, infer the venue it implies and correct the title to the canonical place.',
  ].join('\n'),
  movies_only: [
    'Task (MODE = movies_only):',
    '- Every item must be a film.',
    '- Subtitle = director + release year.',
    '- Links must be official studio pages or IMDb.',
    '- Images must be theatrical posters or official key art.',
    '- Correct obvious mis-hearings (e.g., fuzzy titles) and use canonical film names.',
  ].join('\n'),
}

const MODE_DEFAULT_TYPE: Partial<Record<PromptMode, string>> = {
  places_only: 'place',
  movies_only: 'work',
}

const modeDisplayLabel = (mode?: PromptMode | null) => {
  switch (mode) {
    case 'places_only':
      return 'places'
    case 'movies_only':
      return 'movies'
    default:
      return null
  }
}

const sanitizeString = (value: unknown, maxLength = 600): string | null => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.slice(0, maxLength)
}

const toNumberOrNull = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (!Number.isNaN(parsed)) {
      return parsed
    }
  }
  return null
}

const PLACE_SYNONYMS = new Set([
  'place',
  'restaurant',
  'bar',
  'cafe',
  'coffee shop',
  'venue',
  'hotel',
  'neighborhood',
  'city',
  'museum',
  'park',
  'bookstore',
  'gallery',
  'pub',
  'club',
  'speakeasy',
  'promenade',
  'landmark',
])

const WORK_SYNONYMS = new Set(['work', 'book', 'film', 'movie', 'album', 'song', 'essay', 'article', 'show'])

const matchesMode = (typeHint: string | null | undefined, mode: PromptMode) => {
  if (!typeHint) return false
  const normalized = typeHint.toLowerCase()
  if (mode === 'places_only') {
    if (PLACE_SYNONYMS.has(normalized)) return true
    return [...PLACE_SYNONYMS].some((syn) => normalized.includes(syn))
  }
  if (mode === 'movies_only') {
    if (WORK_SYNONYMS.has(normalized)) return true
    return [...WORK_SYNONYMS].some((syn) => normalized.includes(syn))
  }
  return false
}

const normalizeItems = (items: ModelItem[], sessionId: string, mode?: PromptMode | null) => {
  return items
    .filter((item) => typeof item?.title === 'string' && item.title.trim().length > 0)
    .slice(0, 12)
    .map((item, idx) => {
      const confidence = toNumberOrNull(item.confidence)
      const typeHint = sanitizeString(item.type_hint ?? item.type, 120)
      const normalizedType = typeHint ?? (mode ? MODE_DEFAULT_TYPE[mode] ?? null : null)
      return {
        session_id: sessionId,
        item_index: idx,
        title: sanitizeString(item.title, 280) ?? 'Untitled',
        subtitle: sanitizeString(item.subtitle, 280),
        link: sanitizeString(item.link, 1024),
        image: sanitizeString(item.image, 1024),
        context: sanitizeString(item.context, 1024),
        type_hint: normalizedType,
        confidence: confidence !== null ? Math.max(0, Math.min(1, confidence)) : null,
        escalated: Boolean(item.escalated),
        source_notes: Array.isArray(item.source_notes) || typeof item.source_notes === 'object'
          ? item.source_notes
          : null,
      }
    })
}

const buildSystemPrompt = (mode: PromptMode | null | undefined, override?: string | null) => {
  const sections = [SHARED_PROMPT]
  if (override && override.trim()) {
    sections.push(override.trim())
  } else if (mode && DEFAULT_MODE_INSTRUCTIONS[mode]) {
    sections.push(DEFAULT_MODE_INSTRUCTIONS[mode])
  }
  sections.push(JSON_SCHEMA_PROMPT)
  return sections.filter(Boolean).join('\n\n')
}

const buildUserPrompt = (payload: RamblePayload, transcript: string) => {
  const promptLine = payload.promptText
    ? `Prompt the friend answered: “${payload.promptText}”`
    : payload.promptCue
    ? `Prompt the friend answered: “${payload.promptCue}”`
    : 'Prompt text unavailable.'

  const analystInstructions = payload.agentPrompt?.trim()
    ? ['Analyst instructions from editor:', payload.agentPrompt.trim()]
    : []

  return [promptLine, ...analystInstructions, 'Transcript:', transcript].join('\n\n')
}

const extractItemsWithOpenAI = async (payload: RamblePayload, transcript: string, apiKey: string) => {
  const mode: PromptMode | null = payload.mode && DEFAULT_MODE_INSTRUCTIONS[payload.mode as PromptMode] ? (payload.mode as PromptMode) : null
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: buildSystemPrompt(mode, payload.modeInstruction),
        },
        {
          role: 'user',
          content: buildUserPrompt(payload, transcript),
        },
      ],
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`OpenAI extraction failed: ${response.status} ${errorText}`)
  }

  const completion = await response.json()
  const rawContent = completion?.choices?.[0]?.message?.content ?? ''
  const cleaned = rawContent.trim().replace(/^```json\s*/i, '').replace(/```$/i, '')

  let parsed: any
  try {
    parsed = JSON.parse(cleaned || rawContent)
  } catch (error) {
    console.error('[ramble] failed to parse model JSON', rawContent)
    throw new Error('Model returned invalid JSON structure')
  }

  if (Array.isArray(parsed)) {
    return parsed as ModelItem[]
  }

  if (Array.isArray(parsed?.items)) {
    return parsed.items as ModelItem[]
  }

  throw new Error('Model response did not include an `items` array')
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let sessionId: string | null = null

  try {
    const payload: RamblePayload = await req.json()
    console.log('[ramble] received payload', payload)
    const transcript = payload.transcript?.trim()
    const resolvedMode: PromptMode | null = payload.mode && DEFAULT_MODE_INSTRUCTIONS[payload.mode as PromptMode] ? (payload.mode as PromptMode) : null

    if (!transcript) {
      throw new Error('Transcript is required')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing')
    }

    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: {
        headers: { Authorization: `Bearer ${supabaseServiceKey}` },
      },
    })

    let supabaseUserId: string | null = null
    try {
      const authHeader = req.headers.get('Authorization') ?? ''
      const token = authHeader.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : null
      if (token) {
        const { data: authData } = await supabase.auth.getUser(token)
        if (authData?.user?.id) {
          supabaseUserId = authData.user.id
        }
      }
    } catch (authError) {
      console.warn('[ramble] unable to resolve supabase user from token', authError)
    }

    const startedAt = new Date().toISOString()

    const { data: session, error: insertError } = await supabase
      .from('ramble_sessions')
      .insert({
        user_id: supabaseUserId,
        prompt_id: payload.promptId ?? 'custom',
        agent_prompt: payload.agentPrompt,
        transcript,
        transcript_source: 'manual',
        status: 'processing',
        pipeline_log: { started_at: startedAt },
      })
      .select()
      .single()

    if (insertError || !session) {
      throw new Error(insertError?.message ?? 'Failed to create session')
    }

    sessionId = session.id as string

    const stageDetails: StageDetail[] = [
      {
        stage: 'ASR (speech -> text)',
        status: 'skipped',
        detail: 'Manual transcript supplied by client; ASR step skipped.',
      },
    ]

    const extractionStarted = Date.now()
    const modelItems = await extractItemsWithOpenAI(payload, transcript, openaiApiKey)
    const extractionMs = Date.now() - extractionStarted

    const normalizedItems = normalizeItems(modelItems, sessionId, resolvedMode)
    const filteredItems =
      resolvedMode
        ? normalizedItems.filter((item) => matchesMode(item.type_hint, resolvedMode))
        : normalizedItems
    const missingCritical = filteredItems.filter((item) => !item.link || !item.image).length

    stageDetails.push({
      stage: 'Item segmentation & typing',
      status: 'done',
      detail:
        resolvedMode
          ? `Extracted ${normalizedItems.length} candidate item(s); ${filteredItems.length} match the ${modeDisplayLabel(resolvedMode) ?? resolvedMode} guidelines.`
          : `Extracted ${normalizedItems.length} candidate item(s) from the transcript.`,
    })
    stageDetails.push({
      stage: 'Structured extraction',
      status: 'done',
      detail: `Structured fields using gpt-4o-mini in ${extractionMs}ms.`,
    })
    stageDetails.push({
      stage: 'Link & image enrichment',
      status: 'done',
      detail:
        missingCritical === 0
          ? 'Model provided links and imagery suggestions for all items.'
          : `${missingCritical} item(s) missing link or image suggestions. Review manually.`,
    })
    stageDetails.push({
      stage: 'Validation & escalation',
      status: 'done',
      detail:
        missingCritical > 0
          ? 'Review flagged items manually or escalate to a stronger model for authoritative link/image resolution.'
          : resolvedMode
          ? `All remaining items align with the ${modeDisplayLabel(resolvedMode) ?? resolvedMode} guidelines.`
          : 'No escalation triggered; confidence scores embedded.',
    })

    if (filteredItems.length > 0) {
      const { error: itemsError } = await supabase.from('ramble_items').insert(filteredItems)
      if (itemsError) {
        throw new Error(itemsError.message)
      }
    }

    const pipelineLog = {
      ...(session.pipeline_log ?? {}),
      extraction_ms: extractionMs,
      item_count: filteredItems.length,
      mode: resolvedMode,
      mode_instruction:
        (payload.modeInstruction && payload.modeInstruction.trim()) ||
        (resolvedMode ? DEFAULT_MODE_INSTRUCTIONS[resolvedMode] : null),
      prompt_id: payload.promptId ?? null,
      prompt_text: payload.promptText ?? payload.promptCue ?? null,
      model: 'gpt-4o-mini',
      completed_at: new Date().toISOString(),
    }

    await supabase
      .from('ramble_sessions')
      .update({
        status: missingCritical > 0 ? 'completed' : 'completed',
        status_reason: missingCritical > 0 ? 'Missing enrichment for some items' : null,
        completed_at: new Date().toISOString(),
        pipeline_log: pipelineLog,
      })
      .eq('id', sessionId)

    return new Response(
      JSON.stringify({
        sessionId,
        items: filteredItems,
        stageDetails,
        message: `Processed ${filteredItems.length} item(s).`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('[ramble] edge function error', error)
    if (sessionId) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      if (supabaseUrl && supabaseServiceKey) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
          global: {
            headers: { Authorization: `Bearer ${supabaseServiceKey}` },
          },
        })
        await supabase
          .from('ramble_sessions')
          .update({
            status: 'failed',
            status_reason: error instanceof Error ? error.message : 'Unknown error',
          })
          .eq('id', sessionId)
      }
    }

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error occurred' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
