import React from 'react'
import { ExpandedItem } from '@/features/types'
import { NativeScrollEvent, NativeSyntheticEvent, Text, TextInput, View, FlatList, ListRenderItem } from 'react-native'
import { c, s } from '@/features/style'
import Animated, { FadeIn } from 'react-native-reanimated'
import { YStack } from '../core/Stacks'
import { BottomSheetScrollView } from '@gorhom/bottom-sheet'
import { useEffect, useState, useMemo, useCallback } from 'react'
import { useCalendars } from 'expo-localization'
import { DateTime } from 'luxon'
import SwipeableBacklogItem from './SwipeableBacklogItem'
import { useAppStore } from '@/features/stores'

// Memoized row component to prevent unnecessary re-renders
const BacklogItemRow = React.memo(({ item, onActionPress, enabled }: {
  item: ExpandedItem
  onActionPress: () => void
  enabled: boolean
}) => (
  <SwipeableBacklogItem
    key={item.id}
    item={item}
    onActionPress={onActionPress}
    enabled={enabled}
  />
))

BacklogItemRow.displayName = 'BacklogItemRow'

// Section data structure for FlatList
type SectionData = {
  title: string
  data: ExpandedItem[]
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

  // Memoize grouped data to prevent recalculation on every render
  const groupedData = useMemo(() => {
    const groups = groupByDate(items)
    const sections: SectionData[] = []
    
    groups.forEach((group, index) => {
      if (group.length > 0) {
        const filteredGroup = group.filter(item =>
          item.expand?.ref?.title?.toLowerCase().includes(searchTerm.toLowerCase())
        )
        if (filteredGroup.length > 0) {
          sections.push({
            title: groupnames[index],
            data: filteredGroup
          })
        }
      }
    })
    
    return sections
  }, [items, searchTerm, timeZone])

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

  // Memoize callback to prevent recreation on every render
  const onRemoveFromBacklog = useCallback(async (i: ExpandedItem): Promise<void> => {
    try {
      await removeItem(i.id)
      setItems(items.filter((item) => item.id !== i.id))
    } catch (error) {
      console.error(error)
    }
  }, [removeItem, items])

  // Memoize render item function
  const renderItem: ListRenderItem<ExpandedItem> = useCallback(({ item }) => (
    <BacklogItemRow
      item={item}
      onActionPress={() => onRemoveFromBacklog(item)}
      enabled={ownProfile}
    />
  ), [onRemoveFromBacklog, ownProfile])

  // Memoize section header renderer
  const renderSectionHeader = useCallback(({ section }: { section: SectionData }) => (
    <View style={{ paddingVertical: s.$05, paddingHorizontal: s.$075 }}>
      <Text style={{ color: c.surface, fontSize: s.$1, paddingBottom: s.$05 }}>
        {section.title}
      </Text>
    </View>
  ), [])

  // Memoize key extractor
  const keyExtractor = useCallback((item: ExpandedItem) => item.id, [])

  return (
    <View style={{ backgroundColor: c.olive, flex: 1 }}>
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
        
        <FlatList
          data={groupedData}
          renderItem={({ item: section }) => (
            <View>
              {renderSectionHeader({ section })}
              <FlatList
                data={section.data}
                renderItem={renderItem}
                keyExtractor={keyExtractor}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
                removeClippedSubviews={true}
                initialNumToRender={5}
                maxToRenderPerBatch={10}
                windowSize={5}
                style={{ paddingHorizontal: s.$1 }}
              />
            </View>
          )}
          keyExtractor={(section) => section.title}
          onScroll={onScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
          initialNumToRender={3}
          maxToRenderPerBatch={5}
          windowSize={7}
          style={{ paddingHorizontal: s.$1, paddingBottom: s.$10 }}
        />
      </Animated.View>
    </View>
  )
}
