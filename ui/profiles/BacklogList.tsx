import { ExpandedItem } from '@/features/types'
import { NativeScrollEvent, NativeSyntheticEvent, Text, TextInput, View } from 'react-native'
import { c, s } from '@/features/style'
import Animated, { FadeIn } from 'react-native-reanimated'
import { YStack } from '../core/Stacks'
import { BottomSheetScrollView } from '@gorhom/bottom-sheet'
import { useEffect, useMemo, useState } from 'react'
import { useCalendars } from 'expo-localization'
import { DateTime } from 'luxon'
import SwipeableBacklogItem from './SwipeableBacklogItem'
import { useAppStore } from '@/features/stores'

const generateGroupNames = () => {
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
  return groupnames
}

const GROUP_NAMES = generateGroupNames()

function groupByDate(items_: ExpandedItem[], timeZone: string) {
  const items = items_.toReversed()
  const groups: ExpandedItem[][] = Array.from({ length: 20 }, () => [])
  const now = DateTime.now().setZone(timeZone)

  for (const item of items) {
    const utcString = item.created.slice(0, -1)

    const dt = DateTime.fromISO(utcString).setZone(timeZone)

    const daysAgo = now.diff(dt, 'days').days

    if (daysAgo >= 6) {
      const month = DateTime.fromISO(utcString).setZone(timeZone).monthLong
      groups[GROUP_NAMES.indexOf(month!)].push(item)
    } else {
      const dayOfWeek = DateTime.fromISO(utcString).setZone(timeZone).weekdayLong

      if (dayOfWeek == now.weekdayLong) {
        groups[0].push(item)
      } else if (dayOfWeek == now.minus({ days: 1 }).weekdayLong) {
        groups[1].push(item)
      } else {
        groups[GROUP_NAMES.indexOf(dayOfWeek!)].push(item)
      }
    }
  }
  return groups
}

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

  const groups = useMemo(() => groupByDate(items, timeZone), [items, timeZone])

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
      const newItems = items.filter((item) => item.id !== i.id)
      setItems(newItems)
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
                  {GROUP_NAMES[i]}
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
