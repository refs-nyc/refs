import { router } from 'expo-router'
import { Button } from '../buttons/Button'
import { c } from '@/features/style'
import { useAppStore } from '@/features/stores'
import { useMemo } from 'react'
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
  const { getDirectConversation } = useAppStore()

  const target = useMemo(() => {
    if (!profile) {
      return ''
    }
    try {
      const existingConversationId = getDirectConversation(profile.did)
      if (!existingConversationId) {
        return `/user/${profile.did}/new-dm`
      } else {
        return '/messages/' + existingConversationId
      }
    } catch (error) {
      console.error(error)
    }
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
