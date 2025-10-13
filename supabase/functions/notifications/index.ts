import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.46.0'

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const EXPO_ACCESS_TOKEN = Deno.env.get('EXPO_ACCESS_TOKEN')
const FUNCTION_SECRET = Deno.env.get('PUSH_FUNCTION_SECRET')

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase credentials in environment')
}

const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null

type IncomingNotification = {
  recipientIds: string[]
  title: string
  body?: string
  data?: Record<string, unknown>
}

const chunk = <T>(input: T[], size: number): T[][] => {
  const result: T[][] = []
  for (let i = 0; i < input.length; i += size) {
    result.push(input.slice(i, i + size))
  }
  return result
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (!supabase) {
    return new Response(JSON.stringify({ error: 'Supabase client not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (FUNCTION_SECRET) {
    const secretHeader = req.headers.get('x-push-secret') ?? ''
    if (secretHeader !== FUNCTION_SECRET) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  }

  let payload: { notifications?: IncomingNotification[] }
  try {
    payload = await req.json()
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Invalid JSON', details: String(error) }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const notifications = payload.notifications || []
  if (!Array.isArray(notifications) || notifications.length === 0) {
    return new Response(JSON.stringify({ sent: 0, skipped: 'empty-payload' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const recipientSet = new Set<string>()
  for (const notification of notifications) {
    if (!notification || !Array.isArray(notification.recipientIds)) continue
    for (const id of notification.recipientIds) {
      if (id) recipientSet.add(id)
    }
  }

  if (recipientSet.size === 0) {
    return new Response(JSON.stringify({ sent: 0, skipped: 'no-recipients' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const recipientIds = Array.from(recipientSet)
  const { data: users, error } = await supabase
    .from('users')
    .select('id, push_token')
    .in('id', recipientIds)

  if (error) {
    console.error('Failed to load push tokens', error)
    return new Response(JSON.stringify({ error: 'Failed to load push tokens' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const tokenMap = new Map<string, string>()
  for (const row of users || []) {
    if (row.push_token) {
      tokenMap.set(row.id, row.push_token)
    }
  }

  const messages: Array<Record<string, unknown>> = []
  for (const notification of notifications) {
    if (!notification || !Array.isArray(notification.recipientIds)) continue
    for (const id of notification.recipientIds) {
      const token = tokenMap.get(id)
      if (!token) continue
      const message: Record<string, unknown> = {
        to: token,
        sound: null,
        title: notification.title,
        body: notification.body,
        data: notification.data ?? {},
      }
      
      // Add iOS-specific threading if threadId is present
      if (notification.data?.threadId) {
        message.ios = {
          _displayInForeground: true,
          threadId: notification.data.threadId,
        }
      }
      
      messages.push(message)
    }
  }

  if (messages.length === 0) {
    return new Response(JSON.stringify({ sent: 0, skipped: 'no-valid-tokens' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const chunks = chunk(messages, 100)
  const expoResponses: unknown[] = []

  for (const chunkMessages of chunks) {
    const expoRes = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(EXPO_ACCESS_TOKEN ? { Authorization: `Bearer ${EXPO_ACCESS_TOKEN}` } : {}),
      },
      body: JSON.stringify(chunkMessages),
    })

    if (!expoRes.ok) {
      const errorBody = await expoRes.text()
      console.error('Expo push error', expoRes.status, errorBody)
      expoResponses.push({ status: expoRes.status, error: errorBody })
    } else {
      expoResponses.push(await expoRes.json())
    }
  }

  return new Response(
    JSON.stringify({
      sent: messages.length,
      batches: chunks.length,
      expo: expoResponses,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    },
  )
})
