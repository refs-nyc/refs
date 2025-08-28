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
  onCaptionFocus,
}: {
  existingRefFields: ExistingRefFields | null
  placeholder?: string
  onAddRef: (fields: StagedItemFields) => Promise<void>
  onAddRefToList?: (fields: StagedItemFields) => Promise<void>
  pickerOpen?: boolean
  backlog?: boolean
  canEditRefData?: boolean
  onCaptionFocus?: (focused: boolean) => void
}) => {
  // Separate state for each field to prevent unnecessary re-renders
  const [title, setTitle] = useState<string>(existingRefFields?.title || '')
  const [url, setUrl] = useState<string>(existingRefFields?.url || '')
  const [text, setText] = useState<string>('')
  const [imageAsset, setImageAsset] = useState<ImagePickerAsset | null>(null)
  const [pinataSource, setPinataSource] = useState<string>('')
  const [picking, setPicking] = useState(pickerOpen)
  const [uploadInProgress, setUploadInProgress] = useState(false)
  const [createInProgress, setCreateInProgress] = useState(false)
  const [uploadInitiated, setUploadInitiated] = useState(false)
  const [editingUrl, setEditingUrl] = useState<boolean>(false)
  const [activeField, setActiveField] = useState<'title' | 'link' | 'caption' | null>(null)

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
    } else {
      setTitle(existingRefFields.title || '')
      setUrl(existingRefFields.url || '')

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

  const handleImageSuccess = (imageUrl: string) => {
    // For background uploads, we get called with local URI immediately
    // Don't update pinataSource to prevent flashing - keep using local URI
    if (!imageUrl.startsWith('http')) {
      // Local URI - set it as the source
      setPinataSource(imageUrl)
    }
    // For Pinata URLs (background uploads), don't update pinataSource to prevent flash
    
    // Prefetch image in background as optimization, but don't block UI updates
    Image.prefetch(imageUrl).catch((err) => {
      console.error('Failed to prefetch image:', err)
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
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        gap: s.$1,
        marginTop: s.$2 - 5,
        marginBottom: s.$2 + 10,
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
        >
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
            onActiveFieldChange={setActiveField}
            isActive={activeField === 'title'}
          />
        </Animated.View>

        {/* Inline subtitle row (single field), directly below title */}
        <View style={{ width: '100%', alignItems: 'flex-start', marginTop: -17, marginBottom: 2 }}>
          {canEditRefData ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: s.$075, width: '100%' }}>
              <TextInput
                value={url}
                onChangeText={(t) => t.length <= 150 && setUrl(t)}
                placeholder="+ add a link"
                placeholderTextColor={`${c.surface}80`}
                onFocus={() => {
                  setEditingUrl(true)
                  setActiveField('link')
                }}
                onBlur={() => {
                  if (!url || url.trim() === '') {
                    setEditingUrl(false)
                    setActiveField(null)
                  }
                }}
                style={{
                  minWidth: 80,
                  maxWidth: 280,
                  color: c.surface,
                  fontSize: url ? 18 : 17.6,
                  fontWeight: '600',
                  opacity: url ? 0.5 : 0.7,
                  backgroundColor: 'transparent',
                  padding: 0,
                  margin: 0,
                  textAlign: 'left',
                  flex: 1,
                }}
                maxLength={150}
                returnKeyType="done"
                onSubmitEditing={() => setEditingUrl(false)}
              />
              {activeField === 'link' && (
                <Pressable onPress={() => setEditingUrl(false)}>
                  <CircleCheckmark />
                </Pressable>
              )}
            </View>
          ) : (
            <View style={{ width: '100%', alignItems: 'flex-start', marginTop: -17, marginBottom: 2 }}>
              <Heading tag="h2" style={{ color: c.surface }}>
                {url}
              </Heading>
            </View>
          )}
        </View>

        {/* Notes */}
        <View style={{ width: '100%', alignSelf: 'stretch' }}>
          <TextInput
            multiline={true}
            numberOfLines={3}
            placeholder="Add a caption for your profile"
            placeholderTextColor={c.muted}
            onChangeText={setText}
            value={text}
            style={{
              backgroundColor: c.white,
              borderRadius: s.$075,
              width: '100%',
              maxWidth: '100%',
              flexShrink: 1,
              overflow: 'hidden',
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
              // Snap to 100% when caption is focused to give full access to buttons
              // This will be handled by the parent BottomSheet's keyboardBehavior
              onCaptionFocus?.(true)
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
          <Button
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
          />

          {createInProgress || (uploadInProgress && !pinataSource) ? (
            <Pressable
              style={{
                width: '48%',
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
              title={title ? 'Add Ref' : 'Title required'}
              variant="whiteInverted"
              style={{ width: '48%', minWidth: 0, backgroundColor: c.white }}
              disabled={!(pinataSource && title) || createInProgress}
              onPress={async () => {
                if (!validateFields()) {
                  return
                }

                try {
                  setCreateInProgress(true)
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
