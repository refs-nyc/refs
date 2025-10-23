import { useAppStore } from '@/features/stores'
import { c, s } from '@/features/style'
import { Button } from '@/ui/buttons/Button'
import { XStack, YStack } from '@/ui/core/Stacks'
import { Heading } from '@/ui/typo/Heading'
import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet'
import { useEffect, useCallback } from 'react'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Linking, Platform } from 'react-native'
import * as Notifications from 'expo-notifications'
import { registerForPushNotificationsAsync } from './utils'
import { supabase } from '@/features/supabase/client'

export const NotificationPromptSheet = () => {
  const insets = useSafeAreaInsets()
  const {
    removeRefSheetBackdropAnimatedIndex,
    registerBackdropPress,
    unregisterBackdropPress,
    notificationPromptSheetRef,
    notificationPromptMessage,
    setNotificationPromptMessage,
    user,
    updateUser,
  } = useAppStore()

  const isDenied = notificationPromptMessage?.startsWith('denied:')
  const message = isDenied 
    ? notificationPromptMessage?.slice(7) // Remove 'denied:' prefix
    : notificationPromptMessage

  const handleYes = useCallback(async () => {
    if (isDenied) {
      // Open iOS settings
      if (Platform.OS === 'ios') {
        await Linking.openSettings()
      }
      notificationPromptSheetRef.current?.close()
      return
    }

    // Request permission (triggers native iOS prompt)
    try {
      const token = await registerForPushNotificationsAsync()
      
      if (token && user) {
        // Store token
        await updateUser({ pushToken: token })
        
        const supabaseClient = supabase.client
        if (supabaseClient) {
          try {
            await supabaseClient
              .from('users')
              .upsert({ id: user.id, push_token: token }, { onConflict: 'id' })
          } catch (error) {
            console.info('Failed to upsert push token in Supabase (non-fatal)', error)
          }
        }
      }
    } catch (error) {
      console.info('Failed to register push notifications', error)
    }
    
    notificationPromptSheetRef.current?.close()
  }, [isDenied, user, updateUser, notificationPromptSheetRef])

  const handleNo = useCallback(() => {
    notificationPromptSheetRef.current?.close()
  }, [notificationPromptSheetRef])

  // Open sheet when message is set
  useEffect(() => {
    if (!notificationPromptMessage) return
    requestAnimationFrame(() => {
      notificationPromptSheetRef.current?.snapToIndex(0)
    })
  }, [notificationPromptMessage, notificationPromptSheetRef])

  // Close sheet when user taps backdrop
  useEffect(() => {
    const key = registerBackdropPress(() => {
      notificationPromptSheetRef.current?.close()
    })
    return () => {
      unregisterBackdropPress(key)
    }
  }, [registerBackdropPress, unregisterBackdropPress])

  const disappearsOnIndex = -1
  const appearsOnIndex = 0

  return (
    <BottomSheet
      enableDynamicSizing={false}
      ref={notificationPromptSheetRef}
      enablePanDownToClose
      keyboardBlurBehavior="none"
      snapPoints={[250]}
      index={-1}
      animatedIndex={removeRefSheetBackdropAnimatedIndex}
      backgroundStyle={{ backgroundColor: c.surface, borderRadius: 50, paddingTop: 0, opacity: 1 }}
      backdropComponent={(p) => (
        <BottomSheetBackdrop
          {...p}
          disappearsOnIndex={disappearsOnIndex}
          appearsOnIndex={appearsOnIndex}
          pressBehavior="close"
        />
      )}
      handleComponent={null}
      keyboardBehavior="interactive"
      style={{ zIndex: 10000 }}
      containerStyle={{ zIndex: 10000 }}
      onChange={(index) => {
        if (index === -1) {
          setNotificationPromptMessage(null)
        }
      }}
    >
      <YStack
        gap={s.$2}
        style={{
          paddingHorizontal: s.$2,
          paddingTop: s.$3,
          paddingBottom: insets.bottom || s.$2,
        }}
      >
        <XStack style={{ justifyContent: 'center' }}>
          <Heading tag="h2semi" style={{ color: c.muted, textAlign: 'center' }}>
            {message}
          </Heading>
        </XStack>
        <YStack gap={s.$1 + s.$05}>
          <Button
            onPress={handleYes}
            title={isDenied ? 'Open Settings' : 'Yes'}
            variant="raised"
            style={{ minHeight: 50 }}
          />
          {!isDenied && (
            <Button
              onPress={handleNo}
              title="Not Now"
              variant="raisedSecondary"
              style={{ minHeight: 50 }}
            />
          )}
        </YStack>
      </YStack>
    </BottomSheet>
  )
}
