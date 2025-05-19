import { View, Pressable } from 'react-native'
import { s, c } from '@/features/style'
import CheckboxIcon from '@/assets/icons/checkbox.svg'

export const Checkbox = ({ color = c.grey2, onPress }: { color?: string; onPress: () => void }) => {
  return (
    <Pressable
      onPress={onPress}
      style={{
        width: s.$5,
        height: s.$5,
        borderRadius: s.$10,
        aspectRatio: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: c.surface,
        shadowColor: '#000',
        shadowOffset: {
          width: 1,
          height: 5,
        },
        shadowOpacity: 0.25,
        shadowRadius: 2,
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
        width: s.$5,
        height: s.$5,
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
