import { useState, useEffect, useRef, forwardRef } from 'react'
import { Image } from 'expo-image'
import { Zoomable } from '@likashefqet/react-native-image-zoom'
import { ContextMenu } from '../atoms/ContextMenu'
import { Link, useGlobalSearchParams, usePathname, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { View, Dimensions, Pressable, Text } from 'react-native'
import Carousel, { ICarouselInstance } from 'react-native-reanimated-carousel'
import { useSharedValue } from 'react-native-reanimated'
import { Heading } from '../typo/Heading'
import { c, s, t } from '@/features/style'
import { gridSort } from './sorts'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useUIStore } from '@/ui/state'
import { ListContainer } from '../lists/ListContainer'
import { EditableList } from '../lists/EditableList'
import { Sheet, SheetScreen } from '../core/Sheets'
import { useUserStore, isExpandedProfile } from '@/features/pocketbase/stores/users'
import { ExpandedItem } from '@/features/pocketbase/stores/types'
import { EditableHeader } from '../atoms/EditableHeader'
import { useRefStore } from '@/features/pocketbase/stores/refs'

const win = Dimensions.get('window')

export const renderItem = ({
  item,
  editingRights,
  index,
}: {
  item: ExpandedItem
  editingRights?: boolean
  index: number
}) => {
  const { updateOne } = useRefStore()
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(item.expand?.ref.title)

  return (
    <Pressable>
      <View
        style={{
          height: 'auto', // hack
          width: win.width * 0.8,
          left: win.width * 0.1,
          padding: s.$075,
          gap: s.$1,
          justifyContent: 'start',
          overflow: 'hidden',
        }}
        key={item.id}
      >
        <View style={{ width: '100%', aspectRatio: 1, overflow: 'hidden', borderRadius: s.$075 }}>
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
                style={{ width: '100%', aspectRatio: 1, overflow: 'visible', borderRadius: s.$075 }}
              >
                <Image
                  style={{ width: '100%', aspectRatio: 1, overflow: 'visible' }}
                  source={item.expand.ref.image || item.image}
                />
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
        {/* Information */}
        <View style={{ width: '100%', paddingHorizontal: s.$1 }}>
          <View style={{ marginBottom: 0, flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ gap: s.$05 }}>
              {editing ? (
                <EditableHeader
                  initialEditing={true}
                  onTitleChange={async (newTitle) => {
                    try {
                      const updated = await updateOne(item.ref, { title: newTitle })
                      setTitle(newTitle)
                      console.log(updated)
                    } catch (err) {
                      console.error(err)
                    } finally {
                      setEditing(false)
                    }
                  }}
                  title={title}
                />
              ) : (
                <View style={{ paddingVertical: s.$08 }}>
                  <Heading tag="h2">{title}</Heading>
                  <Heading tag="smallmuted">{item.expand?.ref?.meta}</Heading>
                </View>
              )}
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
          <View style={{ width: '100%' }}>
            <Text numberOfLines={4} style={t.pmuted}>
              {item.text}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  )
}

export const DetailsDemoCarousel = forwardRef(
  (
    { data, height, width, defaultIndex, style, scrollOffsetValue, onSnapToItem, renderItem },
    ref
  ) => {
    console.log(style)
    return (
      <Carousel
        onConfigurePanGesture={(gesture) => {
          'worklet'
          gesture.activeOffsetX([-10, 10])
        }}
        loop={data.length > 1}
        ref={ref}
        data={data}
        width={width * 0.8}
        height={height} // hack
        defaultIndex={defaultIndex}
        style={style}
        defaultScrollOffsetValue={scrollOffsetValue}
        onSnapToItem={onSnapToItem}
        renderItem={renderItem}
        autoPlay={true}
        autoPlayInterval={2000}
      />
    )
  }
)

export const Details = ({
  editingRights = false,
  initialId,
}: {
  editingRights?: boolean
  initialId: string
}) => {
  const { profile, getProfile } = useUserStore()
  const router = useRouter()
  const pathname = usePathname()
  const { userName } = useGlobalSearchParams()
  const ref = useRef<ICarouselInstance>(null)
  const insets = useSafeAreaInsets()
  const { addingToList, setAddingToList } = useUIStore()
  const scrollOffsetValue = useSharedValue<number>(10)

  // Compute userNameParam
  const userNameParam =
    pathname === '/' ? undefined : typeof userName === 'string' ? userName : userName?.[0]

  const data =
    isExpandedProfile(profile) && profile.expand?.items
      ? [...profile.expand.items].filter((itm) => !itm.backlog).sort(gridSort)
      : []

  const index = Math.max(
    0,
    data.findIndex((itm) => itm.id === initialId)
  )

  useEffect(() => {
    if (data.length > 0) {
      const rawIndex = data.findIndex((itm) => itm.id === initialId)

      if (rawIndex === 0) {
        ref.current?.scrollTo({ index: rawIndex })
      } else {
        let correctedIndex = data.length - rawIndex // 🔥 Adjust for reverse order

        if (correctedIndex > -1 && correctedIndex < data.length - 1) {
          ref.current?.scrollTo({ index: correctedIndex })
        } else {
          ref.current?.scrollTo({ index: correctedIndex })
        }
      }
    }
  }, [data, initialId])

  // Close modal and refresh profile
  const close = async () => {
    setAddingToList('')
    await getProfile(userNameParam)
  }

  return (
    <SheetScreen onChange={(e) => e === -1 && router.back()}>
      <View style={{ height: win.height, justifyContent: 'flex-start' }}>
        <Pressable
          style={{
            position: 'absolute',
            top: s.$4,
            right: s.$1,
            padding: s.$1,
            zIndex: 99,
          }}
          onPress={() => {
            setTimeout(() => router.back(), 0)
          }}
        >
          <Ionicons size={s.$1} name="close" color={c.muted} />
        </Pressable>
        <Carousel
          onConfigurePanGesture={(gesture) => {
            'worklet'
            gesture.activeOffsetX([-10, 10])
          }}
          loop={data.length > 1}
          ref={ref}
          data={data}
          height={win.height}
          style={{ overflow: 'visible', top: win.height * 0.2 }}
          width={win.width * 0.8}
          defaultScrollOffsetValue={scrollOffsetValue}
          renderItem={({ item }) =>
            renderItem({
              item,
              editingRights,
            })
          }
        />
      </View>

      {addingToList !== '' && addingItem && (
        <Sheet full={true} onChange={(e) => e === -1 && close()}>
          <EditableList item={addingItem} onComplete={() => {}} />
        </Sheet>
      )}
    </SheetScreen>
  )
}
