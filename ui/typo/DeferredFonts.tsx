import { useEffect } from 'react'
import { useFonts } from 'expo-font'

export const DeferredFonts = () => {
  const [_deferredFonts, deferredError] = useFonts({
    InterLight: require('@/assets/fonts/Inter-Light.ttf'),
    InterItalic: require('@/assets/fonts/Inter-Italic.ttf'),
    InterLightItalic: require('@/assets/fonts/Inter-LightItalic.ttf'),
    InterBoldItalic: require('@/assets/fonts/Inter-BoldItalic.ttf'),
  })

  useEffect(() => {
    if (deferredError) console.error(deferredError)
  }, [deferredError])

  return <></>
}
