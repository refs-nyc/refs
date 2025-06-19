import { addToProfile, pocketbase, removeFromProfile, useUserStore } from '@/features/pocketbase'
import { getProfileItems, useItemStore } from '@/features/pocketbase/stores/items'
import { ExpandedItem } from '@/features/pocketbase/stores/types'
import { c, s } from '@/features/style'
import { RefForm } from '@/ui/actions/RefForm'
import { Button } from '@/ui/buttons/Button'
import { SimplePinataImage } from '@/ui/images/SimplePinataImage'
import { Heading } from '@/ui/typo/Heading'
import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet'
import { useEffect, useState } from 'react'
import { Text, View } from 'react-native'
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated'
import { AddRefSheetGrid } from './AddRefSheetGrid'
import { useUIStore } from '@/ui/state'

export const AddRefSheet = ({
  bottomSheetRef,
}: {
  bottomSheetRef: React.RefObject<BottomSheet>
}) => {
  const { user } = useUserStore()
  const { addingRefId } = useUIStore()
  const [refData, setRefData] = useState<any>({})

  const [gridItems, setGridItems] = useState<ExpandedItem[]>([])
  const { moveToBacklog } = useItemStore()

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

  useEffect(() => {
    const getRef = async () => {
      const ref = await pocketbase.collection('refs').getOne(addingRefId)
      setRefData(ref)
    }
    getRef()
  }, [addingRefId])

  // const [addingTo, setAddingTo] = useState<'backlog' | 'grid' | null>(null)
  const [step, setStep] = useState<
    | 'editNewItem'
    | 'selectItemToReplace'
    | 'addedToBacklog'
    | 'addedToGrid'
    | 'chooseReplaceItemMethod'
  >('editNewItem')
  const [itemToReplace, setItemToReplace] = useState<ExpandedItem | null>(null)

  const sheetHeight =
    step === 'selectItemToReplace'
      ? '90%'
      : step === 'chooseReplaceItemMethod'
      ? '50%'
      : step === 'editNewItem'
      ? '90%'
      : '30%'

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
      backgroundStyle={{ backgroundColor: c.olive, borderRadius: s.$4, paddingTop: 0 }}
      onChange={(i: number) => {
        if (i === -1) {
          setItemToReplace(null)
          setStep('editNewItem')
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
      {step === 'editNewItem' && refData && (
        <View style={{ padding: s.$3 }}>
          <RefForm
            r={refData}
            canEditRefData={false}
            onAddRefToList={async (fields) => {
              console.log('TODO: onAddRefToList')
            }}
            onAddRef={async (fields) => {
              if (!user) return
              const gridItems = await getProfileItems(user.userName)
              setGridItems(gridItems)

              // check if the grid is full
              if (gridItems.length >= 12) {
                // show a modal to the user that the grid is full
                setStep('selectItemToReplace')
              } else {
                await addToProfile(refData, {
                  backlog: false,
                  image: fields.image,
                  text: fields.text,
                })
                setStep('addedToGrid')
              }
            }}
            backlog={false}
          />
        </View>
      )}
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
          <Text style={{ color: c.surface, fontSize: s.$1 }}>
            Adding {refData.title} to your profile
          </Text>
          {refData?.image && (
            <View style={{ alignItems: 'center' }}>
              <SimplePinataImage
                originalSource={refData?.image}
                style={{ height: 80, width: 80 }}
                imageOptions={{
                  width: 80,
                  height: 80,
                }}
              />
            </View>
          )}
          <Text style={{ color: c.surface, fontSize: s.$1 }}>Choose a grid item to replace</Text>
          <AddRefSheetGrid
            gridItems={gridItems}
            onSelectItem={(item) => {
              setItemToReplace(item)
              setStep('chooseReplaceItemMethod')
            }}
          />
          <Button
            title="Add to backlog instead"
            variant="small"
            onPress={async () => {
              await addToProfile(refData, {
                backlog: true,
                text: '',
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
              // remove the item
              await removeFromProfile(itemToReplace.id)
              await addToProfile(refData, {
                backlog: false,
                text: '',
              })
              setStep('addedToGrid')
            }}
          />
          <Button
            title="Send to backlog"
            onPress={async () => {
              // send itemToReplace to the backlog
              await moveToBacklog(itemToReplace.id)
              // replace the item
              await addToProfile(refData, {
                backlog: false,
                text: '',
              })
              setStep('addedToGrid')
            }}
          />
        </View>
      )}
      {step === 'addedToBacklog' && (
        <View style={{ padding: s.$3 }}>
          <Heading tag="h1">{refData.title} was added to the backlog</Heading>
        </View>
      )}
      {step === 'addedToGrid' && (
        <View style={{ padding: s.$3 }}>
          <Heading tag="h1">{refData.title} was added to grid</Heading>
        </View>
      )}
    </BottomSheet>
  )
}
