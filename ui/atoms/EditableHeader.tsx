import { useState, useEffect } from 'react'
import { Pressable } from 'react-native'
import { BottomSheetTextInput as TextInput } from '@gorhom/bottom-sheet'
import { XStack } from '@/ui/core/Stacks'
import { Heading } from '@/ui/typo/Heading'
import Ionicons from '@expo/vector-icons/Ionicons'
import { s, c, t } from '@/features/style'
import * as Clipboard from 'expo-clipboard'
import { getLinkPreview } from 'link-preview-js'

export const EditableHeader = ({
  title,
  setTitle,
  url,
  setUrl,
  image,
  setImage,
  placeholder = '',
  initialEditing = false,
  withUrl = true,
}: {
  title: string
  setTitle: (str: string) => void
  url: string
  setUrl: (str: string) => void
  image?: string
  setImage: (str: string) => void
  placeholder: string
  initialEditing?: boolean
  withUrl?: boolean
}) => {
  const [hasUrl, setHasUrl] = useState(false)
  const [editing, setEditing] = useState(initialEditing)
  const [addingUrl, setAddingUrl] = useState(false)

  const analyseUrl = async (u: string) => {
    // pass the link directly
    getLinkPreview(u).then((data) => {
      // @ts-ignore
      if (data?.title && title === '') {
        // @ts-ignore
        console.log('SETTING TITLE: ', data.title)
        // @ts-ignore
        setTitle(data.title)
      }

      // @ts-ignore
      if (data?.images?.length > 0 && !image) {
        // @ts-ignore
        console.log('IMAGE', data.images[0])
        // @ts-ignore
        setImageState(data.images[0])
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
            <Pressable onPress={() => setEditing(true)}>
              <Heading
                tag="h2"
                style={{
                  textAlign: 'left',
                  color: c.surface,
                  fontSize: 24,
                  opacity: title ? 1 : 0.7,
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
            onChangeText={(e) => {
              setTitle(e)
            }}
            multiline={true}
            onBlur={() => {
              setEditing(false)
            }}
          ></TextInput>
        )}

        {addingUrl && (
          <TextInput
            style={{
              flexShrink: 1,
              width: '100%',
              backgroundColor: c.surface,
              paddingVertical: s.$08,
              paddingHorizontal: s.$1,
              borderRadius: s.$075,
              color: c.muted,
            }}
            value={url}
            autoFocus={true}
            autoCorrect={false}
            autoCapitalize="none"
            autoComplete="off"
            placeholder="Paste url"
            onChangeText={setUrl}
            clearButtonMode="while-editing"
          />
        )}

        <XStack
          style={{
            alignItems: 'center',
            paddingTop: s.$025,
          }}
          gap={s.$09}
        >
          {editing ? (
            <Pressable
              onPress={() => {
                setEditing(false)
              }}
            >
              <Ionicons size={28} name="checkbox-outline" color={c.surface2} />
            </Pressable>
          ) : (
            !addingUrl && (
              <Pressable
                style={{
                  width: 28,
                  // backgroundColor: 'red',
                  flexShrink: 0,
                }}
                onPress={() => setEditing(true)}
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
