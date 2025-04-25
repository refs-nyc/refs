import { c, s } from "@/features/style";
import { Button, Heading, XStack, YStack } from "@/ui";
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { router } from "expo-router";
import { useCallback } from "react";
import { Text, View } from "react-native";

export default function Saves() {

  const renderBackdrop = useCallback(
    (p: any) => <BottomSheetBackdrop {...p} disappearsOnIndex={-1} appearsOnIndex={0} />,
    []
  )
  
  return (
    <BottomSheet
      backdropComponent={renderBackdrop}
      enablePanDownToClose={true}
      enableDynamicSizing={false}
      snapPoints={['70%']}
      onChange={(i: number) => { if (i === -1) router.dismiss() }}
      backgroundStyle={{ backgroundColor: c.olive, borderRadius: s.$4 }}
      handleIndicatorStyle={{ width: s.$13, height: s.$075, backgroundColor: c.white }}
    >
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
        <BottomSheetScrollView style={{ height: '75%', backgroundColor: 'lightblue' }}>
          <YStack style={{ paddingBottom: s.$10 }}>
            <View style={{ padding: s.$3, backgroundColor: c.white, borderRadius: s.$2 }}>
              <Text>Saved</Text>
            </View>
            <View style={{ padding: s.$3, backgroundColor: c.white, borderRadius: s.$2 }}>
              <Text>Saved</Text>
            </View>
            <View style={{ padding: s.$3, backgroundColor: c.white, borderRadius: s.$2 }}>
              <Text>Saved</Text>
            </View>
            <View style={{ padding: s.$3, backgroundColor: c.white, borderRadius: s.$2 }}>
              <Text>Saved</Text>
            </View>
            <View style={{ padding: s.$3, backgroundColor: c.white, borderRadius: s.$2 }}>
              <Text>Saved</Text>
            </View>
            <View style={{ padding: s.$3, backgroundColor: c.white, borderRadius: s.$2 }}>
              <Text>Saved</Text>
            </View>
            <View style={{ padding: s.$3, backgroundColor: c.white, borderRadius: s.$2 }}>
              <Text>Saved</Text>
            </View>
            <View style={{ padding: s.$3, backgroundColor: c.white, borderRadius: s.$2 }}>
              <Text>Saved</Text>
            </View>
            <View style={{ padding: s.$3, backgroundColor: c.white, borderRadius: s.$2 }}>
              <Text>Saved</Text>
            </View>
            <View style={{ padding: s.$3, backgroundColor: c.white, borderRadius: s.$2 }}>
              <Text>Saved</Text>
            </View>
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
    </BottomSheet>
  )
}

