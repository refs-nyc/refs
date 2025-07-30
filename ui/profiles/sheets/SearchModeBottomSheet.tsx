import { c, s } from '@/features/style'
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet'
import { View, Text, Pressable, ScrollView } from 'react-native'
import { XStack, YStack } from '@/ui/core/Stacks'
import { Ionicons } from '@expo/vector-icons'
import { SimplePinataImage } from '@/ui/images/SimplePinataImage'
import { useState, useEffect } from 'react'
import { useAppStore } from '@/features/stores'
import { getSearchHistory, type SearchHistoryItem } from '@/features/pocketbase/api/search'

const HEADER_HEIGHT = s.$8



// Date formatting function
const formatSearchHistoryDate = (dateString: string): string => {
  const date = new Date(dateString)
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - date.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  // Today
  if (diffDays === 0) {
    return 'today'
  }
  
  // Yesterday
  if (diffDays === 1) {
    return 'yesterday'
  }
  
  // This week (day of week)
  if (diffDays <= 7) {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    return dayNames[date.getDay()]
  }
  
  // Last week
  if (diffDays <= 14) {
    return 'last week'
  }
  
  // 2 weeks ago, 3 weeks ago
  if (diffDays <= 21) {
    return '2 weeks ago'
  }
  if (diffDays <= 28) {
    return '3 weeks ago'
  }
  
  // Past month but within a year
  if (diffDays <= 365) {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    const day = date.getDate()
    const suffix = day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'
    return `${monthNames[date.getMonth()]} ${day}${suffix}`
  }
  
  // Past a year
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const day = date.getDate()
  const suffix = day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'
  return `${monthNames[date.getMonth()]} ${day}${suffix}, ${date.getFullYear()}`
}

export default function SearchModeBottomSheet({
  open,
  onClose,
  selectedRefs,
  selectedRefItems,
  onSearch,
  onRestoreSearch,
}: {
  open: boolean
  onClose: () => void
  selectedRefs: string[]
  selectedRefItems: any[]
  onSearch: () => void
  onRestoreSearch?: (historyItem: SearchHistoryItem) => void
}) {
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [refImages, setRefImages] = useState<Record<string, string>>({})
  const [loadingRefs, setLoadingRefs] = useState(false)
  const { user, moduleBackdropAnimatedIndex } = useAppStore()

  const minSnapPoint = s.$1 + HEADER_HEIGHT
  const snapPoints: (string | number)[] = [minSnapPoint, '95%']

  const handleSearch = () => {
    if (selectedRefItems.length > 0) {
      onSearch()
    }
  }

  const fetchRefImages = async (refIds: string[]) => {
    if (refIds.length === 0) return
    
    try {
      setLoadingRefs(true)
      console.log('🔍 Fetching ref images for:', refIds)
      
      // For now, we'll skip fetching ref images since we need to implement this
      // TODO: Implement ref image fetching from PocketBase or Supabase
      console.log('📦 Skipping ref image fetch for now')
      
    } catch (error) {
      console.error('❌ Error fetching ref images:', error)
    } finally {
      setLoadingRefs(false)
    }
  }

  const [isFetchingHistory, setIsFetchingHistory] = useState(false)
  const [lastFetchTime, setLastFetchTime] = useState(0)

  const fetchSearchHistory = async (force = false) => {
    if (!user?.id) return
    
    // Prevent duplicate requests within 2 seconds
    const now = Date.now()
    if (!force && (isFetchingHistory || now - lastFetchTime < 2000)) {
      console.log('🔄 Skipping duplicate search history fetch')
      return
    }
    
    setIsFetchingHistory(true)
    setLastFetchTime(now)
    
    try {
      setLoadingHistory(true)
      console.log('Fetching search history for user:', user.id)
      const history = await getSearchHistory(user.id)
      console.log('Search history data:', history)
      setSearchHistory(history)
      
      // Fetch images for all refs in history
      const allRefIds = new Set<string>()
      history.forEach((item: SearchHistoryItem) => {
        item.search_ref_ids.forEach(refId => allRefIds.add(refId))
      })
      if (allRefIds.size > 0) {
        fetchRefImages(Array.from(allRefIds))
      }
    } catch (error) {
      console.error('Error fetching search history:', error)
    } finally {
      setLoadingHistory(false)
      setIsFetchingHistory(false)
    }
  }

  const handleRestoreSearch = (historyItem: SearchHistoryItem) => {
    if (onRestoreSearch) {
      onRestoreSearch(historyItem)
    }
  }

  // Fetch search history when sheet opens or when user changes
  useEffect(() => {
    if (open) {
      fetchSearchHistory()
    }
  }, [open, user?.id])

  // Also fetch when the sheet index changes (when user drags up)
  const handleSheetChange = (index: number) => {
    if (index === 1) { // When expanded to show history
      // Only fetch if we don't already have data and haven't fetched recently
      if (searchHistory.length === 0 && !isFetchingHistory) {
        fetchSearchHistory()
      }
    }
  }

  return (
    <BottomSheet
      enableDynamicSizing={false}
      index={open ? 1 : 0}
      snapPoints={snapPoints}
      enablePanDownToClose={true}
      onClose={onClose}
      onChange={(i: number) => {
        handleSheetChange(i)
        // Update header dimming
        if (moduleBackdropAnimatedIndex) {
          moduleBackdropAnimatedIndex.value = i
        }
        // Prevent sheet from going off-screen when in search mode
        if (i === -1 && open) {
          // If sheet is trying to close but we're in search mode, keep it at minimized position
          return
        }
      }}
      animatedIndex={moduleBackdropAnimatedIndex}
      backgroundStyle={{ backgroundColor: c.olive, borderRadius: s.$4, paddingTop: 0 }}
      backdropComponent={(p) => (
        <BottomSheetBackdrop 
          {...p} 
          disappearsOnIndex={0} 
          appearsOnIndex={1} 
          pressBehavior="close"
        />
      )}
      handleComponent={null}
      keyboardBehavior="interactive"
    >
      <BottomSheetView>
        <YStack gap={0}>
          {/* Search Button */}
          <Pressable
            onPress={handleSearch}
            style={{ opacity: selectedRefItems.length > 0 ? 1 : 0.5 }}
          >
            <XStack
              gap={5}
              style={{ alignItems: 'center', justifyContent: 'center', paddingHorizontal: 25, height: HEADER_HEIGHT }}
            >
              <Text style={{ color: c.surface, fontSize: s.$2, fontFamily: 'InterBold', lineHeight: s.$3, letterSpacing: -0.5, flexShrink: 0 }}>Search</Text>
              <XStack gap={5} style={{ alignItems: 'center' }}>
                {selectedRefItems.slice(0, 3).map((item, idx) => (
                  <View
                    key={item.id}
                    style={{
                      width: 54,
                      height: 54,
                      borderRadius: 9,
                      overflow: 'hidden',
                      marginHorizontal: 0,
                      marginLeft: idx === 0 ? 8 : -12, // more left padding for first item
                      backgroundColor: c.surface2,
                      borderWidth: 3,
                      borderColor: c.accent || c.olive, // accent border
                    }}
                  >
                    <SimplePinataImage originalSource={item.image || item.expand?.ref?.image} style={{ width: 54, height: 54, borderRadius: 9 }} imageOptions={{ width: 54, height: 54 }} />
                  </View>
                ))}
                {selectedRefItems.length > 3 && (
                  <View
                    key="plus-indicator"
                    style={{
                      width: 54,
                      height: 54,
                      borderRadius: 9,
                      overflow: 'hidden',
                      marginHorizontal: 0,
                      marginLeft: -12,
                      backgroundColor: c.surface2,
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                    }}
                  >
                    <View
                      style={{
                        position: 'absolute',
                        top: -1.5,
                        left: -1.5,
                        right: -1.5,
                        bottom: -1.5,
                        borderRadius: 9,
                        borderWidth: 4,
                        borderColor: c.accent || c.olive,
                        pointerEvents: 'none',
                      }}
                    />
                    <Text style={{ color: c.accent || c.olive, fontSize: 14, fontWeight: 'bold' }}>
                      +{String(selectedRefItems.length - 3)}
                    </Text>
                  </View>
                )}
              </XStack>
              <Ionicons name="arrow-forward" size={34} color={c.surface} />
            </XStack>
          </Pressable>

          {/* Search History Section */}
          <View style={{ paddingHorizontal: 25, paddingTop: s.$3 }}>
            <Text style={{ color: 'white', fontSize: s.$1, fontFamily: 'InterBold', marginBottom: s.$2 }}>
              Recent Searches
            </Text>
            
            {loadingHistory ? (
              <View style={{ alignItems: 'center', paddingVertical: s.$4 }}>
                <Text style={{ color: 'white', opacity: 0.7 }}>Loading...</Text>
              </View>
            ) : searchHistory.length > 0 ? (
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 500 }}>
                <YStack gap={s.$3}>
                  {searchHistory.map((item) => (
                    <Pressable
                      key={item.id}
                      onPress={() => handleRestoreSearch(item)}
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: s.$2,
                        padding: s.$2,
                        borderWidth: 1,
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                      }}
                    >
                      <YStack gap={8}>
                        <Text style={{ color: 'white', fontSize: s.$1, fontFamily: 'InterBold', lineHeight: 20 }}>
                          {item.search_ref_titles.join(', ')}
                        </Text>
                        <XStack gap={5} style={{ alignItems: 'center', marginTop: 2 }}>
                          {item.search_ref_ids.slice(0, 3).map((refId: string, idx: number) => {
                            const imageSource = refImages[refId] || ''
                            console.log(`🖼️ Rendering thumbnail for ref ${refId}:`, imageSource)
                            return (
                              <View
                                key={refId}
                                style={{
                                  width: 40,
                                  height: 40,
                                  borderRadius: 6,
                                  overflow: 'hidden',
                                  marginLeft: idx === 0 ? 0 : -4,
                                  backgroundColor: c.surface2,
                                  borderWidth: 2,
                                  borderColor: c.accent || c.olive,
                                }}
                              >
                                <SimplePinataImage 
                                  originalSource={imageSource} 
                                  style={{ width: 40, height: 40, borderRadius: 6 }} 
                                  imageOptions={{ width: 40, height: 40 }} 
                                />
                              </View>
                            )
                          })}
                          {item.search_ref_ids.length > 3 && (
                            <View
                              style={{
                                width: 40,
                                height: 40,
                                borderRadius: 6,
                                overflow: 'hidden',
                                marginLeft: -4,
                                backgroundColor: c.surface2,
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderWidth: 2,
                                borderColor: c.accent || c.olive,
                              }}
                            >
                              <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>
                                +{String(item.search_ref_ids.length - 3)}
                              </Text>
                            </View>
                          )}
                        </XStack>
                        <Text style={{ color: 'white', fontSize: 12, opacity: 0.5, marginTop: 4 }}>
                          {formatSearchHistoryDate(item.created_at)}
                        </Text>
                      </YStack>
                    </Pressable>
                  ))}
                </YStack>
              </ScrollView>
            ) : (
              <View style={{ alignItems: 'center', paddingVertical: s.$4 }}>
                <Text style={{ color: 'white', opacity: 0.7 }}>No recent searches</Text>
              </View>
            )}
          </View>
        </YStack>
      </BottomSheetView>
    </BottomSheet>
  )
} 