import React, { useEffect, useState } from 'react'
import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native'
import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet'
import { c, s } from '@/features/style'
import { useAppStore } from '@/features/stores'
import { Avatar } from '../../atoms/Avatar'

interface SearchHistoryItem {
  id: number
  user_id: string
  ref_ids: string[]
  ref_titles: string[]
  search_title: string
  search_subtitle: string
  result_count: number
  created_at: string
  search_results?: any[]
}

interface SearchHistorySheetProps {
  searchHistorySheetRef: React.RefObject<BottomSheet>
  onRestoreSearch?: (item: SearchHistoryItem) => void
}

export default function SearchHistorySheet({
  searchHistorySheetRef,
  onRestoreSearch,
}: SearchHistorySheetProps) {
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAppStore()

  const snapPoints = ['80%', '95%']

  useEffect(() => {
    if (user?.id) fetchSearchHistory()
  }, [user?.id])

  const fetchSearchHistory = async () => {
    try {
      setLoading(true)
      const response = await fetch(`http://localhost:8000/search-history/${user?.id}`)
      if (response.ok) {
        const data = await response.json()
        setSearchHistory(data.history || [])
      }
    } catch (error) {
      // handle error
    } finally {
      setLoading(false)
    }
  }

  const handleRestoreSearch = (item: SearchHistoryItem) => {
    if (onRestoreSearch) onRestoreSearch(item)
    if (searchHistorySheetRef.current) searchHistorySheetRef.current.close()
  }

  const renderBackdrop = (props: any) => <BottomSheetBackdrop {...props} />

  return (
    <BottomSheet
      enableDynamicSizing={false}
      ref={searchHistorySheetRef}
      enablePanDownToClose={true}
      snapPoints={snapPoints}
      index={-1}
      backgroundStyle={{ backgroundColor: c.surface }}
      handleIndicatorStyle={{ backgroundColor: c.muted }}
      backdropComponent={renderBackdrop}
      handleComponent={null}
      keyboardBehavior="interactive"
      style={{ zIndex: 0 }}
    >
      <View style={{ flex: 1, padding: s.$2 }}>
        <Text style={{ fontSize: 22, fontWeight: '600', color: c.accent, marginBottom: s.$4 }}>Search History</Text>
        {loading ? (
                      <ActivityIndicator size="large" color={c.accent} />
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            {searchHistory.map((item, index) => (
              <Pressable
                key={item.id}
                onPress={() => handleRestoreSearch(item)}
                style={({ pressed }) => [
                  {
                    padding: s.$3,
                    backgroundColor: pressed ? c.muted : 'transparent',
                    borderRadius: s.$2,
                    marginBottom: index < searchHistory.length - 1 ? s.$2 : 0,
                  },
                ]}
              >
                <Text style={{ fontSize: 18, fontWeight: '600', color: c.accent, marginBottom: s.$2 }}>People into</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: s.$3 }}>
                  {(item.search_results && item.search_results.length > 0) ? (
                    item.search_results.map((person, idx) => (
                      <Avatar
                        key={person.id || idx}
                        size={64}
                        source={person.avatar_url || person.avatar || undefined}
                        // name={person.name || person.username || 'User'}
                      />
                    ))
                  ) : (
                    <Text style={{ color: c.muted }}>No results</Text>
                  )}
                </View>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>
    </BottomSheet>
  )
} 