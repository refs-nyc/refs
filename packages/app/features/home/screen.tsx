import {
  Anchor,
  Button,
  H1,
  Input,
  Paragraph,
  Separator,
  Sheet,
  useToastController,
  SwitchThemeButton,
  SwitchRouterButton,
  XStack,
  YStack,
  Avatar,
  Text,
  H2,
} from '@my/ui'
import { ChevronDown, ChevronUp, X } from '@tamagui/lucide-icons'
import { useState } from 'react'
import { Platform } from 'react-native'
import { useLink } from 'solito/navigation'
import { useCanvas } from '@canvas-js/hooks'

export function HomeScreen({ pagesMode = false }: { pagesMode?: boolean }) {
  const linkTarget = pagesMode ? '/pages-example-user' : '/user'

  const [itemHistory, setItemHistory] = useState([
    { username: "max", user: "Max", item: "The Strokes" },
    { username: "max", user: "Max", item: "The Inner Game of Tennis" },
    { username: "raymond", user: "Raymond", item: "Designing Data-Driven Applications" },
    { username: "raymond", user: "Raymond", item: "Intermezzo" },
  ])

  const { app } = useCanvas(null, {
    contract: {
      models: {
        profiles: {
          did: "primary",
          name: "string",
          items: "@items[]", // TODO
          image: "string?", // TODO
        },
        items: {
          id: "primary",
          name: "string",
          image: "string?",
          children: "@items[]", // TODO
          parent: "@items", // TODO
        }
      },
      actions: {
        createProfile(db, name) {
          const { did } = this
          db.create("profiles", { did, name, items: [], image: null })
        },
        updateProfile(db, name) {
          const { did } = this
          db.update("profiles", { did, name })
        }
      }
    },
    topic: "refs.canvas.xyz"
  })

  return (
    <YStack f={1} jc="center" ai="center" gap="$8" p="$4" bg="$background">
      <XStack
        pos="absolute"
        w="100%"
        t="$6"
        gap="$6"
        jc="center"
        fw="wrap"
        $sm={{ pos: 'relative', t: 0 }}
      >
        {Platform.OS === 'web' && (
          <>
            <SwitchRouterButton pagesMode={pagesMode} />
            <SwitchThemeButton />
          </>
        )}
      </XStack>

      <YStack gap="$4">
        <H2 ta="center" col="$color12">
          Welcome to Refs!
        </H2>
        <Input
          size="$4"
          borderWidth={2}
          w="$20"
          placeholder="Search anything or paste a link"
          autoFocus={Platform.OS === 'web'}
        />
        <Paragraph ta="center">Recent saves from the network</Paragraph>
        <YStack gap="$2" w="100%" maw={400}>
          {itemHistory.map((item, index) => {
            const itemLinkProps = useLink({
              href: `${linkTarget}/${item.username}`,
            })
            
            return (
              <XStack 
                key={index} 
                gap="$3" 
                ai="center" 
                p="$2" 
                br="$4" 
                bw={1} 
                borderColor="$gray8"
                pressStyle={{ opacity: 0.8 }}
                {...itemLinkProps}
              >
                <Avatar circular size="$3">
                  <Avatar.Image source={{ uri: `https://i.pravatar.cc/150?u=${item.user}` }} />
                  <Avatar.Fallback bc="$gray5"><Text>{item.user[0]}</Text></Avatar.Fallback>
                </Avatar>
                <YStack>
                  <Paragraph size="$3" fontWeight="bold">{item.user}</Paragraph>
                  <Paragraph size="$2" col="$gray11">{item.item}</Paragraph>
                </YStack>
              </XStack>
            )
          })}
        </YStack>
      </YStack>
    </YStack>
  )
}
