import { useState, useRef, forwardRef } from 'react'
import { Image } from 'expo-image'
import { Zoomable } from '@likashefqet/react-native-image-zoom'
import { Link, useGlobalSearchParams, usePathname, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { View, Dimensions, Pressable, ScrollView } from 'react-native'
import Carousel, { ICarouselInstance } from 'react-native-reanimated-carousel'
import { useSharedValue } from 'react-native-reanimated'
import { Heading } from '../typo/Heading'
import { c, s } from '@/features/style'
import { gridSort } from './sorts'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useUIStore } from '@/ui/state'
import { ListContainer } from '../lists/ListContainer'
import { EditableList } from '../lists/EditableList'
import { Sheet, SheetScreen } from '../core/Sheets'
import { useUserStore, isExpandedProfile } from '@/features/pocketbase/stores/users'
import { ExpandedItem } from '@/features/pocketbase/stores/types'

const win = Dimensions.get('window')

export const renderItem = ({ item, canAdd }: { item: ExpandedItem; canAdd?: boolean }) => {
  return (
    <View
      style={{
        height: 'auto', // hack
        width: win.width * 0.8,
        left: win.width * 0.1,
        padding: s.$075,
        gap: s.$1,
        justifyContent: 'start',
        overflow: 'hidden',
      }}
      key={item.id}
    >
      <View style={{ width: '100%', aspectRatio: 1, overflow: 'hidden' }}>
        {item.image ? (
          item.expand?.ref.image && (
            <Zoomable
              minScale={1}
              maxScale={3}
              onInteractionEnd={() => console.log('onInteractionEnd')}
              onPanStart={() => console.log('onPanStart')}
              onPanEnd={() => console.log('onPanEnd')}
              onPinchStart={() => console.log('onPinchStart')}
              onPinchEnd={() => console.log('onPinchEnd')}
              onSingleTap={() => console.log('onSingleTap')}
              onDoubleTap={(zoomType) => {
                console.log('onDoubleTap', zoomType)
              }}
              style={{ width: '100%', aspectRatio: 1 }}
            >
              <Image
                onLoad={(e) => {
                  console.log('on image load', e)
                }}
                style={{ width: '100%', aspectRatio: 1 }}
                source={item.image || item.expand.ref.image}
              />
            </Zoomable>
          )
        ) : (
          <View
            style={{
              flex: 1,
              backgroundColor: c.surface2,
              // borderRadius: s.$075,
              // borderWidth: 2,
              // borderColor: c.black
            }}
          >
            {item.list && <ListContainer canAdd={canAdd} item={item} />}
          </View>
        )}
      </View>
      {/* Information */}
      <View style={{ width: '100%', paddingHorizontal: s.$1 }}>
        <View style={{ marginBottom: 0, flexDirection: 'row', justifyContent: 'space-between' }}>
          <View style={{ gap: s.$05 }}>
            <Heading tag="h2">{item.expand?.ref.title}</Heading>
            <Heading tag="smallmuted">{item.expand?.ref?.meta}</Heading>
          </View>
          <Pressable onPress={() => {}}>
            {item.expand.ref.url && (
              <Link href={item.expand.ref.url}>
                <Ionicons
                  style={{ transformOrigin: 'center', transform: 'rotate(-45deg)' }}
                  color={c.muted}
                  size={s.$1}
                  name="arrow-forward-outline"
                />
              </Link>
            )}
          </Pressable>
        </View>
        {/* Comments */}
        <View style={{ width: '100%' }}>
          <Heading numberOfLines={4} tag="pmuted">
            {item.text}
          </Heading>
        </View>
      </View>
    </View>
  )
}

export const DetailsCarousel = forwardRef(
  (
    { data, height, width, defaultIndex, style, scrollOffsetValue, onSnapToItem, renderItem },
    ref
  ) => {
    console.log(style)
    return (
      <Carousel
        panGestureHandlerProps={{
          activeOffsetX: [-10, 10],
          // By setting this to a small range, the vertical interactions are allowed to bypass the handler
        }}
        loop={true}
        ref={ref}
        data={data}
        width={width}
        height={height} // hack
        defaultIndex={defaultIndex}
        style={style}
        defaultScrollOffsetValue={scrollOffsetValue}
        onSnapToItem={onSnapToItem}
        renderItem={renderItem}
      />
    )
  }
)

export const Details = ({
  canAdd = false,
  initialId = '',
}: {
  canAdd?: boolean
  initialId: string
}) => {
  const [isCarouselVisible, setIsCarouselVisible] = useState(true)
  const scrollOffsetValue = useSharedValue<number>(10)
  const pathname = usePathname()
  const { userName } = useGlobalSearchParams()
  const router = useRouter()
  const { profile, getProfile } = useUserStore()

  const userNameParam =
    pathname === '/' ? undefined : typeof userName === 'string' ? userName : userName?.[0]
  const ref = useRef<ICarouselInstance>(null)
  const insets = useSafeAreaInsets()
  const { addingToList, setAddingToList } = useUIStore()
  const data = (
    isExpandedProfile(profile) && profile.expand?.items
      ? [...profile.expand.items].filter((itm) => !itm.backlog).sort(gridSort)
      : []
  ) as ExpandedItem[]
  const defaultIndex = Math.max(
    0,
    data.findIndex((itm) => itm.id == initialId)
  )

  const addingItem = data.find((itm) => itm.id === addingToList)

  const close = async () => {
    setAddingToList('')
    await getProfile(userNameParam)
  }

  return (
    <SheetScreen onChange={(e) => e === -1 && router.back()}>
      <View style={{ height: win.height, justifyContent: 'center' }}>
        <Pressable
          style={{
            position: 'absolute',
            top: s.$4,
            right: s.$1,
            padding: s.$1,
            zIndex: 99,
          }}
          onPress={() => {
            setIsCarouselVisible(false)
            setTimeout(() => router.back(), 0)
          }}
        >
          <Ionicons size={s.$1} name="close" color={c.muted} />
        </Pressable>
        {isCarouselVisible && (
          <DetailsCarousel
            ref={ref}
            data={data}
            height={200}
            defaultIndex={defaultIndex}
            style={{ overflow: 'visible', top: win.height * 0.2 }}
            width={win.width * 0.8}
            defaultScrollOffsetValue={scrollOffsetValue}
            onSnapToItem={(index) => console.log('current index:', index)}
            renderItem={({ item }) => renderItem({ item, canAdd })}
          />
        )}
      </View>

      {addingToList !== '' && addingItem && (
        <Sheet full={true} onChange={(e) => e === -1 && close()}>
          <EditableList item={addingItem} onComplete={() => {}} />
        </Sheet>
      )}
    </SheetScreen>
  )
}
