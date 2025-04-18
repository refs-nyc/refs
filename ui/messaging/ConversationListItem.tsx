import { useUserStore, pocketbase } from "@/features/pocketbase"
import { ExpandedConversation, ExpandedMembership } from "@/features/pocketbase/stores/types"
import { s, c } from "@/features/style"
import { useState, useEffect } from "react"
import { View, Text } from "react-native"
import { XStack, YStack } from "../core/Stacks"
import { Avatar } from "../atoms/Avatar"
import { useMessageStore } from "@/features/pocketbase/stores/messages"

export default function ConversationListItem ({ conversation }: { conversation: ExpandedConversation }): JSX.Element | null
{

  const { user } = useUserStore()
  const [image, setImage] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const { setMembership } = useMessageStore();
  
  if (!user) return null

  useEffect(() => {
    const setConversationDetails = async () => 
    {
      const memberships = await pocketbase.collection<ExpandedMembership>('memberships').getFullList({
        filter: `conversation="${conversation.id}"`,
        expand: 'user',
      });
      setMembership(conversation.id, memberships);

      const members = memberships.filter(m => m.expand?.user && m.expand.user.id !== user.id).map(m=>m.expand!.user);

      if (conversation.is_direct) {
        setTitle(members[0].firstName + " " + members[0].lastName);
      }
      else {
        setTitle('Group Chat'); //todo get title from db instead
      }

      for (const member of members) {
        if (member.image) {
          setImage(member.image);
          break;
        }
      }
    }
    try {
      setConversationDetails();
    }
    catch (error) {
      console.error(error)
    }
  }, [])

  return (
    <XStack gap={s.$075} style={{ alignItems: 'center', backgroundColor: c.surface2 }}>
      <View style={{width: s.$075, height: s.$075, backgroundColor: c.accent, borderRadius: 100}}></View>
      <Avatar source={image} size={s.$5} /> 
      <YStack style={{ padding: s.$1, width: "80%" }}>
        <Text style={{ fontSize: s.$1}}>
          {title}
        </Text>
        <Text>
          {/* todo make sure this is the latest message. i think it's impossible to sort within an expansion so need some diff way */}
          {/* and anyway we shouldn't be fetching the whole conversation for this */}
          {conversation.expand?.messages_via_conversation?.length  &&  conversation.expand.messages_via_conversation[0].text}
        </Text>
      </YStack>
    </XStack>
  )
}