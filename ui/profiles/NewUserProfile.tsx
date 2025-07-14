import { useRef } from 'react'
import { View } from 'react-native'
import { Dimensions } from 'react-native'
import { useAppStore } from '@/features/stores'
import { s, c } from '@/features/style'
import { router } from 'expo-router'
import Carousel, { ICarouselInstance } from 'react-native-reanimated-carousel'
import { ProfileStep } from '@/ui/profiles/ProfileStep'
import { Controller, useForm } from 'react-hook-form'
import { ErrorView, FormFieldWithIcon } from '../inputs/FormFieldWithIcon'
import { DeviceLocation } from '../inputs/DeviceLocation'
import { AvatarPicker } from '../inputs/AvatarPicker'
import { FirstVisitScreen } from './FirstVisitScreen'
import { SizableText } from '../typo/SizableText'
const win = Dimensions.get('window')

const EmailStep = ({ carouselRef }: { carouselRef: React.RefObject<ICarouselInstance> }) => {
  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm({ mode: 'onChange' })
  const { getUserByEmail, updateStagedUser } = useAppStore()

  return (
    <ProfileStep
      buttonTitle="Next"
      showFullHeightStack={false}
      disabled={!isValid}
      onSubmit={handleSubmit(
        async (values) => {
          // check if a user already exists with the given email address
          try {
            const user = await getUserByEmail(values.email)
            if (user) {
              // if so, then redirect to login view
              router.push(`/user/login`)
            }
          } catch (error: any) {
            if (error.status === 404) {
              // otherwise update the staged user and move to the next step
              updateStagedUser(values)
              carouselRef.current?.next()
            } else {
              console.error(error)
            }
          }
        },
        (errors) => console.error('Errors:', errors)
      )}
    >
      <Controller
        name="email"
        control={control}
        rules={{
          required: 'Email address is required',
          pattern: {
            value:
              /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/,
            message: 'Email address is invalid',
          },
        }}
        render={({ field: { onChange, value, onBlur } }) => (
          <FormFieldWithIcon
            onChange={onChange}
            onBlur={onBlur}
            type="email"
            id="email"
            placeholder={'Sign up with email'}
            value={value}
            autoFocus={false}
            autoCorrect={false}
          />
        )}
      />
      <ErrorView error={errors?.email} />
    </ProfileStep>
  )
}

const NameStep = ({ carouselRef }: { carouselRef: React.RefObject<ICarouselInstance> }) => {
  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm({ mode: 'onChange' })
  const { updateStagedUser } = useAppStore()

  return (
    <ProfileStep
      buttonTitle="Next"
      showFullHeightStack={false}
      disabled={!isValid}
      onSubmit={handleSubmit(
        async (values) => {
          updateStagedUser(values)
          carouselRef.current?.next()
        },
        (errors) => console.error('Errors:', errors)
      )}
    >
      <Controller
        name="firstName"
        control={control}
        rules={{
          required: 'First name is required',
        }}
        render={({ field: { onChange, value, onBlur } }) => (
          <FormFieldWithIcon
            onChange={onChange}
            onBlur={onBlur}
            type="user"
            id="firstName"
            placeholder={'First Name'}
            value={value}
            autoFocus={false}
            autoCorrect={false}
          />
        )}
      />
      <ErrorView error={errors?.firstName} />
      <Controller
        name="lastName"
        control={control}
        rules={{
          required: 'Last name is required',
        }}
        render={({ field: { onChange, value, onBlur } }) => (
          <FormFieldWithIcon
            onChange={onChange}
            onBlur={onBlur}
            type="user"
            id="lastName"
            placeholder={'Last Name'}
            value={value}
            autoFocus={false}
            autoCorrect={false}
          />
        )}
      />
      <ErrorView error={errors?.lastName} />
    </ProfileStep>
  )
}

const LocationStep = ({ carouselRef }: { carouselRef: React.RefObject<ICarouselInstance> }) => {
  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors, isValid },
  } = useForm<{ location?: string; lon?: number; lat?: number }>({
    mode: 'onChange',
  })
  const { updateStagedUser } = useAppStore()

  return (
    <ProfileStep
      buttonTitle="Next"
      showFullHeightStack={false}
      disabled={!isValid}
      onSubmit={handleSubmit(
        async (values) => {
          carouselRef.current?.next()
        },
        (errors) => console.error('Errors:', errors)
      )}
    >
      <Controller
        name="location"
        control={control}
        rules={{
          required: 'Location is required',
        }}
        render={({ field: { onChange } }) => (
          <DeviceLocation
            onChange={(values) => {
              updateStagedUser(values)
              onChange(values)
            }}
          />
        )}
      />
      <ErrorView error={errors?.location} />
    </ProfileStep>
  )
}

const PasswordStep = ({ carouselRef }: { carouselRef: React.RefObject<ICarouselInstance> }) => {
  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm({ mode: 'onChange' })
  const { updateStagedUser } = useAppStore()

  return (
    <ProfileStep
      buttonTitle="Next"
      showFullHeightStack={false}
      disabled={!isValid}
      onSubmit={handleSubmit(
        async (values) => {
          updateStagedUser(values)
          carouselRef.current?.next()
        },
        (errors) => console.error('Errors:', errors)
      )}
    >
      <Controller
        name="password"
        control={control}
        rules={{
          required: 'Password is required',
          pattern: {
            value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
            message:
              'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character',
          },
        }}
        render={({ field: { onChange, value, onBlur } }) => (
          <FormFieldWithIcon
            onChange={onChange}
            type="password"
            id="password"
            placeholder={'Password'}
            value={value}
            autoFocus={false}
            onBlur={onBlur}
            autoCorrect={false}
          />
        )}
      />
      <ErrorView error={errors?.password} />
      <Controller
        name="passwordConfirm"
        control={control}
        rules={{
          required: true,
          validate: (value, formValues) => value === formValues.password,
        }}
        render={({ field: { onChange, value, onBlur } }) => (
          <FormFieldWithIcon
            onChange={onChange}
            type="password"
            id="passwordConfirm"
            placeholder={'Confirm Password'}
            value={value}
            autoFocus={false}
            onBlur={onBlur}
            autoCorrect={false}
          />
        )}
      />
      <ErrorView error={errors?.passwordConfirm} />
    </ProfileStep>
  )
}

const ImageStep = ({ carouselRef }: { carouselRef: React.RefObject<ICarouselInstance> }) => {
  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm({ mode: 'onChange' })
  const { register, updateStagedUser } = useAppStore()

  return (
    <ProfileStep
      buttonTitle="Register"
      showFullHeightStack={false}
      disabled={!isValid}
      onSubmit={handleSubmit(
        async (values) => {
          updateStagedUser(values)
          try {
            const record = await register()

            if (record.userName) {
              carouselRef.current?.next()
            }
          } catch (error) {
            console.error('Nope', error)
          }
        },
        (errors) => console.error('Errors:', errors)
      )}
    >
      <Controller
        name="image"
        control={control}
        rules={{
          required: true,
        }}
        render={({ field: { onChange, value } }) => (
          <AvatarPicker onComplete={(s) => onChange(s)} source={value} onReplace={() => {}}>
            {errors?.image && (
              <SizableText style={styles.errorText}>This field is required</SizableText>
            )}
          </AvatarPicker>
        )}
      />
      <ErrorView error={errors?.image} />
    </ProfileStep>
  )
}

const DoneStep = ({ carouselRef }: { carouselRef: React.RefObject<ICarouselInstance> }) => {
  const { handleSubmit } = useForm({ mode: 'onChange' })
  const { user } = useAppStore()

  return (
    <ProfileStep
      buttonTitle="Done"
      showFullHeightStack={false}
      onSubmit={handleSubmit(
        async (values) => {
          const userName = user && 'userName' in user && user.userName
          if (!userName) {
            // user is not logged in
            // throw an error, redirect to home page?
            return
          }
          // go back to /, clear the stack of the onboarding screens
          router.dismissAll()
        },
        (errors) => console.error('Errors:', errors)
      )}
    >
      <FirstVisitScreen />
    </ProfileStep>
  )
}

export const NewUserProfile = () => {
  const carouselRef = useRef<ICarouselInstance>(null)

  return (
    <View style={{ flex: 1 }}>
      <Carousel
        loop={false}
        ref={carouselRef}
        data={[EmailStep, NameStep, LocationStep, PasswordStep, ImageStep, DoneStep]}
        width={win.width}
        height={win.height}
        enabled={false}
        renderItem={({ item }) => item({ carouselRef })}
      />
    </View>
  )
}

const styles = {
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    marginTop: s.$10,
    alignItems: 'stretch',
    width: '100%',
    paddingHorizontal: s.$1half,
  },
  headerText: {
    textAlign: 'center',
  },
  errorText: {
    fontSize: s.$08,
    fontFamily: 'Inter',
    textAlign: 'center',
    color: c.accent,
  },
  submitButton: {
    position: 'absolute',
    width: '100%',
    bottom: s.$3,
    left: s.$1half,
  },
}
