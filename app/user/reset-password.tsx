import { useState, useMemo } from 'react'
import { useLocalSearchParams, router } from 'expo-router'
import { View, Text, Pressable, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native'
import { FormFieldWithIcon } from '@/ui/inputs/FormFieldWithIcon'
import { Controller, useForm } from 'react-hook-form'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { s, c } from '@/features/style'
import { pocketbase } from '@/features/pocketbase'

const PASSWORD_MIN_LENGTH = 8

export default function ResetPasswordScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const insets = useSafeAreaInsets()

  const { control, handleSubmit, watch, setFocus, formState, getValues } = useForm({
    mode: 'onChange',
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  })

  const password = watch('password')
  const confirmPassword = watch('confirmPassword')

  const isFormValid = useMemo(
    () => 
      token && 
      password && 
      password.length >= PASSWORD_MIN_LENGTH && 
      confirmPassword &&
      password === confirmPassword,
    [token, password, confirmPassword]
  )

  const onSubmit = async (data: any) => {
    if (!isFormValid || isSubmitting || !token) return
    setIsSubmitting(true)
    setServerError(null)

    try {
      await pocketbase.collection('users').confirmPasswordReset(
        String(token),
        data.password,
        data.confirmPassword
      )
      setSuccess(true)
      // Navigate to login after a brief moment
      setTimeout(() => {
        router.replace('/user/login')
      }, 1200)
    } catch (error: any) {
      const message = error?.data?.message || error?.message || 'Reset failed. The link may be expired.'
      setServerError(message)
    } finally {
      setIsSubmitting(false)
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

          {success ? (
            <View>
              <Text
                style={{
                  fontSize: s.$09,
                  color: c.olive,
                  marginBottom: 24,
                  lineHeight: 22,
                  fontFamily: 'InterSemiBold',
                  fontWeight: '600',
                }}
              >
                ✓ Password updated successfully
              </Text>
              <Text
                style={{
                  fontSize: s.$09,
                  color: c.muted,
                  lineHeight: 22,
                }}
              >
                You can now sign in with your new password.
              </Text>
            </View>
          ) : (
            <>
              <Text
                style={{
                  fontSize: s.$09,
                  color: c.muted,
                  marginBottom: 50,
                  lineHeight: 22,
                }}
              >
                {!token
                  ? 'Missing or invalid reset token. Please open the link from your email again.'
                  : 'Choose a new password for your account.'}
              </Text>

              {/* Form */}
              {token && (
                <View style={{ gap: s.$1, paddingVertical: s.$2 }}>
                  <Controller
                    control={control}
                    name="password"
                    rules={{
                      required: 'Password is required',
                      minLength: {
                        value: PASSWORD_MIN_LENGTH,
                        message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
                      },
                    }}
                    render={({ field: { onChange, onBlur, value, ref } }) => (
                      <View>
                        <FormFieldWithIcon
                          ref={ref}
                          type="password"
                          id="password"
                          placeholder="New password"
                          onChange={onChange}
                          onBlur={onBlur}
                          value={value || ''}
                          autoFocus={true}
                          autoCorrect={false}
                          returnKeyType="next"
                          onSubmitEditing={() => setFocus('confirmPassword')}
                        />
                        {formState.errors.password && (
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
                            {formState.errors.password.message as string}
                          </Text>
                        )}
                      </View>
                    )}
                  />

                  <Controller
                    control={control}
                    name="confirmPassword"
                    rules={{
                      required: 'Please confirm password',
                      validate: (value) =>
                        value === getValues('password') || 'Passwords do not match',
                    }}
                    render={({ field: { onChange, onBlur, value, ref } }) => (
                      <View>
                        <FormFieldWithIcon
                          ref={ref}
                          type="passwordConfirm"
                          id="confirmPassword"
                          placeholder="Confirm new password"
                          onChange={onChange}
                          onBlur={onBlur}
                          value={value || ''}
                          autoFocus={false}
                          autoCorrect={false}
                          returnKeyType="done"
                          onSubmitEditing={handleSubmit(onSubmit)}
                        />
                        {formState.errors.confirmPassword && (
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
                            {formState.errors.confirmPassword.message as string}
                          </Text>
                        )}
                      </View>
                    )}
                  />

                  {/* Server error message */}
                  {serverError && (
                    <Text
                      style={{
                        color: c.accent,
                        fontSize: 11,
                        marginTop: -4,
                        marginLeft: 4,
                        textAlign: 'center',
                        fontFamily: 'InterSemiBold',
                        fontWeight: '600',
                      }}
                    >
                      {serverError}
                    </Text>
                  )}

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
                        Save password
                      </Text>
                    )}
                  </Pressable>
                </View>
              )}
            </>
          )}
        </View>

        {/* Spacer */}
        <View />
      </ScrollView>

      {/* Request new link button - fixed at bottom */}
      {!token && !success && (
        <View
          style={{
            position: 'absolute',
            bottom: 30,
            left: s.$2,
            right: s.$2,
          }}
        >
          <Pressable
            onPress={() => router.replace('/user/forgot-password')}
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
              Request new reset link
            </Text>
          </Pressable>
        </View>
      )}
    </KeyboardAvoidingView>
  )
}

