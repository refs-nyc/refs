import React, { useMemo, useRef, useState, useEffect } from 'react'
import { View, Text, Keyboard, Pressable, Animated, Dimensions, Switch } from 'react-native'
import { router } from 'expo-router'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { s, c } from '@/features/style'
import { LoopingFadeCarousel } from '@/ui/display/LoopingFadeCarousel'
import { DetailsDemo } from '@/ui/display/DetailsDemo'
import { MiniGridDemo } from '@/ui/display/MiniGridDemo'
import { PinnedProfileStep } from '@/ui/profiles/PinnedProfileStep'
import { Controller, useForm } from 'react-hook-form'
import { FormFieldWithIcon } from '@/ui/inputs/FormFieldWithIcon'
import { AvatarPicker } from '@/ui/inputs/AvatarPicker'
import { DeviceLocation } from '@/ui/inputs/DeviceLocation'
import { useAppStore } from '@/features/stores'
import { registerForPushNotificationsAsync } from '@/ui/notifications/utils'
import { pocketbase } from '@/features/pocketbase'

type StepId =
  | 'firstName'
  | 'lastName'
  | 'email'
  | 'password'
  | 'confirmPassword'
  | 'neighborhood'
  | 'photo'
  | 'notifications'

export function UnifiedOnboarding() {
  const { updateStagedUser, register, updateUser, user, getUserByEmail, setJustOnboarded, setSuppressHomeRedirect } = useAppStore() as any
  const [step, setStep] = useState<StepId>('firstName')
  const form = useForm({ mode: 'onSubmit', shouldUnregister: false })
  const { control, handleSubmit, formState, getValues, trigger, setValue, watch } = form
  const insets = useSafeAreaInsets()

  const win = Dimensions.get('window')
  const [totalUsers, setTotalUsers] = useState<number | null>(null)

  // Photo step staged fade for header then picker
  const photoTextOpacity = useRef(new Animated.Value(0)).current
  const photoPickerOpacity = useRef(new Animated.Value(0)).current
  const notifTextOpacity = useRef(new Animated.Value(0)).current
  const notifContentOpacity = useRef(new Animated.Value(0)).current
  const [pushAccepted, setPushAccepted] = useState(false)

  useEffect(() => {
    if (step === 'photo') {
      photoTextOpacity.setValue(0)
      photoPickerOpacity.setValue(0)
      Animated.timing(photoTextOpacity, { toValue: 1, duration: 350, useNativeDriver: true }).start(() => {
        setTimeout(() => {
          Animated.timing(photoPickerOpacity, { toValue: 1, duration: 700, useNativeDriver: true }).start()
        }, 750)
      })
    } else {
      photoTextOpacity.setValue(0)
      photoPickerOpacity.setValue(0)
    }
  }, [step, photoTextOpacity, photoPickerOpacity])

  useEffect(() => {
    if (step === 'notifications') {
      notifTextOpacity.setValue(0)
      notifContentOpacity.setValue(0)
      Animated.timing(notifTextOpacity, { toValue: 1, duration: 350, useNativeDriver: true }).start(() => {
        setTimeout(() => {
          Animated.timing(notifContentOpacity, { toValue: 1, duration: 700, useNativeDriver: true }).start()
        }, 750)
      })
    } else {
      notifTextOpacity.setValue(0)
      notifContentOpacity.setValue(0)
    }
  }, [step, notifTextOpacity, notifContentOpacity])

  useEffect(() => {
    // Fetch total user count when entering notifications step
    const fetchCount = async () => {
      try {
        const res = await pocketbase.collection('users').getList(1, 1)
        // PocketBase returns totalItems on paginated list
        // @ts-ignore
        const count = (res as any).totalItems ?? 0
        setTotalUsers(count)
      } catch (e) {
        console.warn('Failed to fetch user count', e)
        setTotalUsers(null)
      }
    }
    if (step === 'notifications') fetchCount()
  }, [step])

  // Staggered slides as proper components to avoid hook-order issues
  const BringTogetherSlide = () => {
    const textOpacity = useRef(new Animated.Value(0)).current
    const contentOpacity = useRef(new Animated.Value(0)).current
    useEffect(() => {
      const gapDelay = 750 // slightly later fade for content
      Animated.timing(textOpacity, { toValue: 1, duration: 350, useNativeDriver: true }).start(() => {
        setTimeout(() => {
          Animated.timing(contentOpacity, { toValue: 1, duration: 700, useNativeDriver: true }).start()
        }, gapDelay)
      })
    }, [textOpacity, contentOpacity])
    return (
      <View style={{ marginTop: -70 }}>
        <Animated.Text
          key="intro"
          style={{ color: c.accent, fontSize: 24, marginBottom: s.$2, opacity: textOpacity, transform: [{ translateY: 10 }] }}
        >
          <Text style={{ fontFamily: 'InterSemiBold' }}>Refs</Text> is a place to bring it all together
        </Animated.Text>
        <Animated.View style={{ opacity: contentOpacity }}>
          <View style={{ alignItems: 'flex-start', paddingTop: s.$075, paddingLeft: 0, marginTop: -5 }}>
            <View style={{ width: '100%', height: win.width * 0.54, overflow: 'hidden', opacity: 0.95, alignSelf: 'flex-start' }}>
              <DetailsDemo scale={0.8} />
            </View>
          </View>
        </Animated.View>
      </View>
    )
  }

  const SyllabusSlide = () => {
    const textOpacity = useRef(new Animated.Value(0)).current
    const contentOpacity = useRef(new Animated.Value(0)).current
    useEffect(() => {
      const gapDelay = 750 // slightly later fade for content
      Animated.timing(textOpacity, { toValue: 1, duration: 350, useNativeDriver: true }).start(() => {
        setTimeout(() => {
          Animated.timing(contentOpacity, { toValue: 1, duration: 700, useNativeDriver: true }).start()
        }, gapDelay)
      })
    }, [textOpacity, contentOpacity])
    return (
      <View style={{ marginTop: -70 }}>
        <Animated.Text
          key="syllabus"
          style={{ color: c.accent, fontSize: 24, marginBottom: s.$2, opacity: textOpacity, transform: [{ translateY: 15 }] }}
        >
          A syllabus for people reading <Text style={{ fontStyle: 'italic' }}>you</Text>
        </Animated.Text>
        <Animated.View style={{ opacity: contentOpacity }}>
          <View style={{ alignItems: 'center', paddingTop: s.$075, paddingLeft: 0, marginTop: -5 }}>
            <View style={{ transform: [{ scale: 0.9 }] }}>
              <MiniGridDemo />
            </View>
          </View>
        </Animated.View>
      </View>
    )
  }

  const slides = useMemo(() => {
    // Build the "Apps for our ..." composite line with staged fades
    const AppsLine = () => {
      const o1 = useRef(new Animated.Value(0)).current
      const o2 = useRef(new Animated.Value(0)).current
      const o3 = useRef(new Animated.Value(0)).current
      const o4 = useRef(new Animated.Value(0)).current
      React.useEffect(() => {
        const d = 745
        const p = 500
        Animated.sequence([
          Animated.timing(o1, { toValue: 1, duration: d, useNativeDriver: true }),
          Animated.delay(p),
          Animated.timing(o2, { toValue: 1, duration: d, useNativeDriver: true }),
          Animated.delay(p),
          Animated.timing(o3, { toValue: 1, duration: d, useNativeDriver: true }),
          Animated.delay(p),
          Animated.timing(o4, { toValue: 1, duration: d, useNativeDriver: true }),
        ]).start()
      }, [])
      const textStyle = { color: c.accent, fontSize: 24 } as const
      return (
        <View style={{ flexDirection: 'column' }}>
          <Animated.Text style={[textStyle, { opacity: o1 }]}>Apps for our photos,</Animated.Text>
          <Animated.Text style={[textStyle, { opacity: o2 }]}>fleeting thoughts,</Animated.Text>
          <Animated.Text style={[textStyle, { opacity: o3 }]}>books,</Animated.Text>
          <Animated.Text style={[textStyle, { opacity: o4 }]}>...beers?</Animated.Text>
        </View>
      )
    }

    return [
      { content: 'The internet splits us into pieces', durationMs: 3750 },
      { content: <AppsLine />, durationMs: 5500 },
      { content: 'so we only ever see one side of each other', durationMs: Math.round(3750 * 0.8) },
      { content: <BringTogetherSlide />, durationMs: 8500 },
      { content: <SyllabusSlide />, durationMs: 3750 * 1.5 },
      { content: 'and instead of waiting for an algorithm to tell you who to meet...', durationMs: Math.round(3750 * 0.8) },
      { content: 'you can follow the paths your refs create', durationMs: 3750 },
    ]
  }, [])

  const locationValue = watch('location') as any
  const imageValue = watch('image') as any
  const isLocationSelected = Boolean(locationValue?.location)

  const goNext = async () => {
    const order: StepId[] = [
      'firstName',
      'lastName',
      'email',
      'password',
      'confirmPassword',
      'neighborhood',
      'notifications',
      'photo',
    ]
    const i = order.indexOf(step)
    if (i < order.length - 1) setStep(order[i + 1])
  }

  const goBack = () => {
    const order: StepId[] = [
      'firstName',
      'lastName',
      'email',
      'password',
      'confirmPassword',
      'neighborhood',
      'notifications',
      'photo',
    ]
    const i = order.indexOf(step)
    if (i > 0) setStep(order[i - 1])
  }

  const slideValue = useRef(new Animated.Value(0)).current
  const animateTo = (dir: 'next' | 'back') => {
    const out = dir === 'next' ? -win.width : win.width
    const inFrom = dir === 'next' ? win.width : -win.width
    // slide current out
    Keyboard.dismiss() // ensure we control keyboard state; will be re-focused by next field
    Animated.timing(slideValue, { toValue: out, duration: 240, useNativeDriver: true }).start(() => {
      // instantly move to off-screen start and animate in
      slideValue.setValue(inFrom)
      Animated.timing(slideValue, { toValue: 0, duration: 240, useNativeDriver: true }).start()
    })
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Global back button in top-left */}
      {step !== 'firstName' && (
        <Pressable onPress={() => { animateTo('back'); goBack() }} style={{ position: 'absolute', top: insets.top - 3, left: (s as any).$2 - 6, zIndex: 100 }} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color="#9BA6A0" />
        </Pressable>
      )}

      {/* Top carousel (last visible step: neighborhood) or photo header */}
      {step === 'notifications' ? (
        <View key="notifications" style={{ flex: 1, paddingTop: 150, paddingHorizontal: s.$2 }}>
          <Animated.Text style={{ color: c.accent, fontSize: 24, opacity: notifTextOpacity, textAlign: 'left' }}>Now, turn on push notifications</Animated.Text>
          <Animated.View style={{ opacity: notifContentOpacity }}>
            <View style={{ alignItems: 'center', paddingTop: s.$075, paddingLeft: 0, marginTop: 40 }}>
              <View style={{ alignItems: 'center' }}>
                <Switch
                  trackColor={{ false: c.surface, true: c.accent2 }}
                  thumbColor={c.white}
                  ios_backgroundColor={c.surface}
                  onValueChange={async (val) => {
                    // Optimistically toggle UI
                    setPushAccepted(val)
                    if (val) {
                      const token = await registerForPushNotificationsAsync()
                      if (token && user) {
                        try {
                          await updateUser({ pushToken: token })
                        } catch {}
                      }
                    } else {
                      // Optional: clear token server-side if user turns it off here
                      try {
                        if (user) await updateUser({ pushToken: '' as any })
                      } catch {}
                    }
                  }}
                  value={pushAccepted}
                />
                <Text style={{ fontFamily: 'System', fontWeight: '400', fontSize: 14, color: '#B0B0B0', opacity: 0.5, marginTop: s.$1 }}>(you can turn these off anytime)</Text>
              </View>
            </View>
          </Animated.View>
        </View>
      ) : step === 'photo' ? (
        <View style={{ paddingTop: 150, paddingHorizontal: s.$2 }}>
          <Animated.Text style={{ color: c.accent, fontSize: 24, opacity: photoTextOpacity }}>And finally, add a profile photo</Animated.Text>
        </View>
      ) : (
        <View style={{ flex: 1, paddingTop: 150, paddingHorizontal: s.$2, paddingBottom: 80 }}>
          <LoopingFadeCarousel slides={slides} freezeIndex={slides.length - 1} />
        </View>
      )}

      {/* Bottom pinned form */}
      <PinnedProfileStep
        canGoBack={step !== 'firstName'}
        onBack={() => { animateTo('back'); goBack() }}
         onNext={async () => {
           if (step === 'password') {
             // persist staged password early so confirm step can validate reliably
             useAppStore.getState().updateStagedUser({ password: getValues('password') as string })
           }
            if (step === 'firstName') {
              useAppStore.getState().updateStagedUser({ firstName: getValues('firstName') as any })
            }
            if (step === 'lastName') {
              useAppStore.getState().updateStagedUser({ lastName: getValues('lastName') as any })
            }
            if (step === 'email') {
              const email = getValues('email') as string
              try {
                await getUserByEmail(email)
                // If we get here without error, user exists → redirect to login
                router.push('/user/login')
                return
              } catch (err: any) {
                // 404 means no user exists → continue
                useAppStore.getState().updateStagedUser({ email })
              }
            }
           if (step === 'confirmPassword') {
             const valid = await trigger(['password', 'confirmPassword'])
             if (!valid) return
             // ensure password stored for register flow
              useAppStore.getState().updateStagedUser({
                password: getValues('password') as string,
                // PocketBase requires passwordConfirm on user creation
                passwordConfirm: getValues('confirmPassword') as string,
              })
           }
            if (step === 'photo') {
              const img = getValues('image') as any
              const allValues = form.getValues() as any
              // Ensure required fields for PocketBase auth
              if (!allValues?.password) {
                console.error('Missing password before register')
                return
              }
              if (!allValues?.email) {
                console.error('Missing email before register')
                return
              }
              if (!img) return
              // Classic flow: only stage the image here; other fields were already staged on prior steps
              useAppStore.getState().updateStagedUser({ image: img as string })
              try {
                // prevent Home redirect while onboarding completes
                setSuppressHomeRedirect(true)
                await register()
                // Mark for startup animation gating on first entry to grid
                setJustOnboarded(true)
              } catch (e: any) {
                const storeState = useAppStore.getState()
                const staged = storeState.stagedUser as any
                const stagedKeys = Object.keys(staged || {})
                const fieldErrors = (e && (e.data?.data || e.response?.data?.data)) || {}
                console.error('Register failed (keys, fieldErrors):', stagedKeys, fieldErrors)
                const emailErr = (fieldErrors as any)?.email
                if (emailErr && (emailErr.code?.includes('used') || emailErr.message?.includes('used'))) {
                  router.push('/user/login')
                  return
                }
                return
              }
              // Single-screen onboarding: go straight to grid
              animateTo('next')
              if (user?.userName) {
                router.replace(`/user/${user.userName}`)
              } else {
                router.replace('/')
              }
              return
            }
            if (step === 'notifications') {
              // Proceed to photo picker
              animateTo('next')
              setStep('photo')
              return
            }
           animateTo('next'); goNext()
         }}
          nextDisabled={
            step === 'neighborhood'
              ? !isLocationSelected
              : step === 'photo'
              ? !imageValue
              : step === 'notifications'
              ? false
              : !formState.isValid
          }
        inputWidth={'100%'}
        contentWidth={win.width - 20}
        translateX={slideValue as unknown as number}
        bottomOffsetExtra={step === 'neighborhood' ? 10 : 0}
        nextTitle={step === 'photo' ? 'Take me to my grid' : step === 'notifications' ? 'Next' : 'Next'}
      >
        {step === 'firstName' && (
          <Controller
            name="firstName"
            control={control}
            rules={{ required: true }}
            render={({ field: { onChange, value, onBlur } }) => (
              <FormFieldWithIcon id="firstName" type="user" placeholder="First Name" onChange={onChange} onBlur={onBlur} value={value} autoFocus={true} />
            )}
          />
        )}
        {step === 'lastName' && (
          <Controller
            name="lastName"
            control={control}
            rules={{ required: true }}
            render={({ field: { onChange, value, onBlur } }) => (
              <FormFieldWithIcon id="lastName" type="user" placeholder="Last Name" onChange={onChange} onBlur={onBlur} value={value} autoFocus={true} />
            )}
          />
        )}
        {step === 'email' && (
          <Controller
            name="email"
            control={control}
            rules={{ required: true }}
            render={({ field: { onChange, value, onBlur } }) => (
              <FormFieldWithIcon id="email" type="email" placeholder="Email" onChange={onChange} onBlur={onBlur} value={value} autoFocus={true} />
            )}
          />
        )}
        {step === 'password' && (
          <Controller
            name="password"
            control={control}
            rules={{ required: true, minLength: 8 }}
            render={({ field: { onChange, value, onBlur } }) => (
              <FormFieldWithIcon id="password" type="password" placeholder="Password" onChange={onChange} onBlur={onBlur} value={value} autoFocus={true} />
            )}
          />
        )}
        {step === 'confirmPassword' && (
          <Controller
            name="confirmPassword"
            control={control}
            rules={{
              required: true,
              validate: (v: string) => {
                const match = v === (form.getValues('password') as string)
                return match || 'Passwords do not match'
              },
              minLength: 8,
            }}
            render={({ field: { onChange, value, onBlur } }) => (
              <FormFieldWithIcon
                id="confirmPassword"
                type="password"
                placeholder="Confirm Password"
                onChange={onChange}
                onBlur={onBlur}
                value={value}
                autoFocus={true}
              />
            )}
          />
        )}
        {step === 'neighborhood' && (
          <Controller
            name="location"
            control={control}
            rules={{
              validate: (v: any) => (v && v.location ? true : 'Location required'),
            }}
            render={({ field: { onChange } }) => (
              <DeviceLocation
                onChange={(values) => {
                  // Pass value through RHF's onChange to update state consistently
                  onChange(values as any)
                  // Also be explicit: set + validate ensures Next enables instantly
                  setValue('location', values as any, { shouldValidate: true, shouldDirty: true })
                  trigger('location')
                  // Persist to staged user for register flow
                  useAppStore.getState().updateStagedUser({
                    location: values.location,
                    lat: (values as any).lat,
                    lon: (values as any).lon,
                  } as any)
                }}
              />
            )}
          />
        )}
        {step === 'photo' && (
          <Controller
            name="image"
            control={control}
            rules={{ required: true }}
            render={({ field: { onChange, value } }) => (
              <Animated.View style={{ alignItems: 'center', justifyContent: 'center', marginTop: -200, opacity: photoPickerOpacity }}>
                <AvatarPicker onComplete={(s) => onChange(s)} source={value} onReplace={() => {}}>
                  <></>
                </AvatarPicker>
              </Animated.View>
            )}
          />
        )}
        {step === 'notifications' && <View />}
      </PinnedProfileStep>
    </View>
  )
}

