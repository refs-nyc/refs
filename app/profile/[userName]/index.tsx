import { useEffect } from 'react'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { ActivityIndicator, View } from 'react-native'
import { useAppStore } from '@/features/stores'

export default function ProfileSchemeRedirect() {
  const params = useLocalSearchParams<{ userName?: string }>()
  const userName = typeof params.userName === 'string' ? params.userName : ''
  const router = useRouter()
  const user = useAppStore((state) => state.user)
  const showToast = useAppStore((state) => state.showToast)
  const setPendingProfileUserName = useAppStore((state) => state.setPendingProfileUserName)

  useEffect(() => {
    if (!userName) {
      router.replace('/')
      return
    }

    if (!user?.id) {
      setPendingProfileUserName(userName)
      showToast?.('Log in to view this profile')
      router.replace('/user/login')
      return
    }

    setPendingProfileUserName(null)
    router.replace(`/user/${encodeURIComponent(userName)}`)
  }, [router, user?.id, userName, setPendingProfileUserName, showToast])

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator />
    </View>
  )
}
