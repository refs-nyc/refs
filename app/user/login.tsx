import { useState } from 'react'
import { useAppStore } from '@/features/stores'
import { s, c } from '@/features/style'
import { router } from 'expo-router'
import { View, Text, Pressable, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native'
import { FormFieldWithIcon } from '@/ui/inputs/FormFieldWithIcon'
import { Controller, useForm } from 'react-hook-form'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export default function Screen() {
  const { loginWithPassword } = useAppStore()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [serverError, setServerError] = useState('')
  const insets = useSafeAreaInsets()

  const {
    control,
    handleSubmit,
    watch,
    setFocus,
    formState,
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
    setServerError('')

    try {
      await loginWithPassword(data.email.trim().toLowerCase(), data.password)
      router.dismissAll()
    } catch (error: any) {
      setIsSubmitting(false)
      setServerError(error?.message || 'Login unsuccessful')
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.surface }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: insets.top + 16,
          paddingBottom: 160,
          paddingHorizontal: s.$2,
          justifyContent: 'space-between',
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Top section with header */}
        <View>
          {/* Refs Header */}
          <Text
            style={{
              fontSize: 24,
              fontWeight: 'bold',
              color: c.newDark,
              marginBottom: 50,
            }}
          >
            Refs
          </Text>

          {/* Centered Form Fields */}
          <View style={{ gap: s.$1, paddingVertical: s.$2 }}>
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
              render={({ field: { onChange, onBlur, value, ref } }) => (
                <View>
                  <FormFieldWithIcon
                    ref={ref}
                    type="email"
                    id="email"
                    placeholder="Email"
                    onChange={onChange}
                    onBlur={onBlur}
                    value={value || ''}
                    autoFocus={false}
                    autoCorrect={false}
                    returnKeyType="next"
                    onSubmitEditing={() => setFocus('password')}
                  />
                  {formState.errors.email && (
                    <Text style={{ color: c.accent, fontSize: 11, marginTop: 4, marginLeft: 4, fontFamily: 'InterSemiBold', fontWeight: '600' }}>
                      {formState.errors.email.message as string}
                    </Text>
                  )}
                </View>
              )}
            />

            <Controller
              control={control}
              name="password"
              rules={{
                required: 'Password is required',
              }}
              render={({ field: { onChange, onBlur, value, ref } }) => (
                <View>
                  <FormFieldWithIcon
                    ref={ref}
                    type="password"
                    id="password"
                    placeholder="Password"
                    onChange={onChange}
                    onBlur={onBlur}
                    value={value || ''}
                    autoFocus={false}
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={handleSubmit(onSubmit)}
                  />
                  {formState.errors.password && (
                    <Text style={{ color: c.accent, fontSize: 11, marginTop: 4, marginLeft: 4, fontFamily: 'InterSemiBold', fontWeight: '600' }}>
                      {formState.errors.password.message as string}
                    </Text>
                  )}
                </View>
              )}
            />

            {/* Server error message */}
            {serverError && (
              <Text style={{ color: c.accent, fontSize: 11, marginTop: -4, marginLeft: 4, textAlign: 'center', fontFamily: 'InterSemiBold', fontWeight: '600' }}>
                {serverError}
              </Text>
            )}

            {/* Log in button - part of form */}
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

            {/* Forgot password link */}
            <Pressable
              onPress={() => router.push('/user/forgot-password')}
              style={{ alignItems: 'center', paddingVertical: 8, marginTop: 4 }}
            >
              <Text
                style={{
                  color: c.muted,
                  fontSize: s.$09 - 2,
                  fontFamily: 'Inter',
                }}
              >
                Forgot password?
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Spacer */}
        <View />
      </ScrollView>

      {/* Register instead button - fixed at bottom */}
      <View
        style={{
          position: 'absolute',
          bottom: 30,
          left: s.$2,
          right: s.$2,
        }}
      >
        <Pressable
          onPress={() => router.replace('/onboarding')}
          style={{ alignItems: 'center', paddingVertical: 8 }}
        >
          <Text
            style={{
              color: c.muted,
              fontSize: s.$09,
              fontFamily: 'InterSemiBold',
              fontWeight: '600',
            }}
          >
            Register instead
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  )
}
