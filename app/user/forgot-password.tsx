import { useState } from 'react'
import { useLocalSearchParams, router } from 'expo-router'
import { View, Text, Pressable, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native'
import { FormFieldWithIcon } from '@/ui/inputs/FormFieldWithIcon'
import { Controller, useForm } from 'react-hook-form'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { s, c } from '@/features/style'
import { pocketbase } from '@/features/pocketbase'

export default function ForgotPasswordScreen() {
  const { email: prefillEmail } = useLocalSearchParams<{ email?: string }>()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const insets = useSafeAreaInsets()

  const { control, handleSubmit, watch, setFocus, formState } = useForm({
    mode: 'onChange',
    defaultValues: {
      email: prefillEmail || '',
    },
  })

  const email = watch('email')
  const isFormValid = email && email.includes('@')

  const onSubmit = async (data: any) => {
    if (!isFormValid || isSubmitting) return
    setIsSubmitting(true)

    try {
      const normalizedEmail = data.email.trim().toLowerCase()
      // Always show success to prevent account enumeration
      await pocketbase.collection('users').requestPasswordReset(normalizedEmail)
    } catch (err) {
      // Silently catch errors - we don't want to reveal if account exists
      console.log('Password reset request:', err)
    } finally {
      setIsSubmitting(false)
      setSent(true)
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
              marginBottom: 12,
            }}
          >
            Refs
          </Text>

          <Text
            style={{
              fontSize: s.$09,
              color: c.muted,
              marginBottom: 50,
              lineHeight: 22,
            }}
          >
            {sent 
              ? "If an account exists with that email, we've sent a reset link. Check your inbox (and spam)."
              : "Enter your email and we'll send you a link to reset your password."}
          </Text>

          {/* Form */}
          {!sent && (
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
                      autoFocus={!prefillEmail}
                      autoCorrect={false}
                      returnKeyType="done"
                      onSubmitEditing={handleSubmit(onSubmit)}
                    />
                    {formState.errors.email && (
                      <Text
                        style={{
                          color: c.accent,
                          fontSize: 11,
                          marginTop: 4,
                          marginLeft: 4,
                          fontFamily: 'InterSemiBold',
                          fontWeight: '600',
                        }}
                      >
                        {formState.errors.email.message as string}
                      </Text>
                    )}
                  </View>
                )}
              />

              {/* Submit button */}
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
                    Send reset link
                  </Text>
                )}
              </Pressable>
            </View>
          )}

          {/* Success state - show done button */}
          {sent && (
            <Pressable
              onPress={() => router.replace('/user/login')}
              style={{
                backgroundColor: c.accent,
                paddingVertical: 18,
                borderRadius: s.$12,
                alignItems: 'center',
                marginTop: s.$2,
              }}
            >
              <Text
                style={{
                  color: c.surface,
                  fontSize: s.$1,
                  fontFamily: 'InterBold',
                  fontWeight: '700',
                }}
              >
                Back to login
              </Text>
            </Pressable>
          )}
        </View>

        {/* Spacer */}
        <View />
      </ScrollView>

      {/* Back to login button - fixed at bottom */}
      {!sent && (
        <View
          style={{
            position: 'absolute',
            bottom: 30,
            left: s.$2,
            right: s.$2,
          }}
        >
          <Pressable
            onPress={() => router.back()}
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
              Back to login
            </Text>
          </Pressable>
        </View>
      )}
    </KeyboardAvoidingView>
  )
}

