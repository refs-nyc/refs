import { useUserStore } from "@/features/pocketbase"
import { Conversation } from "@/features/pocketbase/stores/types"
import { s, c } from "@/features/style"
import { View, Text } from "react-native"
import { XStack, YStack } from "../core/Stacks"
import { Avatar } from "../atoms/Avatar"
import { useMessageStore } from "@/features/pocketbase/stores/messages"

export default function ConversationListItem ({ conversation }: { conversation: Conversation }): JSX.Element | null
{

  const { user } = useUserStore()
  const { memberships, messages } = useMessageStore();
  
  if (!user) return null

  const msgs = messages.filter(m => m.conversation === conversation.id);
  const last_message = msgs[msgs.length-1];
  const members = memberships[conversation.id].filter(m => m.expand?.user && m.expand.user.id !== user.id).map(m=>m.expand!.user);
  let image; 
  for (const member of members) {
    if (member.image) {
      image = member.image;
      break;
    }
  }

  return (
    <XStack gap={s.$075} style={{ alignItems: 'center', backgroundColor: c.surface2 }}>
      <View style={{width: s.$075, height: s.$075, backgroundColor: c.accent, borderRadius: 100}}></View>
      <Avatar source={image} size={s.$5} /> 
      <YStack style={{ padding: s.$1, width: "80%" }}>
        <Text style={{ fontSize: s.$1}}>
          {conversation.is_direct ? 
            members[0].firstName + " " + members[0].lastName 
            : 'Group Chat'}
            {/* {`(${conversation.id})`} */}
        </Text>
        <Text>
          {last_message?.text}
        </Text>
      </YStack>
    </XStack>
  )
}