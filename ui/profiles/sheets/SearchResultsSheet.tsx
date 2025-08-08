import { c, s } from '@/features/style'
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet'
import { View, Text, Pressable, Animated, Share } from 'react-native'
import { XStack, YStack } from '@/ui/core/Stacks'
import { SimplePinataImage } from '@/ui/images/SimplePinataImage'
import { Ionicons } from '@expo/vector-icons'

import UserListItem from '@/ui/atoms/UserListItem'
import { Profile } from '@/features/types'
import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  forwardRef,
  useImperativeHandle,
} from 'react'
import { useAppStore } from '@/features/stores'
import {
  searchPeople,
  saveSearchHistory,
  PersonResult,
  SearchHistoryRecord,
} from '@/features/pocketbase/api/search'
import PocketBase from 'pocketbase'


import { SearchLoadingSpinner } from '@/ui/atoms/SearchLoadingSpinner'
import { router } from 'expo-router'

export interface SearchResultsSheetRef {
  triggerSearch: () => void
  restoreSearchFromHistory: (historyItem: SearchHistoryRecord) => void
}

export default forwardRef<
  SearchResultsSheetRef,
  {
    bottomSheetRef: React.RefObject<BottomSheet>;
    selectedRefs: string[];
    selectedRefItems: any[];
  }
>(({ bottomSheetRef, selectedRefs, selectedRefItems }, ref) => {

  const snapPoints = ['25%', '80%']
  const resultsAnimation = useRef(new Animated.Value(0)).current
  const dropdownAnimation = useRef(new Animated.Value(0)).current
  const { user, moduleBackdropAnimatedIndex, registerBackdropPress, unregisterBackdropPress } =
    useAppStore()

  // Register backdrop press handler
  useEffect(() => {
    const key = registerBackdropPress(() => {
      bottomSheetRef.current?.close()
    })
    return () => {
      unregisterBackdropPress(key)
    }
  }, [])

  // Dropdown state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  const animateResultsIn = () => {
    if (hasAnimatedResults.current) {
      return // Don't animate if we've already animated
    }
    
    hasAnimatedResults.current = true
    // Don't set to 0 if we're loading cached results - this causes the flash
    // Only animate from 0 to 1 for fresh searches
    if (searchResults.length === 0) {
      resultsAnimation.setValue(0)
    }
    Animated.timing(resultsAnimation, {
      toValue: 1,
      duration: 300, // Smooth fade-in duration
      useNativeDriver: true,
    }).start()
  }

  const toggleDropdown = () => {
    const toValue = isDropdownOpen ? 0 : 1
    setIsDropdownOpen(!isDropdownOpen)

    Animated.timing(dropdownAnimation, {
      toValue,
      duration: 300,
      useNativeDriver: false,
    }).start()
  }

  const handleShare = async () => {
    try {
      const refTitles = selectedRefItems
        .map((item) => {
          // Try to get title from expand.ref.title first, then fallback to ref_id
          return item.expand?.ref?.title || item.ref || 'Unknown'
        })
        .join(', ')
      const shareMessage = `Check out these people who are into: ${refTitles}\n\nFound via Refs app`

      await Share.share({
        message: shareMessage,
        title: 'People into ' + refTitles,
      })
    } catch (error) {
      console.error('Error sharing:', error)
    }
  }

  const {
    cachedSearchResults,
    cachedSearchTitle,
    cachedSearchSubtitle,
    setCachedSearchResults,
    clearCachedSearchResults,
  } = useAppStore()

  // Search state
  const [searchResults, setSearchResults] = useState<PersonResult[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [searchTitle, setSearchTitle] = useState('People into')
  const [searchSubtitle, setSearchSubtitle] = useState('Browse, dm, or add to a group')

  // Track if we've already used cached results to prevent infinite loops
  const hasUsedCachedResults = useRef(false)
  const hasAnimatedResults = useRef(false)
  
  // Reset flags when component mounts to allow fresh detection of cached results
  useEffect(() => {
    console.log('🔍 SearchResultsSheet mounted, resetting flags')
    hasUsedCachedResults.current = false
    hasAnimatedResults.current = false
  }, [])

  // Create a stable dependency for selectedRefItems
  const selectedRefItemsKey = useMemo(() => {
    return selectedRefItems
      .map((item) => item.id)
      .sort()
      .join(',')
  }, [selectedRefItems])

  // Reset the flag only when explicitly triggered
  // useEffect(() => {
  //   hasUsedCachedResults.current = false
  // }, [selectedRefItemsKey])

  // Track if the sheet is actually open
  const { isSearchResultsSheetOpen, setSearchResultsSheetOpen } = useAppStore()

  // Only show error states when sheet is open, but don't auto-search
  useEffect(() => {
    if (!isSearchResultsSheetOpen) {
      return
    }

    if (!user) {
      setSearchError('Please log in to search')
    } else if (selectedRefItems.length === 0) {
      setSearchError('Please select at least one ref to search')
    } else {
      // Clear any previous errors
      setSearchError(null)
    }
  }, [user, selectedRefItemsKey, isSearchResultsSheetOpen])

  // Separate effect to handle cached results being set after component is open
  useEffect(() => {
    const loadCachedResults = async () => {
      if (cachedSearchResults.length > 0 && !hasUsedCachedResults.current && !isLoading) {
        console.log('🔄 Loading cached search results into sheet...')
        
        // Check if we already have the same results loaded to prevent duplicate loading
        const currentResultsKey = searchResults.map(r => r.id).sort().join(',')
        const cachedResultsKey = cachedSearchResults.map(r => r.id).sort().join(',')
        
        if (currentResultsKey === cachedResultsKey && searchResults.length > 0) {
          console.log('⏸️ Same results already loaded, but still opening sheet...')
          hasUsedCachedResults.current = true
          // Don't return - still need to open the sheet even if results are the same
        }
        
        setSearchResults(cachedSearchResults)
        setSearchTitle(cachedSearchTitle)
        setSearchSubtitle(cachedSearchSubtitle)
        setIsLoading(false)
        setSearchError(null)
        hasUsedCachedResults.current = true
        
        // Only reset animation flag if we're actually loading new results
        if (searchResults.length === 0 || currentResultsKey !== cachedResultsKey) {
          hasAnimatedResults.current = false
        }

        // Convert cached results to profiles immediately
        animateResultsIn() // Start animation immediately
        const convertedProfiles = await convertToProfiles(cachedSearchResults)
        setProfiles(convertedProfiles)
        console.log('✅ Successfully loaded cached results into sheet')
        
        // Auto-open the sheet when we have cached results
        if (bottomSheetRef.current) {
          console.log('📱 Auto-opening sheet with cached results...')
          // Small delay to ensure BottomSheet is fully initialized
          setTimeout(() => {
            if (bottomSheetRef.current) {
              try {
                // Try index 1 first (80% open), fallback to index 0 (25% open)
                bottomSheetRef.current.snapToIndex(1)
              } catch (error) {
                console.log('📱 Falling back to index 0 for sheet opening...')
                bottomSheetRef.current.snapToIndex(0)
              }
            }
          }, 100)
        }
      }
    }
    
    loadCachedResults()
  }, [cachedSearchResults.length, cachedSearchTitle, cachedSearchSubtitle, isLoading]) // Only depend on length, not the full array



  // Function to restore search from history
  const restoreSearchFromHistory = useCallback(async (historyItem: SearchHistoryRecord) => {
    try {
      console.log('🔄 Restoring search from history...')
      // Check if we have cached search results
      if (
        historyItem.search_results &&
        Array.isArray(historyItem.search_results) &&
        historyItem.search_results.length > 0
      ) {
        // Set the search results directly from history
        setSearchResults(historyItem.search_results)
        setSearchTitle(historyItem.search_title || 'People into')
        setSearchSubtitle(historyItem.search_subtitle || 'Browse, dm, or add to a group')

        // Update the cached search results in the global store for back button navigation
        setCachedSearchResults(
          historyItem.search_results,
          historyItem.search_title || 'People into',
          historyItem.search_subtitle || 'Browse, dm, or add to a group',
          historyItem.ref_titles || [],
          historyItem.ref_images || []
        )

        setIsLoading(false)
        setSearchError(null)
        // Don't set hasUsedCachedResults to true here - let the cached results system handle it
        // hasUsedCachedResults.current = true

        // Convert cached results to profiles immediately
        animateResultsIn() // Start animation immediately
        const convertedProfiles = await convertToProfiles(historyItem.search_results)
        setProfiles(convertedProfiles)
        console.log('✅ Successfully restored search from history')
      } else {
        setSearchError('Cannot restore search from history (no cached results)')
      }
    } catch (error) {
      console.error('Error restoring search from history:', error)
      setSearchError('Failed to restore search from history')
    }
  }, [])

  // Fallback function to get some users when search returns no results
  const getFallbackUsers = async (): Promise<PersonResult[]> => {
    try {
      // Call Supabase search with empty item_ids to get fallback users
      const response = await searchPeople({
        user_id: user?.id || '',
        item_ids: [], // Empty to get all users
        limit: 20,
      })

      return response.results || []
    } catch (error) {
      console.error('Error getting fallback users:', error)
    }

    // Return empty array if fallback fails
    return []
  }

  const performSearch = async () => {
    if (!user) {
      setSearchError('Please log in to search')
      return
    }

    if (selectedRefItems.length === 0) {
      setSearchError('Please select at least one ref to search')
      return
    }

    // Prevent multiple simultaneous searches
    if (isLoading) {
      return
    }

    setIsLoading(true)
    setSearchError(null)

    try {
      // Extract item IDs for search
      const itemIds = selectedRefItems.map((item) => item.id).filter(Boolean)

      if (itemIds.length === 0) {
        throw new Error('No valid item IDs found')
      }

      const response = await searchPeople({
        user_id: user.id,
        item_ids: itemIds,
        limit: 60,
      })

      // Always show results, even if empty - never leave user empty-handed
      let results = response.results || []

      // If no results found, get fallback users
      if (results.length === 0) {
        const fallbackUsers = await getFallbackUsers()
        results = fallbackUsers
      }

      setSearchResults(results)

      // Convert search results to profiles immediately (no placeholder flash)
      const convertedProfiles = await convertToProfiles(results)
      setProfiles(convertedProfiles)
      setIsLoading(false) // End loading state once we have real profiles

      // Generate search title and subtitle
      const refTitles = selectedRefItems
        .map((item) => {
          // Try to get title from expand.ref.title first, then fallback to ref_id
          return item.expand?.ref?.title || item.ref || 'Unknown'
        })
        .filter(Boolean)
        .slice(0, 3)
        .join(', ')

      if (response.results && response.results.length > 0) {
        // Original search had results
        setSearchTitle('People into')
        setSearchSubtitle('Browse, dm, or add to a group')

        // Extract ref titles and images from selectedRefItems
        let refTitles = selectedRefItems.map(
          (item) => item.expand?.ref?.title || item.ref || 'Unknown'
        )
        const refImages = selectedRefItems.map(
          (item) => item.image || item.expand?.ref?.image || ''
        )

        // Cache results with ref titles and images
        setCachedSearchResults(response.results, 'People into', 'Browse, dm, or add to a group', refTitles, refImages)
      } else if (results.length > 0) {
        // Using fallback users
        setSearchTitle('People into')
        setSearchSubtitle('Browse, dm, or add to a group')

        // Extract ref titles and images from selectedRefItems
        let refTitles = selectedRefItems.map(
          (item) => item.expand?.ref?.title || item.ref || 'Unknown'
        )
        const refImages = selectedRefItems.map(
          (item) => item.image || item.expand?.ref?.image || ''
        )

        // Cache fallback results with ref titles and images
        setCachedSearchResults(results, 'People into', 'Browse, dm, or add to a group', refTitles, refImages)
      } else {
        // No results at all
        setSearchTitle('People into')
        setSearchSubtitle('No users found, try different refs')

        // Cache empty results
        setCachedSearchResults([], 'People into', 'No users found, try different refs', [], [])
      }

      // Save to search history with ref titles, images, and cached results
      try {
        // Extract ref titles and images from selectedRefItems (if not already extracted)
        let refTitles = selectedRefItems.map(
          (item) => item.expand?.ref?.title || item.ref || 'Unknown'
        )
        const refImages = selectedRefItems.map(
          (item) => item.image || item.expand?.ref?.image || ''
        )

        // If any ref titles are still raw IDs, try to fetch them from PocketBase
        const needsRefTitles = refTitles.some(
          (title) => title.length > 10 && /^[a-z0-9]+$/.test(title)
        )
        if (needsRefTitles) {
          const pocketbase = new PocketBase(
            process.env.EXPO_PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090'
          )

          try {
            const refIds = selectedRefItems.map((item) => item.ref).filter(Boolean)
            const refs = await pocketbase.collection('refs').getList(1, 50, {
              filter: refIds.map((id) => `id = "${id}"`).join(' || '),
              fields: 'id,title',
            })

            const refMap = new Map(refs.items.map((ref) => [ref.id, ref.title]))
            refTitles = selectedRefItems.map(
              (item) => refMap.get(item.ref) || item.expand?.ref?.title || item.ref || 'Unknown'
            )
          } catch (error) {
            console.error('Failed to fetch ref titles from PocketBase:', error)
          }
        }

        await saveSearchHistory(user.id, itemIds, refTitles, refImages, results, results.length)
      } catch (error) {
        console.error('Failed to save search history:', error)
      }

      animateResultsIn()
    } catch (error) {
      console.error('Search failed:', error)
      setSearchError(error instanceof Error ? error.message : 'Search failed')
      setSearchResults([])
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch user profiles from PocketBase and convert to Profile format for UserListItem
  const convertToProfiles = async (results: PersonResult[]): Promise<Profile[]> => {
    const pocketbase = new PocketBase(
      process.env.EXPO_PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090'
    )

    try {
      // Limit to first 10 results for better performance
      const limitedResults = results.slice(0, 10)
      const userIds = limitedResults.map((result) => result.id)

      // Use more efficient query with proper escaping
      const filter = userIds.map((id) => `id = "${id}"`).join(' || ')

      const userProfiles = await pocketbase.collection('users').getList(1, 10, {
        filter,
        fields: 'id,userName,name,firstName,lastName,image',
        perPage: 10,
      })

      // Create a map for O(1) lookup
      const userMap = new Map(userProfiles.items.map((user) => [user.id, user]))

      // Convert search results to Profile format
      return limitedResults.map((result) => {
        const userProfile = userMap.get(result.id)

        if (userProfile) {
          // Optimize name construction
          const displayName =
            userProfile.firstName && userProfile.lastName
              ? `${userProfile.firstName} ${userProfile.lastName}`
              : userProfile.userName || 'Unknown'

          return {
            id: result.id,
            userName: userProfile.userName || displayName,
            firstName: userProfile.firstName || userProfile.userName || '',
            lastName: userProfile.lastName || '',
            image: userProfile.image || '',
            avatar: userProfile.image || '',
            location: '',
            email: '',
            password: '',
            tokenKey: '',
            name: displayName,
          }
        } else {
          // Fallback if user profile not found
          return {
            id: result.id,
            userName: 'Unknown User',
            firstName: 'Unknown',
            lastName: '',
            image: '',
            avatar: '',
            location: '',
            email: '',
            password: '',
            tokenKey: '',
          }
        }
      })
    } catch (error) {
      console.error('Error fetching user profiles from PocketBase:', error)
      // Return fallback profiles if PocketBase fetch fails
      return results.slice(0, 10).map((result) => ({
        id: result.id,
        userName: 'Unknown User',
        firstName: 'Unknown',
        lastName: '',
        image: '',
        avatar: '',
        location: '',
        email: '',
        password: '',
        tokenKey: '',
      }))
    }
  }

  const handleUserPress = (profile: Profile) => {
    // Navigate to user profile using push
    // The search context is preserved in global state and will be restored on back
    router.push(`/user/${profile.userName}`)
  }

  const handleClose = () => {
    console.log('🔍 SearchResultsSheet handleClose called - preserving cached results')
    // Don't clear cached results when closing - preserve them for back button navigation
    // clearCachedSearchResults()
  }

  // Function to trigger search - can be called from parent component
  const triggerSearch = useCallback(() => {
    if (!user || selectedRefItems.length === 0) {
      return
    }

    // Clear cached results when starting a new search
    console.log('🔍 Clearing cached results for new search')
    clearCachedSearchResults()

    // Reset the flags when explicitly triggering a new search
    hasUsedCachedResults.current = false
    hasAnimatedResults.current = false

    // Temporarily disable 7-string check for testing
    // const itemsWithoutSevenStrings = selectedRefItems.filter(item => !item.seven_string)
    // if (itemsWithoutSevenStrings.length > 0) {
    //   console.log('⚠️ Some items missing 7-strings:', itemsWithoutSevenStrings.map(item => item.id))
    //   setSearchError('Some items are still being processed. Please try again in a moment.')
    //   return
    // }

    performSearch()
  }, [user, selectedRefItems, performSearch])

  // Expose triggerSearch function to parent via ref
  useImperativeHandle(
    ref,
    () => ({
      triggerSearch,
      restoreSearchFromHistory,
    }),
    [triggerSearch, restoreSearchFromHistory]
  )

  const renderBackdrop = useCallback(
    (p: any) => (
      <BottomSheetBackdrop {...p} disappearsOnIndex={-1} appearsOnIndex={0} pressBehavior="close" />
    ),
    []
  )

  return (
    <BottomSheet
      enableDynamicSizing={false}
      ref={bottomSheetRef}
      enablePanDownToClose={true}
      snapPoints={snapPoints}
      index={-1}
      backgroundStyle={{ backgroundColor: c.surface, borderRadius: s.$4 }}
      handleIndicatorStyle={{ backgroundColor: 'transparent' }}
      style={{ zIndex: 100 }}
      backdropComponent={renderBackdrop}
      animatedIndex={moduleBackdropAnimatedIndex}
      onAnimate={(fromIndex: number, toIndex: number) => {
        // The animatedIndex prop handles the animation automatically
        // No need to manually set headerBackdropAnimatedIndex.value
      }}
      onChange={(i: number) => {
        if (i === -1) {
          handleClose()
          setSearchResultsSheetOpen(false)
              
        } else if (i === 0 || i === 1) {
          setSearchResultsSheetOpen(true)
          // Don't reset the flag here - let the triggerSearch function handle it
        }
      }}
    >
      <View style={{ paddingHorizontal: s.$3, paddingVertical: s.$1, height: '100%' }}>
        {/* Header with title and thumbnails */}
        <View
          style={{
            paddingBottom: isDropdownOpen ? s.$1 + 10 : s.$1,
            marginTop: -10,
          }}
        >
          {/* Title and thumbnails row */}
          <Pressable
            onPress={toggleDropdown}
            style={{ flexDirection: 'row', alignItems: 'center' }}
          >
            <View style={{ flex: 1, minWidth: 0, justifyContent: 'center' }}>
              <Text
                style={{
                  fontSize: s.$2,
                  fontFamily: 'InterBold',
                  color: c.black,
                  lineHeight: 48,
                }}
              >
                {searchTitle}
              </Text>
            </View>

            {/* Thumbnails of selected refs */}
            <XStack gap={2} style={{ alignItems: 'center', marginRight: -8 }}>
              {selectedRefItems.slice(0, 3).map((item, idx) => (
                <View
                  key={item.id}
                  style={{
                    width: 43,
                    height: 43,
                    borderRadius: 6,
                    overflow: 'hidden',
                    marginLeft: idx === 0 ? 0 : -9,
                    backgroundColor: c.surface2,
                    borderWidth: 2,
                    borderColor: c.surface2,
                  }}
                >
                  <SimplePinataImage
                    originalSource={item.image || item.expand?.ref?.image}
                    style={{ width: 43, height: 43, borderRadius: 6 }}
                    imageOptions={{ width: 43, height: 43 }}
                  />
                </View>
              ))}
              {selectedRefItems.length > 3 && (
                <View
                  style={{
                    width: 43,
                    height: 43,
                    borderRadius: 6,
                    overflow: 'hidden',
                    marginLeft: -9,
                    backgroundColor: c.surface2,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 2,
                    borderColor: c.surface2,
                  }}
                >
                  <Text style={{ color: c.grey2, fontSize: 13, fontWeight: 'bold' }}>
                    +{String(selectedRefItems.length - 3)}
                  </Text>
                </View>
              )}
            </XStack>
          </Pressable>

          {/* Dropdown with ref titles */}
          <Animated.View
            style={{
              maxHeight: dropdownAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [0, selectedRefItems.length * 40],
              }),
              overflow: 'hidden',
              marginTop: 8,
            }}
          >
            <YStack gap={8}>
              {selectedRefItems.map((item, idx) => (
                <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 4,
                      overflow: 'hidden',
                      marginRight: 12,
                      backgroundColor: c.surface2,
                      borderWidth: 1,
                      borderColor: c.surface2,
                    }}
                  >
                    <SimplePinataImage
                      originalSource={item.image || item.expand?.ref?.image}
                      style={{ width: 32, height: 32, borderRadius: 4 }}
                      imageOptions={{ width: 32, height: 32 }}
                    />
                  </View>
                  <Text
                    style={{
                      color: c.grey2,
                      fontSize: 14,
                      opacity: 0.5,
                      lineHeight: 18,
                      flex: 1,
                    }}
                  >
                    {item.title || item.expand?.ref?.title || 'Unknown'}
                  </Text>
                </View>
              ))}
            </YStack>
          </Animated.View>

          {/* Subtitle on its own line */}
          <View style={{ height: 8 }} />
          <Text
            style={{
              color: c.grey2,
              lineHeight: 20,
              fontSize: 14,
              marginTop: (isDropdownOpen ? 10 : 0) - 10,
            }}
          >
            {searchSubtitle}
          </Text>
        </View>

        <BottomSheetScrollView
          alwaysBounceVertical={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          <YStack style={{ marginTop: 10 }}>
            {isLoading ? (
              <View style={{ marginTop: 30 }}>
                <SearchLoadingSpinner />
              </View>
            ) : searchError ? (
              <View
                style={{
                  justifyContent: 'center',
                  alignItems: 'center',
                  paddingHorizontal: s.$4,
                  paddingVertical: s.$4,
                }}
              >
                <Ionicons name="alert-circle-outline" size={48} color={c.grey2} />
                <Text
                  style={{
                    fontSize: s.$2,
                    color: c.grey2,
                    textAlign: 'center',
                    marginTop: s.$3,
                  }}
                >
                  {searchError}
                </Text>
              </View>
            ) : searchResults.length > 0 ? (
              <Animated.View
                style={{
                  opacity: resultsAnimation,
                  transform: [
                    {
                      translateY: resultsAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [15, 0],
                      }),
                    },
                  ],
                }}
              >
                {profiles.map((profile, index) => (
                  <UserListItem
                    key={profile.id}
                    user={profile}
                    small={false}
                    onPress={() => handleUserPress(profile)}
                    style={{ paddingHorizontal: 0 }}
                  />
                ))}
              </Animated.View>
            ) : null}
          </YStack>
        </BottomSheetScrollView>

        {/* Share button styled like message/save/backlog module */}
        {selectedRefItems.length > 0 && (
          <View
            style={{
              position: 'absolute',
              bottom: -10,
              left: 0,
              right: 0,
              backgroundColor: c.olive,
              borderRadius: 50,
              paddingTop: 0,
              paddingBottom: 50,
            }}
          >
            <Pressable
              onPress={handleShare}
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: s.$4,
                paddingVertical: 10,
                paddingHorizontal: s.$2,
                minWidth: s.$8,
                backgroundColor: c.accent,
                height: 47,
                marginHorizontal: 20,
                marginTop: 20,
              }}
            >
              <Text
                style={{
                  color: c.surface,
                  fontSize: 24,
                  fontFamily: 'InterBold',
                  textAlign: 'center',
                }}
              >
                Share list
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </BottomSheet>
  )
})
