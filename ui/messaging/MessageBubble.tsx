import { formatTimestamp } from "@/features/messaging/utils";
import { useUserStore } from "@/features/pocketbase";
import { useMessageStore } from "@/features/pocketbase/stores/messages";
import { Message, Profile } from "@/features/pocketbase/stores/types";
import { c, s } from "@/features/style";
import { useCalendars } from "expo-localization";
import { View, Text } from "react-native";
import { Pressable } from "react-native";
import { Avatar } from "../atoms/Avatar";
import { XStack } from "../core/Stacks";
import { Link } from "expo-router";

export default function MessageBubble(
  { message, showSender, sender, senderColor, setReactingTo }:
  { message: Message, showSender: boolean, sender: Profile, senderColor?: string, setReactingTo?: (id: string) => void }) 
{
  const { user } = useUserStore()
  const calendars = useCalendars();
  const { reactions, deleteReaction } = useMessageStore();

  const messageReactions = reactions[message.id];

  const timeZone = calendars[0].timeZone || "America/New_York";

  const isMe = message.sender === user?.id;
  const date = message.created ? message.created.slice(0, message.created.length - 1) : '';
  const formattedDate = formatTimestamp(date, timeZone);

  return (
    <XStack style={{ alignSelf : isMe ? 'flex-end' : 'flex-start',}}>
      { sender && showSender && !isMe &&
        <View style={{alignSelf: 'flex-end'}}>
          <Link href={`/user/${sender.userName}`}>
            <Avatar source={sender.image} size={s.$3} />
          </Link>
        </View>
      }
      <Pressable
        onLongPress={ () =>
        {
          if (setReactingTo) setReactingTo(message.id);
        }}
      >
        <View
          style={{
            backgroundColor: isMe ? c.accent2 : c.surface2,
            padding: s.$08,
            marginVertical: s.$05,
            borderRadius: s.$075,
            width: '100%',
          }}
        >
          { sender && showSender && !isMe &&
            <Text style={{color: senderColor, fontWeight: 'bold'}}>{sender.firstName}</Text>
          }
          <Text>{message.text}</Text>
          {messageReactions &&
            <XStack >
              {messageReactions.map(r => {
                const isMine = r.user === user?.id;
                return (
                  <Pressable
                    key={r.id}
                    onPress={isMine ? () => deleteReaction(r.id) : null}
                  >
                    <XStack
                      style={{
                        backgroundColor: isMine ? c.accent : c.muted,
                        padding: s.$05,
                        borderRadius: s.$1
                      }}
                    >
                      <Text>{r.emoji}</Text>
                      <Avatar source={r.expand?.user.image} size={s.$1} />
                    </XStack>
                  </Pressable>
                )
              })}
            </XStack>
          }
          <Text
            style={{ color: c.muted, fontSize: s.$08, alignSelf: 'flex-end' }}
          >
            {formattedDate}
          </Text>
        </View>
      </Pressable>
    </XStack>
  )
}