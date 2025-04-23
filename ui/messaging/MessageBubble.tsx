import formatTimestamp from "@/features/messaging/timestampFormatter";
import { useUserStore } from "@/features/pocketbase";
import { useMessageStore } from "@/features/pocketbase/stores/messages";
import { Message } from "@/features/pocketbase/stores/types";
import { c, s } from "@/features/style";
import { useCalendars } from "expo-localization";
import { View, Text } from "react-native";
import { Pressable } from "react-native-gesture-handler";
import { Avatar } from "../atoms/Avatar";
import { XStack } from "../core/Stacks";

export default function MessageBubble(
  { message, setReactingTo }: 
  { message: Message, setReactingTo?: (id: string) => void })
{
  const { user } = useUserStore()
  const calendars = useCalendars();
  const {reactions} = useMessageStore();

  const messageReactions = reactions[message.id];

  const timeZone = calendars[0].timeZone || "America/New_York";
  
  const isMe = message.sender === user?.id;
  const date = message.created ? message.created.slice(0, message.created.length-1) : '';
  const formattedDate = formatTimestamp(date, timeZone);
  
  return (
    <Pressable 
      key={message.id}  
      onLongPress={setReactingTo ? ()=>setReactingTo(message.id) : null}
    >
      <View 
        style={{ 
          backgroundColor: isMe ? c.accent2 : c.surface2, 
          padding: s.$08, 
          marginVertical: s.$05,
          borderRadius: s.$075, 
          maxWidth: '70%',
          alignSelf: isMe ? 'flex-end' : 'flex-start'
        }}
        >
        <Text>{message.text}</Text>
        {messageReactions && 
          <XStack >
            { messageReactions.map(r=>
              <XStack key={r.id} style={{backgroundColor: c.accent, padding: s.$05, borderRadius: s.$1}}>
                <Text>{r.emoji}</Text>
                <Avatar source={r.expand?.user.image} size={s.$1} />
              </XStack>
            )
            }
          </XStack>
        }
        <Text 
          style={{color: c.muted, fontSize: s.$08, alignSelf: 'flex-end'}}
        >
          {formattedDate}
        </Text>
      </View>
    </Pressable>
    )
}