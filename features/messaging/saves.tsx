import { useMessageStore } from '@/features/pocketbase/stores/messages'
import { c, s } from '@/features/style'
import { Button, Heading, XStack, YStack } from '@/ui'
import { Avatar } from '@/ui/atoms/Avatar'
import { DMButton } from '@/ui/profiles/DMButton'
import { Ionicons } from '@expo/vector-icons'
import { BottomSheetScrollView } from '@gorhom/bottom-sheet'
import { Link, router } from 'expo-router'
import { useEffect, useState } from 'react'
import { Pressable, Text, TextInput, View, useWindowDimensions } from 'react-native'
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated'
import { Conversation } from '../pocketbase/stores/types'

type Step = 'select' | 'add'

export default function SavesList() {
  const { saves, createMemberships } = useMessageStore()
  const { width } = useWindowDimensions()

  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [step, setStep] = useState<Step>('select')
  const [searchTerm, setSearchTerm] = useState('')

  const { conversations, memberships } = useMessageStore()
  const [filteredChats, setFilteredChats] = useState<Conversation[]>([
    ...Object.values(conversations).filter((c) => !c.is_direct),
  ])

  const onSearchTermChange = (searchTerm: string) => {
    setSearchTerm(searchTerm)
    setFilteredChats([
      ...Object.values(conversations).filter(
        (c) => !c.is_direct && c.title && c.title.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    ])
  }

  useEffect(() => {
    for (const save of saves) {
      setSelected((prev) => ({ ...prev, [save.id]: false }))
    }
  }, [])

  const toggleSelect = (id: string) => {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const selectedUsers = saves.filter((save) => selected[save.user]).map((save) => save.expand?.user)

  const handleSelectAll = () => {
    const anySelected = selectedUsers.length > 0
    const newValue = anySelected ? false : true
    for (const save of saves) {
      setSelected((prev) => ({ ...prev, [save.user]: newValue }))
    }
  }

  const onAddToGroupChat = async (gcId: string) => {
    await createMemberships(
      selectedUsers.map((u) => u!.id),
      gcId
    )
    router.replace(`/messages/${gcId}`)
  }

  const translateX = useSharedValue(0)

  useEffect(() => {
    translateX.value = withTiming(step === 'select' ? 0 : -width, { duration: 300 })
  }, [step, translateX, width])

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }))

  return (
    <Animated.View style={{ flex: 1, overflow: 'hidden' }}>
      <Animated.View style={[{ flexDirection: 'row', width: width * 2 }, animatedStyle]}>
        {/* Select Step */}
        <View style={{ width, paddingVertical: s.$1, paddingHorizontal: s.$3 }}>
          <View style={{ paddingBottom: s.$1 }}>
            <XStack style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <Heading tag="h2" style={{ color: c.white }}>
                Saved
              </Heading>
              <Button
                variant="smallWhiteOutline"
                onPress={handleSelectAll}
                title={selectedUsers.length ? 'Clear' : 'Select All'}
                style={{ borderColor: c.white, border: 1, borderRadius: s.$2, color: c.white }}
              />
            </XStack>
            <Text style={{ color: c.white }}>Select anyone to DM or start a group chat</Text>
          </View>
          <BottomSheetScrollView style={{ height: '75%' }}>
            <YStack gap={2} style={{ paddingBottom: s.$10 }}>
              {saves.map((save) => (
                <Pressable
                  onPress={() => {
                    toggleSelect(save.user)
                  }}
                  key={save.id}
                  style={{
                    padding: s.$075,
                    backgroundColor: selected[save.user] ? c.olive2 : c.olive,
                    borderRadius: s.$1,
                  }}
                >
                  <XStack gap={s.$1} style={{ alignItems: 'center' }}>
                    <Avatar source={save.expand?.user.image} size={s.$4} />
                    <YStack gap={0}>
                      <Text style={{ color: c.white, fontSize: s.$1 }}>
                        {save.expand?.user.firstName} {save.expand?.user.lastName}
                      </Text>
                      <Text style={{ color: c.white, fontSize: s.$08 }}>
                        {save.expand?.user.location}{' '}
                      </Text>
                    </YStack>
                  </XStack>
                </Pressable>
              ))}
            </YStack>
          </BottomSheetScrollView>
          <XStack
            gap={s.$1}
            style={{
              width: '100%',
              paddingVertical: s.$1half,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <DMButton
              fromSaves={true}
              disabled={selectedUsers.length !== 1}
              profile={selectedUsers[0]!}
            />
            <Button
              disabled={selectedUsers.length < 1}
              variant="whiteOutline"
              onPress={() => {
                setStep('add')
              }}
              title="+ Group"
            />
          </XStack>
        </View>

        {/* Add Step */}
        <View style={{ width, paddingVertical: s.$1, paddingHorizontal: s.$3 }}>
          <View style={{ paddingBottom: s.$1 }}>
            <Pressable
              onPress={() => {
                setStep('select')
              }}
            >
              <XStack style={{ justifyContent: 'start', alignItems: 'center' }}>
                <Ionicons name="chevron-back" size={18} color={c.white} />
                <Heading tag="h2" style={{ color: c.white }}>
                  Back to selection
                </Heading>
              </XStack>
            </Pressable>
          </View>
          <TextInput
            placeholder="Search"
            placeholderTextColor={c.white}
            value={searchTerm}
            onChangeText={onSearchTermChange}
            style={{
              marginVertical: s.$1,
              paddingVertical: s.$075,
              paddingHorizontal: s.$1,
              color: c.white,
              borderWidth: 1,
              borderColor: c.white,
              borderRadius: s.$2,
            }}
          />
          <BottomSheetScrollView style={{ height: '75%' }}>
            <YStack gap={2} style={{ paddingBottom: s.$10, color: c.white }}>
              <Link
                replace
                href={`/messages/new-gc?members=${selectedUsers.map((u) => u!.id).join(',')}`}
              >
                <XStack
                  style={{
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    width: '100%',
                    paddingVertical: s.$075,
                  }}
                >
                  <Heading tag="h2" style={{ color: c.white }}>
                    New Chat
                  </Heading>
                  <View style={{ backgroundColor: c.white, borderRadius: s.$075, padding: s.$075 }}>
                    <Ionicons name="add" size={s.$2} color={c.olive} />
                  </View>
                </XStack>
              </Link>
              {filteredChats.map((gc) => (
                <Pressable
                  key={gc.id}
                  onPress={() => {
                    onAddToGroupChat(gc.id)
                  }}
                >
                  <XStack
                    style={{
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      width: '100%',
                      paddingVertical: s.$075,
                    }}
                  >
                    <Heading tag="h2normal" style={{ color: c.white, width: '65%' }} numberOfLines={2}>
                      {gc.title}
                    </Heading>
                    <Button
                      variant="smallWhiteOutline"
                      onPress={() => {}}
                      style={{ width: '30%' }}
                      title={`${memberships[gc.id].length} members`}
                    />
                  </XStack>
                </Pressable>
              ))}
            </YStack>
          </BottomSheetScrollView>
        </View>
      </Animated.View>
    </Animated.View>
  )
}
