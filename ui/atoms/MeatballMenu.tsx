import { View, Pressable } from 'react-native'
import { s, c } from '@/features/style'
import CheckboxIcon from '@/assets/icons/checkbox.svg'

export const Checkbox = ({ color = c.grey2, onPress }: { color?: string; onPress: () => void }) => {
  return (
    <Pressable
      onPress={onPress}
      style={{
        width: s.$2,
        height: s.$2,
        aspectRatio: 1,
        // gap: 5,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: c.surface,
      }}
    >
      <CheckboxIcon />
      {/* <SvgUri uri={CheckboxIcon} /> */}
    </Pressable>
  )
}

export const MeatballMenu = ({
  color = c.grey2,
  onPress,
}: {
  color?: string
  onPress: () => void
}) => {
  return (
    <Pressable
      onPress={onPress}
      style={{
        width: s.$2,
        height: s.$2,
        aspectRatio: 1,
        gap: 5,
        justifyContent: 'center',
        alignItems: 'center',
        // backgroundColor: 'red',
      }}
    >
      <View style={{ width: 5, height: 5, borderRadius: s.$05, backgroundColor: color }} />
      <View style={{ width: 5, height: 5, borderRadius: s.$05, backgroundColor: color }} />
      <View style={{ width: 5, height: 5, borderRadius: s.$05, backgroundColor: color }} />
    </Pressable>
  )
}
