import { useUserStore } from "@/features/pocketbase";
import { useMessageStore } from "@/features/pocketbase/stores/messages";
import { c, s } from "@/features/style";
import { Heading, XStack, YStack } from "@/ui";
import { Avatar } from "@/ui/atoms/Avatar";
import { Ionicons } from "@expo/vector-icons";
import { router, useGlobalSearchParams } from "expo-router";
import { useState } from "react";
import { DimensionValue, Pressable, TextInput, View } from "react-native";

export default function NewDMScreen() 
{
  const { user, profile } = useUserStore();
  const { userName } = useGlobalSearchParams();
  const [message, setMessage] = useState<string>('');
  const {createConversation, sendMessage} = useMessageStore();

  if (!profile) return null;
  
  if (!user) {
    router.dismissTo('/');
    return;
  }

  if (userName === user.userName) {
    router.dismissTo('/');
    return;
  }

  if (!profile.id) return null;

  const onMessageSubmit = async () => 
  {
    const conversationId = await createConversation(true, user.id, [profile.id]);
    await sendMessage(user.id, conversationId, message);
    router.replace(`/messages/${conversationId}`);
  }

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'flex-start',
        paddingTop: s.$8,
        height: s.full as DimensionValue,
        backgroundColor: c.surface,
      }}
    >
      <YStack style={{ flex: 1, margin: "auto", alignItems: 'center', justifyContent: 'start'}}>
        <XStack gap={s.$1} style={{ alignItems: 'center', padding: s.$1 }}>
          <Pressable onPress={() => { router.dismissTo(`/user/${userName}`) }}>
            <Ionicons name="chevron-back" size={s.$2} color={c.grey2} />
          </Pressable>
          <Heading tag="h2semi">
              {`Message to ${profile.firstName} ${profile.lastName}`}
          </Heading>
          <Avatar source={profile.image} size={s.$4} />
        </XStack>
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
      </YStack>
    </View>
  )
}