import { KeyboardAvoidingView, Text as SizableText, View } from 'react-native'
import { Button } from '../buttons/Button'
import { YStack } from '../core/Stacks'
import { DismissKeyboard } from '../atoms/DismissKeyboard'
import { s, c, t } from '@/features/style'

export const ProfileStep = ({
  title,
  buttonTitle,
  showFullHeightStack,
  onSubmit,
  children,
  disabled = false,
}: {
  title?: string
  buttonTitle: string
  showFullHeightStack: boolean
  onSubmit: () => void
  children: React.ReactNode
  disabled?: boolean
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
          disabled={disabled}
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
} as const