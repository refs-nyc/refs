import React, { useState } from 'react'
import { Image } from 'expo-image'
import { Zoomable } from '@likashefqet/react-native-image-zoom'
import { ContextMenu } from '../atoms/ContextMenu'
import { useUIStore } from '@/ui/state'
import { useItemStore } from '@/features/pocketbase/stores/items'
import { ExpandedItem } from '@/features/pocketbase/stores/types'
import { Link } from 'expo-router'
import { Pressable, Text, Dimensions, Keyboard } from 'react-native'
import { Heading } from '../typo/Heading'
import { c, s, t, base } from '@/features/style'
import Ionicons from '@expo/vector-icons/Ionicons'
import { ListContainer } from '../lists/ListContainer'
import Animated, { useAnimatedStyle } from 'react-native-reanimated'
import { BottomSheetTextInput, BottomSheetView } from '@gorhom/bottom-sheet'
import { KeyboardAvoidingView } from 'react-native-keyboard-controller'

const win = Dimensions.get('window')

const EditableItemComponent = ({
  item,
  editingRights,
  index,
}: {
  item: ExpandedItem
  editingRights?: boolean
  index: number | undefined
}) => {
  const { showContextMenu, setShowContextMenu } = useUIStore()
  const { editing, startEditing, updateEditedState, setSearchingNewRef } = useItemStore()
  const [text, setText] = useState(item?.text)

  const animatedStyle = useAnimatedStyle(() => {
    return editing === item.id ? base.editableItem : base.nonEditableItem
  }, [editing, item])

  return (
    <KeyboardAvoidingView behavior={'position'}>
      <Pressable
        style={{
          gap: s.$09,
          paddingTop: win.height * 0.05,
          paddingHorizontal: s.$2,
        }}
        onPress={() => {
          setShowContextMenu('')
        }}
        onLongPress={() => {
          setShowContextMenu(item.id)
        }}
      >
        {/* Image */}
        <BottomSheetView
          style={{
            width: '100%',
            aspectRatio: 1,
          }}
        >
          {/* Menu */}
          {showContextMenu === item.id && (
            <ContextMenu
              onEditPress={() => {
                startEditing(item.id)
                setShowContextMenu('')
              }}
              editingRights={editingRights}
            />
          )}
          {(item.expand?.ref.image || item.image) && !item.list ? (
            <Zoomable
              minScale={0.25}
              maxScale={3}
              isPanEnabled={true}
              onInteractionEnd={() => console.log('onInteractionEnd')}
              onPanStart={() => console.log('onPanStart')}
              onPanEnd={() => console.log('onPanEnd')}
              onPinchStart={() => console.log('onPinchStart')}
              onPinchEnd={() => console.log('onPinchEnd')}
              onSingleTap={() => console.log('onSingleTap')}
              onDoubleTap={(zoomType) => {
                console.log('onDoubleTap', zoomType)
              }}
            >
              <Animated.View
                style={[
                  animatedStyle,
                  {
                    width: '100%',
                    aspectRatio: 1,
                    overflow: 'hidden',
                    borderRadius: s.$075,
                  },
                ]}
              >
                <BottomSheetView style={{ flex: 1, padding: s.$075 }}>
                  <Image
                    style={[{ flex: 1, aspectRatio: 1, overflow: 'hidden', borderRadius: s.$075 }]}
                    source={item.image || item.expand?.ref.image}
                  />
                </BottomSheetView>
              </Animated.View>
            </Zoomable>
          ) : (
            <BottomSheetView
              style={{
                flex: 1,
                backgroundColor: c.surface2,
              }}
            >
              {/* List */}
              {item.list && <ListContainer editingRights={!!editingRights} item={item} />}
            </BottomSheetView>
          )}
        </BottomSheetView>

        {/* Title */}
        <BottomSheetView style={{ width: '100%' }}>
          <BottomSheetView
            style={{
              marginBottom: 0,
              flexDirection: 'row',
              justifyContent: 'space-between',
              gap: s.$09,
            }}
          >
            {/* Title */}
            <Pressable
              onPress={() => {
                if (!editing) return
                Keyboard.dismiss()
                setSearchingNewRef(editing)
              }}
              style={[
                {
                  gap: s.$05,
                  flex: 1,
                  paddingHorizontal: s.$1,
                },
                editing === item.id ? base.editableItem : base.nonEditableItem,
              ]}
            >
              <BottomSheetView
                style={{
                  paddingVertical: s.$08,
                }}
              >
                <Heading tag="h2">{item.expand?.ref?.title}</Heading>
                <Heading tag="smallmuted">{item.expand?.ref?.meta}</Heading>
              </BottomSheetView>
            </Pressable>

            <Pressable
              style={[
                {
                  width: s.$4,
                  height: s.$4,
                  justifyContent: 'center',
                  alignItems: 'center',
                },
                editing ? base.editableItem : base.nonEditableItem,
              ]}
              onPress={() => {}}
            >
              {item.expand?.ref.url && (
                <Link
                  style={{ transformOrigin: 'center', transform: 'rotate(-45deg)' }}
                  href={item.expand?.ref.url}
                >
                  <Ionicons
                    color={c.muted}
                    size={s.$2}
                    fillColor="red"
                    name="arrow-forward-outline"
                  />
                </Link>
              )}
            </Pressable>
          </BottomSheetView>
        </BottomSheetView>

        {/* Notes */}
        <Animated.View
          style={[
            { width: '100%', minHeight: s.$10, paddingHorizontal: s.$1, paddingVertical: s.$075 },
            animatedStyle,
          ]}
        >
          {editing === item.id ? (
            <BottomSheetTextInput
              defaultValue={item.text}
              style={[{ width: '100%', minHeight: s.$10 }, t.pmuted]}
              multiline={true}
              numberOfLines={4}
              onChangeText={async (e) => {
                updateEditedState({
                  text: e,
                })
                setText(e)
              }}
            ></BottomSheetTextInput>
          ) : (
            <Text numberOfLines={4} style={t.pmuted}>
              {text}
            </Text>
          )}
        </Animated.View>
      </Pressable>
    </KeyboardAvoidingView>
  )
}

export const EditableItem = React.memo(EditableItemComponent)
