import type { ExpandedItem } from '@/features/pocketbase/stores/types'
import { useState, useEffect } from 'react'
import { SearchBar, YStack, DismissKeyboard, Button } from '@/ui'
import { pocketbase } from '@/features/pocketbase'
import { useUserStore } from '@/features/pocketbase/stores/users'
import { View, ScrollView } from 'react-native'
import { s } from '@/features/style'
import { Nearby } from './nearby'

import { SearchResults } from './results'

export const Feed = () => {
  const [items, setItems] = useState<ExpandedItem[]>([])
  const [searching, setSearching] = useState<boolean>(false)
  const [results, setResults] = useState<ExpandedItem[]>([])
  const [searchTerm, setSearchTerm] = useState<string>('')
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
      <ScrollView style={{ flex: 1 }}>
        <View style={{ height: '100%' }}>
          <YStack
            gap={s.$2}
            style={{
              width: '100%',
              paddingBottom: s.$2,
              textAlign: 'center',
            }}
          >
            <YStack
              gap={s.$2}
              style={{
                width: '100%',
                zIndex: 9,
                paddingTop: s.$2,
                textAlign: 'center',
              }}
            >
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

          <View style={{ marginBottom: s.$2, alignItems: 'center' }}>
            <Button
              style={{ width: 20 }}
              variant="inlineSmallMuted"
              title="Log out"
              onPress={logout}
            />
          </View>
        </View>
      </ScrollView>
    </DismissKeyboard>
  )
}
