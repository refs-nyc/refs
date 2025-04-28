import { c, s } from "@/features/style";
import { View, Text } from "react-native";

export function Badge({count, color} : {count: number, color?: string}) {
  return (
    <View style={{
        backgroundColor: color || c.accent, 
        borderRadius: 100,
        padding: s.$075, 
        position: 'absolute',
        top: 0,
        right: -10,
        }}
      >
        <Text style={{fontWeight: 'bold', color: c.white, fontSize: s.$075}}>{count}</Text>
      </View>
  )
}