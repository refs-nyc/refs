import React, { useState, useEffect, useRef } from 'react'
import { View, Text, Pressable, ScrollView, Dimensions, ActivityIndicator, Keyboard, Platform, KeyboardAvoidingView } from 'react-native'
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

export function UnifiedOnboarding() {
  const { register: registerUser, setJustOnboarded } = useAppStore() as any
  const form = useForm({ mode: 'onChange', shouldUnregister: false })
  const { control, handleSubmit, formState, getValues, watch, setFocus } = form
  const insets = useSafeAreaInsets()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [recentUsers, setRecentUsers] = useState<any[]>([])
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  const scrollViewRef = useRef<ScrollView>(null)
  const [currentFieldIndex, setCurrentFieldIndex] = useState(0)

  // Watch all fields to enable/disable button
  const fullName = watch('fullName')
  const email = watch('email')
  const password = watch('password')
  const confirmPassword = watch('confirmPassword')

  // Handle keyboard show/hide and scroll to active field
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height)
        // Scroll to show all forms AND the "Looks good" button above keyboard
        setTimeout(() => {
          scrollViewRef.current?.scrollTo({ y: 105, animated: true })
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
    password.length >= 6 &&
    confirmPassword &&
    password === confirmPassword

  // Fetch 3 most recent users for avatars
  useEffect(() => {
    const fetchRecentUsers = async () => {
      try {
        const res = await pocketbase.collection('users').getList(1, 3, {
          sort: '-created',
          fields: 'id,image,avatar_url',
        })
        setRecentUsers(res.items || [])
      } catch (e) {
        console.warn('Failed to fetch recent users', e)
      }
    }
    fetchRecentUsers()
  }, [])

  const onSubmit = async (data: any) => {
    if (!isFormValid || isSubmitting) return
    setIsSubmitting(true)

    try {
      const nameParts = data.fullName.trim().split(' ')
      const firstName = nameParts[0] || ''
      const lastName = nameParts.slice(1).join(' ') || ''

      await registerUser({
        email: data.email.trim().toLowerCase(),
        password: data.password,
        firstName,
        lastName,
      })

      setJustOnboarded(true)
      // Registration successful, app will auto-navigate
    } catch (error: any) {
      console.error('Registration failed:', error)
      alert(error?.message || 'Registration failed. Please try again.')
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
              marginBottom: 50,
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
          <View
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
            <View style={{ flexDirection: 'row', marginLeft: 10 }}>
              {recentUsers.slice(0, 3).map((user, idx) => {
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
            </View>
        </View>
        </View>
        </View>

        {/* Centered Form Fields */}
        <View style={{ gap: s.$1, paddingVertical: s.$2 }}>
          <Controller
            control={control}
            name="fullName"
            rules={{ required: 'Full name is required' }}
            render={({ field: { onChange, onBlur, value, ref } }) => (
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
            render={({ field: { onChange, onBlur, value, ref } }) => (
              <FormFieldWithIcon
                ref={ref}
                type="email"
                id="email"
                placeholder="Email"
                onChange={onChange}
                onBlur={() => {
                  setCurrentFieldIndex(1)
                  onBlur()
                }}
                value={value || ''}
                autoFocus={false}
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => {
                  setCurrentFieldIndex(2)
                  setFocus('password')
                }}
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            rules={{
              required: 'Password is required',
              minLength: { value: 6, message: 'Password must be at least 6 characters' },
            }}
            render={({ field: { onChange, onBlur, value, ref } }) => (
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
            )}
          />

          {/* Looks good button - styled like a form field */}
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
                fontFamily: 'Inter',
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
