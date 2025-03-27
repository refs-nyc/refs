import React, { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  LayoutAnimation,
  Dimensions,
  UIManager,
  Platform,
} from 'react-native'
import { c, s, t } from '@/features/style'
import { ControlledSearchBar } from '../inputs/SearchBar'

// Enable LayoutAnimation on Android.
if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental &&
    UIManager.setLayoutAnimationEnabledExperimental(true)
}

const terms = ['Tennis partners', 'Hardware founders', 'Chess club + Wes Anderson']

const peopleData = [
  {
    name: 'Noëmie',
    location: 'West Village, NYC',
    shared: 12,
    number: 3,
    source: require('@/assets/images/people/3.jpg'),
  },
  {
    name: 'Paul',
    location: 'Greenpoint, Brooklyn',
    shared: 8,
    number: 2,
    source: require('@/assets/images/people/2.jpg'),
  },
  {
    name: 'Jackson',
    location: 'Carrol Gardens, Brooklyn',
    shared: 8,
    number: 4,
    source: require('@/assets/images/people/4.jpg'),
  },
  {
    name: 'Jed',
    location: 'East Village, NYC',
    shared: 8,
    number: 1,
    source: require('@/assets/images/people/1.jpg'),
  },
  {
    name: 'Anik',
    location: 'FiDi, NYC',
    shared: 8,
    number: 8,
    source: require('@/assets/images/people/8.jpg'),
  },
  {
    name: 'Ilia',
    location: 'West Village, NYC',
    shared: 12,
    number: 7,
    source: require('@/assets/images/people/7.jpg'),
  },
  {
    name: 'Jorge',
    location: 'East Village, NYC',
    shared: 12,
    number: 5,
    source: require('@/assets/images/people/5.jpg'),
  },
  {
    name: 'Tom',
    location: 'East Village, NYC',
    shared: 6,
    number: 6,
    source: require('@/assets/images/people/6.jpg'),
  },
]

function shuffle(array: any[]) {
  let currentIndex = array.length
  while (currentIndex !== 0) {
    let randomIndex = Math.floor(Math.random() * currentIndex)
    currentIndex--
    ;[array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]]
  }
  return array
}

const win = Dimensions.get('window')

const AnimatedPerson = ({ person, index, style }) => {
  // Create an animated value for opacity.
  const fadeAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      delay: index * 150, // Each item is delayed based on its index.
      useNativeDriver: true,
    }).start()
  }, [fadeAnim, index])

  return (
    <Animated.View style={[style, { opacity: fadeAnim }]}>
      <Image source={person.source} style={styles.personImage} resizeMode="cover" />
      <View style={styles.personInfo}>
        <Text style={[styles.personName, { fontWeight: 'normal' }]}>{person.name}</Text>
        <View style={styles.personDetails}>
          <Text style={[styles.personLocation, { fontWeight: 'normal' }]}>{person.location}</Text>
          <Text style={[styles.refsShared, { fontWeight: 'normal' }]}>
            {person.shared} refs shared
          </Text>
        </View>
      </View>
    </Animated.View>
  )
}

export const SearchDemo = () => {
  const placeholder = 'Search anything or paste a link!'
  const [searchTerm, setSearchTerm] = useState(placeholder)
  const [termIndex, setTermIndex] = useState(0)
  const [results, setResults] = useState([...peopleData].slice(0, 4))

  const nextTerm = () => {
    setTermIndex((prevIndex) => {
      const newIndex = prevIndex + 1
      const newTerm = terms[newIndex % terms.length]
      console.log('SET TERM', newTerm)
      setSearchTerm(newTerm)
      return newIndex
    })

    // Clear the results and then update after a delay.
    setResults([])
    setTimeout(() => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
      const shuffled = shuffle([...peopleData])
      setResults(shuffled.slice(0, 3))
    }, 1400)
  }

  useEffect(() => {
    console.log(searchTerm, 'updated')
  }, [searchTerm])

  // Start the interval timers.
  useEffect(() => {
    // Start the first update after 2 seconds.
    const initialTimeout = setTimeout(() => {
      nextTerm()
    }, 2000)

    const intervalId = setInterval(() => {
      nextTerm()
    }, 6000)

    return () => {
      clearInterval(intervalId)
      clearTimeout(initialTimeout)
    }
  }, [])

  return (
    <View style={[styles.container, { gap: s.$4 }]}>
      {/* Search Bar */}
      <ControlledSearchBar searchTerm={searchTerm} />

      {/* Results List */}
      <View style={styles.resultsContainer}>
        {results.map((person, i) => (
          <AnimatedPerson
            key={person.name}
            person={person}
            index={i}
            style={styles.personContainer}
          />
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: win.width - s.$2,
    overflow: 'hidden',
    height: win.width - s.$2,
    marginHorizontal: 'auto',
    // Replicating the transform from the Svelte code:
    // transform: [{ translateX: 10 }, { translateY: 12 }],
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'black',
    borderRadius: 50,
    padding: 8,
    backgroundColor: c.surface,
    marginBottom: 20,
    width: win.width - s.$2,
  },
  icon: {
    width: 48,
    height: 48,
    marginRight: 10,
  },
  searchText: {
    fontSize: 20,
  },
  resultsContainer: {
    width: win.width - s.$2,
  },
  personContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  personImage: {
    width: 56,
    height: 56,
    borderRadius: 10,
    marginRight: 10,
  },
  personInfo: {
    flex: 1,
  },
  personName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  personDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  personLocation: {
    color: 'gray',
  },
  refsShared: {
    backgroundColor: c.surface2, // represents the "surface2" color
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    color: 'gray',
    fontSize: 12,
  },
})
