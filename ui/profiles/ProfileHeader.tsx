import Animated, { FadeIn, FadeOut, SlideInRight, Easing } from 'react-native-reanimated'
import { useState, useEffect } from 'react'
import { View, TextInput } from 'react-native'
import { YStack, XStack } from '@/ui/core/Stacks'
import { Heading } from '@/ui/typo/Heading'
import { Shareable } from '@/ui/atoms/Shareable'
import { s, c } from '@/features/style'
import { Link, usePathname } from 'expo-router'
import { Profile } from '@/features/pocketbase/stores/types'
import { Button } from '@/ui/buttons/Button'
import { Avatar } from '../atoms/Avatar'

export const ProfileHeader = ({
  profile,
  onPress,
  onTermChange,
}: {
  profile: Profile
  onPress: () => void
  onTermChange: (s: string) => void
}) => {
  const pathname = usePathname()
  const [searching, setSearching] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const url = 'https://refs.nyc' + pathname

  useEffect(() => {
    onTermChange(searchTerm)
  }, [searchTerm])

  return (
    <YStack
      gap={0}
      style={{
        minWidth: s.$20,
        flexDirection: 'row',
        borderRadius: s.$08,
        marginBottom: s.$075,
        paddingTop: s.$1,
        paddingBottom: s.$075,
      }}
    >
      <XStack
        gap={s.$09}
        style={{ width: '100%', justifyContent: 'space-between', alignItems: 'center' }}
      >
        {!searching ? (
          <Animated.View
            key="header"
            entering={FadeIn.duration(200).delay(100)}
            exiting={FadeOut.duration(200)}
          >
            <XStack
              gap={s.$09}
              style={{ width: '100%', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <Avatar source={profile.image} size={s.$6} />
              <YStack style={{ flex: 1 }} gap={s.$05}>
                <Heading tag="h2">{profile.firstName}</Heading>
                <Heading tag="small">{profile?.location || profile.userName}</Heading>
              </YStack>
              <Button
                variant="raisedSecondary"
                iconButton
                onPress={() => {
                  setSearching(true)
                  onPress()
                }}
                iconBefore="search"
                title=""
              ></Button>
            </XStack>
          </Animated.View>
        ) : (
          <XStack gap={s.$1} style={{ width: '100%', alignItems: 'center' }}>
            <Animated.View
              key="search"
              style={{ flexDirection: 'row', gap: s.$08, flex: 1 }}
              entering={SlideInRight.duration(300).easing(Easing.in(Easing.ease))}
              exiting={FadeOut.duration(200)}
            >
              <TextInput
                autoFocus
                style={{
                  backgroundColor: c.surface2,
                  marginBottom: s.$1,
                  paddingVertical: s.$1,
                  paddingHorizontal: s.$1,
                  borderRadius: s.$075,
                  color: c.black,
                  flex: 1,
                }}
                value={searchTerm}
                placeholderTextColor={c.muted}
                placeholder="Search anything or start typing"
                onChangeText={setSearchTerm}
              />
            </Animated.View>
            <View style={{ transform: 'translateY(-6px)' }}>
              <Button
                style={{ width: 42, height: 42 }}
                variant="raisedSecondary"
                iconButton
                onPress={() => {
                  setSearching(false)
                  setSearchTerm('')
                  onPress()
                }}
                iconBefore="close"
                title=""
              ></Button>
            </View>
          </XStack>
        )}
      </XStack>
    </YStack>
  )
}
