import { GridWrapper } from './GridWrapper'
import { GridItem } from './GridItem'
import { GridTileWrapper } from './GridTileWrapper'
import { ExpandedItem } from '@/features/types'
import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
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
  { text: 'Link you shared recently', photoPath: false },
  { text: 'free space', photoPath: false },
  { text: 'Place you feel like yourself', photoPath: false },
  { text: 'Example of perfect design', photoPath: false },
  { text: 'something you want to do more of', photoPath: false },
  { text: 'Piece from a museum', photoPath: true },
  { text: 'Most-rewatched movie', photoPath: false },
  { text: 'Tradition you love', photoPath: true },
  { text: 'Meme', photoPath: true },
  { text: 'Neighborhood spot', photoPath: false },
  { text: 'What you put on aux', photoPath: false },
  { text: 'halloween pic', photoPath: true },
  { text: 'Rabbit Hole', photoPath: false },
  { text: 'a preferred publication', photoPath: false },
  { text: 'something on your reading list', photoPath: false },
]

// Fisher-Yates shuffle function
const shuffleArray = (array: any[]) => {
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
      // Fade in
      opacity.value = withTiming(1, { duration: 200 })

      // Drop and scale animation
      translateY.value = withSpring(0, {
        damping: 15,
        stiffness: 150,
        mass: 0.8,
      })

      scale.value = withSpring(1, {
        damping: 15,
        stiffness: 150,
        mass: 0.8,
      })
    }, delay)

    return () => clearTimeout(timer)
  }, [isInitialLoad, delay])

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }))

  return <Animated.View style={animatedStyle}>{children}</Animated.View>
}

// Custom rise-and-settle animation for newly added items
const NewItemAnimationTile = ({
  children,
  isNewItem,
  itemId,
}: {
  children: React.ReactNode
  isNewItem: boolean
  itemId: string
}) => {
  const translateY = useSharedValue(0)
  const scale = useSharedValue(1)
  const hasAnimated = useRef(false)

  useEffect(() => {
    if (isNewItem && !hasAnimated.current) {
      console.log('🎬 ANIMATING NEW ITEM:', itemId)
      hasAnimated.current = true
      
      // Start with a more exaggerated rise
      translateY.value = -50
      scale.value = 1.2
      
      // Settle back to normal position with slower timing
      translateY.value = withSpring(0, {
        damping: 8,
        stiffness: 120,
        mass: 0.8,
      })
      
      scale.value = withSpring(1, {
        damping: 8,
        stiffness: 120,
        mass: 0.8,
      })
    }
  }, [isNewItem, itemId])

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
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
  hideShuffleButton = false,
  screenFocused = false,
  onStartupAnimationComplete,
  shouldAnimateStartup = false,
  newlyAddedItemId = null,
}: {
  onPressItem?: (item?: ExpandedItem) => void
  onLongPressItem?: () => void
  onAddItem?: () => void
  onAddItemWithPrompt?: (prompt: string, photoPath?: boolean) => void
  onRemoveItem?: (item: ExpandedItem) => void
  columns: number
  rows: number
  items: any[]
  editingRights?: boolean
  searchMode?: boolean
  selectedRefs?: string[]
  setSelectedRefs?: (refs: string[]) => void
  hideShuffleButton?: boolean
  screenFocused?: boolean
  onStartupAnimationComplete?: () => void
  shouldAnimateStartup?: boolean
  newlyAddedItemId?: string | null
}) => {
  const gridSize = columns * rows

  // State for shuffled prompts
  const [shuffledPrompts, setShuffledPrompts] = useState<string[]>([])
  const [isShuffling, setIsShuffling] = useState(false)
  const [isInitialLoad, setIsInitialLoad] = useState(false)
  // Track newly added items for animation
  const [newlyAddedItems, setNewlyAddedItems] = useState<Set<string>>(new Set())

  // Animation values
  const buttonScale = useSharedValue(1)

  // Initialize with random prompts on mount
  useEffect(() => {
    setShuffledPrompts(shuffleArray(PROMPTS.map(p => p.text)))
  }, [])

  // Track newly added items
  useEffect(() => {
    const currentItemIds = new Set(items.map(item => item.id))
    const previousItemIds = new Set(Array.from(newlyAddedItems))
    
    // Find items that are new (not in the previous set)
    const newItems = currentItemIds.size > previousItemIds.size ? 
      Array.from(currentItemIds).filter(id => !previousItemIds.has(id)) : []
    
    if (newItems.length > 0) {
      setNewlyAddedItems(new Set(newItems))
      
      // Clear the animation after it completes - extended duration for slower animation
      setTimeout(() => {
        setNewlyAddedItems(new Set())
      }, 1500) // Extended from 1000ms to 1500ms for slower animation
    }
  }, [items])

  // Only trigger initial load animation when explicitly requested by parent
  useEffect(() => {
    if (shouldAnimateStartup && editingRights && items.length === 0 && screenFocused && !isInitialLoad) {
      setIsInitialLoad(true)
    }
    // Ensure no animation on other profiles
    if (!editingRights && isInitialLoad) {
      setIsInitialLoad(false)
    }
  }, [items.length, isInitialLoad, editingRights, screenFocused, shouldAnimateStartup])

  // Fire a completion callback after the last tile animation is expected to finish
  useEffect(() => {
    if (!isInitialLoad) return
    // Approximate the final tile's start time using delays for a full grid
    const maxDelayMs = getTileAnimationDelay(gridSize - 1, gridSize)
    const safetyMs = 400 // cover fade/bounce durations
    const timer = setTimeout(() => {
      if (onStartupAnimationComplete) onStartupAnimationComplete()
    }, maxDelayMs + safetyMs)
    return () => clearTimeout(timer)
  }, [isInitialLoad, gridSize, onStartupAnimationComplete])

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
      const newShuffledPrompts = shuffleArray(PROMPTS.map(p => p.text))
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

  // Create stable callbacks for grid items to avoid hooks violation
  const createItemCallbacks = useCallback((item: any) => ({
    onPress: () => handleGridItemPress(item),
    onRemove: () => {
      if (onRemoveItem) onRemoveItem(item)
    }
  }), [handleGridItemPress, onRemoveItem])

  // Button animation style
  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }))

  return (
    <View style={{ marginTop: 10 }}>
      <GridWrapper columns={columns} rows={rows}>
        {items.map((item, i) => {
          const isSelected = searchMode && selectedRefsSet.has(item.id)
          const isNewItem = newlyAddedItemId === item.id
          const callbacks = createItemCallbacks(item)
          
          return (
            <StartupAnimationTile
              key={`${item.id}-${i}`} // Stable key to prevent grid bouncing
              delay={getTileAnimationDelay(i, items.length)}
              isInitialLoad={isInitialLoad}
            >
              <NewItemAnimationTile isNewItem={isNewItem} itemId={item.id}>
                <GridTileWrapper
                  id={item.id}
                  onPress={callbacks.onPress}
                  onLongPress={onLongPressItem}
                  onRemove={callbacks.onRemove}
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
              </NewItemAnimationTile>
            </StartupAnimationTile>
          )
        })}

        {/* Prompt placeholders for empty slots */}
        {Array.from({ length: gridSize - items.length }).map((_, i) => {
          const promptIndex = i % PROMPTS.length
          const prompt = PROMPTS[promptIndex]
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
              isInitialLoad={isInitialLoad && shouldShowPrompt}
            >
              <GridTileWrapper
                type={shouldShowPrompt ? "prompt" : "placeholder"}
                onPress={() => shouldShowPrompt && onAddItemWithPrompt && onAddItemWithPrompt(prompt.text, prompt.photoPath)}
                isShuffling={isShuffling}
              >
                <Text style={{ fontSize: 14 }}>
                  {shouldShowPrompt ? prompt.text : ''}
                </Text>
              </GridTileWrapper>
            </StartupAnimationTile>
          )
        })}
      </GridWrapper>

      {/* Shuffle prompts button */}
      {editingRights && !searchMode && !hideShuffleButton && items.length < gridSize && (
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
