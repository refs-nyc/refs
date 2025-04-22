import formatTimestamp from "@/features/messaging/timestampFormatter";
import { useUserStore } from "@/features/pocketbase";
import { Message } from "@/features/pocketbase/stores/types";
import { c, s } from "@/features/style";
import { useCalendars } from "expo-localization";
import { View, Text } from "react-native";

export default function MessageBubble({ message }: { message: Message }) 
{
  const { user } = useUserStore()
  const calendars = useCalendars();
  const timeZone = calendars[0].timeZone || "America/New_York";
  
  const isMe = message.sender === user?.id;
  const date = message.created ? message.created.slice(0, message.created.length-1) : '';
  const formattedDate = formatTimestamp(date, timeZone);
  
  return (
    <View 
      key={message.id} 
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
      <Text 
        style={{color: c.muted, fontSize: s.$08, alignSelf: 'flex-end'}}
      >
        {formattedDate}
      </Text>
    </View>
    )
}