// add ref sheet

// this takes an existing item and the user can decide whether to add it to their profile or the backlog
// if they add it to their profile, then if the profile is already full, they will have to remove an existing item

// do we make a copy of the item in the database?
import { useBackdropStore } from '@/features/pocketbase/stores/backdrop'
import { ExpandedItem } from '@/features/pocketbase/stores/types'
import { c, s } from '@/features/style'
import { Button } from '@/ui/buttons/Button'
import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet'
import { useEffect, useState } from 'react'
import { Text, View } from 'react-native'
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated'
import { getProfileItems, useItemStore } from '@/features/pocketbase/stores/items'
import { addToProfile, removeFromProfile, useUserStore } from '@/features/pocketbase'
import { GridWrapper } from '@/ui/grid/GridWrapper'
import { GridTileWrapper } from '@/ui/grid/GridTileWrapper'
import { GridItem } from '@/ui/grid/GridItem'
import { GridTile } from '@/ui/grid/GridTile'

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
    const fetchGridItems = async () => {
      if (!user) {
        setGridItems([])
      } else {
        const gridItems = await getProfileItems(user.userName)
        setGridItems(gridItems)
      }
    }
    fetchGridItems()
  }, [user])

  // const [addingTo, setAddingTo] = useState<'backlog' | 'grid' | null>(null)
  const [step, setStep] = useState<'chooseTarget' | 'selectItemToReplace'>('chooseTarget')
  const [itemToReplace, setItemToReplace] = useState<ExpandedItem | null>(null)

  const sheetHeight = step === 'selectItemToReplace' ? '80%' : '30%'

  const disappearsOnIndex = -1
  const appearsOnIndex = 0
  const HANDLE_HEIGHT = s.$2

  const tileSize = s.$8

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
        if (i === -1) setStep('chooseTarget')
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
      {/* firstly ask "add to backlog" or "add to grid" */}
      {step === 'chooseTarget' && (
        <View style={{ display: 'flex', flexDirection: 'column', padding: s.$3, gap: s.$1 }}>
          <Button
            title="Add to backlog"
            onPress={async () => {
              if (!itemToAdd?.expand.ref) return
              // add the item to the backlog
              await addToProfile(itemToAdd.expand.ref, true, {
                backlog: true,
                comment: itemToAdd.text,
              })
              bottomSheetRef.current?.close()
              // TODO: post something that says we added the ref to the backlog
            }}
            variant="basic"
            style={{ backgroundColor: c.surface2 }}
            textStyle={{ color: c.muted2 }}
          />
          <Button
            title="Add to grid"
            onPress={async () => {
              if (!itemToAdd) return
              // check if the grid is full
              if (gridItems.length >= 12) {
                // show a modal to the user that the grid is full
                setStep('selectItemToReplace')
              } else {
                await addToProfile(itemToAdd.expand.ref, true, {
                  backlog: false,
                  comment: itemToAdd.text,
                })
                bottomSheetRef.current?.close()
              }
            }}
            variant="raised"
          />
        </View>
      )}
      {step === 'selectItemToReplace' &&
        (!itemToReplace ? (
          <View
            style={{
              display: 'flex',
              flexDirection: 'column',
              padding: s.$3,
              gap: s.$1,
              alignItems: 'center',
            }}
          >
            <Text>Choose a grid item to replace</Text>

            <View>
              <GridWrapper cellGap={s.$05} columns={3} rows={4}>
                {gridItems.map((item, i) => (
                  <GridTileWrapper
                    key={item.id}
                    id={item.id}
                    onPress={() => {
                      // select this item
                      setItemToReplace(item)
                    }}
                    size={tileSize}
                    type={
                      item.list ? 'list' : item.expand.ref?.image || item.image ? 'image' : 'text'
                    }
                  >
                    <GridItem item={item} i={i} />
                  </GridTileWrapper>
                ))}

                {Array.from({ length: 12 - gridItems.length }).map((_, i) => (
                  <GridTileWrapper size={tileSize} key={`empty-${i}`} type="">
                    <GridTile key={i} />
                  </GridTileWrapper>
                ))}
              </GridWrapper>
            </View>
          </View>
        ) : (
          <View style={{ display: 'flex', flexDirection: 'column', padding: s.$3, gap: s.$1 }}>
            <Text>Do what with {itemToReplace.expand.ref?.title}?</Text>
            <Button
              title="Remove"
              onPress={async () => {
                if (!itemToAdd?.expand.ref) return
                // remove the item
                await removeFromProfile(itemToReplace.id)
                await addToProfile(itemToAdd.expand.ref, true, {
                  backlog: false,
                  comment: itemToAdd.text,
                })
                bottomSheetRef.current?.close()
                // TODO: post something that says we removed the old item and added the new one
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
                bottomSheetRef.current?.close()
                // TODO: post something that says we moved the old item to the backlog and added the new one
              }}
            />
          </View>
        ))}
    </BottomSheet>
  )
}
