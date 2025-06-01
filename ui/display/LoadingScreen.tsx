import { View, ActivityIndicator } from 'react-native'
import { c, s } from '@/features/style'
import { Heading } from '../typo/Heading'

export function LoadingScreen() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: c.surface,
      }}
    >
      <ActivityIndicator size="large" color={c.olive} />
      <Heading 
        tag="h2normal" 
        style={{ 
          color: c.black, 
          marginTop: s.$2,
          textAlign: 'center' 
        }}
      >
        Loading...
      </Heading>
    </View>
  )
} 