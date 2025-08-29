import { Link, router, usePathname } from 'expo-router'
import { Text, View, Pressable, Animated } from 'react-native'
import { Avatar } from '../atoms/Avatar'
import { c, s } from '@/features/style'
import { useAppStore } from '@/features/stores'
import { NavigationBackdrop } from '@/ui/navigation/NavigationBackdrop'
import { Badge } from '../atoms/Badge'
import { useMemo, useRef, useEffect } from 'react'
import SavesIcon from '@/assets/icons/saves.svg'
import MessageIcon from '@/assets/icons/message.svg'
import { Ionicons } from '@expo/vector-icons'
import BottomSheet from '@gorhom/bottom-sheet'

export const Navigation = ({
  savesBottomSheetRef,
}: {
  savesBottomSheetRef: React.RefObject<BottomSheet>
}) => {
  const pathname = usePathname()

  const {
    user,
    saves,
    messagesPerConversation,
    conversations,
    memberships,
    cachedSearchResults,
    setShowLogoutButton,
    showLogoutButton,
    returnToDirectories,
    setReturnToDirectories,
    setHomePagerIndex,
  } = useAppStore()

  const isHomePage = pathname === '/' || pathname === '/index' || pathname === `/user/${user?.userName}`

  const scaleAnim = useRef(new Animated.Value(1)).current

  // Back button handler with robust fallbacks for directories and no-stack cases
  const handleBackPress = () => {
    console.log('🔍 Back button pressed, cachedSearchResults.length:', cachedSearchResults.length)
    
    // If returning from Directories -> user profile, jump back into Directories view
    if (returnToDirectories) {
      setReturnToDirectories?.(false)
      setHomePagerIndex?.(1)
      if (user?.userName) {
        router.replace(`/user/${user.userName}`)
        return
      }
    }

    // If we have cached search results, navigate back to profile to restore them
    if (cachedSearchResults.length > 0) {
      const currentUser = user?.userName
      if (currentUser) {
        console.log('🔍 Navigating to profile with cached results')
        router.push(`/user/${currentUser}`)
        return
      }
    }
    
   console.log('🔍 No cached results, using default back behavior')
   // Prefer native back if possible; otherwise, fallback to profile route and ensure pager index
   try {
     // @ts-ignore router.canGoBack exists in expo-router v3
     const canGoBack = typeof (router as any).canGoBack === 'function' ? (router as any).canGoBack() : false
     if (canGoBack) {
       router.back()
       return
     }
   } catch {}

   if (user?.userName) {
     setHomePagerIndex?.(returnToDirectories ? 1 : 0)
     setReturnToDirectories?.(false)
     router.replace(`/user/${user.userName}`)
     return
   }
  }

  const animateBadge = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.2,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start()
  }

  useEffect(() => {
    if (saves.length > 0) {
      animateBadge()
    }
  }, [saves.length])

  const newMessages = useMemo(() => {
    if (!user?.id || !messagesPerConversation || Object.keys(memberships).length === 0) {
      return 0
    }

    const userId = user.id
    let totalNewMessages = 0

    // Use more efficient iteration
    const conversationIds = Object.keys(conversations)
    for (let i = 0; i < conversationIds.length; i++) {
      const conversationId = conversationIds[i]
      const membership = memberships[conversationId]?.find((m) => m.expand?.user.id === userId)

      if (!membership || membership?.archived) continue

      const conversationMessages = messagesPerConversation[conversationId]
      if (!conversationMessages) continue

      const lastRead = membership?.last_read
      if (lastRead) {
        const lastReadDate = new Date(lastRead)
        // Use more efficient filtering
        let unreadCount = 0
        for (let j = 0; j < conversationMessages.length; j++) {
          const message = conversationMessages[j]
          if (new Date(message.created!) > lastReadDate && message.sender !== userId) {
            unreadCount++
          }
        }
        totalNewMessages += unreadCount
      } else {
        totalNewMessages += conversationMessages.length
      }
    }

    return totalNewMessages
  }, [messagesPerConversation, memberships, user?.id, conversations])

  if (!user) return null

  return (
    <View style={{ display: 'flex', flexDirection: 'row', paddingLeft: 2 }}>
      <NavigationBackdrop />
      <View
        style={{
          display: 'flex',
          flexDirection: 'row',
          marginTop: s.$6,
          width: '100%',
          paddingHorizontal: s.$1,
          alignItems: 'center',
          paddingBottom: s.$08,
        }}
      >
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', position: 'relative' }}>
            {!isHomePage && (
              <Pressable
                onPress={handleBackPress}
                style={{
                  position: 'absolute',
                  left: -15,
                  top: 6,
                  zIndex: 1,
                  paddingRight: 8,
                }}
              >
                <Ionicons name="chevron-back" size={18} color={c.grey2} />
              </Pressable>
            )}
            <Pressable 
              onPress={() => router.push(`/user/${user.userName}`)} 
              onLongPress={() => setShowLogoutButton(!showLogoutButton)}
              style={{ paddingLeft: 6 }}
            >
              <Text style={{ fontSize: 24, fontWeight: 'bold', textAlign: 'left' }}>Refs</Text>
            </Pressable>
          </View>
        </View>
        <View style={{ top: 1.5, paddingRight: 17 }}>
          <Pressable onPress={() => {
            setHomePagerIndex(0) // Ensure we land on grid view
            router.push(`/user/${user.userName}`)
          }}>
            <Avatar source={user.image} size={30} />
          </Pressable>
        </View>
        <View style={{ display: 'flex', flexDirection: 'row', paddingRight: 18 }}>
          <Pressable onPress={() => savesBottomSheetRef.current?.expand()}>
            <View style={{ top: -2 }}>
              <SavesIcon width={28} height={28} />
            </View>
            <View
              style={{
                position: 'absolute',
                height: '85%',
                width: '100%',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Animated.View
                style={{ top: -2, right: -6, zIndex: 1, transform: [{ scale: scaleAnim }] }}
              >
                {saves.length > 0 && <Badge count={saves.length} color="#7e8f78" />}
              </Animated.View>
            </View>
          </Pressable>
        </View>
        <View style={{ display: 'flex', flexDirection: 'row', paddingRight: 6 }}>
          <Pressable onPress={() => router.push('/messages')}>
            <View style={{ top: -3 }}>
              <MessageIcon width={36} />
            </View>
            <View
              style={{
                position: 'absolute',
                height: '85%',
                width: '100%',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <View style={{ bottom: 2, right: -10, zIndex: 1 }}>
                {newMessages > 0 && <Badge count={newMessages} color="#7e8f78" />}
              </View>
            </View>
          </Pressable>
        </View>
      </View>
    </View>
  )
}
