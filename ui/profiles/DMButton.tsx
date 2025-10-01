import { router } from 'expo-router'
import { Button } from '../buttons/Button'
import { c } from '@/features/style'
import { useAppStore } from '@/features/stores'
import { useEffect, useState } from 'react'
import { Profile } from '@/features/types'

export const DMButton = ({
  profile,
  fromSaves,
  disabled,
  style,
}: {
  profile: Profile
  fromSaves?: boolean
  disabled?: boolean
  style?: any
}) => {
  const { user, getDirectConversations, messagesPerConversation, openDMComposer } = useAppStore()

  const [existingConversationId, setExistingConversationId] = useState<string | null>(null)

  useEffect(() => {
    const checkIfDirectMessageExists = async () => {
      if (!profile || !user) {
        setExistingConversationId(null)
        return
      }
      try {
        const directConversations = await getDirectConversations()
        for (const conversation of directConversations) {
          const otherUserId = conversation.expand?.memberships_via_conversation
            .map((m) => m.expand?.user.id)
            .filter((id) => id !== user.id)[0]
          if (otherUserId === profile.id) {
            setExistingConversationId(conversation.id)
            return
          }
        }
        setExistingConversationId(null)
      } catch (error) {
        console.error(error)
        setExistingConversationId(null)
      }
    }
    checkIfDirectMessageExists()
  }, [profile, user, getDirectConversations])

  const handlePress = () => {
    if (!profile || !user) return

    if (existingConversationId) {
      const messages = messagesPerConversation[existingConversationId] || []
      if (messages.length > 0) {
        const route = `/messages/${existingConversationId}` as const
        if (fromSaves) router.replace(route)
        else router.push(route)
        return
      }
      openDMComposer(profile, { conversationId: existingConversationId })
      return
    }

    openDMComposer(profile)
  }

  return (
    <Button
      onPress={handlePress}
      variant={'whiteInverted'}
      disabled={disabled}
      title="Message"
      iconColor={c.muted}
      style={style}
    />
  )
}
