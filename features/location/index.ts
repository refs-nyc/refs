export const setGeolocation = () => {}

export const getNeighborhoodFromCoordinates = async ({ long, lat }) => {
  try {
    const response = await fetch(
      `https://api.mapbox.com/search/geocode/v6/reverse?types=neighborhood&longitude=${long}&latitude=${lat}&access_token=${process.env.EXPO_PUBLIC_MAPBOX_KEY}`
    )
    const result = await response.json()

    if (result?.features.length > 0) {
      // We want to store the feature without coordinates
      const feature = { ...result.features[0] }

      delete feature.properties.coordinates
      delete feature.geometry.coordinates
      delete feature.properties.bbox

      return feature
    }

    throw new Error('Could not determine location')
  } catch (error) {
    console.error(error)

    return false
  }

  // Store some kind of ID -> mapbox_id
}

export const getCoordinatesFromNeighborhood = async (neighborhood: string) => {
  try {
    const response = await fetch(
      `https://api.mapbox.com/search/geocode/v6/forward?neighborhood=${neighborhood}&access_token=${process.env.EXPO_PUBLIC_MAPBOX_KEY}`
    )
    const result = await response.json()
    return result
  } catch (error) {
    console.error(error)
  }
}

// Should cache this. Not necessary to get all info
export const getNeighborhoodsInNYC = async () => {
  try {
    const response = await fetch(
      `https://api.mapbox.com/search/geocode/v6/forward?q=new%20york&types=place&access_token=${process.env.EXPO_PUBLIC_MAPBOX_KEY}`
    )
    const result = await response.json()
    return result
  } catch (error) {
    console.error(error)
  }
}
