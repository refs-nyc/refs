import type { Item } from '@/features/pocketbase/stores/types'
import { useState, useEffect } from 'react'
import { SearchRef, YStack, Heading, DismissKeyboard } from '@/ui'
import { pocketbase } from '@/features/pocketbase'
import { Link } from 'expo-router'
import { View, Dimensions } from 'react-native'
import { s } from '@/features/style'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Activity } from './activity'
import { SearchResults } from './results'

const win = Dimensions.get('window')

export const Feed = () => {
  const [items, setItems] = useState<Item[]>([])
  const [results, setResults] = useState<Item[]>([])
  const [searchTerm, setSearchTerm] = useState<string>('')
  const insets = useSafeAreaInsets()

  useEffect(() => {
    if (searchTerm === '') return

    const search = async (q: string) => {
      try {
        const records = await pocketbase
          .collection('refs')
          .getFullList({ filter: `title ~ "${q}"` })

        console.log(records)

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
    // The initial data we are looking for is
    // (for now) LOOSELY based off of the user's interests.
    //
    // The subscription at the moment is VERY LOOSE
    // We just serve all new item creations.
    const getInitialData = async () => {
      try {
        const records = await pocketbase
          .collection('items')
          .getList(1, 30, { filter: ``, sort: '-created', expand: 'ref,creator' })

        setItems(records.items)
        console.log('done')
      } catch (error) {
        console.error(error)
      }
    }

    getInitialData()

    pocketbase.collection('items').subscribe('*', (e) => {
      console.log(e.action)
      console.log(e.record)
    })
    return () => pocketbase.collection('items').unsubscribe('*')
  }, [])

  return (
    <DismissKeyboard>
      <View style={{ flex: 1, height: win.height, paddingTop: Math.max(insets.top, 16) }}>
        <YStack
          gap={s.$2}
          style={{
            height: win.height * 0.4,
            paddingTop: s.$2,
            textAlign: 'center',
          }}
        >
          <Heading style={{ textAlign: 'center' }} tag="h1">
            Refs
          </Heading>

          <SearchRef onChange={setSearchTerm} />

          <Link
            style={{ width: '100%', textAlign: 'center' }}
            href={{
              pathname: '/user/[userName]',
              params: { userName: pocketbase.authStore.record.userName },
            }}
          >
            My Profile
          </Link>
        </YStack>

        {searchTerm === '' ? <Activity items={items} /> : <SearchResults results={results} />}
      </View>
    </DismissKeyboard>
  )
}
