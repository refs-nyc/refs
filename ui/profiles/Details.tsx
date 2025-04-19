import { useState, useEffect, useRef, forwardRef } from 'react'
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
import { EditableItem } from './EditableItem'
import { GridLines } from '../display/Gridlines'

const win = Dimensions.get('window')

export const renderItem = ({
  item,
  editingRights,
  index,
  onEditing,
}: {
  item: ExpandedItem
  editingRights?: boolean
  index: number
  onEditing: (b: boolean) => void
}) => {
  return (
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
      <EditableItem onEditing={onEditing} item={item} editingRights={editingRights} index={index} />
    </View>
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
  const [editing, setEditing] = useState(false)
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

  const onEditing = (e) => {
    console.log('receive editing', e)
    setEditing(e)
  }

  // Close modal and refresh profile
  const close = async () => {
    setAddingToList('')
    await getProfile(userNameParam)
  }

  return (
    <SheetScreen onChange={(e) => e === -1 && router.back()}>
      {editing && <GridLines lineColor={c.grey1} size={20} />}

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
              onEditing,
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
