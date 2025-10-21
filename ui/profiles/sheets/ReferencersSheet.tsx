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
import { useCallback, useEffect, useState, useRef } from 'react'
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
    setAddingRefPrefill,
    currentRefId,
    referencersContext,
    setReferencersContext,
    setPendingReferencersReturn,
    setProfileNavIntent,
    moduleBackdropAnimatedIndex,
    detailsBackdropAnimatedIndex,
    setReferencersSheetApi,
  } = useAppStore()
  const [actionLoading, setActionLoading] = useState(false)
  const closeWaitersRef = useRef(new Set<() => void>())
  const sheetOpenRef = useRef(false)
  const preserveOnCloseRef = useRef(false)

  const flushWaiters = useCallback(() => {
    if (closeWaitersRef.current.size === 0) return
    const waiters = Array.from(closeWaitersRef.current)
    closeWaitersRef.current.clear()
    waiters.forEach((resolver) => resolver())
  }, [])

  const closeAsync = useCallback(() => {
    if (!sheetOpenRef.current) {
      return Promise.resolve()
    }
    referencersBottomSheetRef.current?.close()
    return new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        closeWaitersRef.current.delete(resolver)
        resolve()
      }, 700)
      const resolver = () => {
        clearTimeout(timeout)
        closeWaitersRef.current.delete(resolver)
        resolve()
      }
      closeWaitersRef.current.add(resolver)
    })
  }, [referencersBottomSheetRef])

  useEffect(() => {
    const api = {
      closeAsync,
      isOpen: () => sheetOpenRef.current,
    }
    setReferencersSheetApi(api)
    return () => {
      setReferencersSheetApi(null)
      flushWaiters()
    }
  }, [closeAsync, flushWaiters, setReferencersSheetApi])

  useEffect(() => () => flushWaiters(), [flushWaiters])

  const handleSheetChange = useCallback(
    (index: number) => {
      sheetOpenRef.current = index >= 0
      if (index === -1) {
        flushWaiters()
        if (preserveOnCloseRef.current) {
          preserveOnCloseRef.current = false
        } else {
          setPendingReferencersReturn(null)
          setReferencersContext(null)
        }
        if (detailsBackdropAnimatedIndex) {
          detailsBackdropAnimatedIndex.value = -1
        }
      }
    },
    [detailsBackdropAnimatedIndex, flushWaiters, setPendingReferencersReturn, setReferencersContext]
  )

  useEffect(() => {
    if (referencersContext && detailsBackdropAnimatedIndex) {
      detailsBackdropAnimatedIndex.value = 0
      return () => {
        detailsBackdropAnimatedIndex.value = -1
      }
    }
    if (detailsBackdropAnimatedIndex) {
      detailsBackdropAnimatedIndex.value = -1
    }
  }, [referencersContext, detailsBackdropAnimatedIndex])

  useEffect(() => {
    const getUsers = async () => {
      if (!currentRefId) {
        setUsers([])
        setRefData({})
        return
      }
      
      try {
        setIsLoading(true)
        const collected: Profile[] = []
        const pushUnique = (candidate: any, position: 'back' | 'front' = 'back') => {
          if (!candidate || !candidate.id) return
          const existingIndex = collected.findIndex((existing) => existing.id === candidate.id)
          if (existingIndex >= 0) {
            if (position === 'front' && existingIndex > 0) {
              const [existing] = collected.splice(existingIndex, 1)
              collected.unshift(existing)
            }
            return
          }
          const profileCandidate = candidate as Profile
          if (position === 'front') {
            collected.unshift(profileCandidate)
          } else {
            collected.push(profileCandidate)
          }
        }

        const items = await getItemsByRefIds([currentRefId])

        for (const item of items) {
          const creator = item.expand?.creator
          if (creator) {
            pushUnique(creator)
          }
        }

        if (referencersContext?.type === 'community') {
          pushUnique(referencersContext.creator, 'front')
          if (referencersContext.isSubscribed && user) {
            pushUnique(user)
          }
        }

        setUsers(collected)
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

  useEffect(() => {
    if (referencersContext && detailsBackdropAnimatedIndex) {
      detailsBackdropAnimatedIndex.value = 0
      return () => {
        detailsBackdropAnimatedIndex.value = -1
      }
    }
    if (detailsBackdropAnimatedIndex) {
      detailsBackdropAnimatedIndex.value = -1
    }
  }, [referencersContext, detailsBackdropAnimatedIndex])

  const renderBackdrop = useCallback(
    (p: any) => <BottomSheetBackdrop {...p} disappearsOnIndex={-1} appearsOnIndex={0} />,
    []
  )

  return (
    <BottomSheet
      ref={referencersBottomSheetRef}
      index={-1}
      style={{ zIndex: 10000 }}
      containerStyle={{ zIndex: 10000 }}
      animatedIndex={moduleBackdropAnimatedIndex}
      backdropComponent={renderBackdrop}
      enablePanDownToClose={true}
      enableDynamicSizing={false}
      snapPoints={['80%']}
      backgroundStyle={{ backgroundColor: c.surface, borderRadius: s.$4 }}
      handleIndicatorStyle={{ backgroundColor: 'transparent' }}
      onChange={handleSheetChange}
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
                    void (async () => {
                      const hasCommunityContext = referencersContext?.type === 'community' && currentRefId
                      const params: Record<string, string> = {}
                      if (user.userName) {
                        params.userName = user.userName
                      }
                      if (user.id) {
                        params.userId = user.id
                      }

                      if (hasCommunityContext) {
                        const contextCopy = referencersContext ? { ...referencersContext } : null
                        preserveOnCloseRef.current = true
                        setPendingReferencersReturn({
                          refId: currentRefId,
                          context: contextCopy,
                        })
                        setProfileNavIntent({ targetPagerIndex: 2, source: 'corkboard' })
                        params.fromCorkboard = '1'
                      } else {
                        setProfileNavIntent({ targetPagerIndex: 0, source: 'other' })
                      }

                      await closeAsync()

                      if (params.userName) {
                        router.push({ pathname: '/user/[userName]', params })
                      }
                    })()
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
            style={{
              width: '100%',
              paddingVertical: (s.$09 as number) + 2,
              paddingHorizontal: s.$2,
              borderRadius: 26,
            }}
            textStyle={{ fontSize: s.$1, fontWeight: '600' }}
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
                setAddingRefPrefill({
                  title: refData?.title || referencersContext?.title || '',
                  url: refData?.url || '',
                  image: refData?.image || '',
                  meta:
                    typeof refData?.meta === 'string'
                      ? refData.meta
                      : refData?.meta
                      ? JSON.stringify(refData.meta)
                      : '',
                })
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
                : 'Add'
            }
          />
        </View>
      </View>
    </BottomSheet>
  )
}
