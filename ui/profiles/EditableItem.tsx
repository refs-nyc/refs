import React, { useState, useEffect, useRef, forwardRef } from 'react'
import { Image } from 'expo-image'
import { Zoomable } from '@likashefqet/react-native-image-zoom'
import { ContextMenu } from '../atoms/ContextMenu'
import { EditableHeader } from '../atoms/EditableHeader'
import { useItemStore } from '@/features/pocketbase/stores/items'
import { ExpandedItem } from '@/features/pocketbase/stores/types'
import { Link } from 'expo-router'
import { View, Pressable, Text, Dimensions } from 'react-native'
import { Heading } from '../typo/Heading'
import { c, s, t, base } from '@/features/style'
import Ionicons from '@expo/vector-icons/Ionicons'
import { ListContainer } from '../lists/ListContainer'
import Animated, { useAnimatedStyle } from 'react-native-reanimated'
import { BottomSheetTextInput, BottomSheetScrollView } from '@gorhom/bottom-sheet'

const win = Dimensions.get('window')

const EditableItemComponent = ({
  item,
  editingRights,
  index,
}: {
  item: ExpandedItem
  editingRights?: boolean
  index: number
}) => {
  const [showMenu, setShowMenu] = useState(false)
  const [title, setTitle] = useState(item.expand?.ref.title)

  const { editing, startEditing, stopEditing } = useItemStore()

  const animatedStyle = useAnimatedStyle(() => {
    return editing === item.id ? base.editableItem : base.nonEditableItem
  }, [editing, item])

  return (
    <Pressable
      style={{ gap: s.$09, paddingVertical: win.height * 0.2 }}
      onPress={() => console.log('on press')}
      onLongPress={() => {
        setShowMenu(!showMenu)
      }}
    >
      <View
        style={{
          width: '100%',
          aspectRatio: 1,
        }}
      >
        {showMenu && (
          <ContextMenu
            onEditPress={() => {
              startEditing(item.id)
              setShowMenu(false)
            }}
            editingRights={editingRights}
          />
        )}
        {item.image && !item.list ? (
          item.expand?.ref.image && (
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
                <Image
                  style={[{ width: '100%', aspectRatio: 1, overflow: 'visible' }]}
                  source={item.expand.ref.image || item.image}
                />
              </Animated.View>
            </Zoomable>
          )
        ) : (
          <View
            style={{
              flex: 1,
              backgroundColor: c.surface2,
            }}
          >
            {item.list && <ListContainer editingRights={!!editingRights} item={item} />}
          </View>
        )}
      </View>
      <View style={{ width: '100%' }}>
        <View style={{ marginBottom: 0, flexDirection: 'row', justifyContent: 'space-between' }}>
          <View
            style={[
              {
                gap: s.$05,
                width: '100%',
                paddingHorizontal: s.$1,
                borderWidth: 1,
                borderColor: 'transparent',
              },
              editing === item.id && base.editableItem,
            ]}
          >
            <View
              style={{
                paddingVertical: s.$08,
              }}
            >
              <Heading tag="h2">{title}</Heading>
              <Heading tag="smallmuted">{item.expand?.ref?.meta}</Heading>
            </View>
          </View>
          <Pressable onPress={() => {}}>
            {item.expand.ref.url && (
              <Link href={item.expand.ref.url}>
                <Ionicons
                  style={{ transformOrigin: 'center', transform: 'rotate(-45deg)' }}
                  color={c.muted}
                  size={s.$1}
                  name="arrow-forward-outline"
                />
              </Link>
            )}
          </Pressable>
        </View>
      </View>
      <Animated.View
        style={[
          { width: '100%', minHeight: s.$10, paddingHorizontal: s.$1, paddingVertical: s.$075 },
          animatedStyle,
        ]}
      >
        {editing === item.id ? (
          <BottomSheetTextInput numberOfLines={4} style={t.pmuted}></BottomSheetTextInput>
        ) : (
          <Text numberOfLines={4} style={t.pmuted}>
            {item.text}
          </Text>
        )}
      </Animated.View>
    </Pressable>
  )
}

export const EditableItem = React.memo(EditableItemComponent)
