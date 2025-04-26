import { useMessageStore } from "@/features/pocketbase/stores/messages";
import { c, s } from "@/features/style";
import { Button, Heading, XStack, YStack } from "@/ui";
import { Avatar } from "@/ui/atoms/Avatar";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

export default function SavesList() {

  const { saves } = useMessageStore();
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  useEffect(() => {
    for (const save of saves) {
      setSelected((prev) => ({ ...prev, [save.id]: false }))
    }
  }, [])

  const toggleSelect = (id: string) => {
    setSelected((prev) => ({ ...prev, [id]: !(prev[id]) }))
    console.log(selected);
  }

  return (
    <View style={{ paddingVertical: s.$1, paddingHorizontal: s.$3 }}>
      <View style={{ paddingBottom: s.$1 }}>
        <XStack style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <Heading tag='h2' style={{ color: c.white }}>Saved</Heading>
          <Button
            variant='smallWhiteOutline'
            onPress={() => null}
            title='Select All'
            style={{ borderColor: c.white, border: 1, borderRadius: s.$2, color: c.white }}
          />
        </XStack>
        <Text style={{ color: c.white }}>Select anyone to DM or start a group chat</Text>
      </View>
      <BottomSheetScrollView style={{ height: '75%'}}>
        <YStack gap={2} style={{ paddingBottom: s.$10 }}>
          {saves.map(save => 
            <Pressable 
              onPress={()=>{toggleSelect(save.user)}} 
              key={save.id} 
              style={{ padding: s.$075, backgroundColor: selected[save.user] ? c.olive2 : c.olive, borderRadius: s.$1 }}
            >
              <XStack gap={ s.$1 } style={{alignItems: 'center'}}> 
                <Avatar source={save.expand.user?.image} size={s.$4} />
                <YStack gap={0}>
                  <Text style={{ color: c.white, fontSize: s.$1 }}>{save.expand.user?.firstName} {save.expand.user?.lastName}</Text>
                  <Text style={{ color: c.white, fontSize: s.$08 }}>{save.expand.user?.location} </Text>
                </YStack>
              </XStack>
            </Pressable>
          )}
        </YStack>
      </BottomSheetScrollView>
      <XStack
        gap={s.$1}
        style={{
          width: '100%',
          //height: '15%',
          paddingVertical: s.$1half,
          // backgroundColor: 'red',  
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        <Button variant='whiteInverted' onPress={() => null} title='Message' />
        <Button variant='whiteOutline' onPress={() => null} title='+ Group' />
      </XStack>
    </View>
  )
}

