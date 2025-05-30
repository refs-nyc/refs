import { ScrollView, Pressable, Text, StyleSheet } from 'react-native'
import React from 'react'

const suggestedRefs = [
  {
    id: 'my08nqseypicy8e',
    title: 'Memorizing Poems',
  },
  {
    id: '7i2m3fimd3e4xao',
    title: 'Paris',
  },
  {
    id: '7n0632930q23zdj',
    title: 'This Sake',
  },
]

export default function Ticker({ selectedRefs, setSelectedRefs }: { selectedRefs: any[]; setSelectedRefs: (refs: any[]) => void }) {
  // Helper: check if a ref is already selected
  const isRefSelected = (id: string) => selectedRefs.some((r) => r.id === id)

  // Handle pill press
  const onPillPress = (refObj: typeof suggestedRefs[0]) => {
    if (isRefSelected(refObj.id)) {
      setSelectedRefs(selectedRefs.filter((r) => r.id !== refObj.id))
    } else {
      setSelectedRefs([refObj, ...selectedRefs.filter((r) => r.id !== refObj.id)])
    }
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ paddingVertical: 12, paddingLeft: 8, height: 38 }}
      contentContainerStyle={{ alignItems: 'center' }}
    >
      {suggestedRefs.map((ref) => {
        const isSelected = isRefSelected(ref.id)
        return (
          <Pressable
            key={ref.id}
            onPress={() => onPillPress(ref)}
            style={({ pressed }) => [
              pillStyles.pill,
              isSelected ? pillStyles.selected : pillStyles.unselected,
              pressed && pillStyles.pressed,
            ]}
          >
            <Text
              style={[
                pillStyles.text,
                isSelected ? pillStyles.selectedText : pillStyles.unselectedText,
              ]}
            >
              {ref.title}
            </Text>
          </Pressable>
        )
      })}
    </ScrollView>
  )
}

const pillStyles = StyleSheet.create({
  pill: {
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.54)', // Black at 54% opacity for selected
    paddingVertical: 10,
    paddingHorizontal: 18,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 38,
    minWidth: 38,
  },
  unselected: {
    backgroundColor: '#F3F2ED', // Surface
    borderColor: '#A5B89F', // Olive border
  },
  selected: {
    backgroundColor: '#F3F2ED', // Surface
    borderColor: 'rgba(0,0,0,0.54)', // Black at 54% opacity
  },
  pressed: {
    opacity: 0.7,
  },
  text: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    lineHeight: 18,
    textAlign: 'center',
  },
  unselectedText: {
    color: '#A5B89F', // Olive
  },
  selectedText: {
    color: 'rgba(0,0,0,0.54)', // Black at 54% opacity
  },
}) 