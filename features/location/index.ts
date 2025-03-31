// Mapbox does not enable reverse geocoding requests for the neighborhood level.
// We use neighborhood for individual profiling
// We use the locality for search results

// 1. User stores their lat, lon
// 2. We search for their locality
// 3. We store locality as string

// Location-based search
// User can create search profiles
// Search profiles are text based. We process them using the options we have with geocoding

export const getNeighborhoodFromCoordinates = async ({ lon, lat }) => {
  try {
    const response = await fetch(
      `https://api.mapbox.com/search/geocode/v6/reverse?types=neighborhood&longitude=${lon}&latitude=${lat}&access_token=${process.env.EXPO_PUBLIC_MAPBOX_KEY}`
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

// NB: Proximity is set to NYC!
export const getCoordinatesFromNeighborhood = async (neighborhood: string) => {
  try {
    const response = await fetch(
      `https://api.mapbox.com/search/geocode/v6/forward?q=${neighborhood}&proximity=-73.966,40.754&country=us&types=neighborhood,locality&autocomplete=false&access_token=${process.env.EXPO_PUBLIC_MAPBOX_KEY}`
    )
    const result = await response.json()
    if (result.features && result.features.length > 0) {
      return result.features[0]
    } else {
      return false
    }
  } catch (error) {
    console.error(error)
  }
}

// place -> borough -> neighborhood
export const places = {
  'New York': {
    Brooklyn: [
      'Bay Ridge',
      'Bedford-Stuyvesant',
      'Boerum Hill',
      'Brooklyn Heights',
      'Carroll Gardens',
      'Clinton Hill',
      'Cobble Hill',
      'Crown Heights',
      'Ditmas Park',
      'Downtown Brooklyn',
      'Dumbo',
      'East New York',
      'Flatbush',
      'Fort Greene',
      'Gowanus',
      'Greenwood Heights',
      'Kensington',
      'Park Slope',
      'Prospect Heights',
      'Prospect Lefferts Gardens',
      'Prospect Park South',
      'Red Hook',
      'Sunset Park',
      'Williamsburg',
      'Windsor Terrace',
    ],
    Manhattan: [
      'Battery Park City',
      'Chelsea',
      'Chinatown',
      'East Harlem',
      'East Village',
      'Garment District',
      'Financial District',
      'Flatiron',
      'Gramercy Park',
      'Greenwich Village',
      "Hell's Kitchen",
      'Little Italy',
      'Lower East Side',
      'Meatpacking District',
      'Midtown East',
      'Nolita',
      'Nomad',
      'NoHo',
      'SoHo',
      'Theater District',
      'Tribeca',
      'Upper East Side',
      'Upper West Side',
      'West Village',
    ],

    Queens: [
      'Astoria',
      'Forest Hills',
      'Greenpoint',
      'Jackson Heights',
      'Long Island City',
      'Murray Hill',
      'Rockaway Beach',
      'Rockaway Park',
      'Sunnyside',
      'Woodside',
    ],
  },
} as Record<string, Record<string, string[]>>

export function generateDropdownItems() {
  const items = []

  items.push({ label: 'Elsewhere', value: 'Elsewhere' })

  for (const [place, boroughs] of Object.entries(places)) {
    items.push({ label: place, value: place, selectable: false })
    for (const [boroughKey, neighborhoods] of Object.keys(boroughs)) {
      items.push({ label: boroughKey, value: boroughKey, selectable: false })
      for (const neighborhood of neighborhoods) {
        items.push({ label: neighborhood, value: neighborhood })
      }
    }
  }

  return items
}
