import { Keyboard, TouchableWithoutFeedback } from 'react-native'
import { PropsWithChildren } from 'react'

export const DismissKeyboard = ({ children }: PropsWithChildren) => (
  <TouchableWithoutFeedback 
    onPress={() => Keyboard.dismiss()}
    accessible={false}
  >
    {children}
  </TouchableWithoutFeedback>
)
