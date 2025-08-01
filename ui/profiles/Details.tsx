import { useAppStore } from '@/features/stores'
import { ExpandedItem, Item } from '@/features/types'
import { c } from '@/features/style'

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
  const editing = useAppStore((state) => state.editing)
  if (editing === '') {
    return null
  }
  return <GridLines lineColor={c.grey1} size={20} />
})
ConditionalGridLines.displayName = 'ConditionalGridLines'

// --- Main Components ---

export const Details = ({ data }: { data: Item[] }) => {
  const ref = useRef<ICarouselInstance>(null)
  const win = useWindowDimensions()

  const profileDetailsStore = useContext(ProfileDetailsContext)
  const setShowContextMenu = useStore(profileDetailsStore, (state) => state.setShowContextMenu)
  const setCurrentIndex = useStore(profileDetailsStore, (state) => state.setCurrentIndex)
  const currentIndex = useStore(profileDetailsStore, (state) => state.currentIndex)

  const { stopEditing, update, addingToList, setAddingToList, addingItem, startEditing, editing } = useAppStore()

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
      <Carousel
        loop={data.length > 1}
        ref={ref}
        mode="parallax"
        modeConfig={{
          parallaxScrollingScale: 1.0,
          parallaxScrollingOffset: 50,
        }}
        containerStyle={{ padding: 0, overflow: 'hidden', marginTop: 3 }}
        data={data as ExpandedItem[]}
        width={win.width}
        height={win.height}
        defaultIndex={currentIndex}
        onSnapToItem={(index) => {
          setCurrentIndex(index)
          setShowContextMenu(false)
          
          // If we're currently editing, immediately switch to editing the new item
          if (editing !== '') {
            const newItem = data[index]
            if (newItem) {
              // Immediately start editing the new item
              startEditing(newItem.id)
            }
          }
        }}
        onConfigurePanGesture={handleConfigurePanGesture}
        renderItem={({ item, index }) => <DetailsCarouselItem item={item} index={index} />}
        windowSize={2}
        pagingEnabled={true}
        snapEnabled={true}
        style={{ overflow: 'hidden' }}
      />

      {addingToList !== '' && addingItem && (
        <Sheet full={true} onChange={(e: any) => e === -1 && close()}>
          <EditableList item={addingItem as ExpandedItem} onComplete={() => {}} />
        </Sheet>
      )}
    </>
  )
}
