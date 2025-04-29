import { Pressable, TextInput, View, Text } from "react-native";
import { XStack, YStack } from "../core/Stacks";
import { c, s } from "@/features/style";
import { Ionicons } from "@expo/vector-icons";
import { Message, Profile } from "@/features/pocketbase/stores/types";

export default function MessageInput(
  { onMessageSubmit, setMessage, message, parentMessage, parentMessageSender, onReplyClose }:
    { onMessageSubmit: () => void, setMessage: (str: string) => void, message: string, 
      parentMessage?: Message, parentMessageSender?: Profile, onReplyClose?: ()=>void }) 
{
  return (
    <>
      {parentMessage &&
        <View style={{ backgroundColor: c.surface2, padding: s.$1, borderRadius: s.$2 }}>
          <XStack style={{ justifyContent: 'space-between' }}>
            <YStack>
              <Text style={{fontWeight: 'bold'}}>Replying to {parentMessageSender?.firstName}</Text>
              <Text>{parentMessage.text}</Text>
            </YStack>
            <Pressable onPress={onReplyClose}>
              <Ionicons name="close-outline" size={s.$2} color={c.grey2} />
            </Pressable>
          </XStack>
        </View>
      }
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
    </>
  )
}