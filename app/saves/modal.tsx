import { Sheet } from "@/ui";
import { router } from "expo-router";
import { Text } from "react-native";

export default function Saves() {
  return <Sheet
    full={true} 
    snapPoints={['70%']}
    onChange={(i: number) => { if (i === -1) router.dismiss() }}
  >
      <Text>Saved</Text>
    </Sheet>
}

