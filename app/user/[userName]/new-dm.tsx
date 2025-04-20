import {  useUserStore } from "@/features/pocketbase";
import { YStack } from "@/ui";
import { router, useGlobalSearchParams } from "expo-router";
import { Text } from "react-native";

export default function NewDMScreen() {
  const { user } = useUserStore();
  const { userName } = useGlobalSearchParams();
  console.log('USERNAME', userName)

  if (!user) {
    router.dismissTo('/');
    return;
  }

  if (userName === user.userName) {
    router.dismissTo('/');
    return;
  }



  return <YStack style={{ flex: 1, margin: "auto", alignItems: 'center', justifyContent: 'center'}}><Text>New DM</Text></YStack>
}