import { useState } from 'react'
import { TextInput, Pressable } from 'react-native'
import { XStack, Heading } from '@/ui'
import Ionicons from '@expo/vector-icons/Ionicons'
import { s, c, t } from '@/features/style'

export const EditableTitle = ({
  title,
  placeholder = '',
  onComplete,
}: {
  title: string
  placeholder: string
  onComplete: (str: string) => string
}) => {
  const [titleState, setTitleState] = useState(title)
  const [editing, setEditing] = useState(false)

  return (
    <>
      {!editing ? (
        <Pressable onPress={() => setEditing(true)}>
          <XStack gap={s.$3} style={{ justifyContent: 'center', alignItems: 'center' }}>
            <Heading
              tag="h1"
              style={{ textAlign: 'center', color: titleState == placeholder ? c.muted : c.black }}
            >
              {titleState}
            </Heading>
            <Ionicons size={20} name="pencil" />
          </XStack>
        </Pressable>
      ) : (
        <Pressable
          onPress={() => {
            setEditing(false)
            onComplete(titleState)
          }}
        >
          <XStack gap={s.$3} style={{ justifyContent: 'center', alignItems: 'center' }}>
            <TextInput
              style={t.h1}
              autoFocus={true}
              value={titleState == placeholder ? '' : titleState}
              placeholder={placeholder}
              onChangeText={setTitleState}
            ></TextInput>
            <Ionicons size={20} name="checkbox" />
          </XStack>
        </Pressable>
      )}
    </>
  )
}
