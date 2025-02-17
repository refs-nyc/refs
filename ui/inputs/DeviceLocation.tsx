import { useState } from 'react'
import { Platform, StyleSheet, View, Text } from 'react-native'
import { pocketbase } from '@/features/pocketbase'
import { getNeighborhoodFromCoordinates, presets } from '@/features/location'
import { useUserStore } from '@/features/pocketbase/stores/users'
import { Button } from '../buttons/Button'
import { c, t } from '@/features/style'
import DropDownPicker from 'react-native-dropdown-picker'

import * as Device from 'expo-device'
import * as Location from 'expo-location'

export const DeviceLocation = () => {
  const [locationState, setLocation] = useState<Location.LocationObject | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState(null)

  const [items, setItems] = useState(presets)

  const { stagedUser, updateStagedUser, updateUser } = useUserStore()

  /** Get location from button click */
  async function getCurrentLocation() {
    console.log('GET LOCATIONE')
    if (Platform.OS === 'android' && !Device.isDevice) {
      setErrorMsg(
        'Oops, this will not work on Snack in an Android Emulator. Try it on your device!'
      )
      return
    }
    let response = await Location.requestForegroundPermissionsAsync()

    console.log(response.status)
    if (response.status !== 'granted') {
      setErrorMsg('Permission to access location was denied')
      return
    }

    let location = await Location.getCurrentPositionAsync({})

    setLocation(location)

    await getNeighborhoodFromCoordinates({
      lon: location?.coords.longitude,
      lat: location?.coords.latitude,
    })

    const fields = {
      lon: location?.coords.longitude,
      lat: location?.coords.latitude,
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
    <>
      <Button onPress={getCurrentLocation} variant="basic" title="Use my current location"></Button>

      <Text>Or select your neighborhood</Text>

      <DropDownPicker
        open={open}
        value={value}
        items={items}
        setOpen={setOpen}
        setValue={setValue}
        setItems={setItems}
        theme={'LIGHT'}
        searchTextInputStyle={{ ...t.p, color: c.accent, borderWidth: 0 }}
        searchContainerStyle={{ borderBottomColor: c.white }}
        searchable={true}
        ListEmptyComponent={() => <View style={[t.p, { color: c.accent, opacity: 0 }]}></View>}
        style={{ borderColor: c.accent, borderRadius: 30, borderWidth: 2 }}
        labelStyle={{ ...t.p, color: c.accent, paddingHorizontal: 12 }}
        listParentLabelStyle={{ ...t.p, color: c.accent }}
        listChildLabelStyle={{ ...t.p, color: c.accent }}
        dropDownContainerStyle={{
          backgroundColor: 'white',
          borderColor: c.accent,
          borderRadius: 30,
          borderWidth: 2,
        }}
      />
      {/* <View style={styles.overlay} pointerEvents="none" /> */}
    </>
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
