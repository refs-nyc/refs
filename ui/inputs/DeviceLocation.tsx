import { useState } from 'react'
import { Platform, View } from 'react-native'
import { XStack, YStack } from '../core/Stacks'
import { pocketbase } from '@/features/pocketbase'
import { Image } from 'expo-image'
import {
  getNeighborhoodFromCoordinates,
  getCoordinatesFromNeighborhood,
  presets,
} from '@/features/location'
import { useUserStore } from '@/features/pocketbase/stores/users'
import { c, t, s } from '@/features/style'
import DropDownPicker from 'react-native-dropdown-picker'
import * as Device from 'expo-device'
import * as Location from 'expo-location'
import { Pressable } from 'react-native-gesture-handler'
import { Heading } from '../typo/Heading'
import { Button } from '../buttons/Button'

export const DeviceLocation = ({ onChange }: { onChange: (value: string) => void }) => {
  const [locationState, setLocation] = useState<Location.LocationObject | null>(null)
  const [humanReadableFormat, setHumanReadableFormat] = useState('')
  const [open, setOpen] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('')
  const [value, setValue] = useState(null)
  // Ensure "Elsewhere" is added to the dropdown items from the start.
  const [items, setItems] = useState([...presets, { label: 'Elsewhere', value: 'Elsewhere' }])

  const { stagedUser, updateStagedUser, updateUser } = useUserStore()

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

    let location = await Location.getCurrentPositionAsync({})
    setLocation(location)

    const hoodResult = await getNeighborhoodFromCoordinates({
      lon: location?.coords.longitude,
      lat: location?.coords.latitude,
    })

    let computedLocation = ''
    if (hoodResult?.properties?.context?.neighborhood?.name) {
      computedLocation = `${hoodResult.properties.context.neighborhood.name}`
    } else if (hoodResult?.properties?.name) {
      computedLocation = hoodResult.properties.name
    }

    // Determine the final location:
    // If the computed location is in our items and not empty, use it; otherwise, fallback to "Elsewhere"
    const existsInItems = items.find((item) => item.label === computedLocation)
    const finalLocation = existsInItems && computedLocation !== '' ? computedLocation : 'Elsewhere'

    setHumanReadableFormat(finalLocation)
    setValue(finalLocation)
    setLoadingMessage(finalLocation)
    onChange(finalLocation)

    const fields = {
      lon: location?.coords.longitude,
      lat: location?.coords.latitude,
      location: finalLocation,
    }

    if (!pocketbase.authStore.isValid) {
      const updated = updateStagedUser(fields)
      console.log('staged', updated)
    } else {
      const updated = await updateUser(fields)
      console.log('actual', updated)
    }
  }

  return (
    <YStack gap={s.$1}>
      <DropDownPicker
        open={open}
        value={value}
        items={items}
        setOpen={setOpen}
        setValue={setValue}
        setItems={setItems}
        placeholder="Location"
        searchPlaceholder="Type a neighborhood"
        onSelectItem={async (item) => {
          console.log('selected, ', item)
          const name = item.label
          setHumanReadableFormat(name)
          setLoadingMessage(name)
          onChange(name)

          const l = await getCoordinatesFromNeighborhood(item.label)

          if (l) {
            const lat = l.geometry.coordinates[0]
            const lon = l.geometry.coordinates[1]
            if (!pocketbase.authStore.isValid) {
              console.log('UPDATING STAGED', { lat, lon })
              const u = await updateStagedUser({ lat, lon })
              console.log(u)
            } else {
              console.log('UPDATING USER', { lat, lon })
              await updateUser({ lat, lon })
            }
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
    </YStack>
  )
}
