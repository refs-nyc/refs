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

export const presets = [
  // { label: 'New York', value: 'New York', selectable: false },
  { label: 'Queens', value: 'Queens', selectable: false },
  { label: 'Astoria', value: 'Astoria', parent: 'Queens' },
  { label: 'Forest Hills', value: 'Forest Hills', parent: 'Queens' },
  { label: 'Greenpoint', value: 'Greenpoint', parent: 'Queens' },
  { label: 'Jackson Heights', value: 'Jackson Heights', parent: 'Queens' },
  { label: 'Long Island City', value: 'Long Island City', parent: 'Queens' },
  { label: 'Lower East Side', value: 'Lower East Side', parent: 'Queens' },
  { label: 'Meatpacking District', value: 'Meatpacking District', parent: 'Queens' },
  { label: 'Midtown East', value: 'Midtown East', parent: 'Queens' },
  { label: 'Murray Hill', value: 'Murray Hill', parent: 'Queens' },
  { label: 'NoHo', value: 'NoHo', parent: 'Queens' },
  { label: 'Ridgewood', value: 'Ridgewood', parent: 'Queens' },
  { label: 'Rockaway Beach', value: 'Rockaway Beach', parent: 'Queens' },
  { label: 'Rockaway Park', value: 'Rockaway Park', parent: 'Queens' },
  { label: 'Sunnyside', value: 'Sunnyside', parent: 'Queens' },
  { label: 'Woodside', value: 'Woodside', parent: 'Queens' },
  { label: 'Manhattan', value: 'Manhattan', selectable: false },
  { label: 'Battery Park City', value: 'Battery Park City', parent: 'Manhattan' },
  { label: 'Chelsea', value: 'Chelsea', parent: 'Manhattan' },
  { label: 'Chinatown', value: 'Chinatown', parent: 'Manhattan' },
  { label: 'East Harlem', value: 'East Harlem', parent: 'Manhattan' },
  { label: 'East Village', value: 'East Village', parent: 'Manhattan' },
  { label: 'Garment District', value: 'Garment District', parent: 'Manhattan' },
  { label: 'Financial District', value: 'Financial District', parent: 'Manhattan' },
  { label: 'Flatiron', value: 'Flatiron', parent: 'Manhattan' },
  { label: 'Gramercy Park', value: 'Gramercy Park', parent: 'Manhattan' },
  { label: 'Greenwich Village', value: 'Greenwich Village', parent: 'Manhattan' },
  { label: "Hell's Kitchen", value: "Hell's Kitchen", parent: 'Manhattan' },
  { label: 'Little Italy', value: 'Little Italy', parent: 'Manhattan' },
  { label: 'Nolita', value: 'Nolita', parent: 'Manhattan' },
  { label: 'Nomad', value: 'Nomad', parent: 'Manhattan' },
  { label: 'SoHo', value: 'SoHo', parent: 'Manhattan' },
  { label: 'Theater District', value: 'Theater District', parent: 'Manhattan' },
  { label: 'Tribeca', value: 'Tribeca', parent: 'Manhattan' },
  { label: 'Upper East Side', value: 'Upper East Side', parent: 'Manhattan' },
  { label: 'Upper West Side', value: 'Upper West Side', parent: 'Manhattan' },
  { label: 'West Village', value: 'West Village', parent: 'Manhattan' },
  { label: 'Brooklyn', value: 'Brooklyn', selectable: false },
  { label: 'Bay Ridge', value: 'Bay Ridge', parent: 'Brooklyn' },
  { label: 'Bedford-Stuyvesant', value: 'Bedford-Stuyvesant', parent: 'Brooklyn' },
  { label: 'Boerum Hill', value: 'Boerum Hill', parent: 'Brooklyn' },
  { label: 'Brooklyn Heights', value: 'Brooklyn Heights', parent: 'Brooklyn' },
  { label: 'Carroll Gardens', value: 'Carroll Gardens', parent: 'Brooklyn' },
  { label: 'Clinton Hill', value: 'Clinton Hill', parent: 'Brooklyn' },
  { label: 'Cobble Hill', value: 'Cobble Hill', parent: 'Brooklyn' },
  { label: 'Crown Heights', value: 'Crown Heights', parent: 'Brooklyn' },
  { label: 'Ditmas Park', value: 'Ditmas Park', parent: 'Brooklyn' },
  { label: 'Downtown Brooklyn', value: 'Downtown Brooklyn', parent: 'Brooklyn' },
  { label: 'Dumbo', value: 'Dumbo', parent: 'Brooklyn' },
  { label: 'East New York', value: 'East New York', parent: 'Brooklyn' },
  { label: 'Flatbush', value: 'Flatbush', parent: 'Brooklyn' },
  { label: 'Fort Greene', value: 'Fort Greene', parent: 'Brooklyn' },
  { label: 'Gowanus', value: 'Gowanus', parent: 'Brooklyn' },
  { label: 'Greenwood Heights', value: 'Greenwood Heights', parent: 'Brooklyn' },
  { label: 'Harlem', value: 'Harlem', parent: 'Brooklyn' },
  { label: 'Kensington', value: 'Kensington', parent: 'Brooklyn' },
  { label: 'Park Slope', value: 'Park Slope', parent: 'Brooklyn' },
  { label: 'Prospect Heights', value: 'Prospect Heights', parent: 'Brooklyn' },
  { label: 'Prospect Lefferts Gardens', value: 'Prospect Lefferts Gardens', parent: 'Brooklyn' },
  { label: 'Prospect Park South', value: 'Prospect Park South', parent: 'Brooklyn' },
  { label: 'Red Hook', value: 'Red Hook', parent: 'Brooklyn' },
  { label: 'Sunset Park', value: 'Sunset Park', parent: 'Brooklyn' },
  { label: 'Williamsburg', value: 'Williamsburg', parent: 'Brooklyn' },
  { label: 'Windsor Terrace', value: 'Windsor Terrace', parent: 'Brooklyn' },
  // { label: 'Bronx', value: 'Bronx', selectable: false },
  // { label: 'Staten Island', value: 'Staten Island', selectable: false },
].toReversed()
