import { useEffect, useState } from 'react'
import { Keyboard, KeyboardEvent } from 'react-native'

export function useKeyboardHeight() {
  const [keyboardHeight, setKeyboardHeight] = useState(0)

  useEffect(() => {
    const showListener = Keyboard.addListener('keyboardWillShow', (e: KeyboardEvent) => {
      setKeyboardHeight(e.endCoordinates.height)
    })

    const hideListener = Keyboard.addListener('keyboardWillHide', () => {
      setKeyboardHeight(0)
    })

    return () => {
      showListener.remove()
      hideListener.remove()
    }
  }, [])

  return keyboardHeight
}
