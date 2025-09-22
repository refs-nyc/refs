import { useRef } from 'react'
import { Animated, Pressable, ViewStyle } from 'react-native'
import Svg, { G, Path, Rect, Text as SvgText } from 'react-native-svg'
import { c } from '@/features/style'

const SVG_WIDTH = 123
const SVG_HEIGHT = 96
const ROTATION_DEG = 4
const STAR_SCALE = 1.21 // base asset scaled up an additional 10%
const STAR_CENTER_X = 61.5
const STAR_CENTER_Y = 47.5
const SHADOW_OFFSET_X = -1
const SHADOW_OFFSET_Y = 1.84

export function OvalJaggedAddButton({ onPress, style }: { onPress?: () => void; style?: ViewStyle }) {
  const scale = useRef(new Animated.Value(1)).current

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.95, useNativeDriver: true }).start()
  }

  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()
  }

  const baseTransform = `translate(${STAR_CENTER_X} ${STAR_CENTER_Y}) scale(${STAR_SCALE}) translate(${-STAR_CENTER_X} ${-STAR_CENTER_Y})`
  const shadowTransform = `${baseTransform} translate(${SHADOW_OFFSET_X} ${SHADOW_OFFSET_Y})`

  return (
    <Animated.View
      style={[
        {
          transform: [{ rotate: `${ROTATION_DEG}deg` }, { scale }],
        },
        style,
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add a new interest"
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
      >
        <Svg width={SVG_WIDTH} height={SVG_HEIGHT} viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}>
          {/* Drop shadow */}
          <G transform={shadowTransform}>
            {/* Use both outline and accent segments to ensure full shadow coverage */}
            <Path d="M33.5665 11.5906L66.0013 30.1384L45.5684 40.4956L33.5665 11.5906Z" fill="rgba(0,0,0,0.18)" />
            <Path d="M16.3033 29.8421L52.055 29.6834L33.6814 55.0853L16.3033 29.8421Z" fill="rgba(0,0,0,0.18)" />
            <Path d="M57.6278 58.5687L20.8362 64.9195L31.3116 34.997L57.6278 58.5687Z" fill="rgba(0,0,0,0.18)" />
            <Rect x="43.7891" y="27.6367" width="35.8668" height="29.0092" transform="rotate(10 43.7891 27.6367)" fill="rgba(0,0,0,0.18)" />
            <Path d="M80.2837 22.5565L83.6605 49.4187L46.0857 26.1681L80.2837 22.5565Z" fill="rgba(0,0,0,0.18)" />
            <Path d="M96.4354 66.6745L54.093 59.4128L80.3751 35.3963L96.4354 66.6745Z" fill="rgba(0,0,0,0.18)" />
            <Path d="M71.2844 81.4951L37.6237 53.143L85.9263 48.0095L71.2844 81.4951Z" fill="rgba(0,0,0,0.18)" />
            <Path d="M104.897 39.8226L77.9058 65.2578L60.2623 31.4788L104.897 39.8226Z" fill="rgba(0,0,0,0.18)" />
          </G>

          {/* Surface border */}
          <G transform={baseTransform}>
            <Path d="M33.5665 11.5906L66.0013 30.1384L45.5684 40.4956L33.5665 11.5906Z" fill={c.surface2} />
            <Path d="M16.3033 29.8421L52.055 29.6834L33.6814 55.0853L16.3033 29.8421Z" fill={c.surface2} />
            <Path d="M57.6278 58.5687L20.8362 64.9195L31.3116 34.997L57.6278 58.5687Z" fill={c.surface2} />
            <Rect x="43.7891" y="27.6367" width="35.8668" height="29.0092" transform="rotate(10 43.7891 27.6367)" fill={c.surface2} />
            <Path d="M80.2837 22.5565L83.6605 49.4187L46.0857 26.1681L80.2837 22.5565Z" fill={c.surface2} />
            <Path d="M96.4354 66.6745L54.093 59.4128L80.3751 35.3963L96.4354 66.6745Z" fill={c.surface2} />
            <Path d="M71.2844 81.4951L37.6237 53.143L85.9263 48.0095L71.2844 81.4951Z" fill={c.surface2} />
            <Path d="M104.897 39.8226L77.9058 65.2578L60.2623 31.4788L104.897 39.8226Z" fill={c.surface2} />
          </G>

          {/* Accent star */}
          <G transform={baseTransform}>
            <Path d="M36.0682 14.9037L65.5545 31.7654L46.9791 41.181L36.0682 14.9037Z" fill={c.olive} />
            <Path d="M20.3819 31.4839L52.8834 31.3397L36.1802 54.4323L20.3819 31.4839Z" fill={c.olive} />
            <Path d="M57.9472 57.5998L24.5003 63.3732L34.0233 36.1709L57.9472 57.5998Z" fill={c.olive} />
            <Rect x="45.375" y="29.4883" width="32.6062" height="26.372" transform="rotate(10 45.375 29.4883)" fill={c.olive} />
            <Path d="M78.5498 24.8635L81.6196 49.2837L47.4607 28.1468L78.5498 24.8635Z" fill={c.olive} />
            <Path d="M93.2406 64.9687L54.7475 58.3671L78.6404 36.5339L93.2406 64.9687Z" fill={c.olive} />
            <Path d="M70.3509 78.4483L39.7503 52.6736L83.6617 48.0068L70.3509 78.4483Z" fill={c.olive} />
            <Path d="M100.901 40.5692L76.3632 63.6921L60.3237 32.9839L100.901 40.5692Z" fill={c.olive} />
          </G>

          <SvgText
            x={STAR_CENTER_X - 3}
            y={STAR_CENTER_Y + 4}
            fill={c.surface}
            fontSize={19}
            fontWeight="700"
            textAnchor="middle"
          >
            Add
          </SvgText>
        </Svg>
      </Pressable>
    </Animated.View>
  )
}
