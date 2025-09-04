import { Profile } from '@/ui'
import React, { useEffect, useMemo, useRef } from 'react'
import { Dimensions, View, ScrollView } from 'react-native'
import { useAppStore } from '@/features/stores'
import { CommunitiesFeedScreen } from '@/features/communities/feed-screen'
import { c } from '@/features/style'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated'

export function UserProfileScreen({ userName }: { userName: string }) {
  if (!userName) {
    return null
  }

  const { homePagerIndex, setHomePagerIndex, user, returnToDirectories, setReturnToDirectories } = useAppStore()
  const { width } = Dimensions.get('window')

  // Pager gesture setup (hooks must always be called in the same order)
  const translateX = useSharedValue(0)
  const isDragging = useSharedValue(false)

  // Update translateX when homePagerIndex changes
  const hasInitialized = useRef(false)
  useEffect(() => {
    if (!hasInitialized.current) {
      // Avoid initial spring on mount to prevent bounce when returning to directories
      translateX.value = -homePagerIndex * width
      hasInitialized.current = true
      return
    }
    translateX.value = withSpring(-homePagerIndex * width, {
      damping: 20,
      stiffness: 200,
    })
  }, [homePagerIndex, width])

  // Gesture handling for horizontal swipes (will only be attached on own profile)
  const panGesture = Gesture.Pan()
    .onBegin(() => {
      isDragging.value = true
    })
    .onUpdate((event) => {
      if (Math.abs(event.translationX) > Math.abs(event.translationY)) {
        translateX.value = -homePagerIndex * width + event.translationX
      }
    })
    .onEnd((event) => {
      isDragging.value = false
      const threshold = width * 0.3
      const velocity = event.velocityX
      const distance = event.translationX
      let nextIndex = homePagerIndex
      if (Math.abs(distance) > threshold || Math.abs(velocity) > 500) {
        if (distance > 0 && homePagerIndex > 0) {
          nextIndex = homePagerIndex - 1
        } else if (distance < 0 && homePagerIndex < 1) {
          nextIndex = homePagerIndex + 1
        }
      }
      translateX.value = withSpring(-nextIndex * width, {
        damping: 20,
        stiffness: 200,
      })
      if (nextIndex !== homePagerIndex) {
        runOnJS(setHomePagerIndex)(nextIndex)
      }
    })

  // Animated styles for the container
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }))

  // Simple preloader that runs once when component mounts
  useEffect(() => {
    const preloadData = async () => {
      try {
        // Preload profile data for current user
        if (user?.userName === userName) {
          // This will cache the profile data
          await import('@/features/stores/items').then(({ getProfileItems }) => 
            getProfileItems(userName)
          )
        }
        
        // Preload directory data (first 20 results)
        await import('@/features/communities/feed-screen').then(async () => {
          const { pocketbase } = await import('@/features/pocketbase')
          const { simpleCache } = await import('@/features/cache/simpleCache')
          
          // Check if we already have cached directory data
          const cachedDirectory = await simpleCache.get('directory_users')
          if (!cachedDirectory) {
            // Preload directory data in background
            const res = await pocketbase.collection('users').getList(1, 20, {
              fields: 'id,userName,firstName,lastName,name,location,image,avatar_url',
              sort: '-created',
            })
            
            // Batch fetch grid items for all users
            const userIds = res.items.map((u: any) => u.id)
            if (userIds.length > 0) {
              const orFilter = userIds.map((id: string) => `creator = "${id}"`).join(' || ')
              const itemsRes = await pocketbase.collection('items').getList(1, 60, {
                filter: `(${orFilter}) && backlog = false && list = false && parent = null`,
                fields: 'id,image,creator,created,expand.ref(image)',
                expand: 'ref',
                sort: '-created',
              })
              
              // Group items by creator and create directory data
              const byCreator = new Map<string, any[]>()
              for (const it of itemsRes.items as any[]) {
                const creatorId = it.creator
                if (!creatorId) continue
                const arr = byCreator.get(creatorId) || []
                if (arr.length < 3) {
                  arr.push(it)
                  byCreator.set(creatorId, arr)
                }
              }
              
              const mapped = res.items.map((r: any) => {
                const creatorId = r.id
                const creatorItems = byCreator.get(creatorId) || []
                const images = creatorItems
                  .slice(0, 3)
                  .map((it) => it?.image || it?.expand?.ref?.image)
                  .filter(Boolean)
                const latest = creatorItems[0]?.created ? new Date(creatorItems[0].created).getTime() : 0
                return {
                  id: r.id,
                  userName: r.userName,
                  name: r.firstName || r.name || r.userName,
                  neighborhood: r.location || '',
                  avatar_url: r.image || r.avatar_url || '',
                  topRefs: images,
                  _latest: latest,
                }
              }).filter(u => u.userName !== user?.userName)
              
              // Cache the directory data
              await simpleCache.set('directory_users', mapped)
            }
          }
        })
      } catch (error) {
        console.warn('Preloading failed:', error)
        // Don't break the app if preloading fails
      }
    }
    
    preloadData()
  }, [userName, user?.userName]) // Only run once when component mounts

  // If we navigated back from a directory-tapped profile, force pager to Directories
  useEffect(() => {
    if (returnToDirectories) {
      console.log('🔄 RETURN TO DIRECTORIES - Setting pager to index 1')
      setHomePagerIndex(1)
      setReturnToDirectories(false)
    }
  }, [returnToDirectories, setHomePagerIndex, setReturnToDirectories])

  // Define Dots component before conditional returns to prevent hook ordering issues
  const Dots = useMemo(() => {
    return (
      <View
        style={{
          position: 'absolute',
          bottom: 30, // Moved up 80px total from 16
          left: 0,
          right: 0,
          alignItems: 'center',
          pointerEvents: 'none',
        }}
      >
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {[0, 1].map((i) => (
            <View
              key={i}
              style={{
                width: 8,
                height: 8,
                borderRadius: 100,
                backgroundColor: i === homePagerIndex ? c.grey2 : c.grey1,
              }}
            />
          ))}
        </View>
      </View>
    )
  }, [homePagerIndex])

  // Other users render normally; own profile renders pager (both pages stay mounted)
  if (user?.userName !== userName) {
    return <Profile userName={userName} />
  }

  return (
    <View style={{ flex: 1 }}>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[{ flex: 1, flexDirection: 'row' }, animatedStyle]}>
          <View style={{ width }}>
            <Profile userName={userName} />
          </View>
          <View style={{ width }}>
            <CommunitiesFeedScreen />
          </View>
        </Animated.View>
      </GestureDetector>
      {Dots}
    </View>
  )
}
