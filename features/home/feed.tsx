import type { ExpandedItem } from '@/features/pocketbase/stores/types'
import { useState, useEffect } from 'react'
import { DismissKeyboard } from '@/ui'
import { pocketbase } from '@/features/pocketbase'
import { View, ScrollView, Pressable, Text, StyleSheet } from 'react-native'
import { Nearby } from './nearby'
import SearchBottomSheet from '@/ui/actions/SearchBottomSheet'
import { s } from '../style'
import Ticker from '@/ui/Ticker'

// Suggested refs (replace with your real data)
const suggestedRefs = [
  { title: 'Playing Tennis' },
  { title: 'Wes Anderson' },
  { title: '3D Printing' },
  { title: 'Wet Leg' },
  { title: 'Cooking' },
  { title: 'Jazz' },
  { title: 'Cycling' },
  { title: 'Photography' },
  { title: 'Poetry' },
  { title: 'Board Games' },
]

export const Feed = () => {
  const [items, setItems] = useState<ExpandedItem[]>([])
  // Shared state for selected refs (array of CompleteRef)
  const [selectedRefs, setSelectedRefs] = useState<any[]>([])

  useEffect(() => {
    const getInitialData = async () => {
      try {
        const records = await pocketbase.collection('items').getList<ExpandedItem>(1, 30, {
          // TODO: remove list = false once we have a way to display lists in the feed
          // also consider showing backlog items in the feed, when we have a way to link to them
          filter: `creator != null && backlog = false && list = false`,
          sort: '-created',
          expand: 'ref,creator',
        })

        setItems(records.items)
      } catch (error) {
        console.error(error)
      }
    }

    getInitialData()
  }, [])

  // Toggle pill selection
  const toggleSelect = (title: string) => {
    setSelectedRefs((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
    )
  }

  // Layout: Feed, then Ticker, then SearchBottomSheet
  return (
    <>
      <DismissKeyboard>
        <ScrollView style={{ flex: 1, paddingTop: s.$05 }}>
          <View>
            <Nearby items={items} />
          </View>
        </ScrollView>
      </DismissKeyboard>
      {/* Spacer between feed ScrollView and ticker */}
      <View style={{ height: 11 }} />
      <Ticker selectedRefs={selectedRefs} setSelectedRefs={setSelectedRefs} />
      {/* Spacer between ticker and bottom sheet */}
      <View style={{ height: 11 }} />
      <SearchBottomSheet selectedRefs={selectedRefs} setSelectedRefs={setSelectedRefs} />
    </>
  )
}

const pillStyles = StyleSheet.create({
  pill: {
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#A5B89F', // Actual Olive
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 38,
    minWidth: 38,
  },
  unselected: {
    backgroundColor: '#F3F2ED', // Surface
  },
  selected: {
    backgroundColor: '#A5B89F', // Actual Olive
  },
  pressed: {
    opacity: 0.7,
  },
  text: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    lineHeight: 18,
    textAlign: 'center',
  },
  unselectedText: {
    color: '#A5B89F', // Actual Olive
  },
  selectedText: {
    color: 'rgba(0,0,0,0.54)', // Mellow Black
  },
})
