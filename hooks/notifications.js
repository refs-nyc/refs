/// <reference path="../.pocketbase/pb_data/types.d.ts" />

const NOTIFICATIONS_URL = $os.getenv('SUPABASE_NOTIFICATIONS_URL') || ''
const NOTIFICATIONS_SECRET = $os.getenv('SUPABASE_NOTIFICATIONS_SECRET') || ''
const SUPABASE_ANON_KEY = $os.getenv('SUPABASE_ANON_KEY') || ''

function sendNotifications(notifications) {
  if (!NOTIFICATIONS_URL) {
    console.log('Push notifications disabled: SUPABASE_NOTIFICATIONS_URL not set')
    return
  }

  if (!notifications || notifications.length === 0) {
    return
  }

  try {
    const headers = {
      'Content-Type': 'application/json',
    }

    if (SUPABASE_ANON_KEY) {
      headers['Authorization'] = `Bearer ${SUPABASE_ANON_KEY}`
      headers['apikey'] = SUPABASE_ANON_KEY
    }

    if (NOTIFICATIONS_SECRET) {
      headers['x-push-secret'] = NOTIFICATIONS_SECRET
    }

    const response = $http.send({
      method: 'POST',
      url: NOTIFICATIONS_URL,
      headers,
      body: JSON.stringify({ notifications }),
    })

    if (response.statusCode >= 300) {
      console.log('Push notification call failed', response.statusCode, response.raw)
    }
  } catch (error) {
    console.log('Push notification request error', error)
  }
}

function getUserDisplayName(userId) {
  try {
    const user = $app.dao().findFirstRecordByFilter('users', `id = "${userId}"`)
    if (!user) {
      return 'Someone'
    }
    return user.get('name') || user.get('userName') || 'Someone'
  } catch (error) {
    console.log('Failed to load user for notification', error)
    return 'Someone'
  }
}

function truncate(text, max = 120) {
  if (!text) return ''
  if (text.length <= max) return text
  return `${text.slice(0, max - 1)}…`
}

function handleMessageCreated(record) {
  const conversationId = record.get('conversation')
  const senderId = record.get('sender')
  if (!conversationId || !senderId) {
    return
  }

  const memberships = $app.dao().findRecordsByFilter('memberships', `conversation = "${conversationId}"`)

  const recipientIds = new Set()
  for (const membership of memberships || []) {
    const userId = membership.get('user')
    if (userId && userId !== senderId) {
      recipientIds.add(userId)
    }
  }

  if (recipientIds.size === 0) {
    return
  }

  const senderName = getUserDisplayName(senderId)
  const body = truncate(record.get('text') || '')
  const title = body ? `${senderName}: ${body}` : `${senderName} sent a message`

  sendNotifications([
    {
      recipientIds: Array.from(recipientIds),
      title,
      body: body || undefined,
      data: {
        type: 'message:new',
        conversationId,
        messageId: record.id,
      },
    },
  ])
}

function handleItemCreated(record) {
  const creatorId = record.get('creator')
  const refId = record.get('ref')
  if (!creatorId || !refId) {
    return
  }

  const ref = $app.dao().findFirstRecordByFilter('refs', `id = "${refId}"`)
  const refTitle = ref?.get('title') || 'a ref'
  const actorName = getUserDisplayName(creatorId)

  // Notify parent profile owner if applicable
  const parentId = record.get('parent')
  if (parentId && parentId !== creatorId) {
    sendNotifications([
      {
        recipientIds: [parentId],
        title: `${actorName} just added ${refTitle} from your grid!`,
        data: {
          type: 'ref:copied_from_profile',
          refId,
          itemId: record.id,
        },
      },
    ])
  }

  // Notify everyone else who has this ref
  const otherItems = $app
    .dao()
    .findRecordsByFilter('items', `ref = "${refId}" && creator != "${creatorId}"`)

  const otherCreators = new Set()
  for (const item of otherItems || []) {
    const otherCreator = item.get('creator')
    if (otherCreator) {
      otherCreators.add(otherCreator)
    }
  }

  if (otherCreators.size > 0) {
    sendNotifications([
      {
        recipientIds: Array.from(otherCreators),
        title: `${actorName} just added ${refTitle} too.`,
        data: {
          type: 'ref:match',
          refId,
          itemId: record.id,
        },
      },
    ])
  }
}

function handleMembershipCreated(record) {
  const conversationId = record.get('conversation')
  const userId = record.get('user')
  if (!conversationId || !userId) {
    return
  }

  const conversation = $app.dao().findFirstRecordByFilter('conversations', `id = "${conversationId}"`)
  if (!conversation || conversation.get('is_direct')) {
    return
  }

  const actorName = getUserDisplayName(userId)
  const title = conversation.get('title') || 'your group chat'

  const memberships = $app
    .dao()
    .findRecordsByFilter('memberships', `conversation = "${conversationId}" && user != "${userId}"`)

  const recipientIds = new Set()
  for (const membership of memberships || []) {
    const memberId = membership.get('user')
    if (memberId) {
      recipientIds.add(memberId)
    }
  }

  if (recipientIds.size === 0) {
    return
  }

  sendNotifications([
    {
      recipientIds: Array.from(recipientIds),
      title: `${actorName} joined ${title}`,
      data: {
        type: 'community:joined',
        conversationId,
        userId,
      },
    },
  ])
}

onRecordAfterCreateRequest((e) => {
  if (!NOTIFICATIONS_URL) {
    return
  }

  if (e.collection.name === 'messages') {
    handleMessageCreated(e.record)
  } else if (e.collection.name === 'items') {
    handleItemCreated(e.record)
  } else if (e.collection.name === 'memberships') {
    handleMembershipCreated(e.record)
  }
})
