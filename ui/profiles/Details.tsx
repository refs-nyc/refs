import { useItemStore } from '@/features/pocketbase/stores/items'
import { ItemsRecord } from '@/features/pocketbase/stores/pocketbase-types'
import { ExpandedItem, ExpandedProfile } from '@/features/pocketbase/stores/types'
import { c, s } from '@/features/style'
import { XStack } from '@/ui/core/Stacks'
import { useUIStore } from '@/ui/state'
import { useRouter } from 'expo-router'
import React, { useCallback, useContext, useRef, useState } from 'react'
import { Pressable, Text, useWindowDimensions, View } from 'react-native'
import Carousel, { ICarouselInstance } from 'react-native-reanimated-carousel'
import { useStore } from 'zustand'
import { Avatar } from '../atoms/Avatar'
import { Checkbox, MeatballMenu } from '../atoms/MeatballMenu'
import { Sheet } from '../core/Sheets'
import { GridLines } from '../display/Gridlines'
import { EditableList } from '../lists/EditableList'
import { DetailsCarouselItem } from './DetailsCarouselItem'
import { ProfileDetailsContext } from './profileDetailsStore'
import BottomSheet from '@gorhom/bottom-sheet'

// --- Helper Components for State Isolation ---

const ConditionalGridLines = React.memo(() => {
  const editing = useItemStore((state) => state.editing)
  if (editing === '') {
    return null
  }
  return <GridLines lineColor={c.grey1} size={20} />
})
ConditionalGridLines.displayName = 'ConditionalGridLines'

const DetailsHeaderButton = () => {
  const profileDetailsStore = useContext(ProfileDetailsContext)
  const showContextMenu = useStore(profileDetailsStore, (state) => state.showContextMenu)
  const setShowContextMenu = useStore(profileDetailsStore, (state) => state.setShowContextMenu)

  return (
    <MeatballMenu
      onPress={() => {
        setShowContextMenu(!showContextMenu)
      }}
    />
  )
}
DetailsHeaderButton.displayName = 'DetailsHeaderButton'

const ApplyChangesButton = () => {
  const update = useItemStore((state) => state.update)
  const stopEditing = useItemStore((state) => state.stopEditing)
  const triggerProfileRefresh = useItemStore((state) => state.triggerProfileRefresh)

  return (
    <Checkbox
      onPress={async () => {
        await update()
        stopEditing()
        triggerProfileRefresh()
      }}
    />
  )
}
ApplyChangesButton.displayName = 'ApplyChangesButton'

const ProfileLabel = ({ profile }: { profile: ExpandedProfile }) => {
  const router = useRouter()
  return (
    <Pressable
      onPress={() => {
        router.replace(`/user/${profile.userName}`)
      }}
    >
      <XStack style={{ alignItems: 'center' }} gap={s.$075}>
        {/* show user avatar and name */}
        <Text style={{ fontSize: s.$1, fontWeight: 500, opacity: 0.6, color: c.muted }}>
          {profile.firstName}
        </Text>
        <Avatar size={s.$1} source={profile.image} />
      </XStack>
    </Pressable>
  )
}
ProfileLabel.displayName = 'ProfileLabel'

// --- Main Components ---

export const Details = ({ profile, data }: { profile: ExpandedProfile; data: ItemsRecord[] }) => {
  const router = useRouter()
  const ref = useRef<ICarouselInstance>(null)
  const addRefSheetRef = useRef<BottomSheet>(null)
  const win = useWindowDimensions()

  const [itemToAdd, setItemToAdd] = useState<ExpandedItem | null>(null)

  const profileDetailsStore = useContext(ProfileDetailsContext)
  const setShowContextMenu = useStore(profileDetailsStore, (state) => state.setShowContextMenu)
  const setCurrentIndex = useStore(profileDetailsStore, (state) => state.setCurrentIndex)
  const currentIndex = useStore(profileDetailsStore, (state) => state.currentIndex)
  const openedFromFeed = useStore(profileDetailsStore, (state) => state.openedFromFeed)

  const editing = useItemStore((state) => state.editing)

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

      {openedFromFeed ? (
        <>
          <View style={{ paddingLeft: s.$3, paddingTop: s.$2, paddingBottom: s.$05 }}>
            <ProfileLabel profile={profile} />
          </View>
          <View style={{ position: 'absolute', right: s.$3, top: s.$2, zIndex: 99 }}>
            {editing && <ApplyChangesButton />}
          </View>
        </>
      ) : (
        <View
          style={{
            paddingLeft: s.$3,
            paddingRight: s.$3,
            paddingTop: s.$6,
            paddingBottom: s.$1,
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'flex-end',
          }}
        >
          {editing ? <ApplyChangesButton /> : <DetailsHeaderButton />}
        </View>
      )}

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
        renderItem={DetailsCarouselItem}
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
