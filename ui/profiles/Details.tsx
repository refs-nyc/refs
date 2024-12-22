import { useEffect, useRef } from 'react'
import type { Profile } from '@/features/pocketbase/stores/types'
import { Image } from 'expo-image'
import { Link, useGlobalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { View, Text, Dimensions } from 'react-native'
import Carousel, { ICarouselInstance } from 'react-native-reanimated-carousel'
import { useSharedValue } from 'react-native-reanimated'
import { Heading } from '../typo/Heading'
import { c, s } from '@/features/style'
import { gridSort } from './sorts'
import Ionicons from '@expo/vector-icons/Ionicons'

const win = Dimensions.get('window')

const renderItem = ({ item }) => {
  return (
    <View
      style={{
        width: win.width * 0.8,
        left: win.width * 0.1,
        height: win.height,
        padding: s.$075,
        paddingTop: s.$6,
        gap: s.$1,
        justifyContent: 'start',
      }}
      key={item.id}
    >
      {/* Meta information */}
      <View
        style={{
          width: '100%',
          height: s.$4,
          justifyContent: 'center',
          alignItems: 'center',
          // backgroundColor: c.red,
        }}
      >
        <Heading tag="p">{/*  */}</Heading>
      </View>
      {/* Content */}
      <View style={{ width: '100%', aspectRatio: 1, overflow: 'hidden' }}>
        {item.image ? (
          item.expand.ref.image && (
            <Image
              style={{ width: '100%', aspectRatio: 1 }}
              source={item.image || item.expand.ref.image}
            />
          )
        ) : (
          <>
            <View
              style={{
                flex: 1,
                backgroundColor: c.surface2,
                // borderRadius: s.$075,
                // borderWidth: 2,
                // borderColor: c.black
              }}
            ></View>
          </>
        )}
      </View>
      {/* Information */}
      <View style={{ width: '100%', paddingHorizontal: s.$1 }}>
        <View style={{ marginBottom: s.$1, flexDirection: 'row', justifyContent: 'space-between' }}>
          <View style={{ gap: s.$05 }}>
            <Heading tag="h2">{item.expand.ref.title}</Heading>
            <Heading tag="smallmuted">subtitle info</Heading>
          </View>
          <View style={{ transformOrigin: 'center', transform: 'rotate(-45deg)' }}>
            <Ionicons color={c.muted} size={s.$1} name="arrow-forward-outline" />
          </View>
        </View>
        {/* Comments */}
        <View style={{ width: '100%' }}>
          <Heading numberOfLines={6} tag="pmuted">
            {item.text}
          </Heading>
        </View>
      </View>
    </View>
  )
}

export const Details = ({ profile, initialId = '' }: { profile: Profile; intialId: string }) => {
  const scrollOffsetValue = useSharedValue<number>(10)
  const { userName } = useGlobalSearchParams()
  const ref = useRef<ICarouselInstance>(null)
  const insets = useSafeAreaInsets()

  const data = [...profile.expand.items].filter((itm) => !itm.backlog).sort(gridSort)
  console.log(data.map((i) => i.expand.ref.title))

  const defaultIndex = data.findIndex((itm) => itm.id == initialId)

  return (
    <View style={{ paddingTop: Math.max(insets.top, 16) }}>
      <Link
        style={{ position: 'absolute', top: insets.top + s.$1, left: s.$1, zIndex: 99 }}
        href={`/user/${userName}`}
      >
        <Ionicons size={s.$1} name="close" color={c.muted} />
      </Link>
      <Carousel
        loop={true}
        ref={ref}
        data={data}
        height={win.height}
        width={win.width * 0.8}
        defaultIndex={defaultIndex}
        style={{ overflow: 'visible', top: 0 }}
        defaultScrollOffsetValue={scrollOffsetValue}
        onSnapToItem={(index) => console.log('current index:', index)}
        renderItem={renderItem}
      />
    </View>
  )
}
