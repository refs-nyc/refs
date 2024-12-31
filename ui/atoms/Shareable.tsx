import { Pressable, Share, Alert } from 'react-native'

export const Shareable = ({
  children,
  style,
  message = 'Refs - internet phonebook',
  url = 'https://refs.nyc',
  onShare,
}: {
  children: React.ReactNode
  message?: string
  style?: any
  url?: string
  onShare?: () => void
}) => {
  const onShareFn = async () => {
    console.log('share')
    message += ` ${url}`
    try {
      const result = await Share.share({ message, url })
      if (result.action === Share.sharedAction) {
        if (result.activityType) {
          // shared with activity type of result.activityType
          onShare && onShare()
        } else {
          // shared
        }
      } else if (result.action === Share.dismissedAction) {
        // dismissed
      }
    } catch (error: any) {
      Alert.alert(error.message)
    }
  }

  return (
    <Pressable style={style} onPress={onShareFn}>
      {children}
    </Pressable>
  )
}
