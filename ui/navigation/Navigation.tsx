import { Link, router, usePathname } from 'expo-router'
import { Text, View, Pressable } from 'react-native'
import { Avatar } from '../atoms/Avatar'
import { c, s } from '@/features/style'
import { useUserStore } from '@/features/pocketbase/stores/users'
import { useMessageStore } from '@/features/pocketbase/stores/messages'
import { NavigationBackdrop } from '@/ui/navigation/NavigationBackdrop'
import { Badge } from '../atoms/Badge'
import { useMemo, useRef, useEffect } from 'react'
import SavesIcon from '@/assets/icons/saves.svg'
import MessageIcon from '@/assets/icons/message.svg'
import { Ionicons } from '@expo/vector-icons'
import BottomSheet from '@gorhom/bottom-sheet'
import { useUIStore } from '../state'
import { useBackdropStore } from '@/features/pocketbase/stores/backdrop'
import Animated, { useAnimatedStyle, interpolate } from 'react-native-reanimated'

export const Navigation = ({
  savesBottomSheetRef,
}: {
  savesBottomSheetRef: React.RefObject<BottomSheet>
}) => {
  const { user } = useUserStore()
  const pathname = usePathname()
  const { setReturningFromSearch, selectedRefs, setSelectedRefs, setSearchMode, closeActiveBottomSheet, isSearchResultsSheetOpen, setSearchResultsSheetOpen, searchMode, navigationHistory, pushNavigationHistory } = useUIStore()
  const { headerBackdropAnimatedIndex, detailsBackdropAnimatedIndex } = useBackdropStore()

  const { saves, messagesPerConversation, conversations, memberships } = useMessageStore()
  
  // Animated style for header dimming
  const headerBackdropStyle = useAnimatedStyle(() => {
    const headerOpacity = interpolate(
      headerBackdropAnimatedIndex?.value ?? -1,
      [-1, 0, 1],
      [0, 0, 0.5], // Only dim when sheet is at index 1 or higher (expanded)
      'clamp'
    )

    const detailsOpacity = interpolate(
      detailsBackdropAnimatedIndex?.value ?? -1,
      [-1, 0],
      [0, 0.5], // Dim when details sheet is open (index 0)
      'clamp'
    )

    // Combine both opacities - show dimming when either sheet is active
    const opacity = Math.max(headerOpacity, detailsOpacity)

    return {
      opacity,
    }
  })

  const isHomePage = pathname === '/' || pathname === '/index'

  const countNewMessages = () => {
    if (!user) return 0
    if (!messagesPerConversation) return 0
    // messages not loaded yet
    if (Object.keys(memberships).length === 0) return 0
    let newMessages = 0
    for (const conversationId in conversations) {
      const membership = memberships[conversationId].find((m) => m.expand?.user.id === user?.id)
      if (!membership) continue
      if (membership?.archived) continue
      const lastRead = membership?.last_read
      const lastReadDate = new Date(lastRead || '')
      const conversationMessages = messagesPerConversation[conversationId]
      if (!conversationMessages) continue
      let unreadMessages
      if (lastRead) {
        const msgs = conversationMessages.filter(
          (m) => new Date(m.created!) > lastReadDate && m.sender !== user?.id
        )
        unreadMessages = msgs.length
      } else unreadMessages = conversationMessages.length
      newMessages += unreadMessages
    }
    return newMessages
  }
  const newMessages = useMemo(
    () => countNewMessages(),
    [messagesPerConversation, memberships, user]
  )

  useEffect(() => {
    pushNavigationHistory(pathname)
  }, [pathname])

  if (!user) return null

    return (
    <View style={{ 
      display: 'flex', 
      flexDirection: 'row', 
      paddingLeft: 2, 
      backgroundColor: c.surface
    }}>
      {/* Header backdrop overlay - visual dimming */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 120, // Only cover the header area
            backgroundColor: 'black',
            zIndex: 1, // Lower z-index so it doesn't interfere with bottom sheet backdrops
            pointerEvents: 'none', // Never handle pointer events
          },
          headerBackdropStyle,
        ]}
      />
      
      {/* Header tap-to-close overlay - for ProfileDetailsSheet and SearchResultsSheet */}
      {/* Do NOT show for SearchModeBottomSheet to allow navigation */}
      {/* Only show when there's actually an active sheet that can be closed */}
      {((detailsBackdropAnimatedIndex?.value ?? -1) > -1) || (isSearchResultsSheetOpen && closeActiveBottomSheet !== (() => {})) ? (
        <Pressable
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 120, // Only cover the header area
            backgroundColor: 'transparent',
            zIndex: 5, // Higher than visual dimming but lower than navigation buttons
          }}
          onPress={() => {
            console.log('🔍 Header tap-to-close pressed')
            closeActiveBottomSheet()
          }}
        />
      ) : null}
      

 
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
                onPress={() => {
                  // Try to go back to the user's own profile if we're on someone else's profile
                  if (pathname.startsWith('/user/') && user) {
                    const currentUserName = pathname.split('/')[2]
                    if (currentUserName !== user.userName) {
                      // Set flag to indicate we're returning from search
                      setReturningFromSearch(true)
                      router.dismissTo(`/user/${user.userName}`)
                      return
                    }
                  }
                  router.back()
                }}
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
              onPress={() => {
                // Clear search state when navigating to home feed
                if (selectedRefs.length > 0 || searchMode || isSearchResultsSheetOpen) {
                  setSelectedRefs([])
                  setSearchMode(false)
                  setSearchResultsSheetOpen(false)
                  // Reset backdrop index to ensure header is not dimmed
                  if (headerBackdropAnimatedIndex) {
                    headerBackdropAnimatedIndex.value = -1
                  }
                }
                // Use router.back() if previous route was home
                const prevRoute = navigationHistory[navigationHistory.length - 2]
                if (prevRoute === '/' || prevRoute === '/index') {
                  router.back()
                } else {
                  router.push('/')
                }
              }}
              style={{ paddingLeft: 6 }}
            >
              <Text style={{ fontSize: 24, fontWeight: 'bold', textAlign: 'left' }}>Refs</Text>
            </Pressable>
          </View>
        </View>
        <View style={{ top: 1.5, paddingRight: 17, zIndex: 10 }}>
          <Pressable
            onPress={() => {
              // If we're in search mode (selectedRefs has items), clear search and stay on profile
              if (selectedRefs.length > 0) {
                setSelectedRefs([]) // Clear the selected refs first
                setSearchMode(false) // Exit search mode
                setSearchResultsSheetOpen(false) // Ensure search results sheet is also closed
                // Reset backdrop index to ensure header is not dimmed
                if (headerBackdropAnimatedIndex) {
                  headerBackdropAnimatedIndex.value = -1
                }
                setReturningFromSearch(true)
                return
              }
              // If we're already on the user's own profile page and not in search mode, do nothing
              if (pathname === `/user/${user.userName}`) {
                return
              }
              // Otherwise, navigate to the user's own profile page
              router.push(`/user/${user.userName}`)
            }}
          >
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
              <View style={{ top: -2, right: -6, zIndex: 1 }}>
                {saves.length > 0 && <Badge count={saves.length} color="#7e8f78" />}
              </View>
            </View>
          </Pressable>
        </View>
        <View style={{ display: 'flex', flexDirection: 'row', paddingRight: 6 }}>
          <Pressable onPress={() => router.push('/messages')}>
            <View style={{ top: -3, opacity: 0.5 }}>
              <MessageIcon width={30} />
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
