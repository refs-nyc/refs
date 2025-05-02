import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react' // Import useCallback, useMemo
import { Link, useGlobalSearchParams, usePathname, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { View, Dimensions, Pressable, Text, ViewStyle } from 'react-native'
import Carousel, { ICarouselInstance } from 'react-native-reanimated-carousel'
import { useSharedValue } from 'react-native-reanimated'
import { Heading } from '../typo/Heading'
import { c, s, t } from '@/features/style'
import { gridSort } from './sorts'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useUIStore } from '@/ui/state'
import { useItemStore } from '@/features/pocketbase/stores/items'
import { ListContainer } from '../lists/ListContainer'
import { EditableList } from '../lists/EditableList'
import { Sheet, SheetScreen } from '../core/Sheets'
import { useUserStore, isExpandedProfile } from '@/features/pocketbase/stores/users'
import { ExpandedItem } from '@/features/pocketbase/stores/types'
import { EditableItem } from './EditableItem' // Assuming EditableItem is memoized
import { GridLines } from '../display/Gridlines'
import { BottomSheetScrollView } from '@gorhom/bottom-sheet'
import { MeatballMenu } from '../atoms/MeatballMenu'
import { Button } from '../buttons/Button'

const win = Dimensions.get('window')

// --- Helper Components for State Isolation ---

const ConditionalGridLines = React.memo(() => {
  const editing = useItemStore((state) => state.editing)
  if (editing === '') {
    return null
  }
  return <GridLines lineColor={c.grey1} size={20} />
})
ConditionalGridLines.displayName = 'ConditionalGridLines'

const DetailsHeaderButton = React.memo(() => {
  const editing = useItemStore((state) => state.editing)
  const stopEditing = useItemStore((state) => state.stopEditing)
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const handlePress = useCallback(() => {
    if (editing === '') {
      router.back()
    } else {
      stopEditing()
    }
  }, [editing, stopEditing, router])

  return (
    <Pressable
      style={{
        width: '100%',
        zIndex: 99,
        // backgroundColor: 'red',
        alignItems: 'flex-end',
        top: s.$4,
      }}
      onPress={handlePress}
    >
      {editing !== '' ? <Ionicons size={s.$1} name="popover" color={c.muted} /> : <MeatballMenu />}
    </Pressable>
  )
})
DetailsHeaderButton.displayName = 'DetailsHeaderButton'

// --- Main Components ---

export const renderItem = ({
  item,
  editingRights,
  index,
}: {
  item: ExpandedItem
  editingRights?: boolean
  index?: number
}) => {
  return (
    <>
      {/* @ts-ignore */}
      <View
        style={{
          width: win.width * 0.8,
          height: win.height,
          left: win.width * 0.1,
          padding: s.$075,
          gap: s.$1,
          justifyContent: 'start' as any,
        }}
        key={item.id} // key should ideally be on the top-level element returned by map/renderItem callback
      >
        <BottomSheetScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: s.$075, gap: s.$1, paddingBottom: 200 }} // Add padding here, ensure enough bottom padding
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled={true} // May be needed if Carousel interferes, test
        >
          <EditableItem item={item} editingRights={editingRights} index={index} />
        </BottomSheetScrollView>
      </View>
    </>
  )
}

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
  const { addingToList, setAddingToList, addingItem } = useUIStore()
  const scrollOffsetValue = useSharedValue<number>(10)
  const [activeIndex, setActiveIndex] = useState(0)

  const { stopEditing } = useItemStore()

  const userNameParam =
    pathname === '/' ? undefined : typeof userName === 'string' ? userName : userName?.[0]

  const data = useMemo(() => {
    return isExpandedProfile(profile) && profile.expand?.items
      ? [...profile.expand.items].filter((itm) => !itm.backlog).sort(gridSort)
      : []
  }, [profile])

  const index = useMemo(() => {
    return Math.max(
      0,
      data.findIndex((itm) => itm.id === initialId)
    )
  }, [data, initialId])

  useEffect(() => {
    if (ref.current && data.length > 0) {
      if (index >= 0 && index < data.length) {
        // Check if component is mounted and index is valid before scrolling
        try {
          ref.current?.scrollTo({ index: index, animated: false })
        } catch (error) {
          console.error('Error scrolling carousel:', error)
        }
      }
    }
    // Add ref.current to dependencies? Usually not needed unless the ref itself changes identity.
  }, [data, index])

  const handleConfigurePanGesture = useCallback((gesture: any) => {
    'worklet'
    gesture.activeOffsetX([-10, 10])
  }, [])

  const close = useCallback(async () => {
    setAddingToList('')
    if (userNameParam) {
      await getProfile(userNameParam)
    }
    stopEditing()
  }, [setAddingToList, getProfile, userNameParam])

  const carouselStyle = useMemo<{
    overflow: ViewStyle['overflow']
    paddingVertical: number
  }>(
    () => ({
      overflow: 'visible',
      paddingVertical: win.height * 0.2, // Consider making this dynamic based on header/insets
    }),
    []
  )

  const carouselRenderItem = useCallback(
    ({ item, index: carouselIndex }: { item: ExpandedItem; index: number }) => {
      return renderItem({ item, editingRights, index: carouselIndex })
    },
    [editingRights] // Depends only on the editingRights prop
  )

  return (
    <SheetScreen
      onChange={(e: any) => {
        e === -1 && router.back()
        e === -1 && stopEditing()
      }}
    >
      <ConditionalGridLines />

      <Carousel
        loop={data.length > 1}
        ref={ref}
        data={data as ExpandedItem[]}
        width={win.width}
        height={win.height}
        style={carouselStyle}
        defaultIndex={index}
        onConfigurePanGesture={handleConfigurePanGesture}
        renderItem={carouselRenderItem}
        windowSize={5}
        pagingEnabled={true}
        snapEnabled={true}
      />

      {addingToList !== '' && addingItem && (
        <Sheet full={true} onChange={(e: any) => e === -1 && close()}>
          <EditableList item={addingItem} onComplete={() => {}} />
        </Sheet>
      )}
    </SheetScreen>
  )
}
