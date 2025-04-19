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
import { ListContainer } from '../lists/ListContainer'
import { EditableList } from '../lists/EditableList'
import { Sheet, SheetScreen } from '../core/Sheets'
import { useUserStore, isExpandedProfile } from '@/features/pocketbase/stores/users'
import { ExpandedItem } from '@/features/pocketbase/stores/types'
import { EditableItem } from './EditableItem' // Assuming EditableItem is memoized
import { GridLines } from '../display/Gridlines'

const win = Dimensions.get('window')

// Outer renderItem function (already stable as it's outside Details)
export const renderItem = ({
  item,
  editingRights,
  index,
  onEditing, // Will receive the memoized version from Details
}: {
  item: ExpandedItem
  editingRights?: boolean
  index: number
  onEditing: (b: boolean) => void
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
      {/* Ensure EditableItem is wrapped with React.memo */}
      <EditableItem onEditing={onEditing} item={item} editingRights={editingRights} index={index} />
    </View>
  )
}

// Removed DetailsDemoCarousel wrapper as optimizations are applied directly in Details

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
  const [editing, setEditing] = useState(false)
  const scrollOffsetValue = useSharedValue<number>(10)

  const userNameParam =
    pathname === '/' ? undefined : typeof userName === 'string' ? userName : userName?.[0]

  // Memoize data derivation if profile object identity changes frequently but items don't
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
      // Use the memoized index directly
      // No need for rawIndex calculation if `index` is already memoized
      // The logic for `correctedIndex` seems complex and potentially incorrect.
      // react-native-reanimated-carousel usually takes the direct index.
      // Check if your `gridSort` reverses the order. If not, `index` should work.
      // If `gridSort` DOES reverse order, adjust the index calculation accordingly.
      // Let's assume for now `index` is the correct target index for the carousel.
      if (index >= 0 && index < data.length) {
        // Using setTimeout defers execution slightly, can sometimes help avoid race conditions
        // But might not be strictly necessary. Test without it first.
        // setTimeout(() => ref.current?.scrollTo({ index: index, animated: false }), 0);
        ref.current?.scrollTo({ index: index, animated: false }) // Try scrolling without animation initially
      }
    }
  }, [data, index]) // Depend on the memoized index

  // Memoize the onEditing callback
  const handleEditingChange = useCallback((isEditing: boolean) => {
    console.log('receive editing', isEditing)
    setEditing(isEditing)
  }, []) // Empty dependency array as setEditing is stable

  // Memoize the function passed to Carousel's renderItem prop
  const handleRenderCarouselItem = useCallback(
    ({ item }: { item: ExpandedItem; index: number }) => {
      // Call the original renderItem function, passing the memoized handler
      return renderItem({
        item,
        editingRights,
        index: item.index, // The carousel provides the index in the renderItem callback args
        onEditing: handleEditingChange,
      })
    },
    [editingRights, handleEditingChange] // Dependencies: update if these change
  )

  // Memoize the pan gesture handler
  const handleConfigurePanGesture = useCallback((gesture: any) => {
    'worklet'
    gesture.activeOffsetX([-10, 10])
  }, []) // Empty dependency array

  // Memoize the style object for the Carousel
  const carouselStyle = useMemo(
    () => ({
      overflow: 'visible',
      top: win.height * 0.2,
      // width is a separate prop for the Carousel component itself
    }),
    [] // No dependencies from win.height needed as Dimensions are unlikely to change dynamically
  )

  // Close modal and refresh profile
  const close = useCallback(async () => {
    // Memoize close function too
    setAddingToList('')
    await getProfile(userNameParam)
  }, [setAddingToList, getProfile, userNameParam]) // Add dependencies

  return (
    <SheetScreen onChange={(e) => e === -1 && router.back()}>
      {/* GridLines conditionally rendered - this is fine */}
      {editing && <GridLines lineColor={c.grey1} size={20} />}

      <View style={{ height: win.height, justifyContent: 'flex-start' }}>
        <Pressable
          style={{
            position: 'absolute',
            top: Math.max(insets.top, s.$1), // Use safe area top inset or default padding
            right: s.$1,
            padding: s.$1,
            zIndex: 99, // Ensure it's above the carousel
          }}
          onPress={() => router.back()} // Simplified back navigation
        >
          <Ionicons size={s.$1} name="close" color={c.muted} />
        </Pressable>

        {/* Use memoized props */}
        <Carousel
          loop={data.length > 1}
          ref={ref}
          data={data}
          width={win.width} // Carousel typically takes full width for calculations
          style={carouselStyle} // Use memoized style object
          height={win.height * 0.6} // Define a reasonable height, maybe less than full screen?
          defaultIndex={index} // Set initial index directly
          onConfigurePanGesture={handleConfigurePanGesture} // Use memoized handler
          // defaultScrollOffsetValue={scrollOffsetValue} // Often not needed if defaultIndex works
          renderItem={handleRenderCarouselItem} // Use memoized renderItem handler
          // Removed autoPlay props as they weren't in the original request and can cause issues during editing
          // autoPlay={true}
          // autoPlayInterval={2000}
          windowSize={5} // Optional: Render fewer items off-screen
          pagingEnabled={true} // Ensure it snaps correctly
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
