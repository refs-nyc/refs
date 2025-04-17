import { useUserStore, pocketbase } from "@/features/pocketbase"
import { ExpandedConversation, ExpandedMembership } from "@/features/pocketbase/stores/types"
import { s, c } from "@/features/style"
import { useState, useEffect } from "react"
import { View, Text } from "react-native"
import { XStack, YStack } from "../core/Stacks"
import { Avatar } from "../atoms/Avatar"

export default function ConversationListItem ({ conversation }: { conversation: ExpandedConversation }): JSX.Element | null
{

  const { user } = useUserStore()
  const [image, setImage] = useState<string>('')
  
  if (!user) return null

  useEffect(() => {
    const setConversationImage = async () => 
    {
      const memberships = await pocketbase.collection<ExpandedMembership>('memberships').getFullList({
        filter: `conversation="${conversation.id}"`,
        expand: 'user',
      });

      // set image to someone in the conversation who is not the current user
      for (const member of memberships) 
      {
        if (member.expand?.user.email !== user.email && member.expand?.user.image) 
        {
          setImage(member.expand?.user?.image);
          break;
        }
      }
    }
    try {
      setConversationImage();
    }
    catch (error) {
      console.error(error)
    }
  }, [])

  return (
    <XStack gap={s.$075} style={{ alignItems: 'center', backgroundColor: c.surface2 }}>
      <View style={{width: s.$075, height: s.$075, backgroundColor: c.accent, borderRadius: 100}}></View>
      <Avatar source={image} size={s.$5} />
      <YStack style={{ padding: s.$2, width: "80%" }}>
        {/* <Text style={{fontWeight: 'bold'}}>
          {conversation.id}
        </Text> */}
        <Text>
          {/* todo make sure this is the latest message. i think it's impossible to sort within an expansion so need some diff way */}
          {/* and anyway we shouldn't be fetching the whole conversation for this */}
          {conversation.expand?.messages_via_conversation?.length  &&  conversation.expand.messages_via_conversation[0].text}
        </Text>
      </YStack>
    </XStack>
  )
}