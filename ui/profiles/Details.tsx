import { useItemStore } from '@/features/pocketbase/stores/items'
import { ItemsRecord } from '@/features/pocketbase/stores/pocketbase-types'
import { ExpandedItem } from '@/features/pocketbase/stores/types'
import { c } from '@/features/style'
import { useUIStore } from '@/ui/state'
import React, { useCallback, useContext, useRef } from 'react'
import { useWindowDimensions, View } from 'react-native'
import Carousel, { ICarouselInstance } from 'react-native-reanimated-carousel'
import { useStore } from 'zustand'
import { Sheet } from '../core/Sheets'
import { GridLines } from '../display/Gridlines'
import { EditableList } from '../lists/EditableList'
import { DetailsCarouselItem } from './DetailsCarouselItem'
import { ProfileDetailsContext } from './profileDetailsStore'

// --- Helper Components for State Isolation ---

const ConditionalGridLines = React.memo(() => {
  const editing = useItemStore((state) => state.editing)
  if (editing === '') {
    return null
  }
  return <GridLines lineColor={c.grey1} size={20} />
})
ConditionalGridLines.displayName = 'ConditionalGridLines'

// --- Main Components ---

export const Details = ({ data }: { data: ItemsRecord[] }) => {
  const ref = useRef<ICarouselInstance>(null)
  const win = useWindowDimensions()

  const profileDetailsStore = useContext(ProfileDetailsContext)
  const setShowContextMenu = useStore(profileDetailsStore, (state) => state.setShowContextMenu)
  const setCurrentIndex = useStore(profileDetailsStore, (state) => state.setCurrentIndex)
  const currentIndex = useStore(profileDetailsStore, (state) => state.currentIndex)

  const { addingToList, setAddingToList, addingItem } = useUIStore()
  const { stopEditing, update, editing } = useItemStore()

  const handleConfigurePanGesture = useCallback((gesture: any) => {
    'worklet'
    gesture.activeOffsetX([-10, 10])
  }, [])

  const close = useCallback(async () => {
    setAddingToList('')

    await update()
    stopEditing()
  }, [setAddingToList])

  return (
    <>
      {/* Grid lines with proper clipping */}
      <View style={{ 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0,
        borderRadius: 50, // Match the sheet's borderRadius
        overflow: 'hidden', // Clip the grid lines to the rounded corners
        zIndex: -1, // Put behind the carousel so it doesn't block interactions
        pointerEvents: 'none' // Ensure it doesn't block touch events
      }}>
        <ConditionalGridLines />
      </View>

      <Carousel
        loop={data.length > 1}
        ref={ref}
        mode={editing ? "parallax" : "parallax"}
        modeConfig={{
          parallaxScrollingScale: editing ? 1 : 1, // Keep in-view item at full size
          parallaxScrollingOffset: editing ? 0 : 60, // Moderate offset for fun effect
          parallaxAdjacentItemScale: editing ? 1 : 0.9, // Scale adjacent items down slightly
        }}
        containerStyle={{ padding: 0 }}
        data={data as ExpandedItem[]}
        width={win.width}
        height={win.height}
        defaultIndex={currentIndex}
        onSnapToItem={(index) => {
          setCurrentIndex(index)
          stopEditing()
          setShowContextMenu(false)
        }}
        onConfigurePanGesture={handleConfigurePanGesture}
        renderItem={({ item, index }) => <DetailsCarouselItem item={item} index={index} />}
        windowSize={editing ? 1 : 5} // When editing, only render the current item
        pagingEnabled={!editing} // Disable paging when editing
        snapEnabled={!editing} // Disable snapping when editing
      />

      {addingToList !== '' && addingItem && (
        <Sheet full={true} onChange={(e: any) => e === -1 && close()}>
          <EditableList item={addingItem as ExpandedItem} onComplete={() => {}} />
        </Sheet>
      )}
    </>
  )
}
