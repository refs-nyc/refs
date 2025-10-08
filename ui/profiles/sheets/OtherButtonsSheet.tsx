import { useAppStore } from '@/features/stores'
import type { Profile } from '@/features/types'
import { c, s } from '@/features/style'
import { XStack } from '@/ui/core/Stacks'
import { DMButton } from '@/ui/profiles/DMButton'
import { Heading } from '@/ui/typo/Heading'
import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useEffect, useState } from 'react'

export const OtherButtonsSheet = ({
  bottomSheetRef,
  profile,
  openBacklogSheet,
}: {
  bottomSheetRef: React.RefObject<BottomSheet>
  profile: Profile
  openBacklogSheet: () => void
}) => {
  const { moduleBackdropAnimatedIndex, saves, addSave, removeSave } = useAppStore()

  const saveId = saves.find((s) => s.expand.user.id === profile?.id)?.id
  const [optimisticSaved, setOptimisticSaved] = useState(false)

  useEffect(() => {
    if (saveId) {
      setOptimisticSaved(false)
    }
  }, [saveId])

  const isSaved = Boolean(saveId) || optimisticSaved
  const isSaving = optimisticSaved && !saveId

  const handlePress = () => {
    if (saveId) {
      setOptimisticSaved(false)
      void removeSave(saveId)
      return
    }

    if (isSaving) return

    setOptimisticSaved(true)
    void addSave(profile.id, profile).catch((error) => {
      console.warn('Failed to save profile', error)
      setOptimisticSaved(false)
    })
  }
  const disappearsOnIndex = 0
  const appearsOnIndex = 1

  return (
    <BottomSheet
      enableDynamicSizing={false}
      ref={bottomSheetRef}
      enablePanDownToClose={false}
      snapPoints={['15%']}
      index={0}
      animatedIndex={moduleBackdropAnimatedIndex}
      backgroundStyle={{ backgroundColor: c.olive, borderRadius: 50, paddingTop: 0 }}
      handleComponent={null}
      backdropComponent={(p) => (
        <BottomSheetBackdrop
          {...p}
          disappearsOnIndex={disappearsOnIndex}
          appearsOnIndex={appearsOnIndex}
          pressBehavior={'close'}
        />
      )}
      keyboardBehavior="interactive"
    >
      <View style={{ paddingTop: s.$2, alignItems: 'center' }}>
        <XStack style={{ width: '85%' }} gap={12}>
          <View style={{ height: s.$4, flex: 1 }}>
            <DMButton profile={profile} style={{ paddingHorizontal: s.$0 }} />
          </View>
          <View style={{ height: s.$4, flex: 1 }}>
            <Pressable
              onPress={handlePress}
              disabled={isSaving}
              style={[
                {
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: s.$4,
                  paddingVertical: 10,
                  paddingHorizontal: s.$2,
                  minWidth: s.$8,
                  backgroundColor: '#92A18D',
                  height: 47,
                },
                isSaved ? styles.saved : {},
              ]}
            >
              <Heading
                tag="h3"
                style={{
                  color: c.white,
                }}
              >
                <Text style={{ fontSize: 16.5 }}>{isSaved ? 'Saved' : 'Save'}</Text>
              </Heading>
            </Pressable>
          </View>
        </XStack>
      </View>
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  saved: {
    borderWidth: 0,
    backgroundColor: 'rgba(0,0,0,0.15)',
    opacity: 0.5,
    paddingHorizontal: 0,
  },
})
