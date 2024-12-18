import { useRef, useState, useEffect } from 'react'
import { Button } from '../buttons/Button'
import { YStack } from '../core/Stacks'
import { KeyboardAvoidingView, View, Text as SizableText } from 'react-native'
import { FormFieldWithIcon } from '../inputs/FormFieldWithIcon'
import { AvatarPicker } from '../inputs/AvatarPicker'
import { Dimensions } from 'react-native'
import { useForm, Controller } from 'react-hook-form'
import { useUserStore } from '@/features/pocketbase'
import { DismissKeyboard } from '../atoms/DismissKeyboard'
import { router } from 'expo-router'
import { LOGIN_STATE } from '@/features/magic'
import { s, c } from '@/features/style'
import Carousel, { ICarouselInstance } from 'react-native-reanimated-carousel'

type StepInput1 = {
  email: string
}

type StepInput2 = {
  password: string
  passwordConfirm: string
}

type StepInput3 = {
  firstName: string
  lastName: string
}

type StepInput4 = {
  userName: string
}

type StepInput5 = {
  image: string
}

export const ProfileStep = ({
  fields,
  onComplete,
  overrideSubmit,
}: {
  fields: string[]
  onComplete: () => {}
  overrideSubmit?: (formValues: any) => any
}) => {
  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<StepInput1 | StepInput2 | StepInput3 | StepInput4 | StepInput5>()

  // const { login } = useUserStore()
  const { getUserByEmail, updateStagedUser, login } = useUserStore()
  const [loginState, setLoginState] = useState(0)

  const formValues = watch()

  const onSubmit = async (d) => {
    console.log('ON SUBMIT', fields)
    if (overrideSubmit) {
      await overrideSubmit(formValues)
      return
    }

    if (fields.includes('userName')) {
      // Update
      updateStagedUser(formValues)
      try {
        try {
          const record = await login(formValues.userName)
          // If succesful, redirect to the user user
          router.push(`/user/${record.userName}?firstVisit=true`)
        } catch (error) {
          console.error(error)
        }
      } catch (error) {
        console.error(error)
      }
    } else if (fields.includes('email')) {
      console.log('FIELDS INCLUDES EMAIL')
      try {
        console.log('Fetch the user by email')
        const user = await getUserByEmail(formValues.email)
        console.log(user)

        if (user) {
          // Redirect to login
          router.push(`/user/login`)
        }
      } catch (error) {
        console.error(error)
        if (error.status == 404) {
          // Not existing
          onComplete(formValues)
          return
        }
      }
    } else {
      onComplete(formValues)
    }
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
        behavior={'height'}
      >
        {/* <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}> */}
        <YStack gap="$6">
          {fields.includes('login') && (
            <>
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
                    id="email"
                    placeholder="Password"
                    value={value}
                    autoFocus={false}
                  >
                    {errors.login && (
                      <SizableText
                        style={{
                          fontSize: s.$08,
                          fontFamily: 'Inter',
                          textAlign: 'center',
                          color: c.accent,
                        }}
                      >
                        Password incorrect
                      </SizableText>
                    )}
                  </FormFieldWithIcon>
                )}
              />
            </>
          )}
          {fields.includes('password') && (
            <>
              <Controller
                name="password"
                control={control}
                rules={{
                  required: true,
                  pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
                }}
                render={({ field: { onChange, value } }) => (
                  <FormFieldWithIcon
                    onChange={onChange}
                    type="password"
                    id="email"
                    placeholder="Password"
                    value={value}
                    autoFocus={false}
                  >
                    {errors.password && (
                      <SizableText
                        style={{
                          fontSize: s.$08,
                          fontFamily: 'Inter',
                          textAlign: 'center',
                          color: c.accent,
                        }}
                      >
                        Password must include at least one upper case letter,{'\n'}
                        one lower case letter, one number, and one special character
                      </SizableText>
                    )}
                  </FormFieldWithIcon>
                )}
              />
            </>
          )}
          {fields.includes('passwordConfirm') && (
            <>
              <Controller
                name="passwordConfirm"
                control={control}
                rules={{
                  required: true,
                  pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
                }}
                render={({ field: { onChange, value } }) => (
                  <FormFieldWithIcon
                    onChange={onChange}
                    type="password"
                    id="email"
                    placeholder="Password"
                    value={value}
                    autoFocus={false}
                  >
                    {errors.passwordConfirm && (
                      <SizableText
                        style={{
                          fontSize: s.$08,
                          fontFamily: 'Inter',
                          textAlign: 'center',
                          color: c.accent,
                        }}
                      >
                        Passwords must match
                      </SizableText>
                    )}
                  </FormFieldWithIcon>
                )}
              />
            </>
          )}
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
                    placeholder="Login or register with email"
                    value={value}
                    autoFocus={false}
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
                    autoFocus={false}
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
                    autoFocus={false}
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
            style={{ position: 'absolute', bottom: s.$3, left: s.$1half }}
            title={loginState === LOGIN_STATE.LOGGING_IN ? 'Logging in' : 'Login'}
            disabled={loginState === LOGIN_STATE.LOGGING_IN}
            variant="fluid"
            onPress={handleSubmit(onSubmit, onErrors)}
          />
        ) : (
          <Button
            style={{ position: 'absolute', bottom: s.$3, left: s.$1half }}
            title="Submit"
            variant="fluid"
            onPress={handleSubmit(onSubmit, onErrors)}
          />
        )}
      </KeyboardAvoidingView>
    </DismissKeyboard>
  )
}

export const NewUserProfile = () => {
  const { stagedUser, updateStagedUser, register } = useUserStore()
  const ref = useRef<ICarouselInstance>(null)
  const win = Dimensions.get('window')
  const data = [
    ['email'],
    ['password', 'passwordConfirm'],
    ['firstName', 'lastName'],
    ['image'],
    ['userName'],
  ]

  const nextStep = async (formValues) => {
    const index = ref.current?.getCurrentIndex()
    const updated = updateStagedUser(formValues)

    if (index < data.length - 1) {
      // Valid?
      ref.current?.next()
    } else {
      try {
        console.log(stagedUser)
        const record = await register()

        if (record.userName) {
          router.push(`/user/${record.userName}?firstVisit=true`)
        }
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
