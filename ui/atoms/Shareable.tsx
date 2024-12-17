import { Pressable, Share, Alert } from "react-native"

export const Shareable = ({ children, message = "Refs.nyc", url = "https://refs.nyc", onShare }: { children: React.ReactNode, message?: string, url?: string, onShare?: () => void }) => {
  const onShareFn = async () => {
    console.log("share")
    try {
      const result = await Share.share({ message, url });
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
      Alert.alert(error.message);
    }
  };

  return <Pressable onPress={onShareFn}>
    {children}
  </Pressable>
}