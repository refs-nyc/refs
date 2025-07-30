import { c, s } from '@/features/style'
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet'
import { View, Text, Pressable, Animated, Share } from 'react-native'
import { XStack, YStack } from '@/ui/core/Stacks'
import { Heading } from '@/ui/typo/Heading'
import { SimplePinataImage } from '@/ui/images/SimplePinataImage'
import { Ionicons } from '@expo/vector-icons'

import UserListItem from '@/ui/atoms/UserListItem'
import { Profile } from '@/features/types'
import { useState, useRef, useEffect, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react'
import { useAppStore } from '@/features/stores'
import { searchPeople, SearchResponse, PersonResult } from '@/features/pocketbase/api/search'
import { SearchLoadingSpinner } from '@/ui/atoms/SearchLoadingSpinner'
import { router } from 'expo-router'
// import OffScreenButton from '@/ui/buttons/OffScreenButton'
import { Button } from '@/ui/buttons/Button'

export interface SearchResultsSheetRef {
  triggerSearch: () => void;
};

export default forwardRef<SearchResultsSheetRef, {
  bottomSheetRef: React.RefObject<BottomSheet>
  selectedRefs: string[]
  selectedRefItems: any[]
}>(({ bottomSheetRef, selectedRefs, selectedRefItems }, ref) => {
  const snapPoints = ['25%', '80%']
  const resultsAnimation = useRef(new Animated.Value(0)).current
  const dropdownAnimation = useRef(new Animated.Value(0)).current
  const { 
    user, 
    moduleBackdropAnimatedIndex, 
    registerBackdropPress, 
    unregisterBackdropPress 
  } = useAppStore()
  
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
    resultsAnimation.setValue(0)
    Animated.timing(resultsAnimation, {
      toValue: 1,
      duration: 400,
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
      const refTitles = selectedRefItems.map(item => item.title || item.expand?.ref?.title || 'Unknown').join(', ')
      const shareMessage = `Check out these people who are into: ${refTitles}\n\nFound via Refs app`
      
      await Share.share({
        message: shareMessage,
        title: 'People into ' + refTitles,
      })
    } catch (error) {
      console.error('Error sharing:', error)
    }
  }
  
  const { setReturningFromSearch, cachedSearchResults, cachedSearchTitle, cachedSearchSubtitle, setCachedSearchResults, clearCachedSearchResults } = useAppStore()
  
  // Search state
  const [searchResults, setSearchResults] = useState<PersonResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [searchTitle, setSearchTitle] = useState('People into')
  const [searchSubtitle, setSearchSubtitle] = useState('Browse, dm, or add to a group')
  
  // Track if we've already used cached results to prevent infinite loops
  const hasUsedCachedResults = useRef(false)
  
  // Create a stable dependency for selectedRefItems
  const selectedRefItemsKey = useMemo(() => {
    return selectedRefItems.map(item => item.id).sort().join(',')
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
      console.log('❌ User not logged in')
      setSearchError('Please log in to search')
    } else if (selectedRefItems.length === 0) {
      console.log('❌ No selected ref items')
      setSearchError('Please select at least one ref to search')
    } else {
      // Clear any previous errors
      setSearchError(null)
    }
  }, [user, selectedRefItemsKey, isSearchResultsSheetOpen])

  // Separate effect to handle cached results being set after component is open
  useEffect(() => {
    if (cachedSearchResults.length > 0 && !hasUsedCachedResults.current) {
      console.log('✅ Cached results set after component opened, using them now')
      setSearchResults(cachedSearchResults)
      setSearchTitle(cachedSearchTitle)
      setSearchSubtitle(cachedSearchSubtitle)
      setIsLoading(false)
      setSearchError(null)
      hasUsedCachedResults.current = true
      animateResultsIn()
    }
  }, [cachedSearchResults, cachedSearchTitle, cachedSearchSubtitle])

  const performSearch = async () => {
    console.log('🔍 performSearch started')
    if (!user || selectedRefItems.length === 0) {
      console.log('❌ Cannot perform search: no user or no selected items')
      return
    }
    setIsLoading(true)
    setSearchError(null)

    try {
      // Convert item IDs to ref IDs
      const refIds = selectedRefItems.map(item => item.ref).filter(Boolean)
      console.log('🔍 Ref IDs:', refIds)
      
      if (refIds.length === 0) {
        throw new Error('No valid ref IDs found')
      }
      
      console.log('🔍 Calling searchPeople API...')
      const response = await searchPeople({
        user_id: user.id,
        ref_ids: refIds,
        limit: 60
      })
      console.log('🔍 Search response:', response)

      setSearchResults(response.results)
      // Override API response with our desired title and subtitle
      const title = 'People into'
      const subtitle = 'Browse, dm, or add to a group'
      setSearchTitle(title)
      setSearchSubtitle(subtitle)
      
      // Cache the results
      setCachedSearchResults(response.results, title, subtitle)
      
      // Preload search result profiles for faster navigation
      const userIds = response.results.map(person => person.user_id)
      // preloadSearchResults(userIds) // Removed - not essential for core functionality
      
      // Animate results in
      animateResultsIn()
    } catch (error) {
      console.error('Search failed:', error)
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message === 'No valid ref IDs found') {
          setSearchError('Selected items could not be found. Please try selecting different items.')
        } else if (error.message.includes('400: No valid refs found')) {
          setSearchError('Selected refs not found in database. Please try selecting different items.')
        } else {
          setSearchError('Search failed. Please try again.')
        }
      } else {
        setSearchError('Search failed. Please try again.')
      }
      
      setSearchResults([])
      const title = 'People into'
      const subtitle = 'Browse, dm, or add to a group'
      setSearchTitle(title)
      setSearchSubtitle(subtitle)
      
      // Clear cached results on error
      clearCachedSearchResults()
    } finally {
      setIsLoading(false)
    }
  }

  // Convert search results to Profile format for UserListItem
  const convertToProfiles = (results: PersonResult[]): Profile[] => {
    return results.map(result => {
      const profile = {
        id: result.user_id,
        userName: result.user_name,
        firstName: result.user_name.split(' ')[0] || result.user_name,
        lastName: result.user_name.split(' ').slice(1).join(' ') || '',
        avatar: result.user_image || '',
        location: result.user_location || '',
        email: '',
        password: '',
        tokenKey: '',
      }
      return profile
    })
  }

  const handleUserPress = (profile: Profile) => {
    // Set navigation state for returning from search
    setReturningFromSearch(true)
    
    // Navigate to user profile
    router.push(`/user/${profile.userName}`)
  }

  const handleClose = () => {
    // Clear cached results when closing
    clearCachedSearchResults()
  }

  // Function to trigger search - can be called from parent component
  const triggerSearch = useCallback(() => {
    console.log('🔍 triggerSearch called')
    console.log('🔍 User:', user?.id)
    console.log('🔍 Selected ref items:', selectedRefItems)
    console.log('🔍 Selected ref items structure:', selectedRefItems.map(item => ({
      id: item.id,
      refId: item.ref,
      refTitle: item.expand?.ref?.title
    })))
    
    if (!user || selectedRefItems.length === 0) {
      console.log('❌ Cannot search: no user or no selected items')
      return
    }
    
    // Check if we have cached results for the same search
    if (cachedSearchResults.length > 0 && !hasUsedCachedResults.current) {
      console.log('✅ Using cached results')
      setSearchResults(cachedSearchResults)
      setSearchTitle(cachedSearchTitle)
      setSearchSubtitle(cachedSearchSubtitle)
      setIsLoading(false)
      setSearchError(null)
      hasUsedCachedResults.current = true
      animateResultsIn()
    } else {
      console.log('🔍 Performing new search...')
      performSearch()
    }
  }, [user, selectedRefItems, cachedSearchResults, cachedSearchTitle, cachedSearchSubtitle])

  // Expose triggerSearch function to parent via ref
  useImperativeHandle(ref, () => ({
    triggerSearch
  }), [triggerSearch])

  const renderBackdrop = useCallback(
    (p: any) => (
      <BottomSheetBackdrop 
        {...p} 
        disappearsOnIndex={-1} 
        appearsOnIndex={0} 
        pressBehavior="close"
      />
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
            // Reset the flag when sheet opens so we can perform a new search
            hasUsedCachedResults.current = false
          }
        }}
      >
      <View style={{ paddingHorizontal: s.$3, paddingVertical: s.$1, height: '100%' }}>
        {/* Header with title and thumbnails */}
        <View style={{ 
          paddingBottom: isDropdownOpen ? s.$1 + 10 : s.$1,
          marginTop: -10,
        }}>
          {/* Title and thumbnails row */}
          <Pressable onPress={toggleDropdown} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1, minWidth: 0, justifyContent: 'center' }}>
              <Text style={{ 
                fontSize: s.$2, 
                fontFamily: 'InterBold',
                color: c.black,
                lineHeight: 48,
              }}>
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
          <Animated.View style={{
            maxHeight: dropdownAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: [0, selectedRefItems.length * 40],
            }),
            overflow: 'hidden',
            marginTop: 8,
          }}>
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
                  <Text style={{ 
                    color: c.grey2, 
                    fontSize: 14,
                    opacity: 0.5,
                    lineHeight: 18,
                    flex: 1,
                  }}>
                    {item.title || item.expand?.ref?.title || 'Unknown'}
                  </Text>
                </View>
              ))}
            </YStack>
          </Animated.View>
          
          {/* Subtitle on its own line */}
          <View style={{ height: 8 }} />
          <Text style={{ 
            color: c.grey2, 
            lineHeight: 20,
            fontSize: 14,
            marginTop: (isDropdownOpen ? 10 : 0) - 10,
          }}>
            {searchSubtitle}
          </Text>
        </View>

        <BottomSheetScrollView alwaysBounceVertical={false}>
          <YStack style={{ marginTop: 10 }}>
            {isLoading ? (
              <View style={{ marginTop: 30 }}>
                <SearchLoadingSpinner />
              </View>
            ) : searchError ? (
              <View style={{ 
                justifyContent: 'center', 
                alignItems: 'center',
                paddingHorizontal: s.$4,
                paddingVertical: s.$4
              }}>
                <Ionicons name="alert-circle-outline" size={48} color={c.grey2} />
                <Text style={{ 
                  fontSize: s.$2, 
                  color: c.grey2,
                  textAlign: 'center',
                  marginTop: s.$3
                }}>
                  {searchError}
                </Text>
              </View>
            ) : searchResults.length > 0 ? (
              <Animated.View style={{ 
                opacity: resultsAnimation,
                transform: [{
                  translateY: resultsAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0]
                  })
                }]
              }}>
                {convertToProfiles(searchResults).map((profile, index) => (
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
                      <Text style={{
                        color: c.surface,
                        fontSize: 24,
                        fontFamily: 'InterBold',
                        textAlign: 'center',
                      }}>
                        Share list
                      </Text>
                    </Pressable>
          </View>
        )}
      </View>
    </BottomSheet>
  )
}); 