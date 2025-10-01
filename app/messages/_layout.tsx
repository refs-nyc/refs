import { Stack } from 'expo-router'
import { MessagesInit } from '@/features/messaging/message-loader'

export default function MessagesLayout() {
  return (
    <>
      <MessagesInit />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  )
}
