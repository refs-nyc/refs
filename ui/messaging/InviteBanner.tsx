import { View, Text, Pressable } from 'react-native'
import * as Clipboard from 'expo-clipboard'
import Ionicons from '@expo/vector-icons/Ionicons'
import { c, s } from '@/features/style'
import { useAppStore } from '@/features/stores'

type InviteBannerProps = {
  inviteToken: string | undefined
  chatTitle: string
}

export function InviteBanner({ inviteToken, chatTitle }: InviteBannerProps) {
  const { showToast } = useAppStore()

  if (!inviteToken) return null

  const inviteUrl = `https://refs.nyc/invite/g/${inviteToken}`

  const handleCopy = async () => {
    await Clipboard.setStringAsync(inviteUrl)
    showToast('Link copied')
  }

  const handleShare = async () => {
    try {
      const Share = await import('react-native').then(m => m.Share)
      await Share.share({
        message: `Join ${chatTitle} on Refs: ${inviteUrl}`,
        url: inviteUrl,
      })
    } catch (error) {
      // User cancelled or error occurred
    }
  }

  return (
    <View
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
        onPress={handleCopy}
        hitSlop={12}
        style={({ pressed }) => ({
          padding: 8,
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <Ionicons name="copy-outline" size={26} color={c.grey2} />
      </Pressable>
      
      <Pressable
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
    </View>
  )
}
