import { Profile } from '@/features/types'
import { c, s } from '@/features/style'
import UserListItem from '@/ui/atoms/UserListItem'
import { Button } from '@/ui/buttons/Button'
import { YStack } from '@/ui/core/Stacks'
import { pocketbase } from '@/features/pocketbase'

import { Heading } from '@/ui/typo/Heading'
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet'
import { router } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { Text, View, Image } from 'react-native'
import { useAppStore } from '@/features/stores'

export default function Referencers({
  referencersBottomSheetRef,
}: {
  referencersBottomSheetRef: React.RefObject<BottomSheet>
}) {
  const [users, setUsers] = useState<any[]>([])
  const [refData, setRefData] = useState<any>({})
  const [isLoading, setIsLoading] = useState(false)
  const { getItemsByRefIds, addRefSheetRef, setAddingRefId, currentRefId } = useAppStore()

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
  }, [currentRefId])

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
    >
      <View style={{ paddingHorizontal: s.$3, paddingVertical: s.$1, height: '100%' }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', paddingBottom: s.$1 }}>
          <View style={{ flex: 1, minWidth: 0, justifyContent: 'flex-start' }}>
            <Heading tag="h1" style={{ lineHeight: 30 }}>
              {refData?.title}
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
            onPress={() => {
              // open a dialog for adding this ref to your profile
              setAddingRefId(currentRefId)
              addRefSheetRef.current?.expand()
            }}
            variant="raised"
            title="Add Ref +"
          />
        </View>
      </View>
    </BottomSheet>
  )
}
