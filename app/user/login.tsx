import { useRef, useState } from 'react'
import { useAppStore } from '@/features/stores'
import { s, c } from '@/features/style'
import { router } from 'expo-router'
import { ProfileStep } from '@/ui/profiles/ProfileStep'
import { View, Dimensions, Text, TouchableOpacity } from 'react-native'
import Carousel, { ICarouselInstance } from 'react-native-reanimated-carousel'
import { ErrorView, FormFieldWithIcon } from '@/ui/inputs/FormFieldWithIcon'
import { Controller, useForm } from 'react-hook-form'
import { getJsonRpcSignerFromSMS } from '@/features/magic'
import { SIWESigner } from '@canvas-js/signer-ethereum'

const win = Dimensions.get('window')

const LoginStep = () => {
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isValid },
  } = useForm({
    mode: 'onChange',
    defaultValues: {
      phoneNumber: '',
    },
  })
  const [loginInProgress, setLoginInProgress] = useState(false)
  const { login, canvasApp, setShowMagicSheet } = useAppStore()

  return (
    <ProfileStep
      buttonTitle={loginInProgress ? 'Logging in...' : 'Log in'}
      showFullHeightStack={false}
      onSubmit={handleSubmit(async (values) => {
        setLoginInProgress(true)
        try {
          setShowMagicSheet(true)
          const jsonRpcSigner = await getJsonRpcSignerFromSMS(values.phoneNumber)
          setShowMagicSheet(false)

          // check if the profile already exists
          const sessionSigner = new SIWESigner({ signer: jsonRpcSigner })
          const userDid = await sessionSigner.getDid()
          const existingProfile = await canvasApp!.db.get('profile', userDid)
          if (existingProfile) {
            // if so, then log the user in
            await login(jsonRpcSigner)
            router.dismissAll()
            setLoginInProgress(false)
          } else {
            // otherwise show an error, user with this number doesn't exist
            setLoginInProgress(false)
            setError('phoneNumber', {
              type: 'loginFailed',
              message: "User with this number doesn't exist",
            })
          }
        } catch (e) {
          console.error('error while performing Magic SMS verification:', e)
          setShowMagicSheet(false)
          setLoginInProgress(false)
        }
      })}
      disabled={!isValid || !canvasApp || loginInProgress}
    >
      <Controller
        name="phoneNumber"
        control={control}
        rules={{
          required: 'Phone Number is required',
        }}
        render={({ field: { onChange, onBlur, value } }) => {
          return (
            <FormFieldWithIcon
              onBlur={onBlur}
              onChange={onChange}
              type="phone"
              id="phoneNumber"
              placeholder="Phone Number"
              value={value}
              autoFocus={false}
              autoCorrect={false}
            />
          )
        }}
      />
      {/* Warnings etc */}
      <ErrorView error={errors?.phoneNumber} />
    </ProfileStep>
  )
}

export default function Screen() {
  const carouselRef = useRef<ICarouselInstance>(null)

  return (
    <View style={{ flex: 1 }}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>Back</Text>
      </TouchableOpacity>
      <Carousel
        loop={false}
        ref={carouselRef}
        data={[LoginStep]}
        width={win.width}
        height={win.height}
        enabled={false}
        renderItem={({ item }) => item()}
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
