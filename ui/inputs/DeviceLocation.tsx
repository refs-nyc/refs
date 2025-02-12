import { useState } from 'react'
import { Platform, StyleSheet, View, Text } from 'react-native'
import { getNeighborhoodFromCoordinates } from '@/features/location'
import { Button } from '../buttons/Button'
import { c, t } from '@/features/style'
import DropDownPicker from 'react-native-dropdown-picker'

import * as Device from 'expo-device'
import * as Location from 'expo-location'

const hoodList = [
  'Chelsea and Clinton',
  'Lower East Side',
  'Lower Manhattan',
  'Gramercy Park and Murray Hill',
  'Greenwich Village and Soho',
  'Upper East Side',
  'Upper West Side',
  'Central Harlem',
  'East Harlem',
  'Inwood and Washington Heights',
  'West Side',
  'Tribeca',
  'Stapleton and St. George',
  'Port Richmond',
  'South Shore',
  'Mid-Island',
  'High Bridge and Morrisania',
  'Central Bronx',
  'Hunts Point and Mott Haven',
  'Bronx Park and Fordham',
  'Southeast Bronx',
  'Kingsbridge and Riverdale',
  'Northeast Bronx',
  'Southeast Queens',
  'Northwest Queens',
  'Long Island City',
  'Northwest Brooklyn',
  'Flatbush',
  'Borough Park',
  'Bushwick and Williamsburg',
  'East New York and New Lots',
  'Southwest Brooklyn',
  'Greenpoint',
  'Central Brooklyn',
  'Sunset Park',
  'Southern Brooklyn',
  'Canarsie and Flatlands',
  'North Queens',
  'Northeast Queens',
  'Central Queens',
  'West Queens',
  'West Central Queens',
  'Jamaica',
  'Southwest Queens',
  'Rockaways',
]

export const DeviceLocation = () => {
  const [locationState, setLocation] = useState<Location.LocationObject | null>(null)
  const [hoods, setHoods] = useState<string[]>(hoodList)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState(null)
  const [items, setItems] = useState([
    { label: 'New York', value: 'newyork' },
    ...hoodList.map((itm) => ({ label: itm, value: itm, parent: 'newyork' })),
  ])

  async function getCurrentLocation() {
    console.log('GET LOCATIONE')
    if (Platform.OS === 'android' && !Device.isDevice) {
      setErrorMsg(
        'Oops, this will not work on Snack in an Android Emulator. Try it on your device!'
      )
      return
    }
    let { status } = await Location.requestForegroundPermissionsAsync()

    console.log(status)
    if (status !== 'granted') {
      setErrorMsg('Permission to access location was denied')
      return
    }

    let location = await Location.getCurrentPositionAsync({})

    setLocation(location)

    await getNeighborhoodFromCoordinates({
      long: location?.coords.longitude,
      lat: location?.coords.latitude,
    })
  }

  return (
    <>
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
      <Button onPress={getCurrentLocation} variant="basic" title="Use my current location"></Button>
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
