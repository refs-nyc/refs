import { useRef, useState } from 'react'
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
import { getSessionSignerFromSMS } from '@/features/magic'

const win = Dimensions.get('window')

const PhoneNumberStep = ({ carouselRef }: { carouselRef: React.RefObject<ICarouselInstance> }) => {
  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm({ mode: 'onChange' })
  const { login, updateStagedProfileFields, canvasApp } = useAppStore()
  const [checkingPhoneNumber, setCheckingPhoneNumber] = useState(false)

  return (
    <ProfileStep
      buttonTitle={checkingPhoneNumber ? 'Verifying phone number...' : 'Next'}
      showFullHeightStack={false}
      disabled={!isValid || !canvasApp || checkingPhoneNumber}
      onSubmit={handleSubmit(
        async (values) => {
          setCheckingPhoneNumber(true)

          try {
            const sessionSigner = await getSessionSignerFromSMS(values.phoneNumber)

            // check if the profile already exists
            const userDid = await sessionSigner.getDid()
            const existingProfile = await canvasApp!.db.get('profile', userDid)

            if (existingProfile) {
              // if so, then log the user in
              await login(sessionSigner)
              router.dismissAll()
            } else {
              // otherwise update the staged user and move to the next step
              updateStagedProfileFields({
                sessionSigner,
              })
              carouselRef.current?.next()
            }
          } finally {
            setCheckingPhoneNumber(false)
          }
        },
        (errors) => console.error('Errors:', errors)
      )}
    >
      <Controller
        name="phoneNumber"
        control={control}
        rules={{
          required: 'Phone number is required',
        }}
        render={({ field: { onChange, value, onBlur } }) => (
          <FormFieldWithIcon
            onChange={onChange}
            onBlur={onBlur}
            type="phone"
            id="phoneNumber"
            placeholder={'Sign up with phone number'}
            value={value}
            autoFocus={false}
            autoCorrect={false}
          />
        )}
      />
      <ErrorView error={errors?.phoneNumber} />
    </ProfileStep>
  )
}

const NameStep = ({ carouselRef }: { carouselRef: React.RefObject<ICarouselInstance> }) => {
  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm({ mode: 'onChange' })
  const { updateStagedProfileFields } = useAppStore()

  return (
    <ProfileStep
      buttonTitle="Next"
      showFullHeightStack={false}
      disabled={!isValid}
      onSubmit={handleSubmit(
        async (values) => {
          updateStagedProfileFields(values)
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
  const { updateStagedProfileFields } = useAppStore()

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
              updateStagedProfileFields(values)
              onChange(values)
            }}
          />
        )}
      />
      <ErrorView error={errors?.location} />
    </ProfileStep>
  )
}

const ImageStep = ({ carouselRef }: { carouselRef: React.RefObject<ICarouselInstance> }) => {
  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm({ mode: 'onChange' })
  const { register, updateStagedProfileFields } = useAppStore()

  return (
    <ProfileStep
      buttonTitle="Register"
      showFullHeightStack={false}
      disabled={!isValid}
      onSubmit={handleSubmit(
        async (values) => {
          updateStagedProfileFields(values)

          await register()

          carouselRef.current?.next()
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
        data={[PhoneNumberStep, NameStep, LocationStep, ImageStep, DoneStep]}
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
