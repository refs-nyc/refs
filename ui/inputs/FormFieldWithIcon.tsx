import { useState } from 'react'
import { XStack } from '@/ui/core/Stacks'
import Ionicons from '@expo/vector-icons/Ionicons'
import { TextInput, View, Pressable } from 'react-native'
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
  type:
    | 'email'
    | 'firstName'
    | 'lastName'
    | 'userName'
    | 'location'
    | 'password'
    | 'passwordConfirm'
    | 'image'
    | 'user'
    | 'phone'
  id: string
  children: React.ReactNode
  placeholder: string
  onChange: (str: string) => void
  value: string
  autoFocus: boolean
}) => {
  const [showPassword, setShowPassword] = useState(false)
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
          backgroundColor: c.surface,
          borderWidth: 1.5,
          borderColor: c.accent,
          borderRadius: s.$12,
          width: '100%',
        }}
      >
        {/* Left Icon: For password fields, show a pressable toggle icon. Otherwise, show the static icon */}
        {type === 'password' || type === 'passwordConfirm' ? (
          <Pressable onPress={() => setShowPassword((prev) => !prev)}>
            <Ionicons size={s.$1} color={c.accent} name={showPassword ? 'key' : 'eye'} />
          </Pressable>
        ) : type === 'user' ? (
          <Ionicons size={s.$1} color={c.accent} name="person" />
        ) : type === 'phone' ? (
          <Ionicons size={s.$1} color={c.accent} name="call" />
        ) : type === 'email' || type === 'userName' ? (
          <Ionicons size={s.$1} color={c.accent} name="at" />
        ) : null}

        <TextInput
          style={{
            flex: 1,
            paddingVertical: 10,
            fontSize: s.$09,
            fontFamily: 'Inter',
            width: '100%',
            color: c.accent,
          }}
          autoCapitalize={type === 'user' ? 'words' : 'none'}
          secureTextEntry={
            type === 'password' || type === 'passwordConfirm' ? !showPassword : false
          }
          autoFocus={autoFocus}
          placeholder={placeholder}
          placeholderTextColor={c.accent}
          onChangeText={onChange}
          value={value}
          keyboardType={type === 'email' ? 'email-address' : 'default'}
        />
      </XStack>
      {/* Warnings etc */}
      <View
        style={{
          paddingVertical: s.$08,
          width: '100%',
          justifyContent: 'flex-start',
        }}
      >
        {children}
      </View>
    </>
  )
}
