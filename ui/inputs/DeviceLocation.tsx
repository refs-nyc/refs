import { useState } from 'react'
import { Platform, View } from 'react-native'
import { XStack, YStack } from '../core/Stacks'
import { Image } from 'expo-image'
import {
  getNeighborhoodFromCoordinates,
  getCoordinatesFromNeighborhood,
  generateDropdownItems,
  getPlaceLabel,
} from '@/features/location'
import { c, t, s } from '@/features/style'
import DropDownPicker from 'react-native-dropdown-picker'
import * as Device from 'expo-device'
import * as Location from 'expo-location'
import { Heading } from '../typo/Heading'
import { Button } from '../buttons/Button'

export const DeviceLocation = ({
  onChange,
}: {
  onChange: (newLocation: { lon: number; lat: number; location: string }) => void
}) => {
  const [open, setOpen] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('')
  const [dropdownValue, setDropdownValue] = useState<string | null>(null)
  const [items, setItems] = useState(generateDropdownItems())

  /** Get location from button click */
  async function getCurrentLocation() {
    setLoadingMessage('Determining location')
    if (Platform.OS === 'android' && !Device.isDevice) {
      setLoadingMessage(
        'Oops, this will not work on Snack in an Android Emulator. Try it on your device!'
      )
      return
    }
    let response = await Location.requestForegroundPermissionsAsync()

    if (response.status !== 'granted') {
      setLoadingMessage('Permission to access location was denied')
      return
    }

    const location = await Location.getCurrentPositionAsync({})

    if (!location) {
      setLoadingMessage('Could not determine your location, select from dropdown')
      return
    }
    const lon = location.coords.longitude
    const lat = location.coords.latitude

    let locationLabel = 'Elsewhere'
    try {
      const hoodResult = await getNeighborhoodFromCoordinates({
        lon,
        lat,
      })
      const place = hoodResult.properties.context.place?.name as string
      const locality = hoodResult.properties.context.locality?.name as string
      const neighborhood = hoodResult.properties.context.neighborhood?.name as string

      const { locationLabel, matchingItem } = getPlaceLabel(items, place, locality, neighborhood)
      if (matchingItem) {
        setDropdownValue(matchingItem.label)
      }

      setLoadingMessage(locationLabel)
    } catch (error) {
      console.error(error)
      setDropdownValue('Elsewhere')
      setLoadingMessage('Elsewhere')
      locationLabel = 'Elsewhere'
    }

    onChange({ lon, lat, location: locationLabel })
  }

  return (
    <YStack gap={s.$1}>
      <DropDownPicker
        open={open}
        value={dropdownValue}
        items={items}
        setOpen={setOpen}
        setValue={setDropdownValue}
        setItems={setItems}
        placeholder="Location"
        searchPlaceholder="Type a neighborhood"
        onSelectItem={async (item) => {
          const name = item.label!
          setLoadingMessage(name)

          const l = await getCoordinatesFromNeighborhood(name)

          if (l) {
            const lat = l.geometry.coordinates[0]
            const lon = l.geometry.coordinates[1]

            onChange({ lon, lat, location: name })
          }
        }}
        ArrowUpIconComponent={() => (
          <Image
            style={{ width: 24, height: 24 }}
            source={require('@/assets/icons/arrow-up.png')}
          />
        )}
        ArrowDownIconComponent={() => (
          <Image
            style={{ width: 24, height: 24 }}
            source={require('@/assets/icons/arrow-down.png')}
          />
        )}
        TickIconComponent={() => (
          <Image style={{ width: 24, height: 24 }} source={require('@/assets/icons/tick.png')} />
        )}
        CloseIconComponent={() => (
          <Image style={{ width: 24, height: 24 }} source={require('@/assets/icons/close.png')} />
        )}
        theme={'LIGHT'}
        placeholderStyle={{ ...t.p, color: c.accent, borderWidth: 0, paddingHorizontal: 12 }}
        searchTextInputStyle={{ ...t.p, color: c.accent, borderWidth: 0, paddingHorizontal: 12 }}
        searchContainerStyle={{ borderBottomColor: c.surface, backgroundColor: c.surface }}
        searchable={true}
        ListEmptyComponent={() => (
          <View style={[t.p, { color: c.accent, opacity: 0, height: 0, width: 0 }]}></View>
        )}
        style={{
          borderColor: c.accent,
          borderRadius: 30,
          borderWidth: 1.5,
          backgroundColor: c.surface,
        }}
        labelStyle={{ ...t.p, color: c.accent, paddingHorizontal: 12 }}
        listParentLabelStyle={{ ...t.p, color: c.accent, paddingHorizontal: 12 }}
        listChildLabelStyle={{ ...t.p, color: c.accent }}
        dropDownContainerStyle={{
          backgroundColor: c.surface,
          borderColor: c.accent,
          borderRadius: 30,
          borderWidth: 2,
          borderTopWidth: 1,
        }}
        flatListProps={{ keyboardShouldPersistTaps: 'always' }}
      />

      <View style={{ height: s.$4, alignItems: 'center', justifyContent: 'center' }}>
        {loadingMessage === '' ? (
          <XStack gap={s.$025} style={{ alignItems: 'center', justifyContent: 'center' }}>
            <Button
              onPress={getCurrentLocation}
              variant="inlineSmallMuted"
              title="Let us determine your location"
            />
          </XStack>
        ) : (
          <Heading style={{ textAlign: 'center' }} tag="pmuted">
            {loadingMessage}
          </Heading>
        )}
      </View>
      {loadingMessage && (
        <XStack gap={s.$025} style={{ alignItems: 'center', justifyContent: 'center' }}>
          <Button
            onPress={() => {
              setLoadingMessage('')
              setDropdownValue(null)
            }}
            variant="inlineSmallMuted"
            title="Reset"
          />
        </XStack>
      )}
    </YStack>
  )
}
