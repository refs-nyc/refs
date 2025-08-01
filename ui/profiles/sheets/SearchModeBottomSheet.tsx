import { c, s } from '@/features/style'
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet'
import { View, Text, Pressable, ScrollView } from 'react-native'
import { XStack, YStack } from '@/ui/core/Stacks'
import { Ionicons } from '@expo/vector-icons'
import { SimplePinataImage } from '@/ui/images/SimplePinataImage'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAppStore } from '@/features/stores'
import { getSearchHistory, type SearchHistoryRecord } from '@/features/pocketbase/api/search'

const HEADER_HEIGHT = s.$8

// Date formatting function with proper relative date framework
const formatSearchHistoryDate = (dateString: string): string => {
  const date = new Date(dateString)
  const now = new Date()

  // Reset time to start of day for accurate day comparison
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  const diffTime = startOfToday.getTime() - startOfDate.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  // Today
  if (diffDays === 0) {
    return 'Today'
  }

  // Yesterday
  if (diffDays === 1) {
    return 'Yesterday'
  }

  // This week (day of week) - 2 to 6 days ago
  if (diffDays >= 2 && diffDays <= 6) {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    return dayNames[date.getDay()]
  }

  // Last week - 7 to 13 days ago
  if (diffDays >= 7 && diffDays <= 13) {
    return 'last week'
  }

  // 2 weeks ago - 14 to 20 days ago
  if (diffDays >= 14 && diffDays <= 20) {
    return '2 weeks ago'
  }

  // 3 weeks ago - 21 to 27 days ago
  if (diffDays >= 21 && diffDays <= 27) {
    return '3 weeks ago'
  }

  // 4 weeks ago - 28 to 34 days ago
  if (diffDays >= 28 && diffDays <= 34) {
    return '4 weeks ago'
  }

  // Last month - 35 to 65 days ago
  if (diffDays >= 35 && diffDays <= 65) {
    return 'last month'
  }

  // 2 months ago - 66 to 95 days ago
  if (diffDays >= 66 && diffDays <= 95) {
    return '2 months ago'
  }

  // 3 months ago - 96 to 125 days ago
  if (diffDays >= 96 && diffDays <= 125) {
    return '3 months ago'
  }

  // 4 months ago - 126 to 155 days ago
  if (diffDays >= 126 && diffDays <= 155) {
    return '4 months ago'
  }

  // 5 months ago - 156 to 185 days ago
  if (diffDays >= 156 && diffDays <= 185) {
    return '5 months ago'
  }

  // 6 months ago - 186 to 215 days ago
  if (diffDays >= 186 && diffDays <= 215) {
    return '6 months ago'
  }

  // 7 months ago - 216 to 245 days ago
  if (diffDays >= 216 && diffDays <= 245) {
    return '7 months ago'
  }

  // 8 months ago - 246 to 275 days ago
  if (diffDays >= 246 && diffDays <= 275) {
    return '8 months ago'
  }

  // 9 months ago - 276 to 305 days ago
  if (diffDays >= 276 && diffDays <= 305) {
    return '9 months ago'
  }

  // 10 months ago - 306 to 335 days ago
  if (diffDays >= 306 && diffDays <= 335) {
    return '10 months ago'
  }

  // 11 months ago - 336 to 365 days ago
  if (diffDays >= 336 && diffDays <= 365) {
    return '11 months ago'
  }

  // For dates beyond 1 year, show the actual date
  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ]
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
  onRestoreSearch?: (historyItem: SearchHistoryRecord) => void
}) {
  const [searchHistory, setSearchHistory] = useState<SearchHistoryRecord[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  // TODO: Implement loading ref images
  const [refImages, setRefImages] = useState<Record<string, string>>({})
  const [loadingRefs, setLoadingRefs] = useState(false)
  const { user, moduleBackdropAnimatedIndex } = useAppStore()

  // Memoize parsed search history to avoid repeated JSON parsing
  const parsedSearchHistory = useMemo(() => {
    return searchHistory.map((item) => {
      return {
        ...item,
        parsedItems: item.ref_ids || [],
        parsedRefTitles: item.ref_titles || [],
        parsedRefImages: item.ref_images || [], // Use actual ref images from API
        parsedSearchResults: item.search_results || [],
        formattedDate: formatSearchHistoryDate(item.created_at),
      }
    })
  }, [searchHistory])

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

      // For now, we'll skip fetching ref images since we need to implement this
      // TODO: Implement ref image fetching from PocketBase or Supabase
      // console.log('📦 Skipping ref image fetch for now')
    } catch (error) {
      console.error('❌ Error fetching ref images:', error)
    } finally {
      setLoadingRefs(false)
    }
  }

  const [isFetchingHistory, setIsFetchingHistory] = useState(false)
  const [lastFetchTime, setLastFetchTime] = useState(0)

  const fetchSearchHistory = async (force = false) => {
    if (!user?.did) return

    // Prevent duplicate requests within 2 seconds
    const now = Date.now()
    if (!force && (isFetchingHistory || now - lastFetchTime < 2000)) {
      return
    }

    setIsFetchingHistory(true)
    setLastFetchTime(now)

    try {
      setLoadingHistory(true)

      // Make API call non-blocking
      getSearchHistory(user.did)
        .then((history) => {
          setSearchHistory(history)
          setLoadingHistory(false)
          setIsFetchingHistory(false)
        })
        .catch((error) => {
          console.error('Error fetching search history:', error)
          setLoadingHistory(false)
          setIsFetchingHistory(false)
        })

      // Skip image fetching for now to improve performance
      // TODO: Implement lazy image loading if needed
    } catch (error) {
      console.error('Error fetching search history:', error)
      setLoadingHistory(false)
      setIsFetchingHistory(false)
    }
  }

  const handleRestoreSearch = (historyItem: SearchHistoryRecord) => {
    if (onRestoreSearch) {
      onRestoreSearch(historyItem)
    }
  }

  // Fetch search history when sheet opens or when user changes (lazy loading)
  useEffect(() => {
    if (open && searchHistory.length === 0) {
      // Only fetch if we don't have data already
      fetchSearchHistory()
    }
  }, [open, user?.did])

  // Also fetch when the sheet index changes (when user drags up) - optimized
  const handleSheetChange = (index: number) => {
    if (index === 1) {
      // When expanded to show history
      // Only fetch if we don't already have data and haven't fetched recently
      if (searchHistory.length === 0 && !isFetchingHistory && !loadingHistory) {
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
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 25,
                height: HEADER_HEIGHT,
              }}
            >
              <Text
                style={{
                  color: c.surface,
                  fontSize: s.$2,
                  fontFamily: 'InterBold',
                  lineHeight: s.$3,
                  letterSpacing: -0.5,
                  flexShrink: 0,
                }}
              >
                Search
              </Text>
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
                    <SimplePinataImage
                      originalSource={item.image || item.expand?.ref?.image}
                      style={{ width: 54, height: 54, borderRadius: 9 }}
                      imageOptions={{ width: 54, height: 54 }}
                    />
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
            <Text
              style={{
                color: 'white',
                fontSize: s.$1,
                fontFamily: 'InterBold',
                marginBottom: s.$2,
              }}
            >
              Recent Searches
            </Text>

            {loadingHistory ? (
              <View style={{ alignItems: 'center', paddingVertical: s.$4 }}>
                <Text style={{ color: 'white', opacity: 0.7 }}>Loading...</Text>
              </View>
            ) : parsedSearchHistory.length > 0 ? (
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 500 }}>
                <YStack gap={s.$3}>
                  {parsedSearchHistory.map((item) => (
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
                        <Text
                          style={{
                            color: 'white',
                            fontSize: s.$1,
                            fontFamily: 'InterBold',
                            lineHeight: 20,
                          }}
                        >
                          {item.parsedRefTitles.length > 0
                            ? `${item.parsedRefTitles.slice(0, 3).join(', ')}${
                                item.parsedRefTitles.length > 3 ? '...' : ''
                              }`
                            : `${item.parsedItems.length} refs`}
                        </Text>
                        <XStack gap={5} style={{ alignItems: 'center', marginTop: 2 }}>
                          {item.parsedRefImages.length > 0 ? (
                            <>
                              {item.parsedRefImages
                                .slice(0, 3)
                                .map((imageUrl: string, idx: number) => (
                                  <View
                                    key={idx}
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
                                      originalSource={imageUrl}
                                      style={{ width: 40, height: 40, borderRadius: 6 }}
                                      imageOptions={{ width: 40, height: 40 }}
                                    />
                                  </View>
                                ))}
                              {item.parsedRefImages.length > 3 && (
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
                                  <Text
                                    style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}
                                  >
                                    +{String(item.parsedRefImages.length - 3)}
                                  </Text>
                                </View>
                              )}
                            </>
                          ) : (
                            // Fallback: show placeholder for old format
                            <View
                              style={{
                                width: 40,
                                height: 40,
                                borderRadius: 6,
                                backgroundColor: c.surface2,
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderWidth: 2,
                                borderColor: c.accent || c.olive,
                              }}
                            >
                              <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>
                                {item.parsedItems.length}
                              </Text>
                            </View>
                          )}
                        </XStack>
                        <Text style={{ color: 'white', fontSize: 12, opacity: 0.5, marginTop: 4 }}>
                          {item.formattedDate}
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
