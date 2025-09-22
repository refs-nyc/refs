import Svg, { G, Path, Circle, Rect } from 'react-native-svg'
import { Pressable, ViewStyle, Animated } from 'react-native'
import { useRef } from 'react'
import { c } from '@/features/style'
import { buildJaggedPaths } from './jaggedPaths'

export default function FloatingJaggedButton({
  style,
  onPress,
  icon = 'search',
}: {
  style?: ViewStyle
  onPress?: () => void
  icon?: 'search' | 'plus'
}) {
  const scale = useRef(new Animated.Value(1)).current
  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.94, useNativeDriver: true }).start()
  }
  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()
  }
  // Jagged shape path (from your SVG, accent color)
  const jaggedPaths = buildJaggedPaths(c.accent)
  const outlinePaths = buildJaggedPaths(c.surface2)

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4.44 }, // Figma Y: 4.44
          shadowOpacity: 0.25,
          shadowRadius: 5, // Figma blur: 5
          elevation: 5,
        }}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        accessibilityLabel="Open search"
      >
      <Svg width={90} height={91} viewBox="0 0 90 91" fill="none">
        {/* Main button circle with border */}
        <Circle cx={45} cy={45.5} r={40} fill={c.surface} stroke={c.accent} strokeWidth={5.15} />
        {/* Combined jagged shape drop shadow, Y offset 0.5 */}
        <G transform="translate(45 45.5) scale(1.44) translate(-44.5 -42.5) translate(0 0.5)">
          {outlinePaths.map((p, i) => (
            <Path key={i} d={p.d} fill="rgba(0,0,0,0.25)" />
          ))}
        </G>
        {/* Surface2 outline (larger), 25% scale up, same center as accent shape */}
        <G transform="translate(45 45.5) scale(1.44) translate(-44.5 -42.5)">
          {outlinePaths.map((p, i) => (
            <Path key={i} d={p.d} fill={p.fill} />
          ))}
        </G>
        {/* Accent jagged shape, 10% larger, better centered */}
        <G transform="translate(45 45.5) scale(1.265) translate(-44.5 -42.5)">
          {jaggedPaths.map((p, i) => (
            <Path key={i} d={p.d} fill={p.fill} />
          ))}
        </G>
        {/* Icon overlay */}
        {icon === 'search' ? (
          <G transform="translate(45 45.5) scale(1.1) translate(-44.5 -42.5)">
            <Path
              d="M54.0997 47.78L49.6893 43.3695C50.7511 41.956 51.3244 40.2353 51.3224 38.4673C51.3224 33.9514 47.6483 30.2773 43.1324 30.2773C38.6164 30.2773 34.9424 33.9514 34.9424 38.4673C34.9424 42.9833 38.6164 46.6573 43.1324 46.6573C44.9004 46.6593 46.621 46.0861 48.0346 45.0242L52.445 49.4347C52.6683 49.6343 52.9595 49.7408 53.2588 49.7324C53.5582 49.724 53.8429 49.6014 54.0547 49.3896C54.2664 49.1779 54.3891 48.8931 54.3975 48.5938C54.4058 48.2944 54.2993 48.0033 54.0997 47.78ZM37.2824 38.4673C37.2824 37.3103 37.6255 36.1793 38.2683 35.2173C38.9111 34.2552 39.8247 33.5054 40.8937 33.0626C41.9626 32.6199 43.1389 32.504 44.2737 32.7298C45.4085 32.9555 46.4508 33.5126 47.269 34.3308C48.0871 35.1489 48.6443 36.1913 48.87 37.3261C49.0957 38.4609 48.9799 39.6371 48.5371 40.706C48.0943 41.775 47.3445 42.6886 46.3825 43.3314C45.4204 43.9742 44.2894 44.3173 43.1324 44.3173C41.5814 44.3155 40.0945 43.6985 38.9979 42.6019C37.9012 41.5052 37.2842 40.0183 37.2824 38.4673Z"
              fill={c.surface}
            />
          </G>
        ) : (
          <G transform="translate(45 45.5) scale(0.9) translate(-44.5 -42.5)">
            <Rect x={35} y={37} width={19} height={5} rx={2} fill={c.surface} />
            <Rect x={42} y={30} width={5} height={19} rx={2} fill={c.surface} />
          </G>
        )}
      </Svg>
      </Pressable>
    </Animated.View>
  )
}
