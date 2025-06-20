import { pocketbase } from '@/features/pocketbase'
import { Profile } from '@/features/pocketbase/stores/types'
import { c, s } from '@/features/style'
import UserListItem from '@/ui/atoms/UserListItem'
import { Button } from '@/ui/buttons/Button'
import { YStack } from '@/ui/core/Stacks'
import { useUIStore } from '@/ui/state'
import { Heading } from '@/ui/typo/Heading'
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet'
import { router } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { Text, View } from 'react-native'

export default function Referencers({
  referencersBottomSheetRef,
}: {
  referencersBottomSheetRef: React.RefObject<BottomSheet>
}) {
  const { currentRefId } = useUIStore()
  const [users, setUsers] = useState<any[]>([])
  const [refData, setRefData] = useState<any>({})
  const { addRefSheetRef, setAddingRefId } = useUIStore()

  useEffect(() => {
    const getUsers = async () => {
      const users: Profile[] = []
      const userIds: Set<string> = new Set()

      const items = await pocketbase.collection('items').getFullList({
        filter: `ref = "${currentRefId}"`,
        expand: 'creator, ref',
      })

      for (const item of items) {
        const user = item.expand?.creator
        if (!user || userIds.has(user.id)) continue
        userIds.add(user.id)
        users.push(user)
      }

      setUsers(users)
      setRefData(items[0].expand?.ref)
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
        <View style={{ paddingBottom: s.$1 }}>
          <Heading tag="h1">{refData?.title}</Heading>
          <Text style={{ color: c.grey2 }}> Everyone who's added it. </Text>
        </View>
        <BottomSheetScrollView>
          <YStack>
            {users.map((user) => (
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
            ))}
          </YStack>
        </BottomSheetScrollView>
        <View
          style={{
            width: '75%',
            alignSelf: 'center',
            position: 'absolute',
            bottom: 40,
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
