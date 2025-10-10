import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet'
import React, { useMemo } from 'react'
import { useAppStore } from '@/features/stores'
import { c, s } from '@/features/style'
import { Text, View, Pressable, useWindowDimensions } from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'

export const ProfileSettingsSheet = () => {
  const {
    user,
    detailsBackdropAnimatedIndex,
    logout,
    stopEditProfile,
    stopEditing,
    setIsEditMode,
  } = useAppStore()

  const settingsSheetRef = useAppStore((state) => state.settingsSheetRef)
  const isSettingsSheetOpen = useAppStore((state) => state.isSettingsSheetOpen)
  const setIsSettingsSheetOpen = useAppStore((state) => state.setIsSettingsSheetOpen)
  const settingsSheetHeight = useAppStore((state) => state.settingsSheetHeight)
  const setSettingsSheetHeight = useAppStore((state) => state.setSettingsSheetHeight)

  const { height: windowHeight } = useWindowDimensions()

  const settingsSheetSnapPoints = useMemo(() => {
    const baseHeight = Math.max(settingsSheetHeight, Math.round(windowHeight * 0.45))
    const cappedBase = Math.min(baseHeight * 1.1, Math.round(windowHeight * 0.92)) - 5
    const expandedCandidate = Math.max(cappedBase + 120, Math.round(windowHeight * 0.88))
    const cappedExpanded = Math.min(expandedCandidate, Math.round(windowHeight * 0.95)) - 5

    if (cappedExpanded <= cappedBase + 40) {
      return [cappedBase]
    }

    return [cappedBase, cappedExpanded]
  }, [settingsSheetHeight, windowHeight])

  const displayName = useMemo(() => {
    if (!user) return ''
    const first = (user.firstName || '').trim()
    const last = (user.lastName || '').trim()
    const combined = `${first} ${last}`.trim()
    if (combined) return combined
    const fallback = (user.name || '').trim()
    return fallback || user.userName || ''
  }, [user])

  const locationLabel = useMemo(() => {
    if (!user) return ''
    return user.location || ''
  }, [user])

  return (
    <BottomSheet
      ref={settingsSheetRef}
      index={-1}
      snapPoints={settingsSheetSnapPoints}
      enablePanDownToClose
      enableOverDrag={false}
      animatedIndex={detailsBackdropAnimatedIndex}
      animationConfigs={{
        damping: 28,
        stiffness: 180,
        mass: 0.6,
        overshootClamping: false,
        restDisplacementThreshold: 0.01,
        restSpeedThreshold: 0.01,
      }}
      onChange={(idx) => {
        const open = idx >= 0
        setIsSettingsSheetOpen(open)
        if (!open && detailsBackdropAnimatedIndex) {
          detailsBackdropAnimatedIndex.value = -1
        }
      }}
      backgroundStyle={{ backgroundColor: c.surface, borderRadius: 50 }}
      handleComponent={null}
      style={{ borderTopLeftRadius: 50, borderTopRightRadius: 50, overflow: 'hidden' }}
      backdropComponent={(props) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          pressBehavior="close"
          opacity={0.5}
        />
      )}
    >
      <BottomSheetView
        onLayout={(event) => {
          const height = Math.round(event.nativeEvent.layout.height)
          if (height > 0 && Math.abs(height - settingsSheetHeight) > 2) {
            setSettingsSheetHeight(height)
          }
        }}
        style={{ paddingHorizontal: s.$1, paddingVertical: s.$1, gap: s.$075 }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: s.$075,
          }}
        >
          <Text
            style={{
              fontSize: (s.$09 as number) + 4,
              fontFamily: 'System',
              fontWeight: '700',
              color: c.newDark,
            }}
          >
            Profile Settings
          </Text>
          <Pressable
            onPress={() => {
              settingsSheetRef.current?.close()
            }}
            hitSlop={10}
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="close" size={18} color={c.muted2} />
          </Pressable>
        </View>

        <Pressable
          onPress={() => {
            console.log('Edit name')
          }}
          style={({ pressed }) => ({
            backgroundColor: c.surface2,
            borderRadius: s.$12,
            padding: s.$1,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Text
            style={{
              color: c.muted2,
              fontSize: 11,
              fontFamily: 'Inter',
              fontWeight: '600',
              marginBottom: 4,
              textTransform: 'uppercase',
            }}
          >
            Name
          </Text>
          <Text
            style={{
              color: c.newDark,
              fontSize: 15,
              fontFamily: 'Inter',
              fontWeight: '500',
            }}
          >
            {displayName}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            console.log('Edit neighborhood')
          }}
          style={({ pressed }) => ({
            backgroundColor: c.surface2,
            borderRadius: s.$12,
            padding: s.$1,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Text
            style={{
              color: c.muted2,
              fontSize: 11,
              fontFamily: 'Inter',
              fontWeight: '600',
              marginBottom: 4,
              textTransform: 'uppercase',
            }}
          >
            Neighborhood
          </Text>
          <Text
            style={{
              color: c.newDark,
              fontSize: 15,
              fontFamily: 'Inter',
              fontWeight: '500',
            }}
          >
            {locationLabel || 'Elsewhere'}
          </Text>
        </Pressable>

        <View
          style={{
            backgroundColor: c.surface2,
            borderRadius: s.$12,
            padding: s.$1,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: c.newDark,
                  fontSize: 15,
                  fontFamily: 'Inter',
                  fontWeight: '600',
                  marginBottom: 4,
                }}
              >
                Push Notifications
              </Text>
              <Text
                style={{
                  color: c.accent,
                  fontSize: 12,
                  fontFamily: 'Inter',
                  fontWeight: '500',
                }}
              >
                Get notified when someone saves your refs
              </Text>
            </View>
            <View
              style={{
                width: 50,
                height: 30,
                borderRadius: 15,
                backgroundColor: c.accent,
                justifyContent: 'center',
                paddingHorizontal: 3,
              }}
            >
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: c.surface,
                  alignSelf: 'flex-end',
                }}
              />
            </View>
          </View>
        </View>

        <Pressable
          onPress={logout}
          style={({ pressed }) => ({
            backgroundColor: c.surface2,
            borderRadius: s.$12,
            padding: s.$1,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Text
            style={{
              color: c.newDark,
              fontSize: 15,
              fontFamily: 'Inter',
              fontWeight: '600',
              textAlign: 'center',
            }}
          >
            Log Out
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            console.log('Delete account')
          }}
          style={({ pressed }) => ({
            backgroundColor: c.surface2,
            borderRadius: s.$12,
            padding: s.$1,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Text
            style={{
              color: c.accent,
              fontSize: 15,
              fontFamily: 'Inter',
              fontWeight: '600',
              textAlign: 'center',
            }}
          >
            Delete Account
          </Text>
        </Pressable>
      </BottomSheetView>
    </BottomSheet>
  )
}

