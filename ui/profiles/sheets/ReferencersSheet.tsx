import { Profile } from '@/features/types'
import { c, s } from '@/features/style'
import UserListItem from '@/ui/atoms/UserListItem'
import { Button } from '@/ui/buttons/Button'
import { YStack } from '@/ui/core/Stacks'
import { pocketbase } from '@/features/pocketbase'
import { ensureCommunityChat, joinCommunityChat } from '@/features/communities/communityChat'

import { Heading } from '@/ui/typo/Heading'
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet'
import { router } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { Text, View, Image, InteractionManager } from 'react-native'
import { useAppStore } from '@/features/stores'

export default function Referencers({
  referencersBottomSheetRef,
}: {
  referencersBottomSheetRef: React.RefObject<BottomSheet>
}) {
  const [users, setUsers] = useState<any[]>([])
  const [refData, setRefData] = useState<any>({})
  const [isLoading, setIsLoading] = useState(false)
  const {
    user,
    getItemsByRefIds,
    addRefSheetRef,
    setAddingRefId,
    currentRefId,
    referencersContext,
    setReferencersContext,
    setProfileNavIntent,
  } = useAppStore()
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    const getUsers = async () => {
      if (!currentRefId) {
        setUsers([])
        setRefData({})
        return
      }
      
      try {
        setIsLoading(true)
        const users: Profile[] = []
        const userIds: Set<string> = new Set()

        const items = await getItemsByRefIds([currentRefId])

        for (const item of items) {
          const user = item.expand?.creator
          if (!user || userIds.has(user.id)) continue
          userIds.add(user.id)
          users.push(user)
        }

        if (
          referencersContext?.type === 'community' &&
          referencersContext.isSubscribed &&
          user?.id &&
          !users.some((existing) => existing.id === user.id)
        ) {
          users.push(user)
        }

        setUsers(users)
        const primaryRef = items[0]?.expand?.ref
        if (primaryRef) {
          setRefData(primaryRef)
        } else {
          // Fallback: fetch the ref directly so we always have a title even when no items exist yet
          try {
            const refRecord = await pocketbase.collection('refs').getOne(currentRefId)
            setRefData(refRecord || {})
          } catch (e) {
            setRefData({})
          }
        }
      } catch (error) {
        console.error('ReferencersSheet: Error loading users for ref', currentRefId, ':', error)
        setUsers([])
        setRefData({})
      } finally {
        setIsLoading(false)
      }
    }
    getUsers()
  }, [currentRefId, referencersContext, user?.id])

  const renderBackdrop = useCallback(
    (p: any) => <BottomSheetBackdrop {...p} disappearsOnIndex={-1} appearsOnIndex={0} />,
    []
  )

  return (
    <BottomSheet
      ref={referencersBottomSheetRef}
      index={-1}
      backdropComponent={renderBackdrop}
      enablePanDownToClose={true}
      enableDynamicSizing={false}
      snapPoints={['80%']}
      backgroundStyle={{ backgroundColor: c.surface, borderRadius: s.$4 }}
      handleIndicatorStyle={{ backgroundColor: 'transparent' }}
      onChange={(index) => {
        if (index === -1) {
          setReferencersContext(null)
        }
      }}
    >
      <View style={{ paddingHorizontal: s.$3, paddingVertical: s.$1, height: '100%' }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', paddingBottom: s.$1 }}>
          <View style={{ flex: 1, minWidth: 0, justifyContent: 'flex-start' }}>
            <Heading tag="h1" style={{ lineHeight: 30 }}>
              {refData?.title || referencersContext?.title}
            </Heading>
            <View style={{ height: 8 }} />
            <Text style={{ color: c.grey2 }}>{"Everyone who's added it."}</Text>
          </View>
          {refData?.image && (
            <View style={{ marginLeft: 16 }}>
              <Image
                source={{ uri: refData.image }}
                style={{ width: 60, height: 60, borderRadius: 10, backgroundColor: '#eee' }}
                resizeMode="cover"
              />
            </View>
          )}
        </View>
        <BottomSheetScrollView alwaysBounceVertical={false}>
          <YStack>
            {isLoading ? (
              <View style={{ paddingVertical: s.$4, alignItems: 'center' }}>
                <Text style={{ color: c.muted, fontSize: 14 }}>Loading...</Text>
              </View>
            ) : users.length > 0 ? (
              users.map((user) => (
                <UserListItem
                  key={user.id}
                  user={user}
                  small={false}
                  onPress={() => {
                    referencersBottomSheetRef.current?.close()
                    setProfileNavIntent({ targetPagerIndex: 0, source: 'other' })
                    router.push(`/user/${user.userName}`)
                  }}
                  style={{ paddingHorizontal: 0 }}
                />
              ))
            ) : (
              <View style={{ paddingVertical: s.$4, alignItems: 'center' }}>
                <Text style={{ color: c.muted, fontSize: 14, textAlign: 'center' }}>
                  No one has added this ref to their profile yet.
                </Text>
                <Text style={{ color: c.muted, fontSize: 12, textAlign: 'center', marginTop: s.$1 }}>
                  Be the first to add it!
                </Text>
              </View>
            )}
          </YStack>
        </BottomSheetScrollView>
        <View
          style={{
            position: 'absolute',
            bottom: 40,
            left: 20,
            right: 20,
          }}
        >
          <Button
            style={{ paddingTop: s.$2, paddingBottom: s.$2, width: '100%' }}
            textStyle={{ fontSize: s.$1, fontWeight: 800 }}
            onPress={async () => {
              if (referencersContext?.type === 'community') {
                if (!currentRefId || !user?.id || actionLoading) return
                setActionLoading(true)
                try {
                  const desiredTitle = referencersContext.title || refData?.title || 'Community chat'
                  const { conversationId } = await ensureCommunityChat(currentRefId, {
                    title: desiredTitle,
                  })
                  if (!referencersContext.isSubscribed) {
                    await referencersContext.onAdd?.()
                  }
                  referencersBottomSheetRef.current?.close()
                  setReferencersContext(null)
                  
                  // Defer both joining and navigation to prevent hooks errors
                  InteractionManager.runAfterInteractions(async () => {
                    try {
                      await joinCommunityChat(conversationId, user.id)
                      router.push(`/messages/${conversationId}`)
                    } catch (error) {
                      console.warn('Failed to join and navigate to chat', error)
                    }
                  })
                } catch (error) {
                  console.warn('Failed to open community chat', { currentRefId, error })
                } finally {
                  setActionLoading(false)
                }
              } else {
                setAddingRefId(currentRefId)
                addRefSheetRef.current?.expand()
              }
            }}
            disabled={actionLoading || (referencersContext?.type === 'community' && !user?.id)}
            variant="raised"
            title={
              referencersContext?.type === 'community'
                ? referencersContext.isSubscribed
                  ? actionLoading
                    ? 'Opening chat...'
                    : 'Go to chat'
                  : actionLoading
                  ? 'Joining...'
                  : 'Join the chat'
                : actionLoading
                ? 'Working...'
                : 'Add Ref +'
            }
          />
        </View>
      </View>
    </BottomSheet>
  )
}
