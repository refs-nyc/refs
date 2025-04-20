import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react' // Import useCallback, useMemo
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
import { useItemStore } from '@/features/pocketbase/stores/items'
import { ListContainer } from '../lists/ListContainer'
import { EditableList } from '../lists/EditableList'
import { Sheet, SheetScreen } from '../core/Sheets'
import { useUserStore, isExpandedProfile } from '@/features/pocketbase/stores/users'
import { ExpandedItem } from '@/features/pocketbase/stores/types'
import { EditableItem } from './EditableItem' // Assuming EditableItem is memoized
import { GridLines } from '../display/Gridlines'
import { Button } from '../buttons/Button'

const win = Dimensions.get('window')

// Outer renderItem function (already stable as it's outside Details)
export const renderItem = ({
  item,
  editingRights,
  index,
}: {
  item: ExpandedItem
  editingRights?: boolean
  index: number
}) => {
  return (
    <View
      style={{
        height: 'auto',
        width: win.width * 0.8,
        left: win.width * 0.1,
        padding: s.$075,
        gap: s.$1,
        justifyContent: 'start',
        overflow: 'hidden',
      }}
      key={item.id}
    >
      <EditableItem item={item} editingRights={editingRights} index={index} />
    </View>
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
  const insets = useSafeAreaInsets()
  const { addingToList, setAddingToList, addingItem } = useUIStore() // Assuming addingItem comes from here? Make sure it's defined
  const scrollOffsetValue = useSharedValue<number>(10)

  const { editing, stopEditing } = useItemStore()

  const userNameParam =
    pathname === '/' ? undefined : typeof userName === 'string' ? userName : userName?.[0]

  const data = useMemo(() => {
    return isExpandedProfile(profile) && profile.expand?.items
      ? [...profile.expand.items].filter((itm) => !itm.backlog).sort(gridSort)
      : []
  }, [profile]) // Recompute only when profile changes

  const index = useMemo(() => {
    return Math.max(
      0,
      data.findIndex((itm) => itm.id === initialId)
    )
  }, [data, initialId]) // Recompute only when data or initialId changes

  useEffect(() => {
    if (ref.current && data.length > 0) {
      if (index >= 0 && index < data.length) {
        ref.current?.scrollTo({ index: index, animated: false }) // Try scrolling without animation initially
      }
    }
  }, [data, index])

  const handleConfigurePanGesture = useCallback((gesture: any) => {
    'worklet'
    gesture.activeOffsetX([-10, 10])
  }, []) // Empty dependency array

  const close = useCallback(async () => {
    // Memoize close function too
    setAddingToList('')
    await getProfile(userNameParam)
  }, [setAddingToList, getProfile, userNameParam]) // Add dependencies

  const carouselStyle = useMemo(
    () => ({
      overflow: 'visible',
      top: win.height * 0.2,
    }),
    []
  )

  return (
    <SheetScreen onChange={(e) => e === -1 && router.back()}>
      {editing !== '' && <GridLines lineColor={c.grey1} size={20} />}

      <View style={{ height: win.height, justifyContent: 'flex-start' }}>
        <Pressable
          style={{
            position: 'absolute',
            top: Math.max(insets.top, s.$1), // Use safe area top inset or default padding
            right: s.$1,
            padding: s.$1,
            zIndex: 99, // Ensure it's above the carousel
          }}
          onPress={() => {
            if (editing === '') {
              router.back()
            } else {
              stopEditing()
            }
          }} // Simplified back navigation
        >
          {editing !== '' ? (
            <Ionicons size={s.$1} name="checkbox" color={c.muted} />
          ) : (
            <Ionicons size={s.$1} name="close" color={c.muted} />
          )}
        </Pressable>

        {/* Use memoized props */}
        <Carousel
          loop={data.length > 1}
          ref={ref}
          data={data}
          width={win.width}
          style={carouselStyle}
          height={win.height * 0.6}
          defaultIndex={index}
          onConfigurePanGesture={handleConfigurePanGesture} // Use memoized handler
          renderItem={({ item }) => {
            console.log(item)
            return renderItem({ item, editingRights, index })
          }}
          windowSize={5}
          pagingEnabled={true}
          snapEnabled={true}
        />
      </View>

      {/* Ensure addingItem is defined before rendering Sheet */}
      {addingToList !== '' && addingItem && (
        <Sheet full={true} onChange={(e) => e === -1 && close()}>
          <EditableList item={addingItem} onComplete={() => {}} />
        </Sheet>
      )}
    </SheetScreen>
  )
}
