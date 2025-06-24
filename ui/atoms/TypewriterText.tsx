import React, { useState, useEffect } from 'react'
import { Text } from 'react-native'

type TypewriterTextProps = {
  text: string
  style?: any
  typingSpeed?: number // milliseconds per character when typing
  deletingSpeed?: number // milliseconds per character when deleting
}

export const TypewriterText = ({
  text,
  style,
  typingSpeed = 50,
  deletingSpeed = 30,
}: TypewriterTextProps) => {
  const [displayedText, setDisplayedText] = useState(text)

  useEffect(() => {
    let cancelled = false

    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

    const animate = async () => {
      // Delete current text (backspace effect)
      for (let i = displayedText.length; i >= 0; i--) {
        if (cancelled) return
        setDisplayedText(displayedText.substring(0, i))
        await sleep(deletingSpeed)
      }
      // Type in new text
      for (let i = 0; i <= text.length; i++) {
        if (cancelled) return
        setDisplayedText(text.substring(0, i))
        await sleep(typingSpeed)
      }
    }

    animate()

    return () => {
      cancelled = true
    }
  }, [text])

  return <Text {...style}>{displayedText}</Text>
}
