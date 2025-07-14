import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable'
import { View } from 'react-native'
import Reanimated, { SharedValue, useAnimatedStyle } from 'react-native-reanimated'
import { c, s } from '@/features/style'
import { Pressable } from 'react-native-gesture-handler'
import { YStack } from '../core/Stacks'
import { Profile } from '@/features/pocketbase/types'
import UserListItem from './UserListItem'
import { useState } from 'react'
import { Ionicons } from '@expo/vector-icons'

export default function SwipeableConversation({
  onActionPress,
  user,
  onPress,
  backgroundColor,
}: {
  onActionPress: () => Promise<void>
  user: Profile
  onPress: () => void
  backgroundColor: string
}) {
  const [disablePress, setDisablePress] = useState(false)
  return (
    <Swipeable
      onSwipeableOpenStartDrag={() => setDisablePress(true)}
      onSwipeableWillClose={() => setDisablePress(false)}
      friction={2}
      enableTrackpadTwoFingerGesture
      rightThreshold={40}
      renderRightActions={(prog, drag) => (
        <RightAction prog={prog} drag={drag} onActionPress={onActionPress} />
      )}
    >
      <UserListItem
        user={user}
        onPress={disablePress ? () => {} : onPress}
        style={{ backgroundColor: backgroundColor }}
        small={true}
        whiteText={true}
      />
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
