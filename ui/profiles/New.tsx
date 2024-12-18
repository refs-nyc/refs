import { useRef, useState, useEffect } from 'react'
import { Button } from '../buttons/Button'
import { YStack } from '../core/Stacks'
import { KeyboardAvoidingView, Platform, View, Text as SizableText } from 'react-native'
import { FormFieldWithIcon } from '../inputs/FormFieldWithIcon'
import { AvatarPicker } from '../inputs/AvatarPicker'
import { Dimensions } from 'react-native'
import { useForm, Controller } from 'react-hook-form'
import { useProfileStore } from '@/features/canvas/stores'
import { DismissKeyboard } from '../atoms/DismissKeyboard'
import { router } from 'expo-router'
import { LOGIN_STATE } from '@/features/magic'
// import { useMagicContext } from '@/features/magic'
import { s, c } from '@/features/style'
import Carousel, { ICarouselInstance } from 'react-native-reanimated-carousel'

type StepInput1 = {
  email: string
}

type StepInput2 = {
  firstName: string
  lastName: string
}

type StepInput3 = {
  userName: string
}

type StepInput4 = {
  image: string
}

const ProfileStep = ({ fields, index, onComplete }) => {
  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<StepInput1 | StepInput2 | StepInput3 | StepInput4>()

  const { login } = useProfileStore()
  const [loginState, setLoginState] = useState(0)

  const formValues = watch()

  const onSubmit = async (d) => {
    if (fields.includes('userName')) {
      try {
        // setLoginState(LOGIN_STATE.LOGGING_IN)
        console.log(formValues.userName)

        try {
          const record = await login(formValues.userName)
          console.log(record)
          console.log('LOGIN SUCCESSful')
          // If succesful, redirect to the user profile
          router.push(`/user/${record.userName}`)
        } catch (error) {
          console.error(error)
        }
      } catch (error) {
        console.error(error)
      }
    }
    onComplete(formValues)
  }

  const onErrors = (d) => {
    console.log('Failure')

    console.log(formValues)
    console.log(d)
  }

  return (
    <DismissKeyboard>
      <KeyboardAvoidingView
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'stretch',
          width: '100%',
          paddingHorizontal: s.$1half,
        }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}> */}
        <YStack gap="$6">
          {fields.includes('email') && loginState !== LOGIN_STATE.LOGGED_IN && (
            <>
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
                    placeholder="Login with email"
                    value={value}
                    autoFocus={true}
                  >
                    {errors.email && (
                      <SizableText
                        style={{
                          fontSize: s.$08,
                          fontFamily: 'Inter',
                          textAlign: 'center',
                          color: c.accent,
                        }}
                      >
                        This field is required
                      </SizableText>
                    )}
                    {/* <SizableText>{LOGIN_STATE[loginState]}</SizableText> */}
                  </FormFieldWithIcon>
                )}
              />
            </>
          )}
          {fields.includes('email') && loginState === LOGIN_STATE.LOGGED_IN && (
            <Button title="Welcome back" onPress={onComplete} />
          )}

          {/* FirstName */}
          {fields.includes('firstName') && (
            <>
              <Controller
                name="firstName"
                control={control}
                rules={{
                  required: true,
                }}
                render={({ field: { onChange, value } }) => (
                  <FormFieldWithIcon
                    onChange={onChange}
                    type="user"
                    id="firstName"
                    placeholder="First Name"
                    value={value}
                    autoFocus={true}
                  >
                    {errors.firstName && (
                      <SizableText
                        style={{
                          fontSize: s.$08,
                          fontFamily: 'Inter',
                          textAlign: 'center',
                          color: c.accent,
                        }}
                      >
                        This field is required
                      </SizableText>
                    )}
                  </FormFieldWithIcon>
                )}
              />
            </>
          )}

          {/* LastName */}
          {fields.includes('lastName') && (
            <>
              <Controller
                name="lastName"
                control={control}
                rules={{
                  required: true,
                }}
                render={({ field: { onChange, value } }) => (
                  <FormFieldWithIcon
                    onChange={onChange}
                    type="user"
                    id="lastName"
                    placeholder="Last Name"
                    value={value}
                  >
                    {errors.lastName && (
                      <SizableText
                        style={{
                          fontSize: s.$08,
                          fontFamily: 'Inter',
                          textAlign: 'center',
                          color: c.accent,
                        }}
                      >
                        This field is required
                      </SizableText>
                    )}
                  </FormFieldWithIcon>
                )}
              />
            </>
          )}
          {/* UserName */}
          {fields.includes('userName') && (
            <>
              <Controller
                name="userName"
                control={control}
                rules={{
                  required: true,
                }}
                render={({ field: { onChange, value } }) => (
                  <FormFieldWithIcon
                    onChange={onChange}
                    type="username"
                    id="userName"
                    placeholder="username"
                    value={value}
                    autoFocus={true}
                  >
                    {errors.userName && (
                      <SizableText
                        style={{
                          fontSize: s.$08,
                          fontFamily: 'Inter',
                          textAlign: 'center',
                          color: c.accent,
                        }}
                      >
                        This field is required
                      </SizableText>
                    )}
                  </FormFieldWithIcon>
                )}
              />
            </>
          )}

          {fields.includes('image') && (
            <>
              <Controller
                name="image"
                control={control}
                rules={{
                  required: true,
                }}
                render={({ field: { onChange, value } }) => (
                  <AvatarPicker
                    onComplete={(s) => {
                      console.log(s)
                      onChange(s)
                    }}
                    source={value}
                  >
                    {errors.image && (
                      <SizableText
                        style={{
                          fontSize: s.$08,
                          fontFamily: 'Inter',
                          textAlign: 'center',
                          color: c.accent,
                        }}
                      >
                        This field is required
                      </SizableText>
                    )}
                  </AvatarPicker>
                )}
              />
            </>
          )}
        </YStack>
        {/* </KeyboardAvoidingView> */}

        {fields.includes('email') ? (
          <Button
            title={loginState === LOGIN_STATE.LOGGING_IN ? 'Logging in' : 'Login'}
            disabled={loginState === LOGIN_STATE.LOGGING_IN}
            variant="basic"
            onPress={handleSubmit(onSubmit, onErrors)}
          />
        ) : (
          <Button title="Submit" variant="basic" onPress={handleSubmit(onSubmit, onErrors)} />
        )}
      </KeyboardAvoidingView>
    </DismissKeyboard>
  )
}

export const NewProfile = () => {
  const { stagedProfile, updateStagedProfile, register } = useProfileStore()
  const ref = useRef<ICarouselInstance>(null)
  const win = Dimensions.get('window')
  const data = [['userName'], ['email'], ['firstName', 'lastName'], ['image']]

  const nextStep = async (formValues) => {
    const index = ref.current?.getCurrentIndex()
    const updated = updateStagedProfile(formValues)

    if (index < data.length - 1) {
      // Valid?
      ref.current?.next()
    } else {
      // Create a new profile
      // submit()

      console.log('Completely done onboarding', updated, stagedProfile)

      try {
        const { userName } = await register()

        router.push(`/user/${userName}?firstVisit=true`)
      } catch (error) {
        console.error('Nope', error)
      }
    }
  }

  const renderItem = ({ item, index }) => (
    <ProfileStep fields={item} index={index} onComplete={nextStep} />
  )

  return (
    <View style={{ flex: 1 }}>
      <Carousel
        loop={false}
        ref={ref}
        data={data}
        width={win.width}
        height={win.height}
        enabled={false}
        renderItem={renderItem}
      />
    </View>
  )
}
