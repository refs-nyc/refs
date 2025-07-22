import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet'
import { View, Text } from 'react-native'
import { c, s } from '@/features/style'
import { Ionicons } from '@expo/vector-icons'
import { XStack } from '@/ui/core/Stacks'
import { SimplePinataImage } from '@/ui/images/SimplePinataImage'

export default function ProfileSearchBottomSheet({
  open,
  onClose,
  selectedRefs,
  selectedRefItems,
}: {
  open: boolean
  onClose: () => void
  selectedRefs: string[]
  selectedRefItems: any[]
}) {
  // DEBUG: Log when component renders
  console.log('🔍 DEBUG: ProfileSearchBottomSheet rendering with:', { open, selectedRefs, selectedRefItems })

  const snapPoints = [s.$8 * 1.2, '20%']
  return (
    <BottomSheet
      index={open ? 1 : 0}
      snapPoints={snapPoints}
      enablePanDownToClose={true}
      onClose={onClose}
      backgroundStyle={{ backgroundColor: c.olive, borderRadius: s.$4, paddingTop: 0 }}
      backdropComponent={(p) => (
        <BottomSheetBackdrop {...p} disappearsOnIndex={0} appearsOnIndex={1} pressBehavior={'collapse'} />
      )}
      handleComponent={null}
    >
      <XStack
        gap={s.$1}
        style={{ alignItems: 'center', justifyContent: 'center', paddingHorizontal: s.$2, height: s.$8 }}
      >
        <Text style={{ color: c.surface, fontSize: 22, fontWeight: '700', flexShrink: 0 }}>Search</Text>
        {selectedRefItems.map((item, idx) => (
          <View key={item.id} style={{ width: 36, height: 36, borderRadius: 8, overflow: 'hidden', marginHorizontal: 2, backgroundColor: c.surface2 }}>
            <SimplePinataImage source={item.image || item.expand?.ref?.image} style={{ width: 36, height: 36, borderRadius: 8 }} imageOptions={{ width: 36, height: 36 }} />
          </View>
        ))}
        <Ionicons name="arrow-forward" size={28} color={c.surface} style={{ marginLeft: 8 }} />
      </XStack>
    </BottomSheet>
  )
} 