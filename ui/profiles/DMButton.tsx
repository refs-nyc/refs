import { router } from "expo-router"
import { Button } from "../buttons/Button"
import { c } from "@/features/style"
import { pocketbase, useUserStore } from "@/features/pocketbase";
import { useEffect, useState } from "react";
import { ConversationWithMemberships, Profile } from "@/features/pocketbase/stores/types";

export const DMButton = ({profile, fromSaves, disabled} : {profile: Profile, fromSaves?: boolean, disabled?: boolean}) =>
{
  const { user } = useUserStore();

  const [target, setTarget] = useState<string>('');

  useEffect(() => {
    const checkIfDirectMessageExists = async () => {
      if (!profile)
      {
        setTarget('');
        return; 
      } 
      try {
        let existingConversationId = '';

        const directConversations = await pocketbase.collection<ConversationWithMemberships>('conversations').getFullList({
          filter: `is_direct = true`,
          expand: 'memberships_via_conversation.user',
        });
        for (const conversation of directConversations) {
          const otherUserId = conversation.expand?.memberships_via_conversation.map(m=>m.expand?.user.id).filter(id=>id!==user?.id)[0];
          if (otherUserId===profile.id)
          {
            existingConversationId = conversation.id;
            break;
          } 
        }
        if (!existingConversationId) {
          setTarget(`/user/${profile.userName}/new-dm`);
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
  }, [profile]);

  return (
    <Button
      onPress={() => { if (fromSaves)  router.replace(target as any); else router.push(target as any)}}
      variant={fromSaves ? "whiteInverted" : "raisedSecondary"}
      disabled={disabled}
      title="Message"
      iconColor={c.muted}
      iconAfter={fromSaves ? undefined :"paper-plane"}
    />
  )
}