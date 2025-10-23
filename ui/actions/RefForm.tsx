import { useState, useEffect, useRef } from 'react'
import {
  View,
  TouchableOpacity,
  Dimensions,
  Animated,
  Text,
  Pressable,
  ActivityIndicator,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native'
import { BottomSheetScrollView, BottomSheetTextInput as TextInput } from '@gorhom/bottom-sheet'
import { Heading } from '@/ui/typo/Heading'
import { Picker } from '../inputs/Picker'
import { PinataImage } from '../images/PinataImage'
import { Image } from 'expo-image'
import { EditableHeader } from '../atoms/EditableHeader'
import { Button } from '../buttons/Button'
import type { ImagePickerAsset } from 'expo-image-picker'
import { c, s } from '@/features/style'
import { StagedItemFields } from '@/features/types'
import { DismissKeyboard } from '../atoms/DismissKeyboard'
import { Ionicons } from '@expo/vector-icons'
import { Svg, Path, Defs, Filter, FeFlood, FeColorMatrix, FeOffset, FeComposite, FeBlend, G } from 'react-native-svg'
import { clearActiveKeyboardInput, setActiveKeyboardInput } from '@/features/utils/keyboardFocusTracker'

const win = Dimensions.get('window')

// Custom circle checkmark component
const CircleCheckmark = () => (
  <View style={{ 
    width: 28, 
    height: 28, 
    borderRadius: 14, 
    backgroundColor: c.surface, 
    justifyContent: 'center', 
    alignItems: 'center',
    opacity: 0.5 
  }}>
    <Ionicons name="checkmark" size={16} color={c.accent} />
  </View>
)

// Chain link icon component
const ChainLinkIcon = () => (
  <View
    style={{
      padding: 4,
    }}
  >
    <Svg width="23" height="26" viewBox="0 0 23 26" fill="none">
      <Path
        d="M12.9856 16.9807L10.4188 19.5475C9.39762 20.5686 8.01266 21.1423 6.56856 21.1423C5.12445 21.1423 3.7395 20.5686 2.71836 19.5475C1.69722 18.5263 1.12356 17.1414 1.12356 15.6973C1.12356 14.2532 1.69722 12.8682 2.71836 11.8471L5.28516 9.28027M9.13535 5.43008L11.7022 2.86328C12.7233 1.84214 14.1082 1.26847 15.5523 1.26847C16.9965 1.26847 18.3814 1.84214 19.4025 2.86328C20.4237 3.88441 20.9973 5.26937 20.9973 6.71347C20.9973 8.15758 20.4237 9.54253 19.4025 10.5637L16.8357 13.1305M7.34221 14.9236L14.8589 7.40691"
        stroke={c.surface}
        strokeWidth="2.04188"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  </View>
)

type ExistingRefFields = {
  title?: string
  url?: string
  image?: string | ImagePickerAsset
  meta?: string
}

export const RefForm = ({
  existingRefFields,
  placeholder = 'Add a title',
  onAddRef,
  onAddRefToList,
  pickerOpen = false,
  canEditRefData = true,
  isSheetOpen = true,
  onCaptionFocus,
  onManualTransition,
  onLinkIconClick,
  onFieldEditStart,
  bottomInset = 0,
}: {
  existingRefFields: ExistingRefFields | null
  placeholder?: string
  onAddRef: (fields: StagedItemFields) => Promise<void>
  onAddRefToList?: (fields: StagedItemFields) => Promise<void>
  pickerOpen?: boolean
  backlog?: boolean
  canEditRefData?: boolean
  isSheetOpen?: boolean
  onCaptionFocus?: (focused: boolean) => void
  onManualTransition?: () => void
  onLinkIconClick?: () => void
  onFieldEditStart?: () => void
  bottomInset?: number
}) => {
  // Separate state for each field to prevent unnecessary re-renders
  const [title, setTitle] = useState<string>(existingRefFields?.title || '')
  const [url, setUrl] = useState<string>(existingRefFields?.url || '')
  const [text, setText] = useState<string>(existingRefFields?.meta || '')
  const [imageAsset, setImageAsset] = useState<ImagePickerAsset | null>(null)
  const [pinataSource, setPinataSource] = useState<string>('')
  const [picking, setPicking] = useState(pickerOpen)
  const [uploadInProgress, setUploadInProgress] = useState(false)
  const [createInProgress, setCreateInProgress] = useState(false)
  const [uploadInitiated, setUploadInitiated] = useState(false)
  const [editingUrl, setEditingUrl] = useState<boolean>(false)
  const [activeField, setActiveField] = useState<'title' | 'link' | 'caption' | null>(null)
  const [hasAttemptedAddWithoutTitle, setHasAttemptedAddWithoutTitle] = useState<boolean>(false)
  const captionInputRef = useRef<any>(null)
  const urlInputRef = useRef<any>(null)
  const scrollViewRef = useRef<any>(null)
  const titleInputRef = useRef<any>(null)
  const hasInitializedRef = useRef(false)

  useEffect(() => {
    return () => {
      clearActiveKeyboardInput()
    }
  }, [])

  // Scroll to bottom when component mounts and manage activeField based on sheet state
  useEffect(() => {
    if (__DEV__) {
      console.log('📋 RefForm sheet state changed:', { isSheetOpen, canEditRefData, hasInitialized: hasInitializedRef.current })
    }
    
    if (!isSheetOpen) {
      // Sheet is closing - clear activeField to prevent keyboard from reopening
      if (__DEV__) {
        console.log('📋 Sheet closing - clearing activeField')
      }
      titleInputRef.current?.blur?.()
      captionInputRef.current?.blur?.()
      urlInputRef.current?.blur?.()
      setActiveField(null)
      clearActiveKeyboardInput()
      hasInitializedRef.current = false
      // Don't manually dismiss keyboard - let keyboardBlurBehavior="restore" handle it
      return
    }
    
    if (isSheetOpen && !hasInitializedRef.current) {
      // Sheet is open and not yet initialized - set initial field and scroll ONCE
      if (__DEV__) {
        console.log('📋 Sheet open - INITIALIZING activeField and scrolling')
      }
      hasInitializedRef.current = true
      // If data can't be edited (AddRefSheet), focus caption instead of title
      const initialField = canEditRefData ? 'title' : 'caption'
      setActiveField(initialField)
      setActiveKeyboardInput(`RefForm:${initialField}`)
      // Small delay for scroll to let keyboard start appearing
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true })
      }, 150)
    }
  }, [canEditRefData, isSheetOpen])

  // Auto-focus title when activeField becomes 'title'
  useEffect(() => {
    if (activeField === 'title') {
      titleInputRef.current?.focus()
    }
  }, [activeField])

  // Auto-focus caption when activeField becomes 'caption'
  useEffect(() => {
    if (activeField === 'caption') {
      captionInputRef.current?.focus()
    }
  }, [activeField])

  // Auto-focus URL input when activeField becomes 'link'
  useEffect(() => {
    if (__DEV__) {
      console.log('🔄 ACTIVE FIELD CHANGE - activeField:', activeField)
    }
    if (activeField === 'link') {
      if (__DEV__) {
        console.log('🔗 FOCUSING URL INPUT')
      }
      setTimeout(() => {
        urlInputRef.current?.focus()
      }, 100)
    }
  }, [activeField])

  // Animation refs
  const titleShake = useRef(new Animated.Value(0)).current
  const imageShake = useRef(new Animated.Value(0)).current

  // Initialize state based on incoming ref
  useEffect(() => {
    if (!existingRefFields) {
      setTitle('')
      setUrl('')
      setPinataSource('')
      setImageAsset(null)
      setText('')
    } else {
      setTitle(existingRefFields.title || '')
      setUrl(existingRefFields.url || '')
      setText(existingRefFields.meta || '')

      // Initialize image state
      if (existingRefFields?.image) {
        if (typeof existingRefFields.image === 'string') {
          setPinataSource(existingRefFields.image)
        } else {
          setImageAsset(existingRefFields.image)
        }
      } else {
        setPinataSource('')
        setImageAsset(null)
      }
    }
  }, [existingRefFields])

  const lastLocalImageRef = useRef<string | null>(null)

  const handleImageSuccess = (imageUrl: string) => {
    if (!imageUrl) {
      return
    }

    // Track last good local asset so we can fall back if upload fails
    if (!imageUrl.startsWith('http')) {
      lastLocalImageRef.current = imageUrl
      setPinataSource(imageUrl)
      return
    }

    setPinataSource(imageUrl)
    Image.prefetch(imageUrl).catch((err) => {
      console.error('Failed to prefetch image:', err)
      if (lastLocalImageRef.current) {
        setPinataSource(lastLocalImageRef.current)
      }
    })
  }

  const handleImageFail = () => {
    console.error('Upload failed')
    setUploadInProgress(false)
  }

  // Reset uploadInitiated when both required fields are available
  useEffect(() => {
    if (uploadInitiated && pinataSource && title) {
      setUploadInitiated(false)
    }
  }, [uploadInitiated, pinataSource, title])



  // Shake animation function
  const triggerShake = (anim: Animated.Value) => {
    anim.setValue(0)
    Animated.sequence([
      Animated.timing(anim, { toValue: 1, duration: 80, useNativeDriver: true }),
      Animated.timing(anim, { toValue: -1, duration: 80, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 0.7, duration: 80, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 0, duration: 80, useNativeDriver: true }),
    ]).start()
  }

  const validateFields = () => {
    // Check for missing fields
    let isValid = true
    if (!title) {
      triggerShake(titleShake)
      isValid = false
    }
    if (!pinataSource) {
      triggerShake(imageShake)
      isValid = false
    }
    return isValid
  }

  return (
          <BottomSheetScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
        gap: s.$1,
        marginTop: s.$2 - 5,
        paddingBottom: 35,
        justifyContent: 'flex-start',
        // Stretch children to container width so inputs never grow wider
        // than the sheet and inadvertently shift the whole layout.
        alignItems: 'stretch',
      }}
    >
        <View
          style={{
            width: 207.6, // 200 + 2*3.8 for border
            marginBottom: 8,
            borderRadius: s.$09 + 3.8,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'transparent',
            // Subtle outside stroke to indicate the image is editable
            ...(pinataSource || imageAsset
              ? { borderWidth: 3.8, borderColor: 'rgba(255,255,255,0.18)' }
              : {}),
            // Explicitly center this fixed-width block since container stretches children
            alignSelf: 'center',
          }}
        >
          <Animated.View
            style={{
              width: 200,
              height: 200,
              borderRadius: s.$09,
              overflow: 'hidden',
              transform: [
                {
                  translateX: imageShake.interpolate({
                    inputRange: [-1, 0, 1],
                    outputRange: [-10, 0, 10],
                  }),
                },
                {
                  scale: imageShake.interpolate({
                    inputRange: [-1, 0, 1],
                    outputRange: [1.05, 1, 1.05],
                  }),
                },
              ],
            }}
          >
            {imageAsset ? (
              <PinataImage
                asset={imageAsset}
                onReplace={() => setPicking(true)}
                onSuccess={handleImageSuccess}
                onFail={handleImageFail}
                size={200}
                allowBackgroundUpload={true}
              />
            ) : pinataSource ? (
              <TouchableOpacity
                style={{
                  flex: 1,
                  width: 200,
                  height: 200,
                  borderRadius: s.$09,
                  overflow: 'hidden',
                  // Inner subtle stroke for visibility on light images
                  borderWidth: 1,
                  borderColor: 'rgba(0,0,0,0.08)',
                }}
                onPress={() => {
                  setPicking(true)
                  Keyboard.dismiss()
                }}
                onLongPress={() => setPicking(true)}
              >
                <Image style={{ flex: 1 }} source={pinataSource} placeholder={pinataSource} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={{ flex: 1 }} 
                onPress={() => {
                  setPicking(true)
                  Keyboard.dismiss()
                }}
              >
                <View
                  style={{
                    flex: 1,
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderWidth: 3,
                    borderColor: c.surface,
                    borderRadius: s.$09,
                    borderStyle: 'dashed',
                  }}
                >
                  <Heading tag="h1light" style={{ color: c.surface }}>
                    +
                  </Heading>
                </View>
              </TouchableOpacity>
            )}
          </Animated.View>
        </View>

        {picking && (
          <Picker
            onSuccess={(a: ImagePickerAsset) => {
              setImageAsset(a)
              setPicking(false)
              // Don't set uploadInProgress to true for background uploads
              // The image will be available immediately via local URI
              setUploadInitiated(true)
            }}
            onCancel={() => setPicking(false)}
          />
        )}

        <Animated.View
          style={{
            width: '100%',
            marginBottom: 0,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            transform: [
              {
                translateX: titleShake.interpolate({
                  inputRange: [-1, 0, 1],
                  outputRange: [-10, 0, 10],
                }),
              },
              {
                scale: titleShake.interpolate({
                  inputRange: [-1, 0, 1],
                  outputRange: [1.05, 1, 1.05],
                }),
              },
            ],
          }}
          pointerEvents="box-none"
        >
          {/* Title/URL input area with smooth animation */}
          <Animated.View style={{ flex: 1 }}>
            {activeField === 'link' ? (
              <TextInput
                ref={urlInputRef}
                value={url}
                onChangeText={(t) => t.length <= 150 && setUrl(t)}
                placeholder="Paste link here"
                placeholderTextColor={`${c.surface}80`}
                style={{
                  color: c.surface,
                  fontSize: url ? 18 : 17.6,
                  fontWeight: '600',
                  opacity: url ? 0.5 : 0.7,
                  backgroundColor: 'transparent',
                  padding: 0,
                  margin: 0,
                  textAlign: 'left',
                }}
                maxLength={150}
                returnKeyType="done"
                onSubmitEditing={() => {
                  setActiveField('caption')
                  setActiveKeyboardInput('RefForm:caption')
                  // Focus the caption field to encourage typing
                }}
                onBlur={() => {
                  // When URL editing loses focus (keyboard dismissed), return to normal state
                  setActiveField(null)
                  // Trigger manual transition to snap to 67%
                  onManualTransition?.()
                  clearActiveKeyboardInput('RefForm:link')
                }}
                onFocus={() => {
                  setActiveKeyboardInput('RefForm:link')
                }}
              />
            ) : (
              <EditableHeader
                canEditRefData={canEditRefData}
                setTitle={setTitle}
                setUrl={setUrl}
                setImage={setPinataSource}
                placeholder={placeholder}
                title={title}
                url={url || ''}
                image={pinataSource}
                withUrl={false}
                onActiveFieldChange={(field) => {
                  if (__DEV__) {
                    console.log('🎯 EditableHeader onActiveFieldChange called:', { field, isSheetOpen })
                  }
                  // Only allow field changes when sheet is actually open
                  if (isSheetOpen) {
                    setActiveField(field)
                    if (field) {
                      setActiveKeyboardInput(`RefForm:${field}`)
                    } else {
                      clearActiveKeyboardInput()
                    }
                  } else {
                    if (__DEV__) {
                      console.log('🚫 BLOCKED: Sheet is closed, ignoring field change')
                    }
                    clearActiveKeyboardInput()
                  }
                }}
                isActive={(() => {
                  const isActive = activeField === 'title'
                  if (__DEV__) {
                    console.log('🔵 EditableHeader isActive computed:', { activeField, isActive })
                  }
                  return isActive
                })()}
                hideEditIcon={true}
                forceNotEditing={false}
                onManualTransition={onManualTransition}
                onFieldEditStart={onFieldEditStart}
              />
            )}
          </Animated.View>

          {/* Link icon or checkbox */}
          {activeField === 'link' ? (
            <TouchableWithoutFeedback
              onPress={() => {
                console.log('Link checkbox clicked, setting activeField to null')
                // Trigger manual transition to snap to 67% (this sets manualTransition flag)
                onManualTransition?.()
                // Immediately change state to return to normal view
                setActiveField(null)
                clearActiveKeyboardInput('RefForm:link')
                // Dismiss keyboard after setting the flag
                Keyboard.dismiss()
                // Prevent caption from auto-focusing
                setTimeout(() => {
                  captionInputRef.current?.blur()
                }, 50)
              }}
            >
              <View style={{ 
                zIndex: 9999,
                elevation: 9999,
                position: 'relative',
                padding: 15,
              }}>
                <CircleCheckmark />
              </View>
            </TouchableWithoutFeedback>
          ) : activeField === 'title' ? (
            // Don't show anything when title is being edited - EditableHeader handles its own checkbox
            null
          ) : (
            // Default state - show chain link icon
            <TouchableWithoutFeedback
              onPress={() => {
                console.log('🔗 LINK ICON CLICK - Processing click, current activeField:', activeField)
                // Notify parent about transition to prevent unwanted snaps
              onLinkIconClick?.()
              onFieldEditStart?.()
              // Set active field to link - let keyboard behavior handle itself
              setActiveField('link')
              setActiveKeyboardInput('RefForm:link')
            }}
            >
              <View style={{ 
                zIndex: 9999,
                elevation: 9999,
                position: 'relative',
                padding: 15,
              }}>
                <ChainLinkIcon />
              </View>
            </TouchableWithoutFeedback>
          )}
        </Animated.View>

        {/* Notes */}
        <View style={{ width: '100%', alignSelf: 'stretch' }}>
          {!text && (
            <View style={{
              position: 'absolute',
              top: s.$1,
              left: s.$1,
              right: s.$1,
              zIndex: 1,
              pointerEvents: 'none',
            }}>
              <Text style={{
                color: c.muted,
                fontSize: 17,
                fontWeight: '500',
                lineHeight: 20,
              }}>
                What do you like about it?
              </Text>

            </View>
          )}
          <TextInput
            multiline={true}
            numberOfLines={3}
            placeholder=""
            placeholderTextColor={c.muted}
            onChangeText={setText}
            value={text}
            style={{
              backgroundColor: c.white,
              borderRadius: s.$075,
              width: '100%',
              maxWidth: '100%',
              flexShrink: 1,
              padding: s.$1,
              minHeight: s.$11,
              fontSize: 17,
              fontWeight: '500',
            }}
            scrollEnabled={true}
            textAlignVertical="top"
            autoCorrect={true}
            autoCapitalize="sentences"
            onFocus={() => {
              setActiveField('caption')
              setActiveKeyboardInput('RefForm:caption')
              // Snap to 100% when caption is focused to give full access to buttons
              // This will be handled by the parent BottomSheet's keyboardBehavior
              onCaptionFocus?.(true)
            }}
            onBlur={() => {
              // Reset caption focus state when caption loses focus - this should trigger immediate snap
              console.log('📝 CAPTION ONBLUR - Calling onCaptionFocus(false)')
              onCaptionFocus?.(false)
              clearActiveKeyboardInput('RefForm:caption')
            }}
            blurOnSubmit={false}
          />
        </View>

        <View
          style={{
            width: '100%',
            flexDirection: 'row',
            justifyContent: 'space-between',
          }}
        >
          {/* <Button
            title="Add to list"
            variant="whiteOutline"
            style={{ width: '48%', minWidth: 0 }}
            disabled={!title || createInProgress}
            onPress={async () => {
              if (!onAddRefToList) {
                return
              }
              if (!validateFields()) {
                return
              }

              try {
                setCreateInProgress(true)
                await onAddRefToList({ title, text, url: url, image: pinataSource })
              } catch (e) {
                console.error(e)
              } finally {
                setCreateInProgress(false)
              }
            }}
          /> */}

          {createInProgress || (uploadInProgress && !pinataSource) ? (
            <Pressable
              style={{
                width: '100%',
                minWidth: 0,
                height: 48,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: s.$4,
                borderColor: 'white',
                borderWidth: 1,
                backgroundColor: c.white,
                paddingVertical: s.$08,
                paddingHorizontal: s.$2,
              }}
              disabled={true}
            >
              <ActivityIndicator size="small" color={c.olive} />
            </Pressable>
          ) : (
            <Button
              title={hasAttemptedAddWithoutTitle && (!title || title.trim() === '' || title === placeholder) ? 'Title required' : 'Add'}

              variant="whiteInverted"
              style={{ 
                width: '100%', 
                minWidth: 0, 
                backgroundColor: c.white,
                opacity: hasAttemptedAddWithoutTitle && (!title || title.trim() === '' || title === placeholder) ? 0.5 : 1
              }}
              disabled={!(pinataSource && title && title.trim() !== '' && title !== placeholder) || createInProgress}
              onPress={async () => {
                // Check if user is trying to add without a title
                if (!title || title.trim() === '' || title === placeholder) {
                  setHasAttemptedAddWithoutTitle(true)
                  return
                }

                if (!validateFields()) {
                  return
                }

                try {
                  setCreateInProgress(true)
                  // Call onAddRef which will handle the submission
                  await onAddRef({ title, text, url: url, image: pinataSource })
                } catch (e) {
                  console.error(e)
                } finally {
                  setCreateInProgress(false)
                }
              }}
            />
          )}
        </View>
      </BottomSheetScrollView>
  )
}
