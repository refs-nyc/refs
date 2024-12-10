import { useState } from 'react'
import { TextInput, Pressable } from 'react-native'
import { XStack, H2 } from '@/ui'
import Ionicons from '@expo/vector-icons/Ionicons'

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
          <XStack gap="$3" jc="center" ai="center">
            <H2 ta="center" col={titleState == placeholder ? '$muted' : '$black'}>
              {titleState}
            </H2>
            <Ionicons name="pencil" />
          </XStack>
        </Pressable>
      ) : (
        <Pressable
          onPress={() => {
            setEditing(false)
            onComplete(titleState)
          }}
        >
          <XStack gap="$3" jc="center" ai="center">
            <TextInput
              style={{
                fontWeight: 'bold',
                fontSize: 12,
              }}
              autoFocus={true}
              value={titleState == placeholder ? '' : titleState}
              placeholder={placeholder}
              onChangeText={setTitleState}
            ></TextInput>
            <Ionicons name="checkbox" />
          </XStack>
        </Pressable>
      )}
    </>
  )
}
