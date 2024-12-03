import {
  MainButton,
  View,
  Input,
  Paragraph,
  SwitchThemeButton,
  SwitchRouterButton,
  XStack,
  YStack,
  Avatar,
  Text,
  H2,
  Anchor,
} from '@my/ui'
import { useState } from 'react'
import { Platform } from 'react-native'
import { useRouter } from 'solito/router'

import 'event-target-polyfill'
import 'fast-text-encoding'

import { useCanvas, useLiveQuery } from '@canvas-js/hooks'

export function HomeScreen({ pagesMode = false }: { pagesMode?: boolean }) {
  const router = useRouter()

  const linkTarget = pagesMode ? '/pages-example-user' : '/user'

  const [itemHistory, setItemHistory] = useState([
    { username: 'max', user: 'Max', item: 'The Strokes' },
    { username: 'max', user: 'Max', item: 'The Inner Game of Tennis' },
    { username: 'raymond', user: 'Raymond', item: 'Designing Data-Driven Applications' },
    { username: 'raymond', user: 'Raymond', item: 'Intermezzo' },
  ])

  const { app } = useCanvas(null, {
    contract: {
      models: {
        profiles: {
          did: 'primary',
          name: 'string',
          items: '@items[]', // TODO
          image: 'string?', // TODO
        },
        items: {
          id: 'primary',
          name: 'string',
          image: 'string?',
          children: '@items[]', // TODO
          parent: '@items', // TODO
        },
        counters: {
          id: 'primary',
          count: 'number',
        },
      },
      actions: {
        createProfile(db, name) {
          const { did } = this
          db.create('profiles', { did, name, items: [], image: null })
        },
        updateProfile(db, name) {
          const { did } = this
          db.update('profiles', { did, name })
        },
        async updateCounter(db) {
          const current = await db.get('counters', '0')
          db.set('counters', { id: '0', count: current ? current.count + 1 : 0 })
        },
      },
    },
    topic: 'refs.canvas.xyz',
  })

  const counterRows = useLiveQuery(app, 'counters', { where: { id: '0' } })

  return (
    <View px="$4" py="$4" bg="$color.surface" height="100%">
      <YStack gap="$4" pt="$20" pb="$16">
        <H2 ta="center" col="$color12">
          Refs is the phonebook for the internet.
        </H2>
      </YStack>

      <YStack gap="$4">
        <MainButton onPress={() => router.push('/onboarding')}>Join</MainButton>
        <MainButton secondary onPress={() => router.push('/user/1')}>
          Login
        </MainButton>
      </YStack>
    </View>
  )
}
