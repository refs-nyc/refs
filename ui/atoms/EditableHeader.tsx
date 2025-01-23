import { useState, useEffect } from 'react'
import { TextInput, Pressable } from 'react-native'
import { XStack, Heading } from '@/ui'
import Ionicons from '@expo/vector-icons/Ionicons'
import { s, c, t } from '@/features/style'
import * as Clipboard from 'expo-clipboard'

export const EditableHeader = ({
  title,
  url,
  placeholder = '',
  onComplete,
}: {
  title: string
  url: string
  placeholder: string
  onComplete: (str: string) => void
}) => {
  const [titleState, setTitleState] = useState(title)
  const [urlState, setUrlState] = useState(url)
  const [hasUrl, setHasUrl] = useState(false)
  const [editing, setEditing] = useState(false)
  const [addingUrl, setAddingUrl] = useState(false)

  useEffect(() => {
    const detectUrl = async () => {
      setHasUrl(await Clipboard.hasUrlAsync())
    }

    detectUrl()
  }, [addingUrl])

  return (
    <>
      <XStack
        gap={s.$05}
        style={{
          width: '100%',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'start',
          minHeight: 44,
        }}
      >
        {!editing && !addingUrl && (
          <XStack gap={s.$08} style={{ flexShrink: 1, flexDirection: 'row', alignItems: 'center' }}>
            <Pressable onPress={() => setEditing(true)}>
              <Heading
                tag="h1"
                style={{
                  textAlign: 'left',
                  color: titleState == placeholder ? c.muted : c.black,
                }}
              >
                {titleState}
              </Heading>
            </Pressable>
            <Pressable onPress={() => setEditing(true)}>
              <Ionicons size={28} name="pencil" color={c.muted} />
            </Pressable>
          </XStack>
        )}
        {!addingUrl && editing && (
          <TextInput
            style={[
              t.h1,
              { flexShrink: 1, padding: 0, margin: 0, transform: 'translate(0, -1px)' },
            ]}
            autoFocus={true}
            value={titleState == placeholder ? '' : titleState}
            placeholder={placeholder}
            onChangeText={setTitleState}
            multiline={true}
            onBlur={() => {
              setEditing(false)
              onComplete(titleState)
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
            placeholder="Paste url"
            onChangeText={setUrlState}
          />
        )}

        <XStack style={{ alignItems: 'center', paddingTop: s.$05 }} gap={s.$09}>
          {editing && (
            <Pressable
              onPress={() => {
                setEditing(false)
                onComplete(titleState)
              }}
            >
              <Ionicons size={28} name="checkbox" color={c.muted} />
            </Pressable>
          )}
          <Pressable onPress={() => setAddingUrl(true)}>
            {!addingUrl && (
              <Ionicons
                name="link-outline"
                size={28}
                color={urlState === '' ? c.muted : c.accent}
              />
            )}
            {addingUrl && (
              <>
                {hasUrl && urlState === '' ? (
                  <Pressable onPress={async () => setUrlState(await Clipboard.getStringAsync())}>
                    <Ionicons name="clipboard" size={28} color={c.muted} />
                  </Pressable>
                ) : (
                  <Pressable onPress={() => setAddingUrl(false)}>
                    <Ionicons name="checkbox" size={28} color={c.muted} />
                  </Pressable>
                )}
              </>
            )}
          </Pressable>
        </XStack>
      </XStack>
    </>
  )
}
