import { useState } from 'react'
import { useAppStore } from '@/features/stores'
import { s, c } from '@/features/style'
import { router } from 'expo-router'
import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native'
import { FormFieldWithIcon } from '@/ui/inputs/FormFieldWithIcon'
import { Controller, useForm } from 'react-hook-form'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export default function Screen() {
  const { loginWithPassword } = useAppStore()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const insets = useSafeAreaInsets()

  const {
    control,
    handleSubmit,
    watch,
    setError,
    formState: { errors },
  } = useForm({
    mode: 'onChange',
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const email = watch('email')
  const password = watch('password')

  const isFormValid = email && email.includes('@') && password && password.length >= 6

  const onSubmit = async (data: any) => {
    if (!isFormValid || isSubmitting) return
    setIsSubmitting(true)

    try {
      await loginWithPassword(data.email.trim().toLowerCase(), data.password)
      router.dismissAll()
    } catch (error: any) {
      setIsSubmitting(false)
      setError('password', { type: 'manual', message: 'Login unsuccessful' })
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.surface }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 40,
          paddingBottom: insets.bottom + 100,
          paddingHorizontal: s.$2,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Refs Header */}
        <Text
          style={{
            fontSize: 24,
            fontWeight: 'bold',
            color: c.newDark,
            marginBottom: 40,
          }}
        >
          Refs
        </Text>

        {/* Form Fields */}
        <View style={{ gap: s.$1 }}>
          <Controller
            control={control}
            name="email"
            rules={{
              required: 'Email is required',
              pattern: {
                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: 'Invalid email address',
              },
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <FormFieldWithIcon
                type="email"
                id="email"
                placeholder="Email"
                onChange={onChange}
                onBlur={onBlur}
                value={value || ''}
                autoFocus={false}
                autoCorrect={false}
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            rules={{
              required: 'Password is required',
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <FormFieldWithIcon
                type="password"
                id="password"
                placeholder="Password"
                onChange={onChange}
                onBlur={onBlur}
                value={value || ''}
                autoFocus={false}
                autoCorrect={false}
              />
            )}
          />

          {errors.password && (
            <Text style={{ color: c.accent, fontSize: s.$08, textAlign: 'center' }}>
              {errors.password.message}
            </Text>
          )}
        </View>

        {/* Register instead button */}
        <Pressable
          onPress={() => router.push('/user/register')}
          style={{ marginTop: s.$2, alignItems: 'center' }}
        >
          <Text
            style={{
              color: c.muted,
              fontSize: s.$09,
              fontFamily: 'Inter',
            }}
          >
            Register instead
          </Text>
        </Pressable>
      </ScrollView>

      {/* Log in button - fixed at bottom */}
      <View
        style={{
          position: 'absolute',
          bottom: insets.bottom + 20,
          left: s.$2,
          right: s.$2,
        }}
      >
        <Pressable
          onPress={handleSubmit(onSubmit)}
          disabled={!isFormValid || isSubmitting}
          style={{
            backgroundColor: c.accent,
            paddingVertical: 18,
            borderRadius: s.$12,
            alignItems: 'center',
            opacity: isFormValid && !isSubmitting ? 1 : 0.4,
          }}
        >
          {isSubmitting ? (
            <ActivityIndicator color={c.surface} />
          ) : (
            <Text
              style={{
                color: c.surface,
                fontSize: s.$1,
                fontFamily: 'InterBold',
                fontWeight: '700',
              }}
            >
              Log in
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  )
}
