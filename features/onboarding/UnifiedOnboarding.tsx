import React, { useMemo, useRef, useState } from 'react'
import { View, Text, Keyboard, Pressable, Animated, Dimensions } from 'react-native'
import { s, c } from '@/features/style'
import { LoopingFadeCarousel } from '@/ui/display/LoopingFadeCarousel'
import { DetailsDemo } from '@/ui/display/DetailsDemo'
import { PinnedProfileStep } from '@/ui/profiles/PinnedProfileStep'
import { Controller, useForm } from 'react-hook-form'
import { FormFieldWithIcon } from '@/ui/inputs/FormFieldWithIcon'
import { AvatarPicker } from '@/ui/inputs/AvatarPicker'
import { DeviceLocation } from '@/ui/inputs/DeviceLocation'
import { useAppStore } from '@/features/stores'

type StepId = 'firstName' | 'lastName' | 'email' | 'password' | 'neighborhood' | 'photo' | 'notifications'

export function UnifiedOnboarding() {
  const { updateStagedUser, register } = useAppStore()
  const [step, setStep] = useState<StepId>('firstName')
  const form = useForm({ mode: 'onChange' })
  const { control, handleSubmit, formState } = form

  const win = Dimensions.get('window')

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
      const textStyle = { color: c.accent, fontFamily: 'Inter-Medium', fontSize: 24 } as const
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
      { content: <AppsLine />, durationMs: 5000 }, // allow an extra second after beers? appears
      { content: 'and so we only ever see one side of each other', durationMs: 3750 },
      {
        // Slide 4 now text-only syllabus line (was the mini-syllabus with demo)
        content: (
          <Text key="syllabus-text" style={{ color: c.accent, fontFamily: 'Inter-Medium', fontSize: 24 }}>
            Refs is a place to bring it all together
          </Text>
        ),
        durationMs: 3750,
      },
      {
        // Slide 5 is the mini-syllabus with demo, copy italicized
        content: (
          <View style={{ marginTop: -100 }}>
            <Text
              key="intro-italic"
              style={{ fontStyle: 'italic', color: c.accent, fontFamily: 'Inter-Medium', fontSize: 24, marginBottom: s.$1 }}
            >
              A syllabus for people reading you
            </Text>
            <View style={{ alignItems: 'flex-start', paddingTop: s.$075, paddingLeft: 0 }}>
              <View style={{ width: '100%', height: win.width * 0.6, overflow: 'hidden', opacity: 0.95, alignSelf: 'flex-start' }}>
                <DetailsDemo />
              </View>
            </View>
          </View>
        ),
        durationMs: 3750,
      },
      { content: 'and instead of waiting for an algorithm to tell you who to meet...', durationMs: 3750 },
      { content: 'you can follow the paths your refs create', durationMs: 3750 },
    ]
  }, [])

  const goNext = async () => {
    const order: StepId[] = ['firstName', 'lastName', 'email', 'password', 'neighborhood', 'photo', 'notifications']
    const i = order.indexOf(step)
    if (i < order.length - 1) setStep(order[i + 1])
  }

  const goBack = () => {
    const order: StepId[] = ['firstName', 'lastName', 'email', 'password', 'neighborhood', 'photo', 'notifications']
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
      {/* Top carousel */}
      <View style={{ flex: 1, paddingTop: 175, paddingHorizontal: s.$2 }}>
        {/* Freeze on the intro-with-demo slide (index 3) for debugging */}
        <LoopingFadeCarousel slides={slides} freezeIndex={3} />
      </View>

      {/* Bottom pinned form */}
      <PinnedProfileStep
        canGoBack={step !== 'firstName'}
        onBack={() => { animateTo('back'); goBack() }}
        onNext={() => { animateTo('next'); goNext() }}
        nextDisabled={!formState.isValid}
        inputWidth={'100%'}
        contentWidth={win.width - 20}
        translateX={slideValue as unknown as number}
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
            rules={{ required: true, pattern: /.+@.+\..+/ }}
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
        {step === 'neighborhood' && (
          <Controller
            name="location"
            control={control}
            rules={{ required: true }}
            render={({ field: { onChange } }) => (
              <DeviceLocation
                onChange={(values) => {
                  onChange(values)
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
              <AvatarPicker onComplete={(s) => onChange(s)} source={value} onReplace={() => {}}>
                <></>
              </AvatarPicker>
            )}
          />
        )}
        {step === 'notifications' && (
          <View>
            <Text style={{ color: c.surface, marginBottom: s.$1 }}>
              By continuing you agree to our <Text style={{ textDecorationLine: 'underline' }} onPress={() => {}}>
                Privacy Policy
              </Text>
            </Text>
            {/* real push prompt occurs post-register to avoid OS modal spam */}
          </View>
        )}
      </PinnedProfileStep>
    </View>
  )
}

