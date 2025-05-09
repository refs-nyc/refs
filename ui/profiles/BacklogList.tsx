import { ExpandedItem } from '@/features/pocketbase/stores/types'
import { Pressable } from 'react-native-gesture-handler'
import {
  Linking,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SimplePinataImage } from '../images/SimplePinataImage'
import { c, s } from '@/features/style'
import Animated, { FadeIn } from 'react-native-reanimated'
import { XStack, YStack } from '../core/Stacks'
import { BottomSheetScrollView } from '@gorhom/bottom-sheet'
import { useState } from 'react'
import { useCalendars } from 'expo-localization'
import { DateTime } from 'luxon'
import { Ionicons } from '@expo/vector-icons'

export default function BacklogList({ items }: { items: ExpandedItem[] }) {
  const [showSearch, setShowSearch] = useState(false)
  const [hasScrolled, setHasScrolled] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const calendars = useCalendars()
  const timeZone = calendars[0].timeZone || 'America/New_York'

  const groupnames = ['Today', 'Yesterday']

  for (let i = 2; i < 7; i++) {
    groupnames.push(
      new Date(Date.now() - i * 86400000).toLocaleDateString('en-US', { weekday: 'long' })
    )
  }
  groupnames.push('Older')

  function groupByDate(items: ExpandedItem[]) {
    const groups: ExpandedItem[][] = Array.from({ length: 8 }, () => [])
    const now = DateTime.now().setZone(timeZone)

    for (const item of items) {
      const dt = DateTime.fromFormat(item.created.slice(0, -1), 'yyyy-MM-dd HH:mm:ss.SSS', {
        zone: 'utc',
      }).setZone(timeZone)

      const daysAgo = now.diff(dt, 'days').days
      if (daysAgo >= 6) {
        groups[7].push(item)
      } else {
        const utcString = item.created.slice(0, -1)
        const dayOfWeek = DateTime.fromFormat(utcString, 'yyyy-MM-dd HH:mm:ss.SSS', {
          zone: 'utc',
        }).setZone(timeZone).weekdayLong
        if (dayOfWeek == now.weekdayLong) {
          groups[0].push(item)
        } else if (dayOfWeek == now.minus({ days: 1 }).weekdayLong) {
          groups[1].push(item)
        } else {
          groups[groupnames.indexOf(dayOfWeek!)].push(item)
        }
      }
    }
    return groups
  }

  const groups = groupByDate(items)

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    if (!hasScrolled && e.nativeEvent.contentOffset.y > 150) {
      setHasScrolled(true)
    }
    if (!showSearch && hasScrolled && e.nativeEvent.contentOffset.y < 100) {
      setShowSearch(true)
    }
  }

  const onSearchTermChange = (searchTerm: string) => {
    setSearchTerm(searchTerm)
  }

  return (
    <BottomSheetScrollView style={{ backgroundColor: c.olive }} onScroll={onScroll}>
      <Animated.View entering={FadeIn.duration(500)}>
        {showSearch && (
          <TextInput
            style={{
              width: '80%',
              marginHorizontal: 'auto',
              marginBottom: s.$1,
              paddingVertical: s.$08,
              paddingHorizontal: s.$1,
              borderRadius: s.$1,
              color: c.white,
              borderWidth: 1,
              borderColor: c.white,
              fontSize: s.$1,
            }}
            value={searchTerm}
            placeholderTextColor={c.white}
            placeholder="Search anything"
            onChangeText={onSearchTermChange}
          />
        )}
        <YStack gap={s.$1} style={{ paddingHorizontal: s.$1, paddingBottom: s.$10 }}>
          {groups.map((g, i) =>
            !g.length ? null : (
              <View key={i} style={{ paddingVertical: s.$05, paddingHorizontal: s.$075 }}>
                <Text style={{ color: c.surface, fontSize: s.$1, paddingBottom: s.$05 }}>
                  {groupnames[i]}
                </Text>
                {g
                  .filter((i) =>
                    i.expand?.ref?.title?.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((i) => (
                    <XStack
                      key={i.id}
                      gap={s.$1}
                      style={{
                        paddingVertical: s.$05,
                        paddingHorizontal: s.$1,
                        alignItems: 'center',
                      }}
                    >
                      <SimplePinataImage
                        originalSource={i.image}
                        imageOptions={{ width: s.$2, height: s.$2 }}
                        style={{
                          width: s.$2,
                          height: s.$2,
                          borderRadius: s.$075,
                          backgroundColor: c.olive2,
                        }}
                      />
                      <Text
                        style={{ color: c.white, fontSize: s.$1, width: '80%' }}
                        numberOfLines={2}
                      >
                        {i.expand?.ref?.title?.trim()}
                      </Text>
                      {i.expand?.ref?.url && (
                        <Pressable onPress={() => Linking.openURL(i.expand.ref.url!)}>
                          <Ionicons
                            name="arrow-up"
                            size={s.$2}
                            color={c.white}
                            style={{ transform: 'rotate(45deg)' }}
                          />
                        </Pressable>
                      )}
                    </XStack>
                  ))}
              </View>
            )
          )}
        </YStack>
      </Animated.View>
    </BottomSheetScrollView>
  )
}
