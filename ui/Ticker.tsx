import { ScrollView, Pressable, Text, StyleSheet } from 'react-native'
import React from 'react'

const suggestedRefs = [
  {
    id: 'my08nqseypicy8e',
    title: 'Memorizing Poems',
    image:
      'https://violet-fashionable-blackbird-836.mypinata.cloud/files/bafkreie5z4rvlr3qsnycliba66pf3eytg7cpwggjdiiozufntan3fxmmia?X-Algorithm=PINATA1&X-Date=1748310959851&X-Expires=500000&X-Method=GET&X-Signature=2c3a59e5e84c220cd498afff13848e173e203950df04453490d808083bfce5bc',
  },
  {
    id: '7i2m3fimd3e4xao',
    title: 'Paris',
    image:
      'https://violet-fashionable-blackbird-836.mypinata.cloud/files/bafybeia4lg3py57qopgryhohlihqqb3zwv2c5cixj3u2lyiulrcz2otjhq?X-Algorithm=PINATA1&X-Date=1741197105210&X-Expires=500000&X-Method=GET&X-Signature=e3cf3a4d80e38b997ea617322be2066df800b5c5d726e385dc3db963f2f5714a',
  },
  {
    id: '7n0632930q23zdj',
    title: 'This Sake',
    image:
      'https://violet-fashionable-blackbird-836.mypinata.cloud/files/bafybeic2jj457wrr6swmvn3n4czyizu2cwjvilzgddthit3tyliqrsvhma?X-Algorithm=PINATA1&X-Date=1741011345712&X-Expires=500000&X-Method=GET&X-Signature=f6cf43ecf31c464fe5949e2a20d62b5187ee3a3d3a24526f90753dafaa540e5d',
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
      style={{ paddingVertical: 12, paddingLeft: 8, height: 38, marginTop: 11, marginBottom: 11 }}
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