import { XStack } from '@/ui/core/Stacks'
import Ionicons from '@expo/vector-icons/Ionicons'
import { View } from 'react-native'
import { BottomSheetTextInput as TextInput } from '@gorhom/bottom-sheet'
import { Dropdown } from '../inputs/Dropdown'
import { DeviceLocation } from '../inputs/DeviceLocation'
import { setGeolocation } from '@/features/location'

import { c, s } from '@/features/style'
import { Button } from '../buttons/Button'

export const FormFieldWithIcon = ({
  type,
  id,
  children,
  placeholder,
  onChange,
  value = '',
  autoFocus = false,
}: {
  type: 'user' | 'username' | 'phone' | 'email' | 'password' | 'location'
  id: string
  children: React.ReactNode
  placeholder: string
  onChange: (str: string) => void
  value: string
  autoFocus: boolean
}) => {
  const onSelect = (s: string) => {}
  const onCancel = () => {}

  return (
    <>
      <XStack
        gap={s.$075}
        style={{
          alignItems: 'center',
          paddingHorizontal: s.$09,
          paddingVertical: s.$05,
          backgroundColor: c.white,
          borderWidth: 1.5,
          borderColor: c.accent,
          borderRadius: s.$12,
          width: '100%',
        }}
      >
        {type === 'user' && <Ionicons size={s.$1} color={c.accent} name="person" col="$accent" />}
        {type === 'phone' && <Ionicons size={s.$1} color={c.accent} name="call" col="$accent" />}
        {(type === 'email' || type === 'username') && (
          <Ionicons size={s.$1} color={c.accent} name="at" col="$accent" />
        )}
        {type === 'location' && <Ionicons size={s.$1} color={c.accent} name="map" col="$accent" />}
        {type === 'password' && <Ionicons size={s.$1} color={c.accent} name="key" col="$accent" />}
        <TextInput
          style={{
            flex: 1,
            paddingVertical: 10,
            fontSize: s.$09,
            fontFamily: 'Inter',
            width: '100%',
            color: c.accent,
          }}
          secureTextEntry={type === 'password'}
          autoFocus={autoFocus}
          autoCapitalize="none"
          placeholder={placeholder}
          placeholderTextColor={c.accent}
          onChangeText={onChange}
          value={value}
        />
      </XStack>
      {/* Warnings etc */}
      <View
        style={{
          height: s.$6,
          paddingVertical: s.$08,
          width: '100%',
          justifyContent: 'flex-start',
        }}
      >
        {children}
      </View>

      {type === 'location' && value !== '' && (
        <Dropdown
          options={[{ id: 'a', title: 'ShittyTown' }]}
          onSelect={onSelect}
          onCancel={onCancel}
        ></Dropdown>
      )}
      {type === 'location' && value === '' && <DeviceLocation />}
    </>
  )
}
