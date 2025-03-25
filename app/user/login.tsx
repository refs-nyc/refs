import { useEffect, useRef } from 'react'
import { useUserStore } from '@/features/pocketbase'
import { s, c } from '@/features/style'
import { router } from 'expo-router'
import { ProfileStep } from '@/ui/profiles/ProfileStep'
import { View, Dimensions } from 'react-native'
import { pocketbase } from '@/features/pocketbase'
import Carousel, { ICarouselInstance } from 'react-native-reanimated-carousel'
import { FormFieldWithIcon } from '@/ui/inputs/FormFieldWithIcon'
import { SizableText } from '@/ui'
import { Controller, useForm } from 'react-hook-form'

const win = Dimensions.get('window')

const EmailStep = ({ carouselRef }: { carouselRef: React.RefObject<ICarouselInstance> }) => {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm()
  const { updateStagedUser } = useUserStore()

  return (
    <ProfileStep
      buttonTitle="Logging in"
      showFullHeightStack={false}
      onSubmit={handleSubmit(
        async (values) => {
          updateStagedUser(values)
          // Valid?
          carouselRef.current?.next()
        },
        (errors) => console.log('Errors:', errors)
      )}
    >
      <Controller
        name="email"
        control={control}
        rules={{
          required: true,
          pattern:
            /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/,
        }}
        render={({ field: { onChange, value } }) => (
          <FormFieldWithIcon
            onChange={onChange}
            type="email"
            id="email"
            placeholder={'Login with email'}
            value={value}
            autoFocus={false}
          >
            {errors?.email && (
              <SizableText style={styles.errorText}>This field is required</SizableText>
            )}
          </FormFieldWithIcon>
        )}
      />
    </ProfileStep>
  )
}

const LoginStep = () => {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm()
  const { stagedUser, loginWithPassword } = useUserStore()

  return (
    <ProfileStep
      buttonTitle="Done"
      showFullHeightStack={false}
      onSubmit={handleSubmit(async (values) => {
        if (values.login) {
          if (!stagedUser.email) throw new Error('email required')
          const response = await loginWithPassword(stagedUser.email, values.login)

          if (pocketbase.authStore.record === null) {
            console.error('Login unsuccessful')
            return
          }
          router.push(`/user/${pocketbase.authStore.record.userName}`)
        }
      })}
    >
      <Controller
        name="login"
        control={control}
        rules={{
          required: true,
        }}
        render={({ field: { onChange, value } }) => (
          <FormFieldWithIcon
            onChange={onChange}
            type="password"
            id="login"
            placeholder="Password"
            value={value}
            autoFocus={false}
          >
            {errors?.login && (
              <SizableText style={styles.errorText}>Password incorrect</SizableText>
            )}
          </FormFieldWithIcon>
        )}
      />
    </ProfileStep>
  )
}

export default function Screen() {
  const carouselRef = useRef<ICarouselInstance>(null)
  const { stagedUser } = useUserStore()

  useEffect(() => {
    if (stagedUser.email) {
      carouselRef.current?.scrollTo({ count: 1 })
      console.log('Scroll to 1')
    }
  }, [stagedUser])

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
