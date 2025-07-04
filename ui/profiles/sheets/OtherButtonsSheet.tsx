import { useBackdropStore } from '@/features/pocketbase/stores/backdrop'
import { useMessageStore } from '@/features/pocketbase/stores/messages'
import { UsersRecord } from '@/features/pocketbase/stores/pocketbase-types'
import type { ExpandedProfile } from '@/features/pocketbase/stores/types'
import { c, s } from '@/features/style'
import { Button } from '@/ui/buttons/Button'
import { XStack } from '@/ui/core/Stacks'
import { DMButton } from '@/ui/profiles/DMButton'
import { Heading } from '@/ui/typo/Heading'
import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet'
import { Pressable, StyleSheet, Text, View } from 'react-native'

export const OtherButtonsSheet = ({
  bottomSheetRef,
  profile,
  user,
  openBacklogSheet,
}: {
  bottomSheetRef: React.RefObject<BottomSheet>
  profile: ExpandedProfile
  user: UsersRecord | null
  openBacklogSheet: () => void
}) => {
  const { moduleBackdropAnimatedIndex } = useBackdropStore()

  const { saves, addSave, removeSave } = useMessageStore()

  const saveId = saves.find((s) => s.expand.user.id === profile?.id)?.id
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
      <XStack style={{ paddingTop: s.$2 + 8, justifyContent: 'center' }} gap={12}>
        <View style={{ height: s.$4, width: s.$10 }}>
          <DMButton profile={profile} style={{ paddingHorizontal: s.$0 }} />
        </View>
        <View style={{ height: s.$4, width: s.$10 }}>
          <Pressable
            onPress={saveId ? () => removeSave(saveId) : () => addSave(profile.id, user?.id!)}
            style={[
              {
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: s.$4,
                paddingVertical: 10,
                paddingHorizontal: s.$2,
                minWidth: s.$8,
                borderColor: c.white,
                borderWidth: 1,
                backgroundColor: 'transparent',
                height: 47,
              },
              saveId ? styles.saved : {},
            ]}
          >
            <Heading
              tag="h3"
              style={{
                color: c.white,
              }}
            >
              <Text style={{ fontSize: 16.5 }}>{saveId ? 'Saved' : 'Save'}</Text>
            </Heading>
          </Pressable>
        </View>

        <View style={{ height: s.$4, width: s.$10 }}>
          <Button
            onPress={() => {
              openBacklogSheet()
            }}
            variant="whiteOutline"
            title="Backlog"
            style={{ paddingHorizontal: s.$0 }}
          />
        </View>
      </XStack>
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
