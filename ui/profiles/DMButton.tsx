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
  const { user, getDirectConversations } = useAppStore()

  const [target, setTarget] = useState<string>('')

  useEffect(() => {
    const checkIfDirectMessageExists = async () => {
      if (!profile) {
        setTarget('')
        return
      }
      try {
        let existingConversationId = ''

        const directConversations = await getDirectConversations()
        for (const conversation of directConversations) {
          const otherUserId = conversation.expand?.memberships_via_conversation
            .map((m) => m.expand?.user.id)
            .filter((id) => id !== user?.id)[0]
          if (otherUserId === profile.id) {
            existingConversationId = conversation.id
            break
          }
        }
        if (!existingConversationId) {
          setTarget(`/user/${profile.userName}/new-dm`)
        } else {
          setTarget('/messages/' + existingConversationId)
        }
      } catch (error) {
        console.error(error)
      }
    }
    checkIfDirectMessageExists()
  }, [profile])

  return (
    <Button
      onPress={() => {
        if (fromSaves) router.replace(target as any)
        else router.push(target as any)
      }}
      variant={'whiteInverted'}
      disabled={disabled}
      title="Message"
      iconColor={c.muted}
      style={style}
    />
  )
}
