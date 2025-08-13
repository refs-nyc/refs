import { useMemo, useRef, useState } from 'react'
import { useAppStore } from '@/features/stores'
import { s, c } from '@/features/style'
import { router } from 'expo-router'
import { ProfileStep } from '@/ui/profiles/ProfileStep'
import { View, Dimensions, Text, TouchableOpacity } from 'react-native'
import Carousel, { ICarouselInstance } from 'react-native-reanimated-carousel'
import { ErrorView, FormFieldWithIcon } from '@/ui/inputs/FormFieldWithIcon'
import { Controller, useForm } from 'react-hook-form'

const win = Dimensions.get('window')

const EmailStep = ({ carouselRef }: { carouselRef: React.RefObject<ICarouselInstance> }) => {
  const {
    control,
    handleSubmit,
    setError,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      email: '',
    },
    mode: 'onSubmit',
  })

  const { updateStagedUser } = useAppStore()

  return (
    <ProfileStep
      buttonTitle="Next"
      showFullHeightStack={false}
      onSubmit={handleSubmit(async (values) => {
        const email = (values.email || '').trim()
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
          setError('email', { type: 'manual', message: 'Please use a valid email address' })
          return
        }
        updateStagedUser({ email })
        carouselRef.current?.next()
      })}
      disabled={!((watch('email') || '').trim())}
    >
      <Controller
        name="email"
        control={control}
        render={({ field: { onChange, onBlur, value } }) => (
          <FormFieldWithIcon
            onChange={onChange}
            onBlur={onBlur}
            type="email"
            id="email"
            placeholder={'Login with email'}
            value={value}
            autoFocus={false}
            autoCorrect={false}
          />
        )}
      />
      {/* Warnings etc */}
      <ErrorView error={errors?.email} />
    </ProfileStep>
  )
}

const LoginStep = () => {
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isValid },
  } = useForm({
    mode: 'onChange',
    defaultValues: {
      login: '',
    },
  })

  const { stagedUser, loginWithPassword } = useAppStore()
  const [loginInProgress, setLoginInProgress] = useState(false)

  return (
    <ProfileStep
      buttonTitle={loginInProgress ? 'Logging in...' : 'Log in'}
      showFullHeightStack={false}
      onSubmit={handleSubmit(async (values) => {
        if (values.login) {
          setLoginInProgress(true)
          if (!stagedUser.email) throw new Error('email required')
          try {
            await loginWithPassword(stagedUser.email, values.login)
            router.dismissAll()
          } catch (error) {
            setLoginInProgress(false)
            setError('login', { type: 'loginFailed', message: 'Login unsuccessful' })
          }
        }
      })}
      disabled={!isValid}
    >
      <Controller
        name="login"
        control={control}
        rules={{
          required: 'Password is required',
        }}
        render={({ field: { onChange, onBlur, value } }) => {
          return (
            <FormFieldWithIcon
              onBlur={onBlur}
              onChange={onChange}
              type="password"
              id="login"
              placeholder="Password"
              value={value}
              autoFocus={false}
              autoCorrect={false}
            />
          )
        }}
      />
      {/* Warnings etc */}
      <ErrorView error={errors?.login} />
    </ProfileStep>
  )
}

export default function Screen() {
  const carouselRef = useRef<ICarouselInstance>(null)
  const slides = useMemo(() => [EmailStep, LoginStep], [])

  return (
    <View style={{ flex: 1 }}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>Back</Text>
      </TouchableOpacity>
      <Carousel
        loop={false}
        ref={carouselRef}
        data={slides}
        width={win.width}
        height={win.height}
        enabled={false}
        renderItem={({ item }) => item({ carouselRef })}
      />
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
  backButton: {
    position: 'absolute' as const,
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  backButtonText: {
    color: '#999999',
    fontSize: 16,
    fontFamily: 'Inter',
  },
}
