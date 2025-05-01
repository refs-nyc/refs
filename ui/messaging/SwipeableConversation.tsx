import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable'
import ConversationListItem from './ConversationListItem'
import { Conversation } from '@/features/pocketbase/stores/types'
import { Text, View } from 'react-native'
import Reanimated, { SharedValue, useAnimatedStyle } from 'react-native-reanimated'
import { c, s } from '@/features/style'
import { Pressable } from 'react-native-gesture-handler'
import { YStack } from '../core/Stacks'

export default function SwipeableConversation({
  conversation,
  isInArchive,
  onArchive,
}: {
  conversation: Conversation
  isInArchive?: boolean
  onArchive: () => Promise<void>
}) {
  return (
    <Swipeable
      friction={2}
      enableTrackpadTwoFingerGesture
      rightThreshold={40}
      renderRightActions={(prog, drag) => (
        <RightAction
          prog={prog}
          drag={drag}
          onArchive={onArchive}
          isInArchive={isInArchive || false}
        />
      )}
    >
      <ConversationListItem conversation={conversation} />
    </Swipeable>
  )
}

function RightAction({
  prog,
  drag,
  onArchive,
  isInArchive,
}: {
  prog: SharedValue<number>
  drag: SharedValue<number>
  onArchive: () => void
  isInArchive: boolean
}) {
  const styleAnimation = useAnimatedStyle(() => {
    // console.log('showRightProgress:', prog.value);
    // console.log('appliedTranslation:', drag.value);

    return {
      transform: [{ translateX: drag.value + 100 }],
    }
  })

  return (
    <Reanimated.View style={styleAnimation}>
      <View style={{ backgroundColor: c.surface, minWidth: 100, height: '100%' }}>
        <Pressable
          style={{
            backgroundColor: c.accent,
            width: '90%',
            borderRadius: s.$05,
            height: '90%',
            margin: 'auto',
          }}
          onPress={onArchive}
        >
          <YStack style={{ alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <Text style={{ color: c.white }}>{isInArchive ? 'Unarchive' : 'Archive'}</Text>
          </YStack>
        </Pressable>
      </View>
    </Reanimated.View>
  )
}
