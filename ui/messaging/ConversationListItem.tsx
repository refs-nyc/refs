import { useUserStore } from "@/features/pocketbase"
import { Conversation } from "@/features/pocketbase/stores/types"
import { s, c } from "@/features/style"
import { View, Text } from "react-native"
import { XStack, YStack } from "../core/Stacks"
import { Avatar } from "../atoms/Avatar"
import { useMessageStore } from "@/features/pocketbase/stores/messages"
import formatTimestamp from "@/features/messaging/timestampFormatter"
import { useCalendars } from "expo-localization"

export default function ConversationListItem ({ conversation }: { conversation: Conversation }): JSX.Element | null
{

  const { user } = useUserStore()
  const { memberships, messages } = useMessageStore();

  const calendars = useCalendars();
  const timeZone = calendars[0].timeZone || "America/New_York";
  
  if (!user) return null

  const msgs = messages.filter(m => m.conversation === conversation.id);
  const last_message = msgs[msgs.length-1];
  const time = last_message?.created ? last_message.created.slice(0, last_message.created.length-1) : '';
  const members = memberships[conversation.id].filter(m => m.expand?.user && m.expand.user.id !== user.id).map(m=>m.expand!.user);
  const ownMembership = memberships[conversation.id].filter(m => m.expand?.user.id === user.id)[0];

  const lastMessageDate = new Date(last_message?.created ? last_message.created : '');
  const lastReadDate = new Date(ownMembership.last_read);
  const newMessages = lastMessageDate > lastReadDate;

  let image; 
  for (const member of members) {
    if (member.image) {
      image = member.image;
      break;
    }
  }

  return (
    <XStack 
      style={{ 
        alignItems: 'center', 
        backgroundColor: c.surface2, 
        justifyContent: 'space-between',
        paddingHorizontal: s.$075,
        borderRadius: s.$075,
      }}>
      <XStack gap={s.$075} style={{ alignItems: 'center' }}>
        { newMessages && 
          <View style={{width: s.$075, height: s.$075, backgroundColor: c.accent, borderRadius: 100}}></View>}
        <Avatar source={image} size={s.$5} /> 
        <YStack style={{ padding: s.$1, }}>
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
      <Text style={{color: c.muted, margin: s.$05, alignSelf: 'flex-start'}}>{formatTimestamp(time, timeZone)}</Text>
    </XStack>
  )
}