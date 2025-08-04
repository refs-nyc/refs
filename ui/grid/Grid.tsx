import { GridWrapper } from './GridWrapper'
import { GridItem } from './GridItem'
import { GridTileWrapper } from './GridTileWrapper'
import { ExpandedItem } from '@/features/types'
import { useState, useCallback, useMemo, useEffect } from 'react'
import { Text, View, Pressable } from 'react-native'
import { c } from '@/features/style'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withSpring,
} from 'react-native-reanimated'

const PROMPTS = [
  'All-time comfort game',
  'Link you shared recently',
  'Song that always hits',
  'Free space',
  'Place you feel like yourself',
  'Example of perfect design',
  'Hobby you want to get into',
  'Favorite piece from a museum',
  'Most rewatched movie',
  'Tradition you love',
  'Meme slot',
  'Neighborhood spot',
  'Art that moved you',
]

// Fisher-Yates shuffle function
const shuffleArray = (array: string[]) => {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

const getTileAnimationDelay = (index: number, totalTiles: number) => {
  // First tile: 750ms
  if (index === 0) {
    return 0
  }
  // Second tile: 750ms
  if (index === 1) {
    return 750
  }
  // Third tile: 150ms
  if (index === 2) {
    return 1500
  }
  // Tiles 3-6: 150ms each
  if (index >= 3 && index <= 5) {
    return 1650 + (index - 3) * 150
  }
  // Tiles 7-12: 100ms each (faster)
  return 2100 + (index - 6) * 100
}

// Custom drop animation component
const StartupAnimationTile = ({
  children,
  delay,
  isInitialLoad,
}: {
  children: React.ReactNode
  delay: number
  isInitialLoad: boolean
}) => {
  const translateY = useSharedValue(-60) // Reduced from -100 to -60 for less severe drop
  const scale = useSharedValue(0.9) // Reduced from 0.8 to 0.9 for less dramatic scale
  const opacity = useSharedValue(0)

  useEffect(() => {
    // Only animate on initial load
    if (!isInitialLoad) {
      translateY.value = 0
      scale.value = 1
      opacity.value = 1
      return
    }

    // Reset animation values
    translateY.value = -60
    scale.value = 0.9
    opacity.value = 0

    // Determine if this is a fast tile (100ms timing)
    const isFastTile = delay >= 2100

    // Animate after delay
    const timer = setTimeout(() => {
      // Slam down with spring animation (gentler for fast tiles)
      translateY.value = withSpring(0, {
        damping: isFastTile ? 20 : 15,
        stiffness: isFastTile ? 200 : 250,
        mass: isFastTile ? 1.0 : 0.9,
      })

      // Scale up with bounce (gentler for fast tiles)
      scale.value = withSpring(1, {
        damping: isFastTile ? 22 : 18,
        stiffness: isFastTile ? 300 : 350,
        mass: isFastTile ? 0.8 : 0.7,
      })

      // Fade in quickly
      opacity.value = withTiming(1, { duration: 200 })

      // After slam, add the bounce-back effect (much more subtle for fast tiles)
      setTimeout(
        () => {
          const bounceHeight = isFastTile ? -2 : -3
          const bounceScale = isFastTile ? 0.995 : 0.99

          // Bounce back up slightly and shrink
          translateY.value = withSpring(bounceHeight, {
            damping: isFastTile ? 35 : 30,
            stiffness: isFastTile ? 200 : 250,
            mass: isFastTile ? 0.6 : 0.5,
          })
          scale.value = withSpring(bounceScale, {
            damping: isFastTile ? 35 : 30,
            stiffness: isFastTile ? 200 : 250,
            mass: isFastTile ? 0.6 : 0.5,
          })

          // Then settle back to normal (smoother for fast tiles)
          setTimeout(
            () => {
              translateY.value = withSpring(0, {
                damping: isFastTile ? 30 : 25,
                stiffness: isFastTile ? 150 : 200,
                mass: isFastTile ? 0.8 : 0.7,
              })
              scale.value = withSpring(1, {
                damping: isFastTile ? 30 : 25,
                stiffness: isFastTile ? 150 : 200,
                mass: isFastTile ? 0.8 : 0.7,
              })
            },
            isFastTile ? 80 : 120
          )
        },
        isFastTile ? 150 : 200
      )
    }, delay)

    return () => clearTimeout(timer)
  }, [isInitialLoad, delay])

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
    opacity: opacity.value,
  }))

  return <Animated.View style={animatedStyle}>{children}</Animated.View>
}

export const Grid = ({
  onPressItem,
  onLongPressItem,
  onAddItem,
  onAddItemWithPrompt,
  onRemoveItem,
  columns = 3,
  rows = 3,
  items,
  editingRights = false,
  searchMode = false,
  selectedRefs = [],
  setSelectedRefs,
}: {
  onPressItem?: (item?: ExpandedItem) => void
  onLongPressItem?: () => void
  onAddItem?: () => void
  onAddItemWithPrompt?: (prompt: string) => void
  onRemoveItem?: (item: ExpandedItem) => void
  columns: number
  rows: number
  items: any[]
  editingRights?: boolean
  searchMode?: boolean
  selectedRefs?: string[]
  setSelectedRefs?: (refs: string[]) => void
}) => {
  const gridSize = columns * rows

  // State for shuffled prompts
  const [shuffledPrompts, setShuffledPrompts] = useState<string[]>([])
  const [isShuffling, setIsShuffling] = useState(false)
  const [isInitialLoad, setIsInitialLoad] = useState(false) // Start as false

  // Animation values
  const buttonScale = useSharedValue(1)

  // Initialize with random prompts on mount
  useEffect(() => {
    setShuffledPrompts(shuffleArray(PROMPTS))
  }, [])

  // Only trigger initial load animation if this is the first time seeing the grid
  // This should be controlled by the parent component (MyProfile) based on onboarding state
  useEffect(() => {
    // For now, we'll disable the animation entirely to prevent the navigation issue
    // The parent component can pass a prop to enable it when appropriate
    setIsInitialLoad(false)
  }, [])

  // Shuffle prompts function with animation
  const handleShufflePrompts = useCallback(() => {
    if (isShuffling) return // Prevent multiple rapid clicks

    setIsShuffling(true)

    // Button press animation
    buttonScale.value = withSequence(
      withTiming(0.95, { duration: 100 }),
      withTiming(1, { duration: 100 })
    )

    // Shuffle after a brief delay to allow fade out
    setTimeout(() => {
      // Create a new shuffled array but preserve the same length
      const newShuffledPrompts = shuffleArray([...PROMPTS])
      setShuffledPrompts(newShuffledPrompts)
      setIsShuffling(false)
    }, 300) // Increased delay for smoother animation
  }, [isShuffling, buttonScale])

  const handleGridItemPress = useCallback(
    (item: any) => {
      if (searchMode && setSelectedRefs) {
        const itemId = item.id

        // Use Set for O(1) lookup and manipulation
        const selectedSet = new Set(selectedRefs)

        if (selectedSet.has(itemId)) {
          // Remove item
          selectedSet.delete(itemId)
        } else {
          // Add item
          selectedSet.add(itemId)
        }

        setSelectedRefs(Array.from(selectedSet))
      } else if (onPressItem) {
        onPressItem(item)
      }
    },
    [searchMode, setSelectedRefs, selectedRefs, onPressItem]
  )

  // Memoize the selected refs set for O(1) lookup
  const selectedRefsSet = useMemo(() => new Set(selectedRefs), [selectedRefs])

  // Button animation style
  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }))

  return (
    <View style={{ marginTop: 10 }}>
      <GridWrapper columns={columns} rows={rows}>
        {items.map((item, i) => {
          const isSelected = searchMode && selectedRefsSet.has(item.id)
          return (
            <StartupAnimationTile
              key={item.id}
              delay={getTileAnimationDelay(i, items.length)}
              isInitialLoad={isInitialLoad}
            >
              <GridTileWrapper
                id={item.id}
                onPress={useCallback(() => handleGridItemPress(item), [handleGridItemPress, item])}
                onLongPress={onLongPressItem}
                onRemove={useCallback(() => {
                  if (onRemoveItem) onRemoveItem(item)
                }, [onRemoveItem, item])}
                type={item.list ? 'list' : item.expand.ref?.image || item.image ? 'image' : 'text'}
                tileStyle={
                  searchMode
                    ? {
                        opacity: isSelected ? 1 : 0.25,
                      }
                    : {}
                }
              >
                <GridItem item={item} i={i} />
                {searchMode && isSelected && (
                  <View
                    style={{
                      position: 'absolute',
                      top: -2.5,
                      left: -2.5,
                      right: -2.5,
                      bottom: -2.5,
                      borderWidth: 5,
                      borderColor: '#A3C9A8',
                      borderRadius: 8 + 2.5,
                      pointerEvents: 'none',
                    }}
                  />
                )}
              </GridTileWrapper>
            </StartupAnimationTile>
          )
        })}

        {/* Prompt placeholders for empty slots */}
        {Array.from({ length: gridSize - items.length }).map((_, i) => {
          const prompt = shuffledPrompts[i % shuffledPrompts.length] || PROMPTS[i % PROMPTS.length]
          const totalIndex = items.length + i

          // Only show prompt squares on own profile when grid isn't full
          const shouldShowPrompt = editingRights && items.length < gridSize

          return (
            <StartupAnimationTile
              key={`placeholder-${totalIndex}`}
              delay={
                isShuffling
                  ? getTileAnimationDelay(i, gridSize - items.length)
                  : getTileAnimationDelay(totalIndex, gridSize)
              }
              isInitialLoad={isInitialLoad}
            >
              <GridTileWrapper
                type={shouldShowPrompt ? 'prompt' : 'placeholder'}
                onPress={() =>
                  shouldShowPrompt && onAddItemWithPrompt && onAddItemWithPrompt(prompt)
                }
                isShuffling={isShuffling}
              >
                <Text style={{ fontSize: 14 }}>{shouldShowPrompt ? prompt : ''}</Text>
              </GridTileWrapper>
            </StartupAnimationTile>
          )
        })}
      </GridWrapper>

      {/* Shuffle prompts button */}
      {editingRights && !searchMode && (
        <Animated.View style={buttonAnimatedStyle}>
          <Pressable
            onPress={handleShufflePrompts}
            style={{
              alignSelf: 'center',
              marginTop: 40,
              paddingVertical: 4,
              paddingHorizontal: 8,
            }}
          >
            <Text
              style={{
                color: c.accent,
                fontSize: 14,
                fontWeight: '600',
                opacity: isShuffling ? 0.6 : 1,
              }}
            >
              shuffle prompts
            </Text>
          </Pressable>
        </Animated.View>
      )}
    </View>
  )
}
