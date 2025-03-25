import { useState } from 'react'
import { KeyboardAvoidingView, Text as SizableText, View } from 'react-native'
import { Button } from '../buttons/Button'
import { YStack } from '../core/Stacks'
import { FormFieldWithIcon } from '../inputs/FormFieldWithIcon'
import { AvatarPicker } from '../inputs/AvatarPicker'
import {
  useForm,
  Controller,
  FieldValues,
  ValidateResult,
  FieldErrors,
  SubmitHandler,
} from 'react-hook-form'
import { useUserStore } from '@/features/pocketbase'
import { usePathname } from 'expo-router'
import { DismissKeyboard } from '../atoms/DismissKeyboard'
import { router } from 'expo-router'
import { LOGIN_STATE } from '@/features/magic'
import { s, c, t } from '@/features/style'
import { DeviceLocation } from '../inputs/DeviceLocation'
import { FirstVisitScreen } from './FirstVisitScreen'

// Field configurations with validation rules
const fieldConfigs = {
  login: {
    required: true,
    component: ({ onChange, value, errors }) => (
      <FormFieldWithIcon
        onChange={onChange}
        type="password"
        id="email"
        placeholder="Password"
        textContentType="email"
        value={value}
        autoFocus={false}
      >
        {errors?.login && <SizableText style={styles.errorText}>Password incorrect</SizableText>}
      </FormFieldWithIcon>
    ),
  },
  email: {
    required: true,
    pattern:
      /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/,
    component: ({ onChange, value, errors, pathname }) => (
      <FormFieldWithIcon
        onChange={onChange}
        type="email"
        id="email"
        placeholder={pathname.includes('/user/login') ? 'Login with email' : 'Register with email'}
        value={value}
        autoFocus={false}
      >
        {errors?.email && (
          <SizableText style={styles.errorText}>This field is required</SizableText>
        )}
      </FormFieldWithIcon>
    ),
  },
  password: {
    required: true,
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    component: ({ onChange, value, errors }) => (
      <FormFieldWithIcon
        onChange={onChange}
        type="password"
        id="email"
        placeholder="Password"
        value={value}
        autoFocus={false}
      >
        {errors?.password && (
          <SizableText style={styles.errorText}>
            Password must include an uppercase letter, lowercase letter, {'\n'} number, and special
            character, and be at least 8 characters long
          </SizableText>
        )}
      </FormFieldWithIcon>
    ),
  },
  passwordConfirm: {
    required: true,
    validate: (value, formValues) => value === formValues.password,
    component: ({ onChange, value, errors }) => (
      <FormFieldWithIcon
        onChange={onChange}
        type="password"
        id="email"
        placeholder="Confirm Password"
        value={value}
        autoFocus={false}
      >
        {errors?.passwordConfirm && (
          <SizableText style={styles.errorText}>Passwords must match</SizableText>
        )}
      </FormFieldWithIcon>
    ),
  },
  firstName: {
    required: true,
    component: ({ onChange, value, errors }) => (
      <FormFieldWithIcon
        onChange={onChange}
        type="user"
        id="firstName"
        placeholder="First Name"
        value={value}
        autoFocus={false}
      >
        {errors?.firstName && (
          <SizableText style={styles.errorText}>This field is required</SizableText>
        )}
      </FormFieldWithIcon>
    ),
  },
  lastName: {
    required: true,
    component: ({ onChange, value, errors }) => (
      <FormFieldWithIcon
        onChange={onChange}
        type="user"
        id="lastName"
        placeholder="Last Name"
        value={value}
        autoFocus={false}
      >
        {errors?.lastName && (
          <SizableText style={styles.errorText}>This field is required</SizableText>
        )}
      </FormFieldWithIcon>
    ),
  },
  location: {
    required: true,
    component: ({ onChange }) => <DeviceLocation onChange={onChange} />,
  },
  userName: {
    required: true,
    validate: (value) => !['new'].includes(value.toLowerCase()),
    component: ({ onChange, value, errors }) => (
      <FormFieldWithIcon
        onChange={onChange}
        type="username"
        id="userName"
        placeholder="username"
        value={value}
        autoFocus={false}
      >
        {errors?.userName && (
          <SizableText style={styles.errorText}>This field is required</SizableText>
        )}
      </FormFieldWithIcon>
    ),
  },
  image: {
    required: false,
    component: ({ onChange, value, errors }) => (
      <AvatarPicker onComplete={(s) => onChange(s)} source={value} onReplace={() => {}}>
        {errors?.image && (
          <SizableText style={styles.errorText}>This field is required</SizableText>
        )}
      </AvatarPicker>
    ),
  },
  done: {
    required: false,
    component: () => <FirstVisitScreen />,
  },
}

export const ProfileStep = ({
  title,
  buttonTitle,
  showFullHeightStack,
  onSubmit,
  children,
}: {
  title?: string
  buttonTitle: string
  showFullHeightStack: boolean
  onSubmit: () => void
  children: React.ReactNode
}) => {
  return (
    <DismissKeyboard>
      <KeyboardAvoidingView behavior={'height'} style={styles.container}>
        <YStack style={!showFullHeightStack && { height: '80%', justifyContent: 'center' }}>
          <View style={{ height: s.$8, marginBottom: s.$08, paddingHorizontal: s.$2 }}>
            <SizableText style={[t.h2semi, { textAlign: 'center' }]}>{title}</SizableText>
          </View>
          {children}
        </YStack>

        <Button
          variant="raised"
          style={styles.submitButton}
          title={buttonTitle}
          onPress={onSubmit}
        />
      </KeyboardAvoidingView>
    </DismissKeyboard>
  )
}

// Styles
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
