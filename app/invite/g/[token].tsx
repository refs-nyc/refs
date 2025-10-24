import { useEffect } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useAppStore } from '@/features/stores'

export default function InviteSchemeRedirect() {
  const params = useLocalSearchParams<{ token?: string }>()
  const token = typeof params.token === 'string' ? params.token : ''
  const router = useRouter()
  const user = useAppStore((state) => state.user)
  const joinChatByInvite = useAppStore((state) => state.joinChatByInvite)
  const showToast = useAppStore((state) => state.showToast)
  const setPendingInviteToken = useAppStore((state) => state.setPendingInviteToken)

  useEffect(() => {
    if (!token) {
      router.replace('/messages')
      return
    }

    let cancelled = false

    const join = async () => {
      try {
        showToast?.('Joining chat…')
        const { chatId, title } = await joinChatByInvite(token)
        if (cancelled) return
        showToast?.(`Joined ${title}`)
        router.replace(`/messages/${chatId}`)
      } catch (error) {
        if (cancelled) return
        showToast?.(error instanceof Error ? error.message : 'Unable to join chat')
        router.replace('/messages')
      }
    }

    if (!user?.id) {
      setPendingInviteToken(token)
      showToast?.('Log in to join this chat')
      router.replace('/user/login')
      return
    }

    join()

    return () => {
      cancelled = true
    }
  }, [joinChatByInvite, router, setPendingInviteToken, showToast, token, user?.id])

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator />
    </View>
  )
}
