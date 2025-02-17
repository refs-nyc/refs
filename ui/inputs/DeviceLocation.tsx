import { useState } from 'react'
import { Platform, StyleSheet, View, Text } from 'react-native'
import { YStack } from '../core/Stacks'
import { pocketbase } from '@/features/pocketbase'
import { Image } from 'expo-image'
import {
  getNeighborhoodFromCoordinates,
  getCoordinatesFromNeighborhood,
  presets,
} from '@/features/location'
import { useUserStore } from '@/features/pocketbase/stores/users'
import { Button } from '../buttons/Button'
import { c, t, s } from '@/features/style'
import DropDownPicker from 'react-native-dropdown-picker'

import * as Device from 'expo-device'
import * as Location from 'expo-location'

export const DeviceLocation = ({ onChange }: { onChange: (string) => void }) => {
  const [locationState, setLocation] = useState<Location.LocationObject | null>(null)
  const [humanReadableFormat, setHumanReadableFormat] = useState('')
  const [open, setOpen] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('Use my current location')
  const [value, setValue] = useState(null)

  const [items, setItems] = useState(presets)

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

    if (
      hoodResult?.properties?.context?.neighborhood?.name &&
      hoodResult?.properties?.context?.locality?.name &&
      hoodResult?.properties?.context?.place?.name
    ) {
      setHumanReadableFormat(
        `${hoodResult?.properties?.context?.neighborhood?.name}, ${hoodResult?.properties?.context?.locality?.name}, ${hoodResult?.properties?.context?.place?.name}`
      )
      setLoadingMessage(humanReadableFormat)
    } else if (hoodResult?.properties?.name) {
      setHumanReadableFormat(hoodResult?.properties?.name)
      setLoadingMessage(humanReadableFormat)
    } else {
      setLoadingMessage('Could not determine your neighborhood')
    }

    const fields = {
      lon: location?.coords.longitude,
      lat: location?.coords.latitude,
      location: humanReadableFormat,
    }

    onChange(humanReadableFormat)

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
        onSelectItem={async (item) => {
          console.log('selected, ', item)
          const name =
            item.label === 'New York'
              ? item.label
              : `${item.label}${item?.parent ? `, ${item.parent}, New York` : ', New York'}`
          setHumanReadableFormat(name)
          setLoadingMessage(name)
          onChange(name)

          console.log('search ', item.label)
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
        searchContainerStyle={{ borderBottomColor: c.white }}
        searchable={true}
        ListEmptyComponent={() => (
          <View style={[t.p, { color: c.accent, opacity: 0, height: 0, width: 0 }]}></View>
        )}
        style={{ borderColor: c.accent, borderRadius: 30, borderWidth: 2 }}
        labelStyle={{ ...t.p, color: c.accent, paddingHorizontal: 12 }}
        listParentLabelStyle={{ ...t.p, color: c.accent, paddingHorizontal: 12 }}
        listChildLabelStyle={{ ...t.p, color: c.accent }}
        dropDownContainerStyle={{
          backgroundColor: 'white',
          borderColor: c.accent,
          borderRadius: 30,
          borderWidth: 2,
          borderTopWidth: 1,
        }}
      />

      <Button disabled variant="basic" title="Or let us determine your location"></Button>

      <Button onPress={getCurrentLocation} variant="" title={loadingMessage}></Button>
    </YStack>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  paragraph: {
    fontSize: 18,
    textAlign: 'center',
  },
  // overlay: {
  //   ...StyleSheet.absoluteFillObject,
  //   backgroundColor: c.accent,
  // },
})
