import { Pressable, TextInput } from "react-native";
import { XStack } from "../core/Stacks";
import { c, s } from "@/features/style";
import { Ionicons } from "@expo/vector-icons";

export default function MessageInput(
  {onMessageSubmit, setMessage, message}: 
  {onMessageSubmit: () => void, setMessage: (str: string) => void, message: string}) 
{
  return (
    <XStack 
    style={{ 
      backgroundColor: c.white,
      borderRadius: s.$2,
      marginVertical: s.$075,
      marginHorizontal: s.$1,
      paddingVertical: s.$09,
      paddingHorizontal: s.$1,
      justifyContent: 'space-between',
      fontSize: s.$09,
      alignItems: 'center',
    }}
  >
    <TextInput
      style={{
        width: '70%',
      }}
      placeholder="Type anything..."
      multiline={true}
      value={message}
      onChangeText={setMessage}
    />
    <Pressable
      onPress={onMessageSubmit}
    >
      <Ionicons 
        name="paper-plane-outline" 
        size={s.$2} 
        color={c.grey2} 

      />
    </Pressable>
  </XStack>
  )
}