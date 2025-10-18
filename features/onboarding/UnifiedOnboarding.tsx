import React, { useState, useEffect, useRef } from 'react'
import { View, Text, Pressable, ScrollView, Dimensions, ActivityIndicator, Keyboard, Platform, KeyboardAvoidingView, Animated } from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { s, c } from '@/features/style'
import { Controller, useForm } from 'react-hook-form'
import { FormFieldWithIcon } from '@/ui/inputs/FormFieldWithIcon'
import { useAppStore } from '@/features/stores'
import { pocketbase } from '@/features/pocketbase'
import { Image } from 'expo-image'
import Svg, { Circle } from 'react-native-svg'

const win = Dimensions.get('window')
const PASSWORD_MIN_LENGTH = 8

export function UnifiedOnboarding() {
  const { register: registerUser, updateStagedUser, setJustOnboarded } = useAppStore() as any
  const form = useForm({
    mode: 'onBlur',
    reValidateMode: 'onBlur',
    shouldUnregister: false,
  })
  const { control, handleSubmit, formState, getValues, watch, setFocus } = form
  const insets = useSafeAreaInsets()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [recentUsers, setRecentUsers] = useState<any[]>([])
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  const scrollViewRef = useRef<ScrollView>(null)
  const [currentFieldIndex, setCurrentFieldIndex] = useState(0)
  const [serverError, setServerError] = useState<string>('')
  const [emailAlreadyExists, setEmailAlreadyExists] = useState(false)
  const [isCheckingEmail, setIsCheckingEmail] = useState(false)
  const pillScale = useRef(new Animated.Value(1)).current
  const [displayedUsers, setDisplayedUsers] = useState<any[]>([])
  const [allUsers, setAllUsers] = useState<any[]>([])
  const avatarOpacity = useRef(new Animated.Value(1)).current

  // Watch all fields to enable/disable button
  const fullName = watch('fullName')
  const email = watch('email')
  const password = watch('password')
  const confirmPassword = watch('confirmPassword')

  const refocusEmailField = () => {
    setCurrentFieldIndex(1)
    setTimeout(() => setFocus('email'), 0)
  }

  useEffect(() => {
    setEmailAlreadyExists(false)
    setIsCheckingEmail(false)
  }, [email])

  // Handle keyboard show/hide and scroll to active field
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height)
        // Scroll to show all forms and the "Looks good" button above keyboard
        setTimeout(() => {
          scrollViewRef.current?.scrollTo({ y: 145, animated: true })
        }, 100)
      }
    )
    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0)
        scrollViewRef.current?.scrollTo({ y: 0, animated: true })
      }
    )

    return () => {
      keyboardWillShow.remove()
      keyboardWillHide.remove()
    }
  }, [currentFieldIndex])

  const isFormValid =
    fullName &&
    fullName.trim().length > 0 &&
    email &&
    email.includes('@') &&
    password &&
    password.length >= PASSWORD_MIN_LENGTH &&
    confirmPassword &&
    password === confirmPassword

  // Fetch users for avatars
  useEffect(() => {
    const fetchRecentUsers = async () => {
      try {
        const res = await pocketbase.collection('users').getList(1, 20, {
          sort: '-created',
          fields: 'id,image,avatar_url',
        })
        const users = res.items || []
        setAllUsers(users)
        setDisplayedUsers(users.slice(0, 3))
      } catch (e) {
        console.warn('Failed to fetch recent users', e)
      }
    }
    fetchRecentUsers()
  }, [])

  const onSubmit = async (data: any) => {
    if (!isFormValid || isSubmitting) return
    setIsSubmitting(true)
    setServerError('')
    setEmailAlreadyExists(false)

    try {
      // Validate all required fields
      if (!data.email || !data.email.trim()) {
        setServerError('Email is required')
        setIsSubmitting(false)
        return
      }
      if (!data.password || data.password.length < PASSWORD_MIN_LENGTH) {
        setServerError(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
        setIsSubmitting(false)
        return
      }
      if (!data.fullName || !data.fullName.trim()) {
        setServerError('Full name is required')
        setIsSubmitting(false)
        return
      }

      const nameParts = data.fullName.trim().split(' ')
      const firstName = nameParts[0] || ''
      const lastName = nameParts.slice(1).join(' ') || ''

      // First, stage the user data
      updateStagedUser({
        email: data.email.trim().toLowerCase(),
        password: data.password,
        passwordConfirm: data.confirmPassword,
        firstName,
        lastName,
      })

      // Then call register (which reads from stagedUser)
      await registerUser()

      setJustOnboarded(true)
      // Registration successful, app will auto-navigate
    } catch (error: any) {
      console.error('Registration failed:', error)
      const emailError = error?.data?.data?.email || error?.response?.data?.email
      const emailMessage = typeof emailError?.message === 'string' ? emailError.message.toLowerCase() : ''
      const duplicateEmail =
        emailError?.code === 'validation_not_unique' ||
        emailMessage.includes('already') ||
        emailMessage.includes('exists')

      if (duplicateEmail) {
        setEmailAlreadyExists(true)
        refocusEmailField()
        return
      }

      setServerError(error?.message || 'Registration failed. Please try again.')
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
        ref={scrollViewRef}
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
        {/* Top section with header and pill */}
        <View>
          {/* Refs Header - positioned to match navigation bar */}
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

          {/* Directory for Edge Patagonia pill */}
          <View>
          <Text
            style={{
              color: c.muted,
              fontSize: s.$09,
              marginBottom: (s.$075 as number) + 3,
              fontFamily: 'Inter',
            }}
          >
            Directory for
          </Text>
          <Pressable
            onPressIn={() => {
              // Immediate press down
              Animated.spring(pillScale, {
                toValue: 0.95,
                damping: 14,
                stiffness: 180,
                useNativeDriver: true,
              }).start()
            }}
            onPressOut={() => {
              // Immediate spring back
              Animated.spring(pillScale, {
                toValue: 1,
                damping: 14,
                stiffness: 220,
                useNativeDriver: true,
              }).start()
            }}
            onPress={() => {
              // Avatar shuffle animation
              if (allUsers.length < 4) return

              // Fade out
              Animated.timing(avatarOpacity, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
              }).start(() => {
                // Get random 3 users that aren't currently displayed
                const currentIds = displayedUsers.map(u => u.id)
                const availableUsers = allUsers.filter(u => !currentIds.includes(u.id))
                
                if (availableUsers.length >= 3) {
                  // Shuffle and pick 3
                  const shuffled = [...availableUsers].sort(() => Math.random() - 0.5)
                  setDisplayedUsers(shuffled.slice(0, 3))
                } else {
                  // Not enough different users, just shuffle all
                  const shuffled = [...allUsers].sort(() => Math.random() - 0.5)
                  setDisplayedUsers(shuffled.slice(0, 3))
                }

                // Fade in
                Animated.timing(avatarOpacity, {
                  toValue: 1,
                  duration: 200,
                  useNativeDriver: true,
                }).start()
              })
            }}
          >
            <Animated.View
              style={{
                borderWidth: 1.5,
                borderColor: c.newDark,
                borderRadius: 27,
                paddingVertical: 18,
                paddingHorizontal: 20,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: c.surface,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.12,
                shadowRadius: 12,
                elevation: 5,
                transform: [{ scale: pillScale }],
              }}
            >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              {/* Venn diagram icon */}
              <Svg width={28} height={18} viewBox="0 0 64 40">
                <Circle cx="24" cy="20" r="16" fill="none" stroke={c.newDark} strokeWidth="2.5" />
                <Circle cx="40" cy="20" r="16" fill="none" stroke={c.newDark} strokeWidth="2.5" />
              </Svg>
              <Text
                style={{
                  fontSize: (s.$09 as number) + 6,
                  fontFamily: 'InterBold',
                  fontWeight: '700',
                  color: c.newDark,
                }}
              >
                Edge Patagonia
              </Text>
            </View>

            {/* Avatars */}
            <Animated.View style={{ flexDirection: 'row', marginLeft: 10, opacity: avatarOpacity }}>
              {displayedUsers.map((user, idx) => {
                const avatarUrl = user.image || user.avatar_url
                return (
                  <View
                    key={user.id}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      marginLeft: idx > 0 ? -8 : 0,
                      borderWidth: 2,
                      borderColor: c.surface,
                      overflow: 'hidden',
                      backgroundColor: c.surface2,
                    }}
                  >
                    {avatarUrl ? (
                      <Image
                        source={avatarUrl}
                        style={{ width: '100%', height: '100%' }}
                        contentFit="cover"
                        transition={0}
                      />
                    ) : (
                      <View style={{ width: '100%', height: '100%', backgroundColor: c.surface2 }} />
                    )}
              </View>
                )
              })}
            </Animated.View>
          </Animated.View>
          </Pressable>
        </View>
        </View>

        {/* Centered Form Fields */}
        <View style={{ gap: s.$1, marginTop: s.$3 }}>
          <Controller
            control={control}
            name="fullName"
            rules={{ required: 'Full name is required' }}
            render={({ field: { onChange, onBlur, value, ref } }) => (
              <View>
                <FormFieldWithIcon
                  ref={ref}
                  type="user"
                  id="fullName"
                  placeholder="Full Name"
                  onChange={onChange}
                  onBlur={() => {
                    setCurrentFieldIndex(0)
                    onBlur()
                  }}
                  value={value || ''}
                  autoFocus={false}
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => {
                    setCurrentFieldIndex(1)
                    setFocus('email')
                  }}
                />
                {formState.errors.fullName && (
                  <Text style={{ color: c.accent, fontSize: 11, marginTop: 4, marginLeft: 4, fontFamily: 'InterSemiBold', fontWeight: '600' }}>
                    {formState.errors.fullName.message as string}
                  </Text>
                )}
              </View>
            )}
          />

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
            render={({ field: { onChange, onBlur, value, ref } }) => {
              const handleEmailBlur = async () => {
                setCurrentFieldIndex(1)
                onBlur()
                const normalized = (value || '').trim().toLowerCase()
                if (!normalized || !normalized.includes('@')) {
                  setEmailAlreadyExists(false)
                  return
                }
                setIsCheckingEmail(true)
                let duplicate = false
                try {
                  await pocketbase.collection('users').getFirstListItem(`email = "${normalized}"`)
                  setEmailAlreadyExists(true)
                  duplicate = true
                } catch (err: any) {
                  if (err?.status === 404) {
                    setEmailAlreadyExists(false)
                  } else {
                    console.warn('Email availability check failed', err)
                  }
                } finally {
                  setIsCheckingEmail(false)
                  if (duplicate) {
                    refocusEmailField()
                  }
                }
              }

              return (
                <View>
                  <FormFieldWithIcon
                    ref={ref}
                    type="email"
                    id="email"
                    placeholder="Email"
                    onChange={onChange}
                    onBlur={handleEmailBlur}
                    value={value || ''}
                    autoFocus={false}
                    autoCorrect={false}
                    returnKeyType="next"
                    onSubmitEditing={() => {
                      if (emailAlreadyExists) {
                        refocusEmailField()
                        return
                      }
                      setCurrentFieldIndex(2)
                      setFocus('password')
                    }}
                  />
                  {formState.errors.email && (
                    <Text style={{ color: c.accent, fontSize: 11, marginTop: 4, marginLeft: 4, fontFamily: 'InterSemiBold', fontWeight: '600' }}>
                      {formState.errors.email.message as string}
                    </Text>
                  )}
                  {emailAlreadyExists && !isCheckingEmail && (
                    <View style={{ gap: s.$075, marginTop: s.$075 }}>
                      <Text
                        style={{
                          color: c.accent,
                          fontSize: 12,
                          fontFamily: 'InterSemiBold',
                          fontWeight: '600',
                        }}
                      >
                        This email is already registered.
                      </Text>
                      <View
                        style={{
                          flexDirection: 'row',
                          gap: s.$075,
                        }}
                      >
                        <Pressable
                          onPress={() => router.replace('/user/login')}
                          style={{
                            flex: 1,
                            backgroundColor: c.surface2,
                            paddingVertical: 14,
                            borderRadius: s.$12,
                            alignItems: 'center',
                          }}
                        >
                          <Text
                            style={{
                              color: c.newDark,
                              fontSize: s.$09,
                              fontFamily: 'InterSemiBold',
                              fontWeight: '600',
                            }}
                          >
                            Log In
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={() => router.push({ pathname: '/user/forgot-password', params: { email: value || '' } })}
                          style={{
                            flex: 1,
                            backgroundColor: c.surface2,
                            paddingVertical: 14,
                            borderRadius: s.$12,
                            alignItems: 'center',
                          }}
                        >
                          <Text
                            style={{
                              color: c.newDark,
                              fontSize: s.$09,
                              fontFamily: 'InterSemiBold',
                              fontWeight: '600',
                            }}
                          >
                            Reset Password
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  )}
                </View>
              )
            }}
          />

          <Controller
            control={control}
            name="password"
            rules={{
              required: 'Password is required',
              minLength: { value: PASSWORD_MIN_LENGTH, message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters` },
            }}
            render={({ field: { onChange, onBlur, value, ref } }) => (
              <View>
                <FormFieldWithIcon
                  ref={ref}
                  type="password"
                  id="password"
                  placeholder="Password"
                  onChange={onChange}
                  onBlur={() => {
                    setCurrentFieldIndex(2)
                    onBlur()
                  }}
                  value={value || ''}
                  autoFocus={false}
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => {
                    setCurrentFieldIndex(3)
                    setFocus('confirmPassword')
                  }}
                />
                {formState.errors.password && (
                  <Text style={{ color: c.accent, fontSize: 11, marginTop: 4, marginLeft: 4, fontFamily: 'InterSemiBold', fontWeight: '600' }}>
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
              validate: (value) => value === getValues('password') || 'Passwords do not match',
            }}
            render={({ field: { onChange, onBlur, value, ref } }) => (
              <View>
                <FormFieldWithIcon
                  ref={ref}
                  type="passwordConfirm"
                  id="confirmPassword"
                  placeholder="Password confirmation"
                  onChange={onChange}
                  onBlur={() => {
                    setCurrentFieldIndex(3)
                    onBlur()
                  }}
                  value={value || ''}
                  autoFocus={false}
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit(onSubmit)}
                />
                {formState.errors.confirmPassword && (
                  <Text style={{ color: c.accent, fontSize: 11, marginTop: 4, marginLeft: 4, fontFamily: 'InterSemiBold', fontWeight: '600' }}>
                    {formState.errors.confirmPassword.message as string}
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

          {/* Looks good button - styled like a form field */}
          <Pressable
            onPress={handleSubmit(onSubmit)}
            disabled={!isFormValid || isSubmitting}
            style={{
              marginTop: (s.$1 as number) + 6,
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
                Looks good
              </Text>
            )}
          </Pressable>
        </View>

      </ScrollView>

      {/* Log in instead button - fixed at bottom, only show when keyboard is hidden */}
      {keyboardHeight === 0 && (
        <View
          style={{
            position: 'absolute',
            bottom: 30,
            left: s.$2,
            right: s.$2,
          }}
        >
          <Pressable
            onPress={() => router.push('/user/login')}
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
              Log in instead
            </Text>
          </Pressable>
        </View>
      )}
    </KeyboardAvoidingView>
  )
}
