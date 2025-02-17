import { useRef, useState, useEffect } from 'react'
import { Button } from '../buttons/Button'
import { YStack } from '../core/Stacks'
import { KeyboardAvoidingView, View, Text as SizableText, Platform } from 'react-native'
import { FormFieldWithIcon } from '../inputs/FormFieldWithIcon'
import { AvatarPicker } from '../inputs/AvatarPicker'
import { useForm, Controller } from 'react-hook-form'
import { useUserStore } from '@/features/pocketbase'
import { usePathname } from 'expo-router'
import { DismissKeyboard } from '../atoms/DismissKeyboard'
import { router } from 'expo-router'
import { LOGIN_STATE } from '@/features/magic'
import { s, c } from '@/features/style'
import { DeviceLocation } from '../inputs/DeviceLocation'

export const ProfileStep = ({
  fields,
  onComplete,
  overrideSubmit,
  index,
}: {
  fields: string[]
  onComplete?: (formValues?: any) => {}
  overrideSubmit?: (formValues: any) => any
  index: number
}) => {
  const {
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm()

  const { getUserByEmail, updateStagedUser, login } = useUserStore()
  const [loginState, setLoginState] = useState(0)
  const pathname = usePathname()

  const formValues = watch()

  const onSubmit = async () => {
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
      try {
        console.log('Fetch the user by email')
        const user = await getUserByEmail(formValues.email)
        console.log(user)

        if (user) {
          // Redirect to login
          router.push(`/user/login`)
        }
      } catch (error: any) {
        if (error.status == 404) {
          // Not existing
          onComplete?.(formValues)
          return
        } else {
          console.error(error)
        }
      }
    } else {
      onComplete?.(formValues)
    }
  }

  const onErrors = (d: any) => {
    console.log('Failure')

    console.log(formValues)
    console.log(d)
  }

  const handleBackPress = () => {
    // Check if any field has a value
    const hasValues = Object.values(formValues).some((value) => value)

    if (hasValues) {
      reset() // Reset form if there are values
    } else {
      router.back() // Go back if form is empty
    }
  }

  return (
    <DismissKeyboard>
      <KeyboardAvoidingView
        behavior={'height'}
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'stretch',
          width: '100%',
          paddingHorizontal: s.$1half,
        }}
      >
        <SizableText
          onPress={handleBackPress}
          style={{
            position: 'absolute',
            top: s.$6,
            right: s.$2,
            fontSize: s.$09,
            color: c.grey2,
            zIndex: 1000,
          }}
        >
          Back
        </SizableText>
        <YStack gap="$6">
          {fields.includes('login') && (
            <>
              <SizableText
                style={{
                  fontSize: s.$1,
                  fontFamily: 'Inter',
                  textAlign: 'center',
                  color: c.accent,
                  marginBottom: s.$6,
                }}
              >
                Welcome back! Please enter your password to continue:
              </SizableText>
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
              <SizableText
                style={{
                  fontSize: s.$1,
                  fontFamily: 'Inter',
                  textAlign: 'center',
                  color: c.accent,
                  marginBottom: s.$6,
                }}
              >
                Welcome! Please provide a password for your account:
              </SizableText>
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
                        Password must include an uppercase letter, lowercase letter, {'\n'} number,
                        and special character, and be at least 8 characters long
                      </SizableText>
                    )}
                  </FormFieldWithIcon>
                )}
              />
              <Controller
                name="passwordConfirm"
                control={control}
                rules={{
                  required: true,
                  validate: (value) => value === formValues.password,
                }}
                render={({ field: { onChange, value } }) => (
                  <FormFieldWithIcon
                    onChange={onChange}
                    type="password"
                    id="email"
                    placeholder="Confirm Password"
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
                    placeholder={
                      pathname.includes('/user/login') ? 'Login with email' : 'Register with email'
                    }
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
                  </FormFieldWithIcon>
                )}
              />
            </>
          )}
          {fields.includes('email') && loginState === LOGIN_STATE.LOGGED_IN && (
            <Button title="Welcome back" onPress={onComplete ?? (() => {})} />
          )}

          {/* FirstName */}
          {fields.includes('firstName') && (
            <>
              <SizableText
                style={{
                  fontSize: s.$1,
                  fontFamily: 'Inter',
                  textAlign: 'center',
                  color: c.accent,
                  marginBottom: s.$6,
                }}
              >
                What should we call you?
              </SizableText>
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
                    autoFocus={false}
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

          {/* Location */}
          {fields.includes('location') && (
            <>
              <Controller
                name="location"
                control={control}
                rules={{
                  required: true,
                }}
                render={({ field: { onChange, value } }) => <DeviceLocation onChange={onChange} />}
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
                  validate: (value) => !['new'].includes(value.toLowerCase()),
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
                  required: false,
                }}
                render={({ field: { onChange, value } }) => (
                  <AvatarPicker
                    onComplete={(s) => {
                      onChange(s)
                    }}
                    source={value}
                    placeholder=""
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

        {fields.includes('email') ? (
          <Button
            style={{ position: 'absolute', bottom: s.$3, left: s.$1half }}
            title={
              pathname.includes('/user/login')
                ? loginState === LOGIN_STATE.LOGGING_IN
                  ? 'Logging in'
                  : 'Login'
                : loginState === LOGIN_STATE.LOGGING_IN
                ? 'Registering'
                : 'Register'
            }
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
