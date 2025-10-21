import BottomSheet, { BottomSheetBackdrop, BottomSheetView, BottomSheetTextInput } from '@gorhom/bottom-sheet'
import React, { useMemo, useState, useRef, useEffect } from 'react'
import { useAppStore } from '@/features/stores'
import { c, s } from '@/features/style'
import { Text, View, Pressable, useWindowDimensions, ActivityIndicator } from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import * as Location from 'expo-location'
import * as ImagePicker from 'expo-image-picker'
import { Image } from 'expo-image'
import { pinataUpload } from '@/features/pinata'
import Svg, { Circle } from 'react-native-svg'

export const ProfileSettingsSheet = () => {
  const {
    user,
    logout,
    stopEditProfile,
    stopEditing,
    setIsEditMode,
    updateUser,
  } = useAppStore()

  const settingsSheetRef = useAppStore((state) => state.settingsSheetRef)
  const isSettingsSheetOpen = useAppStore((state) => state.isSettingsSheetOpen)
  const setIsSettingsSheetOpen = useAppStore((state) => state.setIsSettingsSheetOpen)
  const settingsSheetHeight = useAppStore((state) => state.settingsSheetHeight)
  const setSettingsSheetHeight = useAppStore((state) => state.setSettingsSheetHeight)
  const shouldFocusLocation = useAppStore((state) => state.shouldFocusLocationInput)
  const setShouldFocusLocation = useAppStore((state) => state.setShouldFocusLocationInput)

  const { height: windowHeight } = useWindowDimensions()
  
  const locationInputRef = useRef<any>(null)

  // Local state for editing
  const [fullName, setFullName] = useState('')
  const [location, setLocation] = useState('')
  const [isSavingName, setIsSavingName] = useState(false)
  const [isSavingLocation, setIsSavingLocation] = useState(false)
  const [isLoadingLocation, setIsLoadingLocation] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  
  // Auto-focus location input when requested
  useEffect(() => {
    if (shouldFocusLocation && isSettingsSheetOpen && locationInputRef.current) {
      setTimeout(() => {
        locationInputRef.current?.focus()
        setShouldFocusLocation(false)
      }, 400)
    }
  }, [shouldFocusLocation, isSettingsSheetOpen, setShouldFocusLocation])

  const settingsSheetSnapPoints = useMemo(() => {
    const baseHeight = Math.max(settingsSheetHeight, Math.round(windowHeight * 0.45))
    const cappedBase = Math.min(baseHeight * 1.1, Math.round(windowHeight * 0.92)) - 5
    const expandedCandidate = Math.max(cappedBase + 120, Math.round(windowHeight * 0.88))
    const cappedExpanded = Math.min(expandedCandidate, Math.round(windowHeight * 0.95)) - 5

    if (cappedExpanded <= cappedBase + 40) {
      return [cappedBase]
    }

    return [cappedBase, cappedExpanded]
  }, [settingsSheetHeight, windowHeight])

  const displayName = useMemo(() => {
    if (!user) return ''
    const first = (user.firstName || '').trim()
    const last = (user.lastName || '').trim()
    const combined = `${first} ${last}`.trim()
    if (combined) return combined
    const fallback = (user.name || '').trim()
    return fallback || user.userName || ''
  }, [user])

  const locationLabel = useMemo(() => {
    if (!user) return ''
    return user.location || ''
  }, [user])

  // Initialize form values when sheet opens
  React.useEffect(() => {
    if (isSettingsSheetOpen && user) {
      const first = (user.firstName || '').trim()
      const last = (user.lastName || '').trim()
      const combined = `${first} ${last}`.trim()
      setFullName(combined || user.name || '')
      setLocation(user.location || '')
    }
  }, [isSettingsSheetOpen, user])

  const handleSaveName = async () => {
    if (!fullName.trim() || isSavingName) return
    
    setIsSavingName(true)
    try {
      const nameParts = fullName.trim().split(' ')
      const firstName = nameParts[0] || ''
      const lastName = nameParts.slice(1).join(' ') || ''
      
      await updateUser({ firstName, lastName })
    } catch (error) {
      console.error('Failed to update name:', error)
    } finally {
      setIsSavingName(false)
    }
  }

  const handleSaveLocation = async () => {
    if (isSavingLocation) return
    
    setIsSavingLocation(true)
    try {
      await updateUser({ location: location.trim() })
    } catch (error) {
      console.error('Failed to update location:', error)
    } finally {
      setIsSavingLocation(false)
    }
  }

  const handleChangeAvatar = async () => {
    if (avatarUploading) return

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      })

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0]
        setAvatarUploading(true)

        try {
          const imageUrl = await pinataUpload(asset)
          await updateUser({ image: imageUrl })
        } catch (error) {
          console.error('Failed to upload avatar:', error)
        } finally {
          setAvatarUploading(false)
        }
      }
    } catch (error) {
      console.error('Failed to pick image:', error)
    }
  }

  const handleUseMyLocation = async () => {
    if (isLoadingLocation) return
    
    setIsLoadingLocation(true)
    try {
      // Request permission
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        console.log('Location permission denied')
        setIsLoadingLocation(false)
        return
      }

      // Get current position
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      })

      // Reverse geocode with Google
      const { latitude, longitude } = position.coords
      const apiKey = process.env.EXPO_PUBLIC_GOOGLE_SEARCH_API_KEY
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`
      )
      const data = await response.json()

      if (data.results && data.results.length > 0) {
        // Look through multiple results to find the best neighborhood match
        let neighborhood = ''
        let city = ''
        let borough = ''
        
        // Be aggressive about finding a neighborhood - look through ALL results
        for (const result of data.results) {
          const components = result.address_components
          
          // Try to find neighborhood in this result (multiple type options)
          if (!neighborhood) {
            neighborhood = components.find((c: any) =>
              c.types.includes('neighborhood') || 
              c.types.includes('sublocality') ||
              c.types.includes('sublocality_level_2') ||
              c.types.includes('colloquial_area')
            )?.long_name || ''
          }
          
          // Find city
          if (!city) {
            city = components.find((c: any) =>
              c.types.includes('locality')
            )?.long_name || ''
          }
          
          // Find borough (for NYC and other cities with sublocality_level_1)
          if (!borough) {
            borough = components.find((c: any) =>
              c.types.includes('sublocality_level_1')
            )?.long_name || ''
          }
          
          // Break early if we have a neighborhood
          if (neighborhood && city) break
        }

        // Determine location string based on hierarchy
        let locationString = ''
        
        if (city === 'New York' && borough) {
          // NYC: Special handling - ALWAYS use neighborhood (we found one above)
          const boroughName = borough === 'Manhattan' ? 'NYC' : borough
          locationString = neighborhood ? `${neighborhood}, ${boroughName}` : boroughName
        } else if (neighborhood && city) {
          // Other cities: "Mission District, San Francisco"
          locationString = `${neighborhood}, ${city}`
        } else if (city || borough) {
          // Fallback: just city or borough
          locationString = city || borough
        } else {
          // Can't determine location at all
          locationString = 'Elsewhere'
        }

        setLocation(locationString)
        // Save immediately
        await updateUser({ location: locationString })
      }
    } catch (error) {
      console.error('Failed to get location:', error)
    } finally {
      setIsLoadingLocation(false)
    }
  }

  return (
    <BottomSheet
      ref={settingsSheetRef}
      index={-1}
      snapPoints={settingsSheetSnapPoints}
      enablePanDownToClose
      enableOverDrag={false}
      animationConfigs={{
        damping: 28,
        stiffness: 180,
        mass: 0.6,
        overshootClamping: false,
        restDisplacementThreshold: 0.01,
        restSpeedThreshold: 0.01,
      }}
      onChange={(idx) => {
      const open = idx >= 0
      setIsSettingsSheetOpen(open)
    }}
    backgroundStyle={{ backgroundColor: c.surface, borderRadius: 50 }}
      handleComponent={null}
      style={{ borderTopLeftRadius: 50, borderTopRightRadius: 50, overflow: 'hidden' }}
      backdropComponent={(props) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          pressBehavior="close"
          opacity={0.5}
        />
      )}
    >
      <BottomSheetView
        onLayout={(event) => {
          const height = Math.round(event.nativeEvent.layout.height)
          if (height > 0 && Math.abs(height - settingsSheetHeight) > 2) {
            setSettingsSheetHeight(height)
          }
        }}
        style={{ paddingHorizontal: s.$1, paddingVertical: s.$1, gap: s.$075 }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: s.$075,
          }}
        >
          <Text
            style={{
              fontSize: (s.$09 as number) + 4,
              fontFamily: 'System',
              fontWeight: '700',
              color: c.newDark,
            }}
          >
            Profile Settings
          </Text>
          <Pressable
            onPress={() => {
              settingsSheetRef.current?.close()
              setIsSettingsSheetOpen(false)
            }}
            hitSlop={10}
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="close" size={18} color={c.muted2} />
          </Pressable>
        </View>

        {/* Avatar Picker */}
        <View
          style={{
            backgroundColor: c.surface2,
            borderRadius: s.$12,
            padding: s.$1,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Pressable
            onPress={handleChangeAvatar}
            disabled={avatarUploading}
            style={{ alignItems: 'center', justifyContent: 'center' }}
          >
            <View style={{ position: 'relative' }}>
              {user?.image ? (
                <Image
                  source={user.image}
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 40,
                    backgroundColor: c.surface,
                  }}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
              ) : (
                <View
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 40,
                    backgroundColor: c.surface,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Svg width={64} height={40} viewBox="0 0 64 40">
                    <Circle cx="24" cy="20" r="16" stroke={c.muted} strokeWidth={2} fill="none" />
                    <Circle cx="40" cy="20" r="16" stroke={c.muted} strokeWidth={2} fill="none" />
                  </Svg>
                </View>
              )}
              {avatarUploading && (
                <View
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(242,238,230,0.7)',
                    borderRadius: 40,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ActivityIndicator size="small" color={c.olive} />
                </View>
              )}
              {!avatarUploading && (
                <View
                  style={{
                    position: 'absolute',
                    bottom: -2,
                    right: -2,
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: c.accent,
                    borderWidth: 3,
                    borderColor: c.surface2,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="camera" size={14} color={c.surface} />
                </View>
              )}
            </View>
            <Text
              style={{
                color: c.accent,
                fontSize: 13,
                fontFamily: 'Inter',
                fontWeight: '600',
                marginTop: 8,
              }}
            >
              {avatarUploading ? 'Uploading...' : 'Change Photo'}
            </Text>
          </Pressable>
        </View>

        <View
          style={{
            backgroundColor: c.surface2,
            borderRadius: s.$12,
            padding: s.$1,
          }}
        >
          <Text
            style={{
              color: c.muted2,
              fontSize: 11,
              fontFamily: 'Inter',
              fontWeight: '600',
              marginBottom: 4,
              textTransform: 'uppercase',
            }}
          >
            Full Name
          </Text>
          <BottomSheetTextInput
            value={fullName}
            onChangeText={setFullName}
            onBlur={handleSaveName}
            placeholder="Your name"
            placeholderTextColor={c.muted}
            style={{
              color: c.newDark,
              fontSize: 15,
              fontFamily: 'Inter',
              fontWeight: '500',
              padding: 0,
              margin: 0,
            }}
          />
        </View>

        <View
          style={{
            backgroundColor: c.surface2,
            borderRadius: s.$12,
            padding: s.$1,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <Text
              style={{
                color: c.muted2,
                fontSize: 11,
                fontFamily: 'Inter',
                fontWeight: '600',
                textTransform: 'uppercase',
              }}
            >
              Neighborhood
            </Text>
            <Pressable
              onPress={handleUseMyLocation}
              disabled={isLoadingLocation}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                opacity: pressed || isLoadingLocation ? 0.6 : 1,
              })}
            >
              {isLoadingLocation ? (
                <ActivityIndicator size="small" color={c.accent} />
              ) : (
                <Ionicons name="location-outline" size={14} color={c.accent} />
              )}
              <Text
                style={{
                  color: c.accent,
                  fontSize: 11,
                  fontFamily: 'Inter',
                  fontWeight: '600',
                }}
              >
                Use my location
              </Text>
            </Pressable>
          </View>
          <BottomSheetTextInput
            ref={locationInputRef}
            value={location}
            onChangeText={setLocation}
            onBlur={handleSaveLocation}
            placeholder="e.g. West Village, NYC"
            placeholderTextColor={c.prompt}
            style={{
              color: c.newDark,
              fontSize: 15,
              fontFamily: 'Inter',
              fontWeight: '500',
              padding: 0,
              margin: 0,
            }}
          />
        </View>

        <View
          style={{
            backgroundColor: c.surface2,
            borderRadius: s.$12,
            padding: s.$1,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: c.newDark,
                  fontSize: 15,
                  fontFamily: 'Inter',
                  fontWeight: '600',
                  marginBottom: 4,
                }}
              >
                Push Notifications
              </Text>
              <Text
                style={{
                  color: c.accent,
                  fontSize: 12,
                  fontFamily: 'Inter',
                  fontWeight: '500',
                }}
              >
                Get notified when someone saves your refs
              </Text>
            </View>
            <View
              style={{
                width: 50,
                height: 30,
                borderRadius: 15,
                backgroundColor: c.accent,
                justifyContent: 'center',
                paddingHorizontal: 3,
              }}
            >
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: c.surface,
                  alignSelf: 'flex-end',
                }}
              />
            </View>
          </View>
        </View>

        <Pressable
          onPress={logout}
          style={({ pressed }) => ({
            backgroundColor: c.surface2,
            borderRadius: s.$12,
            padding: s.$1,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Text
            style={{
              color: c.newDark,
              fontSize: 15,
              fontFamily: 'Inter',
              fontWeight: '600',
              textAlign: 'center',
            }}
          >
            Log Out
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            console.log('Delete account')
          }}
          style={({ pressed }) => ({
            backgroundColor: c.surface2,
            borderRadius: s.$12,
            padding: s.$1,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Text
            style={{
              color: c.accent,
              fontSize: 15,
              fontFamily: 'Inter',
              fontWeight: '600',
              textAlign: 'center',
            }}
          >
            Delete Account
          </Text>
        </Pressable>
      </BottomSheetView>
    </BottomSheet>
  )
}
