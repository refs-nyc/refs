import React from 'react'
import { View, StyleSheet, useWindowDimensions } from 'react-native'
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated'

interface GridLinesProps {
  size?: number
  lineColor?: string
  lineThickness?: number
  animationDuration?: number // Duration for each individual line's fade animation
  staggerMs?: number // Delay between the start of each consecutive line's animation
}

export const GridLines = ({
  size = 40,
  lineColor = '#444444',
  lineThickness = 1,
  animationDuration = 300, // Default duration for fade in/out
  staggerMs = 15, // Default delay between lines starting animation
}: GridLinesProps) => {
  console.log('render grid lines')
  const { width, height } = useWindowDimensions()

  const horizontalLines = []
  const verticalLines = []

  const numHorizontal = Math.ceil(height / size)
  const numVertical = Math.ceil(width / size)
  const totalHorizontalLines = numHorizontal > 0 ? numHorizontal - 1 : 0
  const totalVerticalLines = numVertical > 0 ? numVertical - 1 : 0

  // Generate horizontal lines
  for (let i = 1; i < numHorizontal; i++) {
    const entryDelay = i * staggerMs
    // Exit delay can be simple (same as entry) or reversed
    const exitDelay = (totalHorizontalLines - i) * staggerMs // Example: reverse stagger

    horizontalLines.push(
      <Animated.View
        key={`h-${i}`}
        entering={FadeIn.delay(entryDelay).duration(animationDuration)}
        // Make exit animation faster and use reversed stagger delay
        exiting={FadeOut.delay(exitDelay).duration(animationDuration * 0.6)}
        style={[
          styles.line,
          styles.horizontal,
          {
            top: i * size - lineThickness / 2,
            backgroundColor: lineColor,
            height: lineThickness,
          },
        ]}
      /> // Each line is now an Animated.View
    )
  }

  // Generate vertical lines
  // Optionally, delay vertical lines until horizontal lines start fading in
  const verticalEntryStartDelay = totalHorizontalLines * staggerMs * 0.5 // Start verticals partway through horizontals
  const verticalExitStartDelay = totalVerticalLines * staggerMs * 0.5 // Similar concept for exit stagger start

  for (let i = 1; i < numVertical; i++) {
    const entryDelay = verticalEntryStartDelay + i * staggerMs
    const exitDelay = verticalExitStartDelay + (totalVerticalLines - i) * staggerMs // Example: reverse stagger

    verticalLines.push(
      <Animated.View
        key={`v-${i}`}
        entering={FadeIn.delay(entryDelay).duration(animationDuration)}
        exiting={FadeOut.delay(exitDelay).duration(animationDuration * 0.6)}
        style={[
          styles.line,
          styles.vertical,
          {
            left: i * size - lineThickness / 2,
            backgroundColor: lineColor,
            width: lineThickness,
          },
        ]}
      /> // Each line is now an Animated.View
    )
  }

  // The container itself doesn't need animation, just the lines within it
  return (
    <View style={styles.container} pointerEvents="none">
      {horizontalLines}
      {verticalLines}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -1, // Keep it in the background
    overflow: 'hidden', // Hide lines potentially drawn slightly outside bounds during animation/layout
  },
  line: {
    position: 'absolute',
    // backgroundColor will be set inline
  },
  horizontal: {
    width: '100%',
    // height will be set inline via lineThickness
  },
  vertical: {
    height: '100%',
    // width will be set inline via lineThickness
  },
})

// How to use it in your parent component:
// import { GridLines } from './path/to/GridLines'; // Adjust the path
// import React, { useState } from 'react';
// import { Button, View } from 'react-native';
//
// function App() {
//   const [showGrid, setShowGrid] = useState(true);
//
//   return (
//     <View style={{ flex: 1, backgroundColor: 'white' }}>
//       <View style={{ padding: 20, zIndex: 1 }}>
//          <Button
//            title={showGrid ? "Hide Grid" : "Show Grid"}
//            onPress={() => setShowGrid(s => !s)}
//          />
//          {/* Your other foreground content here */}
//       </View>
//
//       {/* Conditionally render GridLines */}
//       {showGrid && (
//         <GridLines
//            size={50}
//            lineColor="#E0E0E0"
//            lineThickness={1}
//            animationDuration={400}
//            staggerMs={10}
//         />
//       )}
//     </View>
//   );
// }
