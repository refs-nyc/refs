import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react' // Import useCallback, useMemo
import { useRouter } from 'expo-router'
import { View, Dimensions, Pressable, ViewStyle } from 'react-native'
import Carousel, { ICarouselInstance } from 'react-native-reanimated-carousel'
import { c, s } from '@/features/style'
import { gridSort } from './sorts'
import { useItemStore } from '@/features/pocketbase/stores/items'
import { SearchRef } from '../actions/SearchRef'
import { EditableList } from '../lists/EditableList'
import { Sheet, SheetScreen } from '../core/Sheets'
import { ExpandedItem, ExpandedProfile } from '@/features/pocketbase/stores/types'
import { EditableItem } from './EditableItem' // Assuming EditableItem is memoized
import { GridLines } from '../display/Gridlines'
import { BottomSheetScrollView } from '@gorhom/bottom-sheet'
import { MeatballMenu, Checkbox } from '../atoms/MeatballMenu'
import { useUIStore } from '@/ui/state'

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

const DetailsHeaderButton = React.memo(({ item }: { item: ExpandedItem }) => {
  const editing = useItemStore((state) => state.editing)
  const update = useItemStore((state) => state.update)
  const stopEditing = useItemStore((state) => state.stopEditing)
  const { setShowContextMenu } = useUIStore()

  return (
    <Pressable
      style={{
        width: '100%',
        zIndex: 99,
        padding: s.$2,
        alignItems: 'flex-end',
        top: s.$4,
      }}
      onPress={() => {
        setShowContextMenu('')
      }}
    >
      {editing !== '' ? (
        <Checkbox
          onPress={async () => {
            await update()
            stopEditing()
          }}
        />
      ) : (
        <MeatballMenu
          onPress={() => {
            setShowContextMenu(item.id)
          }}
        />
      )}
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
  const { searchingNewRef, updateEditedState, setSearchingNewRef, update, items } = useItemStore()
  const [currentItem, setCurrentItem] = useState(item)

  return (
    <View
      style={{
        width: win.width,
        height: win.height,
        gap: s.$1,
        justifyContent: 'flex-start',
      }}
      key={currentItem.id}
    >
      <BottomSheetScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ gap: s.$1 }}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={true}
      >
        <DetailsHeaderButton item={currentItem} />
        <EditableItem item={currentItem} editingRights={editingRights} index={index} />
      </BottomSheetScrollView>

      {searchingNewRef && (
        <Sheet
          onClose={() => {
            console.log('close')
            setSearchingNewRef('')
            // Do not update the ref
          }}
        >
          <SearchRef
            noNewRef
            onComplete={async (e) => {
              // Update the ref
              console.log(e.id)
              await updateEditedState({
                ref: e.id,
              })
              const newRecord = await update()
              setCurrentItem(newRecord)
              setSearchingNewRef('')
            }}
          />
        </Sheet>
      )}
    </View>
  )
}

export const Details = ({
  profile,
  editingRights = false,
  initialId,
}: {
  profile: ExpandedProfile
  editingRights?: boolean
  initialId: string
}) => {
  const router = useRouter()
  const ref = useRef<ICarouselInstance>(null)

  const { addingToList, setAddingToList, addingItem, setShowContextMenu } = useUIStore()
  const { stopEditing, update, editing: editingId } = useItemStore()

  const data = useMemo(
    () => [...profile.expand.items].filter((itm) => !itm.backlog).sort(gridSort),
    [profile]
  )

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

    await update()
    stopEditing()
  }, [setAddingToList])

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
      snapPoints={['100%']}
      maxDynamicContentSize={'100%'}
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
        onSnapToItem={(index) => {
          stopEditing()
          setShowContextMenu('')
        }}
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
