import { addToProfile, removeFromProfile, useUserStore } from '@/features/pocketbase'
import { useBackdropStore } from '@/features/pocketbase/stores/backdrop'
import { getProfileItems, useItemStore } from '@/features/pocketbase/stores/items'
import { ExpandedItem } from '@/features/pocketbase/stores/types'
import { c, s } from '@/features/style'
import { Button } from '@/ui/buttons/Button'
import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet'
import { useEffect, useState } from 'react'
import { Text, View } from 'react-native'
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated'
import { AddRefSheetGrid } from './AddRefSheetGrid'
import { Heading } from '@/ui/typo/Heading'
import { SimplePinataImage } from '@/ui/images/SimplePinataImage'

export const AddRefSheet = ({
  itemToAdd,
  bottomSheetRef,
}: {
  itemToAdd: ExpandedItem | null
  bottomSheetRef: React.RefObject<BottomSheet>
}) => {
  const { addRefSheetBackdropAnimatedIndex, registerBackdropPress, unregisterBackdropPress } =
    useBackdropStore()

  const { user } = useUserStore()

  const [gridItems, setGridItems] = useState<ExpandedItem[]>([])
  const { moveToBacklog } = useItemStore()

  // close the new ref sheet when the user taps the navigation backdrop
  useEffect(() => {
    const key = registerBackdropPress(() => {
      bottomSheetRef.current?.close()
    })
    return () => {
      unregisterBackdropPress(key)
    }
  }, [])

  useEffect(() => {
    async function initialize() {
      if (itemToAdd) {
        if (user) {
          const gridItems = await getProfileItems(user.userName)
          setGridItems(gridItems)

          // check if the grid is full
          if (gridItems.length >= 12) {
            // show a modal to the user that the grid is full
            setStep('selectItemToReplace')
          } else {
            addToProfile(itemToAdd.expand.ref, true, {
              backlog: false,
              comment: itemToAdd.text,
            }).then(() => {
              setStep('addedToGrid')
            })
          }
        }
      }
    }
    initialize()
  }, [itemToAdd])

  // const [addingTo, setAddingTo] = useState<'backlog' | 'grid' | null>(null)
  const [step, setStep] = useState<
    null | 'selectItemToReplace' | 'addedToBacklog' | 'addedToGrid' | 'chooseReplaceItemMethod'
  >(null)
  const [itemToReplace, setItemToReplace] = useState<ExpandedItem | null>(null)

  const sheetHeight =
    step === 'selectItemToReplace' ? '90%' : step === 'chooseReplaceItemMethod' ? '50%' : '30%'

  const disappearsOnIndex = -1
  const appearsOnIndex = 0
  const HANDLE_HEIGHT = s.$2

  return (
    <BottomSheet
      enableDynamicSizing={false}
      ref={bottomSheetRef}
      enablePanDownToClose={true}
      snapPoints={[sheetHeight]}
      index={-1}
      animatedIndex={addRefSheetBackdropAnimatedIndex}
      backgroundStyle={{ backgroundColor: c.surface, borderRadius: s.$4, paddingTop: 0 }}
      onChange={(i: number) => {
        if (i === -1) {
          setItemToReplace(null)
          setStep(null)
        }
      }}
      backdropComponent={(p) => (
        <BottomSheetBackdrop
          {...p}
          disappearsOnIndex={disappearsOnIndex}
          appearsOnIndex={appearsOnIndex}
          pressBehavior={'close'}
        />
      )}
      handleComponent={() => (
        <View
          style={{
            width: '100%',
            position: 'absolute',
            alignItems: 'center',
            justifyContent: 'center',
            display: 'flex',
            height: HANDLE_HEIGHT,
          }}
        >
          <Animated.View
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(200)}
            style={{
              backgroundColor: c.white,
              width: s.$5,
              height: s.$05,
              borderRadius: s.$10,
            }}
          />
        </View>
      )}
      keyboardBehavior="interactive"
    >
      {step === 'selectItemToReplace' && (
        <View
          style={{
            display: 'flex',
            flexDirection: 'column',
            padding: s.$3,
            gap: s.$1,
            alignItems: 'center',
          }}
        >
          <Text>Adding {itemToAdd?.expand.ref.title} to your profile</Text>
          {itemToAdd?.expand.ref?.image && (
            <View style={{ alignItems: 'center' }}>
              <SimplePinataImage
                originalSource={itemToAdd.expand.ref?.image}
                style={{ height: 100, width: 100 }}
                imageOptions={{
                  width: 100,
                  height: 100,
                }}
              />
            </View>
          )}
          <Text>Choose a grid item to replace</Text>
          <AddRefSheetGrid
            gridItems={gridItems}
            onSelectItem={(item) => {
              setItemToReplace(item)
              setStep('chooseReplaceItemMethod')
            }}
          />
          <Button
            title="Add to backlog instead"
            variant="smallMuted"
            onPress={async () => {
              if (!itemToAdd) return
              await addToProfile(itemToAdd.expand.ref, true, {
                backlog: true,
                comment: itemToAdd.text,
              })
              setStep('addedToBacklog')
            }}
          />
        </View>
      )}
      {step === 'chooseReplaceItemMethod' && itemToReplace && (
        <View
          style={{
            display: 'flex',
            flexDirection: 'column',

            padding: s.$3,
            gap: s.$1,
          }}
        >
          <View style={{ alignItems: 'center' }}>
            <Text style={{ color: c.muted }}>Do what with {itemToReplace.expand.ref?.title}?</Text>
          </View>
          {/* display the image of the item to be replaced */}
          {itemToReplace.expand.ref?.image && (
            <View style={{ alignItems: 'center' }}>
              <SimplePinataImage
                originalSource={itemToReplace.expand.ref?.image}
                style={{ height: 100, width: 100 }}
                imageOptions={{
                  width: 100,
                  height: 100,
                }}
              />
            </View>
          )}
          <Button
            title="Remove"
            variant="basic"
            onPress={async () => {
              if (!itemToAdd?.expand.ref) return
              // remove the item
              await removeFromProfile(itemToReplace.id)
              await addToProfile(itemToAdd.expand.ref, true, {
                backlog: false,
                comment: itemToAdd.text,
              })
              setStep('addedToGrid')
            }}
          />
          <Button
            title="Send to backlog"
            onPress={async () => {
              if (!itemToAdd?.expand.ref) return
              // send itemToReplace to the backlog
              await moveToBacklog(itemToReplace.id)
              // replace the item
              await addToProfile(itemToAdd.expand.ref, true, {
                backlog: false,
                comment: itemToAdd.text,
              })
              setStep('addedToGrid')
            }}
          />
        </View>
      )}
      {step === 'addedToBacklog' && (
        <View style={{ padding: s.$3 }}>
          <Heading tag="h1">{itemToAdd?.expand.ref.title} was added to the backlog</Heading>
        </View>
      )}
      {step === 'addedToGrid' && (
        <View style={{ padding: s.$3 }}>
          <Heading tag="h1">{itemToAdd?.expand.ref.title} was added to grid</Heading>
        </View>
      )}
    </BottomSheet>
  )
}
