import { Profile } from '@/ui'
import React, { useEffect, useMemo, useRef } from 'react'
import { Dimensions, View } from 'react-native'
import Svg, { Path, G } from 'react-native-svg'
import { useAppStore } from '@/features/stores'
import { CommunityInterestsScreen } from '@/features/communities/interests-screen'
import { WantToMeetScreen } from '@/features/communities/want-to-meet-screen'
import { c } from '@/features/style'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated'

export function UserProfileScreen({ userName, prefetchedUserId }: { userName: string; prefetchedUserId?: string }) {
  if (!userName) {
    return null
  }

  const {
    homePagerIndex,
    setHomePagerIndex,
    user,
    profileNavIntent,
    consumeProfileNavIntent,
    directoriesFilterTab,
    setDirectoriesFilterTab,
    moduleBackdropAnimatedIndex,
    detailsBackdropAnimatedIndex,
    otherProfileBackdropAnimatedIndex,
    removeRefSheetBackdropAnimatedIndex,
    editingProfile,
    stopEditProfile,
  } = useAppStore()
  const { width } = Dimensions.get('window')

  // Pager gesture setup (hooks must always be called in the same order)
  const translateX = useSharedValue(-homePagerIndex * width)
  const isDragging = useSharedValue(false)
  const skipNextAnimation = useRef(true)
  const hasCommittedDefault = useRef(false)
  if (!user) {
    return null
  }

  const ownProfile = user.userName === userName
  useEffect(() => {
    skipNextAnimation.current = true
    hasCommittedDefault.current = false
  }, [userName])

  useEffect(() => {
    if (!ownProfile) return

    if (profileNavIntent) {
      const intent = consumeProfileNavIntent()
      if (intent) {
        if (intent.directoryFilter) {
          setDirectoriesFilterTab(intent.directoryFilter)
        }

        const shouldAnimate = intent.animate === true && homePagerIndex !== intent.targetPagerIndex
        skipNextAnimation.current = shouldAnimate ? false : true
        hasCommittedDefault.current = true

        if (!shouldAnimate) {
          translateX.value = -intent.targetPagerIndex * width
        }

        if (homePagerIndex !== intent.targetPagerIndex) {
          setHomePagerIndex(intent.targetPagerIndex)
        }
        return
      }
    }

    if (!hasCommittedDefault.current) {
      hasCommittedDefault.current = true
      skipNextAnimation.current = true
      translateX.value = -homePagerIndex * width
    }
  }, [ownProfile, profileNavIntent, consumeProfileNavIntent, setHomePagerIndex, width, translateX, homePagerIndex, setDirectoriesFilterTab])

  // Update translateX when homePagerIndex changes
  useEffect(() => {
    if (skipNextAnimation.current) {
      translateX.value = -homePagerIndex * width
      skipNextAnimation.current = false
      return
    }
    translateX.value = withSpring(-homePagerIndex * width, {
      damping: 20,
      stiffness: 200,
    })
  }, [homePagerIndex, width, translateX])

  useEffect(() => {
    if (homePagerIndex !== 0 && editingProfile) {
      stopEditProfile()
    }
  }, [homePagerIndex, editingProfile, stopEditProfile])

  useEffect(() => {
    return () => {
      stopEditProfile()
    }
  }, [stopEditProfile])

  // Gesture handling for horizontal swipes (will only be attached on own profile)
  const panGesture = Gesture.Pan()
    // Only activate on meaningful horizontal drags; let vertical scrolling inside pages win
    .activeOffsetX([-20, 20])
    .failOffsetY([-10, 10])
    .onBegin(() => {
      isDragging.value = true
    })
    .onUpdate((event) => {
      if (Math.abs(event.translationX) > Math.abs(event.translationY)) {
        // Allow a bit of elastic feel by not hard-clamping during drag
        translateX.value = -homePagerIndex * width + event.translationX
      }
    })
    .onEnd((event) => {
      isDragging.value = false
      const threshold = width * 0.28
      const velocity = event.velocityX
      const distance = event.translationX
      let nextIndex = homePagerIndex
      if (Math.abs(distance) > threshold || Math.abs(velocity) > 450) {
        if (distance > 0 && homePagerIndex > 0) {
          nextIndex = homePagerIndex - 1
        } else if (distance < 0 && homePagerIndex < 2) {
          nextIndex = homePagerIndex + 1
        }
      }
      translateX.value = withSpring(-nextIndex * width, {
        damping: 18,
        stiffness: 220,
      })
      if (nextIndex !== homePagerIndex) {
        runOnJS(setHomePagerIndex)(nextIndex)
      }
    })
    .onFinalize(() => {})

  // Animated styles for the container
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }))

  // Hide pager dots when any sheet backdrop is visible
  const dotsAnimatedStyle = useAnimatedStyle(() => {
    const shown =
      (moduleBackdropAnimatedIndex?.value ?? -1) >= 0 ||
      (detailsBackdropAnimatedIndex?.value ?? -1) >= 0 ||
      (otherProfileBackdropAnimatedIndex?.value ?? -1) >= 0 ||
      (removeRefSheetBackdropAnimatedIndex?.value ?? -1) >= 0
    return { opacity: shown ? 0 : 1, display: shown ? 'none' : 'flex' }
  })

  // Simple preloader that runs once when component mounts
  // Define Dots component before conditional returns to prevent hook ordering issues
  const Dots = useMemo(() => {
    const Indicator = ({ index }: { index: number }) => {
      const iconAnimatedStyle = useAnimatedStyle(() => {
        const progress = -translateX.value / width
        const distance = Math.abs(progress - index)
        const iconOpacity = Math.max(0, Math.min(1, 1 - distance * 2))
        const translateY = -4 * iconOpacity
        const translateXParallax = (index - progress) * 2
        return { opacity: iconOpacity, transform: [{ translateY }, { translateX: translateXParallax }] }
      })
      const dotAnimatedStyle = useAnimatedStyle(() => {
        const progress = -translateX.value / width
        // Snap progress into [0..2] to avoid drawing the middle (removed) page remnants
        const clamped = Math.max(0, Math.min(2, progress))
        const distance = Math.abs(clamped - index)
        const dotOpacity = Math.max(0, Math.min(1, distance * 2))
        return { opacity: dotOpacity }
      })

      const color = c.grey2
      const strokeW = 1.5

      const Icon = () => {
        if (index === 0) {
          // Home icon
          return (
            <Svg width={16} height={16} viewBox="0 0 24 24">
              <G transform="translate(0,-2) scale(1,1.25)">
                <Path d="M3 11l9-7 9 7v9h-6v-5H9v5H3z" stroke={color} strokeWidth={strokeW} fill="none" strokeLinejoin="round" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
              </G>
            </Svg>
          )
        }
        if (index === 1) {
          // Backpack icon (provided)
          return (
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
              <G transform="translate(-0.5,-0.5) scale(1.02)">
                <Path d="M23.157 16.5478L21.9695 8.27058C23.115 6.41608 22.8865 3.88183 21.9422 2.08983V2.083C21.5809 1.42285 20.8865 1.01367 20.1365 1.01367C17.199 1 7.01828 1 4.08078 1C3.32395 1 2.62277 1.41015 2.2546 2.08985C1.32392 3.88868 1.10225 6.42285 2.24776 8.2706L1.06026 16.5558C0.817099 18.2365 1.31709 19.9308 2.42844 21.2081C3.53979 22.4853 5.14319 23.2218 6.83869 23.2218H17.3807C19.075 23.2218 20.6864 22.4854 21.7909 21.2081C22.9023 19.9307 23.4023 18.2286 23.1591 16.5558L23.157 16.5478ZM3.25379 2.61033C3.42078 2.30466 3.74012 2.11716 4.07997 2.11716C7.01747 2.11716 17.1912 2.11716 20.1357 2.13083C20.4756 2.13083 20.7812 2.31149 20.9482 2.61033C21.8506 4.31833 21.9756 6.80458 20.5312 8.27733C18.413 10.416 15.9415 10.7978 12.1005 10.7841C8.26072 10.8046 5.79472 10.4159 3.67672 8.27733C2.22554 6.81248 2.36422 4.31258 3.24604 2.61033L3.25379 2.61033ZM20.9413 20.4581C20.0458 21.4932 18.747 22.0831 17.3855 22.0831H6.84354C5.47537 22.0831 4.17654 21.4932 3.28779 20.4581C2.39229 19.4229 1.98897 18.0557 2.18329 16.7081L3.23212 9.40233C5.42644 11.416 8.00262 11.8955 11.5514 11.9161V13.6104C11.5514 13.9229 11.8014 14.1729 12.1139 14.1797C12.4264 14.1797 12.6764 13.9297 12.6764 13.6172V11.9229C16.2321 11.9024 18.8014 11.4297 20.9956 9.40916L22.0444 16.7149C22.2388 18.0694 21.8364 19.4377 20.9399 20.4649L20.9413 20.4581Z" stroke={color} strokeWidth={strokeW} fill="none" vectorEffect="non-scaling-stroke" />
              </G>
            </Svg>
          )
        }
        // Ribbon icon for Want to Meet (bookmark outline)
        return (
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
            <G transform="translate(0,0) scale(1.25)">
              <Path d="M7 3h10a1 1 0 011 1v16l-6-3-6 3V4a1 1 0 011-1z" stroke={color} strokeWidth={strokeW} fill="none" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            </G>
          </Svg>
        )
      }

      return (
        <View style={{ width: 22, height: 22, alignItems: 'center', justifyContent: 'center', overflow: 'visible' }}>
          <Animated.View style={iconAnimatedStyle}>
            <View style={{ alignItems: 'center', justifyContent: 'center' }}>
              <Icon />
            </View>
          </Animated.View>
          <Animated.View style={[{ position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: c.grey1 }, dotAnimatedStyle]} />
        </View>
      )
    }

    return (
      <Animated.View
        style={[{ position: 'absolute', bottom: 30, left: 0, right: 0, alignItems: 'center', pointerEvents: 'none' }, dotsAnimatedStyle]}
      >
        <View style={{ flexDirection: 'row', gap: 10, backgroundColor: c.surface, paddingHorizontal: 5, paddingVertical: 5, borderRadius: 50 }}>
          {[0, 1, 2].map((i) => (
            <Indicator key={i} index={i} />
          ))}
        </View>
      </Animated.View>
    )
  }, [homePagerIndex])

  // Other users render normally; own profile renders pager (both pages stay mounted)
  if (!ownProfile) {
    return <Profile userName={userName} prefetchedUserId={prefetchedUserId} />
  }

  return (
    <View style={{ flex: 1 }}>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[{ flex: 1, flexDirection: 'row' }, animatedStyle]}>
          <View style={{ width, overflow: 'hidden', backgroundColor: c.surface }}>
            <Profile userName={userName} />
          </View>
          <View style={{ width, overflow: 'hidden', backgroundColor: c.surface }}>
            <CommunityInterestsScreen />
          </View>
          <View style={{ width, overflow: 'hidden', backgroundColor: c.surface }}>
            <WantToMeetScreen />
          </View>
        </Animated.View>
      </GestureDetector>
      {Dots}
    </View>
  )
}
