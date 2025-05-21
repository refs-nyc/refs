import { useState, useEffect } from 'react'
import { Pressable } from 'react-native'
import { BottomSheetTextInput as TextInput } from '@gorhom/bottom-sheet'
import { XStack } from '@/ui/core/Stacks'
import { Heading } from '@/ui/typo/Heading'
import Ionicons from '@expo/vector-icons/Ionicons'
import { s, c, t } from '@/features/style'
import * as Clipboard from 'expo-clipboard'
import { getLinkPreview, getPreviewFromContent } from 'link-preview-js'

export const EditableHeader = ({
  title,
  url,
  image,
  placeholder = '',
  initialEditing = false,
  withUrl = true,
  onTitleChange = () => {},
  onDataChange = () => {},
}: {
  title: string
  url: string
  image?: string
  placeholder: string
  initialEditing?: boolean
  withUrl?: boolean
  onTitleChange: (str: string) => void
  onDataChange: (d: { url: string; image?: string; title: string }) => void
}) => {
  const [titleState, setTitleState] = useState(title || '')
  const [urlState, setUrlState] = useState(url)
  const [imageState, setImageState] = useState(image)
  const [hasUrl, setHasUrl] = useState(false)
  const [editing, setEditing] = useState(initialEditing)
  const [addingUrl, setAddingUrl] = useState(false)

  const analyseUrl = async (u: string) => {
    // pass the link directly
    getLinkPreview(u).then((data) => {
      // @ts-ignore
      if (data?.title && titleState === '') {
        // @ts-ignore
        console.log('SETTING TITLE: ', data.title)
        // @ts-ignore
        setTitleState(data.title)
      }

      // @ts-ignore
      if (data?.images?.length > 0 && !imageState) {
        // @ts-ignore
        console.log('IMAGE', data.images[0])
        // @ts-ignore
        setImageState(data.images[0])
      }
    })
  }

  useEffect(() => {
    console.log(titleState, imageState, urlState)
    onDataChange({ title: titleState, url: urlState, image: imageState })
  }, [titleState, imageState, urlState])

  useEffect(() => {
    if (urlState && urlState !== '') analyseUrl(urlState)
  }, [urlState])

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
              alignItems: 'start',
            }}
          >
            <Pressable onPress={() => setEditing(true)}>
              <Heading
                tag="h2"
                style={{
                  textAlign: 'left',
                  color: c.surface,
                }}
              >
                {titleState || ''}
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
              },
            ]}
            autoFocus={true}
            value={titleState == placeholder ? '' : titleState}
            placeholder={placeholder}
            onChangeText={(e) => {
              console.log('set title state', e)
              setTitleState(e)
            }}
            multiline={true}
            onBlur={() => {
              setEditing(false)
              onTitleChange(titleState)
            }}
          ></TextInput>
        )}

        {addingUrl && (
          <TextInput
            style={{
              flexShrink: 1,
              width: '100%',
              backgroundColor: c.surface2,
              paddingVertical: s.$08,
              paddingHorizontal: s.$1,
              borderRadius: s.$075,
              color: c.black,
            }}
            value={urlState}
            autoFocus={true}
            autoCorrect={false}
            autoCapitalize="none"
            autoComplete="off"
            placeholder="Paste url"
            onChangeText={setUrlState}
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
                onTitleChange(titleState)
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
                  name={titleState === 'placeholder' || titleState === '' ? 'add' : 'pencil'}
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
              <Ionicons
                name="link-outline"
                size={28}
                color={urlState === '' ? c.olive2 : c.white}
              />
            </Pressable>
          )}

          {addingUrl && withUrl && (
            <>
              {hasUrl && urlState === '' ? (
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
