import { useItemStore } from '@/features/pocketbase/stores/items'
import { ItemsRecord } from '@/features/pocketbase/stores/pocketbase-types'
import { ExpandedItem } from '@/features/pocketbase/stores/types'
import { c } from '@/features/style'
import { useUIStore } from '@/ui/state'
import React, { useCallback, useContext, useRef } from 'react'
import { useWindowDimensions } from 'react-native'
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
  const { stopEditing, update } = useItemStore()

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
      <ConditionalGridLines />

      <Carousel
        loop={data.length > 1}
        ref={ref}
        mode="parallax"
        modeConfig={{
          parallaxScrollingScale: 0.99999,
          parallaxScrollingOffset: 50,
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
        windowSize={5}
        pagingEnabled={true}
        snapEnabled={true}
      />

      {addingToList !== '' && addingItem && (
        <Sheet full={true} onChange={(e: any) => e === -1 && close()}>
          <EditableList item={addingItem as ExpandedItem} onComplete={() => {}} />
        </Sheet>
      )}
    </>
  )
}
