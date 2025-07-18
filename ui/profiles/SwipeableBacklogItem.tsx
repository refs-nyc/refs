import { s, c } from '@/features/style'
import { Ionicons } from '@expo/vector-icons'
import { Pressable, Linking, Text, View } from 'react-native'
import { XStack, YStack } from '../core/Stacks'
import { SimplePinataImage } from '../images/SimplePinataImage'
import { ExpandedItem } from '@/features/types'
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable'
import Reanimated, { SharedValue, useAnimatedStyle } from 'react-native-reanimated'
import { useAppStore } from '@/features/stores'

export default function SwipeableBacklogItem({
  item,
  onActionPress,
  enabled,
}: {
  item: ExpandedItem
  onActionPress: () => void
  enabled: boolean
}) {
  const { referencersBottomSheetRef, setCurrentRefId } = useAppStore()

  return (
    <Swipeable
      enabled={enabled}
      friction={2}
      enableTrackpadTwoFingerGesture
      rightThreshold={40}
      renderRightActions={(prog, drag) => (
        <RightAction prog={prog} drag={drag} onActionPress={onActionPress} />
      )}
    >
      <XStack
        gap={s.$1}
        style={{
          paddingVertical: s.$05,
          alignItems: 'center',
          marginBottom: 3,
        }}
      >
        <SimplePinataImage
          originalSource={item.image || ''}
          imageOptions={{ width: s.$4, height: s.$4 }}
          style={{
            width: s.$4,
            height: s.$4,
            borderRadius: s.$075,
            backgroundColor: c.olive2,
          }}
        />
        <Pressable
          style={{ flex: 1, justifyContent: 'center' }}
          onPress={() => {
            setCurrentRefId(item.expand.ref.id)
            // sometimes the sheet shows the previous item for a second
            // but this timeout seems to fix it
            setTimeout(() => {
              referencersBottomSheetRef.current?.expand()
            }, 0)
          }}
        >
          <Text style={{ color: c.white, fontSize: s.$1 }} numberOfLines={2}>
            {item.expand?.ref?.title?.trim()}
          </Text>
        </Pressable>
        {item.expand?.ref?.url && (
          <Pressable onPress={() => Linking.openURL(item.expand.ref.url!)}>
            <Ionicons
              name="arrow-up"
              size={s.$2}
              color={c.white}
              style={{ transform: 'rotate(45deg)' }}
            />
          </Pressable>
        )}
      </XStack>
    </Swipeable>
  )
}

function RightAction({
  drag,
  onActionPress,
}: {
  prog: SharedValue<number>
  drag: SharedValue<number>
  onActionPress: () => void
}) {
  const styleAnimation = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: drag.value + 100 }],
    }
  })

  return (
    <Reanimated.View style={styleAnimation}>
      <View style={{ minWidth: 100, height: '100%' }}>
        <Pressable
          style={{
            backgroundColor: c.olive2,
            width: '90%',
            borderRadius: s.$05,
            height: '90%',
            margin: 'auto',
          }}
          onPress={onActionPress}
        >
          <YStack style={{ alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <Ionicons name="close-outline" size={s.$2} color={c.white} />
          </YStack>
        </Pressable>
      </View>
    </Reanimated.View>
  )
}
