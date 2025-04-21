import { router, useGlobalSearchParams } from "expo-router"
import { Button } from "../buttons/Button"
import { c } from "@/features/style"
import { pocketbase, useUserStore } from "@/features/pocketbase";
import { useEffect, useState } from "react";
import { ConversationWithMemberships } from "@/features/pocketbase/stores/types";
import { UsersRecord } from "@/features/pocketbase/stores/pocketbase-types";

export const DMButton = () => 
{
  const { user } = useUserStore();
  if (!user) return null;

  const [target, setTarget] = useState<string>('');

  const { userName } =  useGlobalSearchParams();

  useEffect(() => {
    const checkIfDirectMessageExists = async () => {
      try {
        let existingConversationId = '';
        const userId = await pocketbase.collection<UsersRecord>('users').getFullList({
          filter: `userName = "${userName}"`,
        });

        const directConversations = await pocketbase.collection<ConversationWithMemberships>('conversations').getFullList({
          filter: `is_direct = true`,
          expand: 'memberships_via_conversation.user',
        });
        for (const conversation of directConversations) {
          const otherUserId = conversation.expand?.memberships_via_conversation.map(m=>m.expand?.user.id).filter(id=>id!==user.id)[0];
          if (otherUserId===userId[0].id) existingConversationId = conversation.id;
        }
         if (!existingConversationId) {
          setTarget(`/user/${userName}/new-dm`);
        }
        else
        {
          setTarget('/messages/' + existingConversationId);
        }
      }
      catch (error) {
        console.error(error);
      }
    }
    checkIfDirectMessageExists();
  },[]);

  return (
    <Button
      onPress={() => {router.push(target as any)}}
      variant="raisedSecondary"
      title="Message"
      iconColor={c.muted}
      iconAfter="paper-plane"
    />
  )
}