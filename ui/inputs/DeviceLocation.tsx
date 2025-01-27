import { useState, useEffect } from 'react'
import { Platform, Text, View, StyleSheet } from 'react-native'
import { getNeighborhoodsInNYC, getNeighborhoodFromCoordinates } from '@/features/location'
import { Button } from '../buttons/Button'

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
  const [hoods, getHoods] = useState<any[]>([])
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const getList = async () => {
    const list = await getNeighborhoodsInNYC()
    // console.log(list)

    console.log(JSON.stringify(list, null, 2))
  }

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
    console.log(location)
  }

  return (
    <>
      <Button onPress={getList} title="Get NYC hoods" />
      <Button onPress={getCurrentLocation} variant="basic" title="Use my current location"></Button>
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
})
