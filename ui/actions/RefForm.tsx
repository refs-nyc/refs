import { useState, useEffect, useRef } from 'react'
import {
  View,
  TouchableOpacity,
  Dimensions,
  Animated,
  Text,
  Pressable,
  ActivityIndicator,
} from 'react-native'
import { BottomSheetTextInput as TextInput } from '@gorhom/bottom-sheet'
import { Heading } from '@/ui/typo/Heading'
import { Picker } from '../inputs/Picker'
import { PinataImage } from '../images/PinataImage'
import { Image } from 'expo-image'
import { EditableHeader } from '../atoms/EditableHeader'
import { Button } from '../buttons/Button'
import type { ImagePickerAsset } from 'expo-image-picker'
import { c, s } from '@/features/style'
import { StagedItemFields, StagedRef } from '@/features/pocketbase/stores/types'
// @ts-ignore
import { KeyboardAvoidingView } from 'react-native-keyboard-controller'
import { DismissKeyboard } from '../atoms/DismissKeyboard'

const win = Dimensions.get('window')

export const RefForm = ({
  r,
  placeholder = 'Add a title',
  onAddRef,
  onAddRefToList,
  pickerOpen = false,
  canEditRefData = true,
}: {
  r: StagedRef
  placeholder?: string
  onAddRef: (fields: StagedItemFields) => Promise<void>
  onAddRefToList?: (fields: StagedItemFields) => Promise<void>
  pickerOpen?: boolean
  backlog?: boolean
  canEditRefData?: boolean
}) => {
  // Separate state for each field to prevent unnecessary re-renders
  const [title, setTitle] = useState<string>(r?.title || '')
  const [url, setUrl] = useState<string>(r?.url || '')
  const [text, setText] = useState<string>('')
  const [imageAsset, setImageAsset] = useState<ImagePickerAsset | null>(null)
  const [pinataSource, setPinataSource] = useState<string>('')
  const [picking, setPicking] = useState(pickerOpen)
  const [uploadInProgress, setUploadInProgress] = useState(false)
  const [createInProgress, setCreateInProgress] = useState(false)
  const [uploadInitiated, setUploadInitiated] = useState(false)
  const [location, setLocation] = useState<string>('')
  const [author, setAuthor] = useState<string>('')
  const [editingField, setEditingField] = useState<'location' | 'author' | null>(null)

  // Animation refs
  const titleShake = useRef(new Animated.Value(0)).current
  const imageShake = useRef(new Animated.Value(0)).current

  // Initialize state based on incoming ref
  useEffect(() => {
    setTitle(r.title || '')
    setUrl(r.url || '')

    // Initialize image state
    if (r?.image) {
      if (typeof r.image === 'string') {
        setPinataSource(r.image)
      } else {
        setImageAsset(r.image)
      }
    } else {
      setPinataSource('')
      setImageAsset(null)
    }
  }, [r])

  const handleImageSuccess = (imageUrl: string) => {
    setUploadInProgress(false)
    // Set pinataSource immediately to update UI
    setPinataSource(imageUrl)

    // Prefetch image in background as optimization, but don't block UI updates
    Image.prefetch(imageUrl).catch((err) => {
      console.error('Failed to prefetch image:', err)
    })
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
    <DismissKeyboard>
      <KeyboardAvoidingView
        style={{
          justifyContent: 'flex-start',
          alignItems: 'center',
          gap: s.$1,
          marginTop: s.$2,
          marginBottom: s.$2 + 10,
          width: '100%',
        }}
        behavior="padding"
        keyboardVerticalOffset={Dimensions.get('window').height * 0.25}
      >
        <View
          style={{
            width: 207.6, // 200 + 2*3.8 for border
            marginBottom: 8,
            borderRadius: s.$09 + 3.8,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'transparent',
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
                onFail={() => {
                  console.error('Upload failed')
                  setUploadInProgress(false)
                }}
              />
            ) : pinataSource ? (
              <TouchableOpacity
                style={{
                  flex: 1,
                  width: 200,
                  height: 200,
                  borderRadius: s.$09,
                  overflow: 'hidden',
                }}
                onLongPress={() => setPicking(true)}
              >
                <Image style={{ flex: 1 }} source={pinataSource} placeholder={pinataSource} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={{ flex: 1 }} onPress={() => setPicking(true)}>
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
              setUploadInProgress(true)
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
          />
        </Animated.View>

        {/* Inline subtitle row for location/author, now directly below title with minimal spacing */}
        <View style={{ width: '100%', alignItems: 'flex-start', marginTop: -17, marginBottom: 2 }}>
          {/* Only show one: location or author, never both */}
          {canEditRefData ? (
            editingField === 'location' ? (
              <TextInput
                value={location}
                onChangeText={(t) => t.length <= 150 && setLocation(t)}
                onBlur={() => setEditingField(null)}
                autoFocus
                placeholder="Add location"
                style={{
                  minWidth: 80,
                  maxWidth: 250,
                  color: c.surface,
                  fontSize: 18,
                  fontWeight: '600',
                  opacity: 0.5,
                  backgroundColor: 'transparent',
                  padding: 0,
                  margin: 0,
                  textAlign: 'left',
                }}
                maxLength={150}
                returnKeyType="done"
              />
            ) : editingField === 'author' ? (
              <TextInput
                value={author}
                onChangeText={(t) => t.length <= 150 && setAuthor(t)}
                onBlur={() => setEditingField(null)}
                autoFocus
                placeholder="Add author"
                style={{
                  minWidth: 80,
                  maxWidth: 250,
                  color: c.surface,
                  fontSize: 18,
                  fontWeight: '600',
                  opacity: 0.5,
                  backgroundColor: 'transparent',
                  padding: 0,
                  margin: 0,
                  textAlign: 'left',
                }}
                maxLength={150}
                returnKeyType="done"
              />
            ) : location ? (
              <Pressable
                onPress={() => {
                  setTimeout(() => setEditingField('location'), 0)
                }}
              >
                <Text
                  style={{
                    color: c.surface,
                    fontSize: 18,
                    fontWeight: '600',
                    opacity: 0.5,
                    textAlign: 'left',
                  }}
                >
                  {location}
                </Text>
              </Pressable>
            ) : author ? (
              <Pressable
                onPress={() => {
                  setTimeout(() => setEditingField('author'), 0)
                }}
              >
                <Text
                  style={{
                    color: c.surface,
                    fontSize: 18,
                    fontWeight: '600',
                    opacity: 0.5,
                    textAlign: 'left',
                  }}
                >
                  {author}
                </Text>
              </Pressable>
            ) : (
              <View style={{ flexDirection: 'row', gap: 16 }}>
                <Pressable onPress={() => setEditingField('location')}>
                  <Text
                    style={{
                      color: c.surface,
                      fontSize: 17.6,
                      opacity: 0.7,
                      textAlign: 'left',
                      fontWeight: '600',
                    }}
                  >
                    + location
                  </Text>
                </Pressable>
                <Pressable onPress={() => setEditingField('author')}>
                  <Text
                    style={{
                      color: c.surface,
                      fontSize: 17.6,
                      opacity: 0.7,
                      textAlign: 'left',
                      fontWeight: '600',
                    }}
                  >
                    + author
                  </Text>
                </Pressable>
              </View>
            )
          ) : (
            <View
              style={{ width: '100%', alignItems: 'flex-start', marginTop: -17, marginBottom: 2 }}
            >
              <Heading tag="h2" style={{ color: c.surface }}>
                {location || author}
              </Heading>
            </View>
          )}
        </View>

        {/* Notes */}
        <TextInput
          multiline={true}
          numberOfLines={4}
          placeholder="Add a caption for your profile"
          placeholderTextColor={c.muted}
          onChangeText={setText}
          style={{
            backgroundColor: c.white,
            borderRadius: s.$075,
            width: '100%',
            padding: s.$1,
            minHeight: s.$12,
            fontSize: 17,
            fontWeight: '500',
          }}
        />

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
              // Only include meta if location or author is present
              let meta: string | undefined = undefined
              if (location || author) {
                meta = JSON.stringify({ location, author })
              }

              try {
                setCreateInProgress(true)
                await onAddRefToList({ title, text, url, image: pinataSource, meta })
              } catch (e) {
                console.error(e)
              } finally {
                setCreateInProgress(false)
              }
            }}
          />

          {createInProgress || uploadInProgress || (uploadInitiated && !pinataSource) ? (
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
                backgroundColor: 'white',
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
              style={{ width: '48%', minWidth: 0 }}
              disabled={!(pinataSource && title) || createInProgress}
              onPress={async () => {
                if (!validateFields()) {
                  return
                }

                // Only include meta if location or author is present
                let meta: string | undefined = undefined
                if (location || author) {
                  meta = JSON.stringify({ location, author })
                }

                try {
                  setCreateInProgress(true)
                  await onAddRef({ title, text, url, image: pinataSource, meta })
                } catch (e) {
                  console.error(e)
                } finally {
                  setCreateInProgress(false)
                }
              }}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </DismissKeyboard>
  )
}
