import { useState, useEffect } from 'react'
import { Pressable, View } from 'react-native'
import { BottomSheetTextInput as TextInput } from '@gorhom/bottom-sheet'
import { XStack } from '@/ui/core/Stacks'
import { Heading } from '@/ui/typo/Heading'
import Ionicons from '@expo/vector-icons/Ionicons'
import { c, s, t } from '@/features/style'
import * as Clipboard from 'expo-clipboard'
import { getLinkPreview } from 'link-preview-js'

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

export const EditableHeader = ({
  canEditRefData,
  title,
  setTitle,
  url,
  setUrl,
  image,
  setImage,
  placeholder = '',
  withUrl = true,
  onActiveFieldChange,
  isActive = false,
}: {
  canEditRefData: boolean
  title: string
  setTitle: (str: string) => void
  url: string
  setUrl: (str: string) => void
  image?: string
  setImage: (str: string) => void
  placeholder: string
  withUrl?: boolean
  onActiveFieldChange?: (field: 'title' | 'link' | 'caption' | null) => void
  isActive?: boolean
}) => {
  const [hasUrl, setHasUrl] = useState(false)
  const [editing, setEditing] = useState(false)
  const [addingUrl, setAddingUrl] = useState(false)

  // Auto-focus when there's a pre-populated image but no title
  useEffect(() => {
    if (image && !title && canEditRefData) {
      setEditing(true)
    }
  }, [image, title, canEditRefData])

  const analyseUrl = async (u: string) => {
    // pass the link directly
    getLinkPreview(u).then((data) => {
      if ('title' in data && data?.title && title === '') {
        setTitle(data.title)
      }

      if ('images' in data && data?.images?.length > 0 && !image) {
        setImage(data.images[0])
      }
    })
  }

  useEffect(() => {
    if (url && url !== '') analyseUrl(url)
  }, [url])

  useEffect(() => {
    const detectUrl = async () => {
      setHasUrl(await Clipboard.hasUrlAsync())
    }

    detectUrl()
  }, [addingUrl])

  return (
    <>
      <XStack
        gap={s.$075}
        style={{
          width: '100%',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          minHeight: 44,
          // backgroundColor: 'green',
        }}
      >
        {!editing && !addingUrl && (
          <XStack
            gap={s.$08}
            style={{
              flexShrink: 1,
              flexDirection: 'row',
              alignItems: 'flex-start',
            }}
          >
            <Pressable
              onPress={() => {
                if (canEditRefData) setEditing(true)
              }}
            >
              <Heading
                tag="h2"
                style={{
                  textAlign: 'left',
                  color: c.surface,
                  fontSize: 24,
                  opacity: title ? 1 : 0.5,
                }}
              >
                {title || placeholder}
              </Heading>
            </Pressable>
          </XStack>
        )}
        {!addingUrl && editing && (
          <TextInput
            style={[
              t.h2,
              {
                flex: 1,
                padding: 0,
                margin: 0,
                transform: 'translate(0, -1px)',
                color: c.surface,
                fontSize: 24,
              },
            ]}
            autoFocus={true}
            value={title == placeholder ? '' : title}
            placeholder={placeholder}
            placeholderTextColor={`${c.surface}80`}
            onChangeText={(e) => {
              setTitle(e)
            }}
            multiline={true}
            onFocus={() => onActiveFieldChange?.('title')}
          ></TextInput>
        )}

        {addingUrl && (
          <TextInput
            style={{
              flexGrow: 1,
              flexBasis: 0,
              maxWidth: '100%',
              minWidth: 0,
              backgroundColor: c.white,
              paddingVertical: s.$08,
              paddingHorizontal: s.$1,
              borderRadius: s.$075,
              color: c.black,
              fontSize: 17,
              fontWeight: '500',
            }}
            value={url}
            autoFocus={true}
            autoCorrect={false}
            autoCapitalize="none"
            autoComplete="off"
            placeholder="Paste url"
            placeholderTextColor={c.muted}
            onChangeText={setUrl}
            clearButtonMode="while-editing"
            returnKeyType="done"
            onSubmitEditing={() => setAddingUrl(false)}
          />
        )}

        <XStack
          style={{
            alignItems: 'center',
            paddingTop: s.$025 - 5,
          }}
          gap={s.$09}
        >
          {editing ? (
            <Pressable
              onPress={() => {
                setEditing(false)
              }}
            >
              {isActive ? <CircleCheckmark /> : null}
            </Pressable>
          ) : (
            !addingUrl &&
            canEditRefData && (
              <Pressable
                style={{
                  width: 28,
                  // backgroundColor: 'red',
                  flexShrink: 0,
                }}
                onPress={() => {
                  if (canEditRefData) setEditing(true)
                }}
              >
                <Ionicons
                  size={24}
                  name={title === 'placeholder' || title === '' ? 'add' : 'pencil'}
                  color={c.white}
                />
              </Pressable>
            )
          )}
          {!addingUrl && withUrl && !editing && (
            <Pressable
              style={{
                width: 28,
                // backgroundColor: 'red',
                flexShrink: 0,
              }}
              onPress={() => setAddingUrl(true)}
            >
              <Ionicons name="link-outline" size={28} color={url === '' ? c.olive2 : c.white} />
            </Pressable>
          )}

          {addingUrl && withUrl && (
            <>
              {hasUrl && url === '' ? (
                <></>
              ) : (
                <Pressable onPress={() => setAddingUrl(false)}>
                  <Ionicons name="checkbox-outline" size={28} color={c.surface2} />
                </Pressable>
              )}
            </>
          )}
        </XStack>
      </XStack>
    </>
  )
}
