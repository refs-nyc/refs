import { ExpandedItem } from '@/features/pocketbase/stores/types'
import { NativeScrollEvent, NativeSyntheticEvent, Text, TextInput, View } from 'react-native'
import { c, s } from '@/features/style'
import Animated, { FadeIn } from 'react-native-reanimated'
import { YStack } from '../core/Stacks'
import { BottomSheetScrollView } from '@gorhom/bottom-sheet'
import { useEffect, useState } from 'react'
import { useCalendars } from 'expo-localization'
import { DateTime } from 'luxon'
import SwipeableBacklogItem from './SwipeableBacklogItem'
import { useAppStore } from '@/features/pocketbase'

export default function BacklogList({
  items: itemsInit,
  ownProfile,
}: {
  items: ExpandedItem[]
  ownProfile: boolean
}) {
  const [showSearch, setShowSearch] = useState(false)
  const [hasScrolled, setHasScrolled] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [items, setItems] = useState<ExpandedItem[]>(itemsInit)
  const { removeItem } = useAppStore()
  const calendars = useCalendars()
  const timeZone = calendars[0].timeZone || 'America/New_York'

  useEffect(() => {
    if (itemsInit.length) setItems(itemsInit)
  }, [itemsInit])

  const groupnames = ['Today', 'Yesterday']

  for (let i = 2; i < 7; i++) {
    groupnames.push(
      new Date(Date.now() - i * 86400000).toLocaleDateString('en-US', { weekday: 'long' })
    )
  }
  for (let i = 0; i < 12; i++) {
    groupnames.push(
      new Date(Date.now() - i * 30 * 86400000).toLocaleDateString('en-US', { month: 'long' })
    )
  }
  groupnames.push('Older')

  function groupByDate(items: ExpandedItem[]) {
    const groups: ExpandedItem[][] = Array.from({ length: 20 }, () => [])
    const now = DateTime.now().setZone(timeZone)

    for (const item of items) {
      const utcString = item.created.slice(0, -1)

      const dt = DateTime.fromFormat(utcString, 'yyyy-MM-dd HH:mm:ss.SSS', {
        zone: 'utc',
      }).setZone(timeZone)

      const daysAgo = now.diff(dt, 'days').days

      if (daysAgo >= 6) {
        const month = DateTime.fromFormat(utcString, 'yyyy-MM-dd HH:mm:ss.SSS', {
          zone: 'utc',
        }).setZone(timeZone).monthLong
        groups[groupnames.indexOf(month!)].push(item)
      } else {
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

  async function onRemoveFromBacklog(i: ExpandedItem): Promise<void> {
    try {
      await removeItem(i.id)
      setItems(items.filter((item) => item.id !== i.id))
    } catch (error) {
      console.error(error)
    }
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
            autoFocus
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
                    <SwipeableBacklogItem
                      key={i.id}
                      item={i}
                      onActionPress={() => onRemoveFromBacklog(i)}
                      enabled={ownProfile}
                    />
                  ))}
              </View>
            )
          )}
        </YStack>
      </Animated.View>
    </BottomSheetScrollView>
  )
}
