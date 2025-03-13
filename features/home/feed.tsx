import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated'
import type { ExpandedItem } from '@/features/pocketbase/stores/types'
import { useState, useEffect } from 'react'
import { SearchBar, YStack, Heading, DismissKeyboard, Button } from '@/ui'
import { pocketbase } from '@/features/pocketbase'
import { useUserStore } from '@/features/pocketbase/stores/users'
import { Link } from 'expo-router'
import { View, ScrollView, Dimensions } from 'react-native'
import { s } from '@/features/style'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Nearby } from './nearby'

import { SearchResults } from './results'

const win = Dimensions.get('window')

export const Feed = () => {
  const [items, setItems] = useState<ExpandedItem[]>([])
  const [searching, setSearching] = useState<boolean>(false)
  const [results, setResults] = useState<ExpandedItem[]>([])
  const [searchTerm, setSearchTerm] = useState<string>('')
  const insets = useSafeAreaInsets()
  const { logout } = useUserStore()

  useEffect(() => {
    if (searchTerm === '') return

    const search = async (q: string) => {
      try {
        const records = await pocketbase.collection('refs').getFullList<ExpandedItem>({
          filter: `title ~ "${q}" && creator != null`,
          expand: 'ref,creator',
        })

        setResults(records)
      } catch (err) {
        console.error(err)
        console.dir(err)
        setResults([])
      }
    }

    search(searchTerm)
  }, [searchTerm])

  useEffect(() => {
    const getInitialData = async () => {
      try {
        const records = await pocketbase.collection('items').getList<ExpandedItem>(1, 30, {
          filter: `creator != null`,
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

  return (
    <DismissKeyboard>
      <ScrollView style={{ flex: 1, height: win.height }}>
        <YStack
          gap={s.$2}
          style={{
            height: win.height * 0.4,
            // position: 'absolute',
            width: '100%',
            top: Math.max(insets.top, 16),
            paddingTop: s.$2,
            textAlign: 'center',
          }}
        >
          <YStack
            gap={s.$2}
            style={{
              // position: 'absolute',
              width: '100%',
              zIndex: 9,
              height: win.height * 0.4,
              paddingTop: s.$2,
              textAlign: 'center',
            }}
          >
            {!searching && (
              <Animated.View entering={FadeInUp.duration(200)} exiting={FadeOutUp.duration(200)}>
                <Heading style={{ textAlign: 'center' }} tag="h1">
                  Refs
                </Heading>
              </Animated.View>
            )}

            <SearchBar
              onFocus={() => setSearching(true)}
              onBlur={() => {
                setSearching(false)
                setSearchTerm('')
              }}
              onChange={setSearchTerm}
            />
          </YStack>
        </YStack>

        {searchTerm === '' ? <Nearby items={items} /> : <SearchResults results={results} />}

        <View style={{ marginBottom: s.$14, alignItems: 'center' }}>
          <Button
            style={{ width: 20 }}
            variant="inlineSmallMuted"
            title="Log out"
            onPress={logout}
          />
        </View>
      </ScrollView>
    </DismissKeyboard>
  )
}
