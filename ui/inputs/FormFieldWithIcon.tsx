import { useState, forwardRef } from 'react'
import { TextInput, Pressable, View } from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import { c, s } from '@/features/style'
import { XStack } from '@/ui/core/Stacks'
import { SizableText } from '../typo/SizableText'
import { GlobalError } from 'react-hook-form'

export const FormFieldWithIcon = forwardRef<TextInput, {
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
  placeholder: string
  onChange: (str: string) => void
  onBlur: () => void
  value: string
  autoFocus: boolean
  autoCorrect?: boolean
  returnKeyType?: 'done' | 'go' | 'next' | 'search' | 'send' | 'default'
  onSubmitEditing?: () => void
  onFocus?: () => void
}>(({
  type,
  id,
  placeholder,
  onChange,
  value = '',
  autoFocus = false,
  onBlur,
  autoCorrect = true,
  returnKeyType = 'default',
  onSubmitEditing,
  onFocus,
}, ref) => {
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
        ) : type === 'email' ? (
          <Ionicons size={s.$1} color={c.accent} name="mail" />
        ) : type === 'userName' ? (
          <Ionicons size={s.$1} color={c.accent} name="at" />
        ) : null}

        <TextInput
          ref={ref}
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
          autoCorrect={autoCorrect}
          autoFocus={autoFocus}
          placeholder={placeholder}
          placeholderTextColor={c.accent}
          onBlur={onBlur}
          onFocus={onFocus}
          onChangeText={onChange}
          value={value}
          keyboardType={type === 'email' ? 'email-address' : 'default'}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          blurOnSubmit={false}
          textContentType={
            type === 'email' ? 'emailAddress' :
            type === 'userName' ? 'username' :
            type === 'user' ? 'name' :
            'none'
          }
          autoComplete={
            type === 'email' ? 'email' :
            'off'
          }
          importantForAutofill={
            type === 'password' || type === 'passwordConfirm' ? 'no' : 'auto'
          }
          onLayout={() => {
            if (autoFocus) {
              // re-affirm focus to keep keyboard visible across step transitions
            }
          }}
        />
      </XStack>
    </>
  )
})

FormFieldWithIcon.displayName = 'FormFieldWithIcon'

export const ErrorView = ({ error }: { error?: GlobalError }) => {
  if (!error) return null
  return (
    <View
      style={{
        paddingVertical: s.$08,
        width: '100%',
        justifyContent: 'flex-start',
      }}
    >
      <SizableText style={styles.errorText}>{error.message}</SizableText>
    </View>
  )
}

const styles = {
  errorText: {
    fontSize: s.$08,
    fontFamily: 'Inter',
    textAlign: 'center',
    color: c.accent,
  },
}
