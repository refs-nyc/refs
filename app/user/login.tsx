import { useRef } from 'react'
import { useUserStore } from '@/features/pocketbase'
import { s, c } from '@/features/style'
import { router } from 'expo-router'
import { ProfileStep } from '@/ui/profiles/ProfileStep'
import { View, Dimensions } from 'react-native'
import Carousel, { ICarouselInstance } from 'react-native-reanimated-carousel'
import { ErrorView, FormFieldWithIcon } from '@/ui/inputs/FormFieldWithIcon'
import { Controller, useForm } from 'react-hook-form'

const win = Dimensions.get('window')

const EmailStep = ({ carouselRef }: { carouselRef: React.RefObject<ICarouselInstance> }) => {
  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm({
    defaultValues: {
      email: '',
    },
    mode: 'onChange',
  })
  const { updateStagedUser } = useUserStore()

  return (
    <ProfileStep
      buttonTitle="Next"
      showFullHeightStack={false}
      onSubmit={handleSubmit(
        async (values) => {
          updateStagedUser(values)
          // Valid?
          carouselRef.current?.next()
        },
        (errors) => console.log('Errors:', errors)
      )}
      disabled={!isValid}
    >
      <Controller
        name="email"
        control={control}
        rules={{
          required: 'Email address is required',
          pattern: {
            value:
              /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/,
            // TODO: better validation message
            message: 'Email address is invalid',
          },
        }}
        render={({ field: { onChange, onBlur, value } }) => (
          <FormFieldWithIcon
            onChange={onChange}
            onBlur={onBlur}
            type="email"
            id="email"
            placeholder={'Login with email'}
            value={value}
            autoFocus={false}
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

  const { stagedUser, loginWithPassword } = useUserStore()

  return (
    <ProfileStep
      buttonTitle="Log in"
      showFullHeightStack={false}
      onSubmit={handleSubmit(async (values) => {
        if (values.login) {
          if (!stagedUser.email) throw new Error('email required')
          try {
            await loginWithPassword(stagedUser.email, values.login)
            router.dismissAll()
          } catch (error) {
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

  return (
    <View style={{ flex: 1 }}>
      <Carousel
        loop={false}
        ref={carouselRef}
        data={[EmailStep, LoginStep]}
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
}
