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
  const { getDirectConversation } = useAppStore()

  const [target, setTarget] = useState<string>('')

  useEffect(() => {
    const checkIfDirectMessageExists = async () => {
      if (!profile) {
        setTarget('')
        return
      }
      try {
        const existingConversationId = await getDirectConversation(profile.did)
        if (!existingConversationId) {
          setTarget(`/user/${profile.did}/new-dm`)
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
