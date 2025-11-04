import { useMemo, useRef, useState } from 'react'
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import * as Clipboard from 'expo-clipboard'

import { c, s, t } from '@/features/style'
import { useAppStore } from '@/features/stores'
import { supabase } from '@/features/supabase/client'

type PipelineStage = {
  stage: string
  model: string
  when: string
  notes: string
}

type StageStatus = 'idle' | 'running' | 'done' | 'skipped'

type DemoStage = PipelineStage & {
  status: StageStatus
  detail?: string
}

type RefResult = {
  itemIndex: number
  title: string
  subtitle?: string | null
  link?: string | null
  image?: string | null
  context?: string | null
  type?: string | null
  confidence?: number | null
}

type PromptMode = 'places_only' | 'movies_only'

const MODE_LABELS: Record<PromptMode, string> = {
  places_only: 'places',
  movies_only: 'movies',
}

const ALL_MODES: PromptMode[] = ['places_only', 'movies_only']

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

const OUTPUT_SCHEMA_PROMPT = [
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
    '- Images must be storefront or interior photos (prefer Google Maps).',
    '- If the transcript mentions a dish/person/object, infer the venue it implies and correct the title to the canonical place.',
  ].join('\n'),
  movies_only: [
    'Task (MODE = movies_only):',
    '- Every item must be a film.',
    '- Subtitle = director + release year.',
    '- Links must be official studio pages or IMDb.',
    '- Images must be theatrical posters or official key art.',
    '- Correct obvious fuzzy titles using world knowledge.',
  ].join('\n'),
}

type PromptConfig = {
  id: string
  title: string
  cue: string
  promptText: string
  mode: PromptMode
  sampleTranscript: string
  sampleResults: RefResult[]
  stageNotes: Record<string, string>
}

const pipeline: PipelineStage[] = [
  {
    stage: 'ASR (speech -> text)',
    model: 'Whisper large-v3-turbo / Deepgram Nova-2 / Google STT',
    when: 'Always first',
    notes: 'Punctuation ON, word timestamps OFF. Return transcript + segments.',
  },
  {
    stage: 'Item segmentation & typing',
    model: 'GPT-4o-mini / Claude Haiku / Gemini Flash',
    when: 'Immediately after ASR',
    notes: 'response_format=json, temperature=0. Output array of candidate refs with coarse type + confidence.',
  },
  {
    stage: 'Structured extraction',
    model: 'Same efficient model as segmentation',
    when: 'Only if segmentation confident',
    notes: 'Normalize titles/subtitles, carry context snippets, emit search_queries[] for each item.',
  },
  {
    stage: 'Link & image enrichment',
    model: 'Deterministic tools (Google Maps, OpenLibrary, TMDB, OG scrapers)',
    when: 'Per item based on type',
    notes: 'Prefer authoritative sources. Cache lookups in Supabase. No heavy LLM unless conflict found.',
  },
  {
    stage: 'Validation & escalation',
    model: 'Efficient LLM w/ JSON schema + rules, escalate only on gaps',
    when: 'After enrichment',
    notes: 'Verify title/link/image/context set. Retry targeted lookup before escalation.',
  },
]

const prompts: PromptConfig[] = [
  {
    id: 'movies',
    title: 'Favorite movies',
    cue: '"Chat about the movies you come back to whenever you need comfort."',
    promptText: 'Chat about the movies you come back to whenever you need comfort.',
    mode: 'movies_only',
    sampleTranscript:
      "Okay so my go-to movie when I need to cheer up is The Muppet Movie - the original one with the banjo intro. My dad used to quote it on road trips. When I'm feeling nostalgic New York energy, I go straight to When Harry Met Sally. My grandma actually took me to the IFC Center to see the anniversary screening, and I remember the deli scene getting a standing ovation. I also end up rewatching Paddington 2 every winter; it's technically a kids movie but the soundtrack and the pop-up book sequence just reset my mood.",
    sampleResults: [
      {
        itemIndex: 0,
        title: 'The Muppet Movie',
        subtitle: 'Directed by James Frawley (1979)',
        link: 'https://www.disneyplus.com/movies/the-muppet-movie/6l08A3B2PVkb',
        image: 'https://images.unsplash.com/photo-1524985069026-dd778a71c7b4?auto=format&fit=crop&w=640&q=80',
        context: '"My dad used to quote it on road trips."',
      },
      {
        itemIndex: 1,
        title: 'When Harry Met Sally...',
        subtitle: 'Directed by Rob Reiner (1989)',
        link: 'https://www.sonypictures.com/movies/whenharrymetsally',
        image: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=640&q=70',
        context: '"My grandma took me to the IFC Center anniversary screening and everyone applauded the deli scene."',
      },
      {
        itemIndex: 2,
        title: 'Paddington 2',
        subtitle: 'Directed by Paul King (2017)',
        link: 'https://www.studiocanal.com/movie/paddington-2',
        image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=640&q=60',
        context: '"The pop-up book sequence just resets my mood every winter."',
      },
    ],
    stageNotes: {
      'ASR (speech -> text)': 'Whisper large-v3-turbo detected a 46s clip, 3 segments, 0.96 avg confidence.',
      'Item segmentation & typing': 'Segmenter surfaced 3 works (movies) with confidence >= 0.82.',
      'Structured extraction': 'Normalized titles via IMDb canonical forms, inferred directors as subtitles.',
      'Link & image enrichment': 'Fetched official studio landing pages + theatrical art via TMDB posters.',
      'Validation & escalation': 'All items contained title/link/image/context; no escalation needed.',
    },
  },
  {
    id: 'places',
    title: 'Places that feel like home',
    cue: '"Tell us about a place that grounds you - even if it is just a coffee shop counter."',
    promptText: 'Tell us about a place that grounds you - even if it is just a coffee shop counter.',
    mode: 'places_only',
    sampleTranscript:
      "There's a coffee shop called El Rey on the Lower East Side where I basically learned how to slow down. I used to go before opening shifts and they'd play this mellow vinyl while I planned my day. The staff would slide me an iced matcha with macadamia milk before I even ordered. Another spot is the Brooklyn Heights Promenade: when I have a decision to make I walk the promenade at sunset and it always clears my head. And then there is McNally Jackson in Seaport - it's where I met half my book club, so I end up there most Sundays grabbing a new paperback.",
    sampleResults: [
      {
        itemIndex: 0,
        title: 'El Rey Coffee',
        subtitle: '82 Stanton St, New York, NY',
        link: 'https://maps.google.com/?q=El+Rey+Coffee+New+York',
        image: 'https://images.unsplash.com/photo-1459755486867-b55449bb39ff?auto=format&fit=crop&w=640&q=60',
        context: '"They would slide me an iced matcha with macadamia milk before I even ordered."',
      },
      {
        itemIndex: 1,
        title: 'Brooklyn Heights Promenade',
        subtitle: 'Brooklyn Heights, NY 11201',
        link: 'https://maps.google.com/?q=Brooklyn+Heights+Promenade',
        image: 'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=640&q=60',
        context: '"When I have a decision to make I walk it at sunset and it clears my head."',
      },
      {
        itemIndex: 2,
        title: 'McNally Jackson Seaport',
        subtitle: '4 Fulton St, New York, NY',
        link: 'https://www.mcnallyjackson.com/seaport',
        image: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=640&q=60',
        context: '"It is where I met half my book club so I stop in most Sundays."',
      },
    ],
    stageNotes: {
      'ASR (speech -> text)': 'Google STT transcript, punctuation restored, 4 segments, 0 hesitations flagged.',
      'Item segmentation & typing': 'Detected 3 locations, classified as "place" with >= 0.88 confidence.',
      'Structured extraction': 'Generated normalized display names + captured personal context snippets.',
      'Link & image enrichment': 'Google Places + OG scrapers provided Maps links and storefront photography.',
      'Validation & escalation': 'Second pass filled missing subtitle with street address, no escalation needed.',
    },
  },
]

const ResultCard = ({ item }: { item: RefResult }) => {
  const handleOpenLink = () => {
    if (!item.link) return
    void Linking.openURL(item.link).catch(() => {})
  }

  const linkLabel = item.link ?? 'Link pending review'
  const confidenceLabel =
    typeof item.confidence === 'number' ? `${Math.round(item.confidence * 100)}% confidence` : null

  return (
    <View style={styles.resultCard}>
      {item.image ? (
        <Image source={{ uri: item.image }} style={styles.resultImage} />
      ) : (
        <View style={styles.resultImageFallback}>
          <Text style={styles.resultImageFallbackText}>{(item.type ?? 'ref').slice(0, 1).toUpperCase()}</Text>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.resultTitle}>{item.title}</Text>
        {!!item.subtitle && <Text style={styles.resultSubtitle}>{item.subtitle}</Text>}
        <Pressable onPress={handleOpenLink} disabled={!item.link}>
          <Text style={[styles.resultLink, !item.link && styles.resultLinkDisabled]} numberOfLines={1}>
            {linkLabel}
          </Text>
        </Pressable>
        {!!item.context && <Text style={styles.resultContext}>{item.context}</Text>}
        <View style={styles.resultMetaRow}>
          {!!item.type && <Text style={styles.resultMetaChip}>{item.type}</Text>}
          {!!confidenceLabel && <Text style={styles.resultMetaChip}>{confidenceLabel}</Text>}
        </View>
      </View>
    </View>
  )
}

export default function SlideOnboardingTestScreen() {
  const { user, setHomePagerIndex, homePagerIndex, setProfileNavIntent } = useAppStore()
  const router = useRouter()

  if (!user) {
    router.dismissTo('/')
    return null
  }

  const [selectedPromptId, setSelectedPromptId] = useState<string>(prompts[0].id)
  const [transcript, setTranscript] = useState<string>(prompts[0].sampleTranscript)
  const [demoStages, setDemoStages] = useState<DemoStage[]>(() =>
    pipeline.map((stage) => ({
      ...stage,
      status: 'idle' as StageStatus,
      detail: undefined,
    }))
  )
  const [results, setResults] = useState<RefResult[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [lastRun, setLastRun] = useState<Date | null>(null)
  const [runMessage, setRunMessage] = useState<string>('')
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null)
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [customPromptText, setCustomPromptText] = useState<string>(prompts[0].promptText)
  const [modeInstructions, setModeInstructions] = useState<Record<PromptMode, string>>(() => ({
    ...DEFAULT_MODE_INSTRUCTIONS,
  }))
  const [selectedModes, setSelectedModes] = useState<PromptMode[]>([prompts[0].mode])
  const [additionalInstructions, setAdditionalInstructions] = useState<string>('')

  const selectedPrompt = prompts.find((prompt) => prompt.id === selectedPromptId) ?? prompts[0]

  const activeMode = useMemo<PromptMode>(() => selectedModes[0] ?? selectedPrompt.mode, [selectedModes, selectedPrompt.mode])

  const lastUpdated = useMemo(() => new Date().toLocaleString(), [])

  const promptPreview = useMemo(() => {
    const modeInstruction = modeInstructions[activeMode] ?? DEFAULT_MODE_INSTRUCTIONS[activeMode]
    const parts = [
      SHARED_PROMPT,
      modeInstruction,
      OUTPUT_SCHEMA_PROMPT,
      `Prompt the friend answered: “${customPromptText}”`,
    ]
    if (additionalInstructions.trim()) {
      parts.push(`Additional editor instructions:\n${additionalInstructions.trim()}`)
    }
    parts.push('Transcript:')
    parts.push(transcript.trim() || '[Transcript will stream from ASR]')
    return parts.filter(Boolean).join('\n\n')
  }, [activeMode, modeInstructions, customPromptText, additionalInstructions, transcript])

  const stageSummaries = useMemo(() => {
    if (!lastRun) return []
    return demoStages
      .filter((stage) => stage.detail && stage.status !== 'idle')
      .map((stage) => `${stage.stage}: ${stage.detail}`)
  }, [demoStages, lastRun])

  const resetStages = () => {
    setDemoStages(
      pipeline.map((stage) => ({
        ...stage,
        status: 'idle' as StageStatus,
        detail: undefined,
      }))
    )
  }

  const handleSelectPrompt = (promptId: string) => {
    const next = prompts.find((prompt) => prompt.id === promptId)
    if (!next) return
    setSelectedPromptId(promptId)
    setTranscript(next.sampleTranscript)
    setResults([])
    setRunMessage('')
    setLastRun(null)
    setCopyFeedback(null)
    setCustomPromptText(next.promptText)
    setSelectedModes([next.mode])
    setModeInstructions((prev) => ({
      ...prev,
      [next.mode]: DEFAULT_MODE_INSTRUCTIONS[next.mode],
    }))
    setAdditionalInstructions('')
    resetStages()
  }

  const toggleMode = (mode: PromptMode) => {
    setSelectedModes((prev) => {
      const exists = prev.includes(mode)
      if (exists) {
        if (prev.length === 1) return prev
        return prev.filter((item) => item !== mode)
      }
      return [mode, ...prev]
    })
  }

  const handleModeInstructionsChange = (mode: PromptMode, value: string) => {
    setModeInstructions((prev) => ({
      ...prev,
      [mode]: value,
    }))
  }

  const handleCopyPromptPreview = async () => {
    if (!promptPreview.trim()) return
    try {
      await Clipboard.setStringAsync(promptPreview)
      setCopyFeedback('Prompt copied to clipboard.')
    } catch (error) {
      console.error('[ramble] copy failed', error)
      setCopyFeedback('Could not copy prompt.')
    }
    if (copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current)
    }
    copyTimeoutRef.current = setTimeout(() => setCopyFeedback(null), 2000)
  }

  const handleRunDemo = async () => {
    if (isProcessing) return

    const supabaseClient = supabase.client
    if (!supabaseClient) {
      setRunMessage('Supabase client not available. Check environment variables.')
      return
    }

    if (!selectedModes.length) {
      setRunMessage('Select at least one mode before running the pipeline.')
      return
    }

    const trimmedPrompt = customPromptText.trim()
    if (!trimmedPrompt) {
      setRunMessage('Enter the prompt copy before running the pipeline.')
      return
    }

    const trimmedTranscript = transcript.trim()
    if (!trimmedTranscript) {
      setRunMessage('Add a transcript before running the pipeline.')
      return
    }

    const manualStageDetail = 'Manual transcript supplied by user; ASR skipped for this run.'
    const activeModeLabel = MODE_LABELS[activeMode]
    const modeInstruction = (modeInstructions[activeMode] ?? DEFAULT_MODE_INSTRUCTIONS[activeMode]).trim()
    const trimmedAdditionalInstructions = additionalInstructions.trim()

    setIsProcessing(true)
    setResults([])
    setRunMessage(`Submitting transcript to the ${activeModeLabel} pipeline...`)

    setDemoStages(
      pipeline.map((stage) => {
        if (stage.stage === 'ASR (speech -> text)') {
          return { ...stage, status: 'skipped', detail: manualStageDetail }
        }
        return { ...stage, status: 'running', detail: undefined }
      })
    )

    try {
      const { data: sessionData } = await supabaseClient.auth.getSession()
      const accessToken = sessionData?.session?.access_token || process.env.EXPO_PUBLIC_SUPA_KEY || ''

      const requestBody = {
        promptId: selectedPrompt.id,
        promptTitle: selectedPrompt.title,
        promptCue: selectedPrompt.cue,
        promptText: trimmedPrompt,
        mode: activeMode,
        modeInstruction,
        agentPrompt: trimmedAdditionalInstructions,
        transcript: trimmedTranscript,
      }

      const supabaseUrl = process.env.EXPO_PUBLIC_SUPA_URL
      if (!supabaseUrl) {
        throw new Error('Missing EXPO_PUBLIC_SUPA_URL env variable')
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/ramble`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(requestBody),
      })

      const responseText = await response.text()
      console.log('[ramble] edge response', response.status, responseText)

      if (!response.ok) {
        throw new Error(`status ${response.status}: ${responseText}`)
      }

      const data = responseText ? JSON.parse(responseText) : {}

      const stageDetails = new Map<string, { stage: string; detail?: string; status?: StageStatus }>(
        (data?.stageDetails ?? []).map((entry: any) => [
          entry.stage as string,
          {
            stage: entry.stage as string,
            detail: entry.detail as string | undefined,
            status: entry.status as StageStatus | undefined,
          },
        ])
      )

      setDemoStages((prev) =>
        prev.map((stage) => {
          const override = stageDetails.get(stage.stage)
          if (stage.stage === 'ASR (speech -> text)') {
            return {
              ...stage,
              status: override?.status ?? 'skipped',
              detail: override?.detail ?? manualStageDetail,
            }
          }
          return {
            ...stage,
            status: override?.status ?? 'done',
            detail: override?.detail ?? stage.notes,
          }
        })
      )

      const mappedResults: RefResult[] = (data?.items ?? []).map((item: any, idx: number) => ({
        itemIndex: typeof item.item_index === 'number' ? item.item_index : idx,
        title: item.title ?? 'Untitled',
        subtitle: item.subtitle ?? null,
        link: item.link ?? null,
        image: item.image ?? null,
        context: item.context ?? null,
        type: item.type_hint ?? item.type ?? null,
        confidence:
          typeof item.confidence === 'number'
            ? Math.max(0, Math.min(1, Number(item.confidence)))
            : null,
      }))

      setResults(mappedResults)
      setLastRun(new Date())
      const modeLabel = MODE_LABELS[activeMode]
      const sessionMessage = data?.sessionId
        ? `Session ${String(data.sessionId).slice(0, 8)}… (${modeLabel}) complete.`
        : `Pipeline complete (${modeLabel}).`
      setRunMessage(data?.message ?? sessionMessage)
    } catch (error) {
      let errorDetail = ''
      if (typeof error === 'object' && error && 'context' in error) {
        try {
          // @ts-ignore - functions error shape
          const response: Response | undefined = error?.context?.response
          if (response) {
            const text = await response.clone().text()
            if (text) {
              try {
                const parsed = JSON.parse(text)
                errorDetail = parsed?.error || parsed?.message || text
              } catch {
                errorDetail = text
              }
            }
          }
        } catch (parseError) {
          console.warn('[ramble] failed to read error payload', parseError)
        }
      }
      let debugInfo = errorDetail
      if (!debugInfo) {
        try {
          debugInfo = JSON.stringify(error)
        } catch {
          debugInfo = String(error)
        }
      }
      console.error('[ramble] pipeline run failed', error, debugInfo)
      const readableMessage = `Pipeline failed: ${debugInfo}`
      setRunMessage(readableMessage)
      setDemoStages((prev) =>
        prev.map((stage) =>
          stage.stage === 'ASR (speech -> text)'
            ? { ...stage, status: 'skipped', detail: manualStageDetail }
            : { ...stage, status: 'idle', detail: stage.notes }
        )
      )
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReturnHome = () => {
    if (!user?.userName) return
    const targetIndex = 0
    const alreadyOnGrid = homePagerIndex === targetIndex

    setHomePagerIndex(targetIndex)
    setProfileNavIntent({
      targetPagerIndex: targetIndex,
      source: 'other',
      animate: !alreadyOnGrid,
    })

    router.push({
      pathname: '/user/[userName]',
      params: { userName: user.userName, _t: Date.now().toString() },
    })
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.topRow}>
        <Text style={styles.pageLabel}>Experimental</Text>
        <Pressable
          onPress={handleReturnHome}
          style={({ pressed }) => [
            styles.homeButton,
            {
              opacity: pressed ? 0.6 : 1,
            },
          ]}
        >
          <Text style={styles.homeButtonText}>Return home</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        alwaysBounceVertical
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>Slide onboarding test</Text>
        <Text style={styles.subheading}>Hidden prototype workspace to vet the "ramble to refs" onboarding concept.</Text>

        <View style={styles.card}>
          <Text style={styles.cardHeading}>Prompt setup</Text>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Load sample</Text>
            <View style={styles.promptRow}>
              {prompts.map((prompt) => {
                const selected = prompt.id === selectedPromptId
                return (
                  <Pressable
                    key={prompt.id}
                    onPress={() => handleSelectPrompt(prompt.id)}
                    style={({ pressed }) => [
                      styles.promptPill,
                      selected && styles.promptPillSelected,
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <Text style={[styles.promptText, selected && styles.promptTextSelected]}>{prompt.title}</Text>
                  </Pressable>
                )
              })}
            </View>
            <Text style={styles.promptCue}>{selectedPrompt.cue}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Prompt copy</Text>
            <TextInput
              multiline
              value={customPromptText}
              onChangeText={setCustomPromptText}
              textAlignVertical="top"
              style={styles.promptInput}
              placeholder="Describe what the friend is being asked."
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Modes (first selected runs)</Text>
            <View style={styles.modeRow}>
              {ALL_MODES.map((mode) => {
                const selected = selectedModes.includes(mode)
                return (
                  <Pressable
                    key={mode}
                    onPress={() => toggleMode(mode)}
                    style={({ pressed }) => [
                      styles.modePill,
                      selected && styles.modePillSelected,
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <Text style={[styles.modePillText, selected && styles.modePillTextSelected]}>
                      {MODE_LABELS[mode]}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
            <Text style={styles.modeHint}>Active mode: {MODE_LABELS[activeMode]}</Text>
          </View>

          {selectedModes.map((mode) => (
            <View key={mode} style={styles.section}>
              <Text style={styles.sectionLabel}>Mode instructions — {MODE_LABELS[mode]}</Text>
              <TextInput
                multiline
                value={modeInstructions[mode] ?? DEFAULT_MODE_INSTRUCTIONS[mode]}
                onChangeText={(value) => handleModeInstructionsChange(mode, value)}
                textAlignVertical="top"
                style={styles.modeInput}
              />
            </View>
          ))}

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Transcript</Text>
            <TextInput
              multiline
              numberOfLines={6}
              value={transcript}
              onChangeText={setTranscript}
              style={styles.transcriptInput}
              textAlignVertical="top"
              placeholder="Paste or type the voice note transcript..."
            />
            <Text style={styles.transcriptHint}>
              In the real flow this will be captured from the user's audio. For now it feeds the simulated pipeline.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Additional editor instructions (optional)</Text>
            <TextInput
              multiline
              value={additionalInstructions}
              onChangeText={setAdditionalInstructions}
              textAlignVertical="top"
              style={styles.promptInput}
              placeholder="Add one-off rules or clarifications."
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Composed prompt preview</Text>
            <View style={styles.previewBox}>
              <Text style={styles.previewText}>{promptPreview}</Text>
            </View>
            <View style={styles.transcriptActions}>
              <Pressable
                onPress={handleCopyPromptPreview}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  pressed && styles.secondaryButtonPressed,
                ]}
              >
                <Text style={styles.secondaryButtonText}>Copy final prompt</Text>
              </Pressable>
            </View>
            {!!copyFeedback && <Text style={styles.copyFeedback}>{copyFeedback}</Text>}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Run pipeline</Text>
            <Pressable
              disabled={isProcessing}
              onPress={() => {
                void handleRunDemo()
              }}
              style={({ pressed }) => [
                styles.processButton,
                (pressed || isProcessing) && styles.processButtonPressed,
                isProcessing && styles.processButtonDisabled,
              ]}
            >
              <Text style={styles.processButtonText}>{isProcessing ? 'Processing...' : 'Run demo pipeline'}</Text>
            </Pressable>
            {!!runMessage && (
              <Text style={styles.runMessage}>
                {runMessage} {lastRun ? `Last run ${lastRun.toLocaleTimeString()}` : ''}
              </Text>
            )}
            {stageSummaries.length > 0 && (
              <View style={styles.stageSummaryBox}>
                {stageSummaries.map((line) => (
                  <Text key={line} style={styles.stageSummaryText}>
                    {line}
                  </Text>
                ))}
              </View>
            )}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardHeading}>Generated ref cards</Text>
          {results.length === 0 ? (
            <Text style={styles.bodyMuted}>Run the demo to populate cards.</Text>
          ) : (
            results.map((result, idx) => (
              <View key={`${result.itemIndex}-${idx}`} style={styles.resultWrapper}>
                <ResultCard item={result} />
              </View>
            ))
          )}
        </View>

        <Text style={styles.meta}>Opened {lastUpdated}</Text>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: c.surface,
  },
  scroll: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: s.$1,
    paddingTop: s.$1,
  },
  content: {
    paddingHorizontal: s.$1,
    paddingTop: s.$1,
    paddingBottom: s.$2,
  },
  heading: {
    ...t.h1,
    color: c.black,
    marginBottom: s.$08,
  },
  subheading: {
    ...t.psemi,
    color: c.muted,
    marginBottom: s.$1,
  },
  card: {
    backgroundColor: c.surface2,
    borderRadius: 18,
    padding: s.$1,
    marginBottom: s.$1,
    borderWidth: 1,
    borderColor: '#e0dbd1',
  },
  cardHeading: {
    ...t.h3,
    color: c.newDark,
    marginBottom: s.$08,
  },
  body: {
    ...t.p,
    color: c.muted2,
    marginBottom: 6,
  },
  bodyMuted: {
    ...t.p,
    color: c.muted,
  },
  meta: {
    ...t.smallmuted,
    marginTop: s.$2,
    textAlign: 'center',
  },
  pageLabel: {
    ...t.smallmuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  homeButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: c.surface2,
    borderWidth: 1,
    borderColor: '#d6d0c4',
  },
  homeButtonText: {
    ...t.psemi,
    color: c.newDark,
  },
  section: {
    marginTop: s.$08,
  },
  sectionHeading: {
    ...t.psemi,
    color: c.newDark,
    marginBottom: s.$08,
  },
  sectionLabel: {
    ...t.psemi,
    color: c.newDark,
    marginBottom: 6,
  },
  promptRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    marginBottom: s.$08,
  },
  promptPill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d6d0c4',
    backgroundColor: c.surface,
    marginHorizontal: 4,
    marginBottom: 8,
  },
  promptPillSelected: {
    backgroundColor: c.accent2,
    borderColor: c.olive,
  },
  promptText: {
    ...t.p,
    color: c.muted2,
  },
  promptTextSelected: {
    ...t.psemi,
    color: c.newDark,
  },
  promptCue: {
    ...t.p,
    color: c.muted,
  },
  modeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
    marginHorizontal: -4,
  },
  modePill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d6d0c4',
    backgroundColor: c.surface,
    marginHorizontal: 4,
    marginBottom: 8,
  },
  modePillSelected: {
    backgroundColor: c.accent2,
    borderColor: c.olive,
  },
  modePillText: {
    ...t.smallmuted,
    color: c.muted2,
  },
  modePillTextSelected: {
    ...t.psemi,
    color: c.newDark,
  },
  modeHint: {
    ...t.smallmuted,
    marginBottom: s.$08,
  },
  promptInput: {
    borderWidth: 1,
    borderColor: '#d6d0c4',
    borderRadius: 12,
    padding: 12,
    backgroundColor: c.surface,
    fontSize: 15,
    lineHeight: 20,
    minHeight: 220,
    color: c.muted2,
  },
  transcriptInput: {
    borderWidth: 1,
    borderColor: '#d6d0c4',
    borderRadius: 12,
    padding: 12,
    backgroundColor: c.surface,
    minHeight: 140,
    fontSize: 16,
    lineHeight: 22,
    color: c.muted2,
  },
  transcriptHint: {
    ...t.smallmuted,
    marginTop: s.$08,
  },
  copyFeedback: {
    ...t.smallmuted,
    marginTop: 6,
  },
  previewBox: {
    borderWidth: 1,
    borderColor: '#d6d0c4',
    borderRadius: 12,
    backgroundColor: c.surface,
    padding: 12,
  },
  previewText: {
    fontFamily: 'Courier',
    fontSize: 15,
    lineHeight: 20,
    color: c.muted2,
  },
  modeInput: {
    borderWidth: 1,
    borderColor: '#d6d0c4',
    borderRadius: 12,
    padding: 12,
    backgroundColor: c.surface,
    minHeight: 160,
    fontFamily: 'Courier',
    fontSize: 15,
    lineHeight: 20,
    color: c.muted2,
  },
  processButton: {
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 18,
    backgroundColor: c.olive,
    alignItems: 'center',
  },
  processButtonPressed: {
    opacity: 0.75,
  },
  processButtonDisabled: {
    backgroundColor: '#b8c3b1',
  },
  processButtonText: {
    ...t.psemi,
    color: '#fff',
  },
  runMessage: {
    ...t.smallmuted,
    marginTop: s.$08,
  },
  stageSummaryBox: {
    marginTop: 12,
  },
  stageSummaryText: {
    ...t.smallmuted,
    marginBottom: 4,
  },
  resultWrapper: {
    marginBottom: 12,
  },
  resultCard: {
    flexDirection: 'row',
    padding: 12,
    borderWidth: 1,
    borderColor: '#d6d0c4',
    borderRadius: 16,
    backgroundColor: c.surface,
  },
  resultImage: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: '#ddd',
    marginRight: 12,
  },
  resultImageFallback: {
    width: 72,
    height: 72,
    borderRadius: 12,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d9d5cc',
  },
  resultImageFallbackText: {
    ...t.psemi,
    color: c.newDark,
    fontSize: 18,
  },
  resultTitle: {
    ...t.psemi,
    color: c.newDark,
  },
  resultSubtitle: {
    ...t.smallmuted,
    marginTop: 2,
  },
  resultLink: {
    ...t.smallmuted,
    color: '#4a6b49',
    marginTop: 6,
  },
  resultLinkDisabled: {
    color: c.muted,
  },
  resultContext: {
    ...t.smallmuted,
    color: c.muted2,
    marginTop: 8,
  },
  resultMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  resultMetaChip: {
    ...t.smallmuted,
    backgroundColor: c.accent2,
    color: c.newDark,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
})
