import React, { useRef, useCallback, useMemo, useContext, useState } from 'react'
import { useRouter } from 'expo-router'
import { View, Dimensions, Pressable, ViewStyle } from 'react-native'
import Carousel, { ICarouselInstance } from 'react-native-reanimated-carousel'
import { c, s } from '@/features/style'
import { useItemStore } from '@/features/pocketbase/stores/items'
import { SearchRef } from '../actions/SearchRef'
import { EditableList } from '../lists/EditableList'
import { Sheet, SheetScreen } from '../core/Sheets'
import { ExpandedItem } from '@/features/pocketbase/stores/types'
import { EditableItem } from './EditableItem'
import { GridLines } from '../display/Gridlines'
import { BottomSheetScrollView } from '@gorhom/bottom-sheet'
import { MeatballMenu, Checkbox } from '../atoms/MeatballMenu'
import { useUIStore } from '@/ui/state'
import { ProfileDetailsContext } from './profileDetailsStore'
import { useStore } from 'zustand'
import { ItemsRecord } from '@/features/pocketbase/stores/pocketbase-types'

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
  const update = useItemStore((state) => state.update)
  const stopEditing = useItemStore((state) => state.stopEditing)
  const profileDetailsStore = useContext(ProfileDetailsContext)
  const setShowContextMenu = useStore(profileDetailsStore, (state) => state.setShowContextMenu)

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
        setShowContextMenu(false)
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
            setShowContextMenu(true)
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
  const { searchingNewRef, updateEditedState, setSearchingNewRef, update } = useItemStore()
  const profileDetailsStore = useContext(ProfileDetailsContext)
  const { currentIndex } = useStore(profileDetailsStore)

  const [currentItem, setCurrentItem] = useState<ExpandedItem>(item)

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
        <EditableItem item={currentItem} editingRights={editingRights} index={index} />
      </BottomSheetScrollView>

      {searchingNewRef && currentIndex == index && (
        <Sheet
          keyboardShouldPersistTaps="always"
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
              setCurrentItem(newRecord as ExpandedItem)
              setSearchingNewRef('')
            }}
          />
        </Sheet>
      )}
    </View>
  )
}

export const Details = ({
  data,
  editingRights = false,
}: {
  data: ItemsRecord[]
  editingRights?: boolean
}) => {
  const router = useRouter()
  const ref = useRef<ICarouselInstance>(null)

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
      <DetailsHeaderButton />

      <Carousel
        loop={data.length > 1}
        ref={ref}
        mode="parallax"
        modeConfig={{
          parallaxScrollingScale: 0.9,
        }}
        data={data as ExpandedItem[]}
        width={win.width}
        height={win.height}
        style={carouselStyle}
        defaultIndex={currentIndex}
        onSnapToItem={(index) => {
          setCurrentIndex(index)
          stopEditing()
          setShowContextMenu(false)
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
