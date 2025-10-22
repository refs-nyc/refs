import { View, Text, Share, Pressable, StyleSheet } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated'
import * as Clipboard from 'expo-clipboard'
import Ionicons from '@expo/vector-icons/Ionicons'
import { c } from '@/features/style'
import { useAppStore } from '@/features/stores'
import { useEffect, useRef } from 'react'

type InviteBannerProps = {
  inviteToken: string | undefined
  chatTitle: string
  onActionPressIn?: () => void
  onActionComplete?: () => void
}

export function InviteBanner({
  inviteToken,
  chatTitle,
  onActionPressIn,
  onActionComplete,
}: InviteBannerProps) {
  if (!inviteToken) return null

  const showToast = useAppStore((state) => state.showToast)
  const resetTimerRef = useRef<NodeJS.Timeout | null>(null)
  const iconProgress = useSharedValue(0)

  const inviteUrl = `https://refs.nyc/invite/g/${inviteToken}`

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current)
        resetTimerRef.current = null
      }
      iconProgress.value = 0
    }
  }, [iconProgress])

  const handleCopy = async () => {
    await Clipboard.setStringAsync(inviteUrl)
    showToast('Link copied')
    onActionComplete?.()

    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current)
    }

    iconProgress.value = withTiming(1, { duration: 140 })
    resetTimerRef.current = setTimeout(() => {
      iconProgress.value = withTiming(0, { duration: 200 })
    }, 2000)
  }

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join ${chatTitle} on Refs: ${inviteUrl}`,
        url: inviteUrl,
      })
    } catch (error) {
      console.error('Error sharing:', error)
      // User cancelled or error occurred
    } finally {
      onActionComplete?.()
    }
  }

  const copyIconStyle = useAnimatedStyle(() => ({
    opacity: 1 - iconProgress.value,
  }))

  const checkIconStyle = useAnimatedStyle(() => ({
    opacity: iconProgress.value,
    transform: [
      {
        scale: 0.85 + 0.15 * iconProgress.value,
      },
    ],
  }))

  return (
    <Animated.View
      style={{
        marginHorizontal: 16,
        marginBottom: 12,
        paddingVertical: 10,
        paddingHorizontal: 18,
        backgroundColor: c.surface2,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      }}
    >
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text
            style={{
              fontSize: 15,
              color: c.grey2,
              fontFamily: 'Inter',
              lineHeight: 20,
            }}
          >
            Link others to join the chat
          </Text>
        </View>
        
        <Pressable
          onPressIn={onActionPressIn}
          onPress={handleCopy}
          hitSlop={12}
          style={({ pressed }) => ({
            padding: 8,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <View style={styles.iconSwapContainer}>
            <Animated.View style={[StyleSheet.absoluteFill, copyIconStyle]}>
              <Ionicons name="copy-outline" size={26} color={c.grey2} />
            </Animated.View>
            <Animated.View style={[StyleSheet.absoluteFill, checkIconStyle]}>
              <Ionicons name="checkmark-circle" size={26} color={c.accent} />
            </Animated.View>
          </View>
        </Pressable>
        
        <Pressable
          onPressIn={onActionPressIn}
          onPress={handleShare}
          hitSlop={12}
          style={({ pressed }) => ({
            padding: 8,
            marginLeft: 4,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Ionicons name="share-outline" size={26} color={c.grey2} />
        </Pressable>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  iconSwapContainer: {
    width: 26,
    height: 26,
  },
})
