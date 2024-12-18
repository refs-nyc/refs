import React, { useState, useRef } from 'react'
import { ScrollView, TouchableOpacity, View, Text, FlatList } from 'react-native'
import { GridTile } from '../grid/GridTile'
import { s } from '@/features/style'

import { DraggableGrid as DraggableGridComponent } from 'react-native-draggable-grid'

export const FlatListGrid = ({ items }) => {
  console.log(items.length)

  return (
    <FlatList
      style={{ width: '100%' }}
      contentContainerStyle={{ gap: s.$075 }}
      columnWrapperStyle={{ gap: s.$075 }}
      numColumns={3}
      scrollEnabled={false}
      horizontal={false}
      data={items}
      renderItem={({ item, index }) => (
        <GridTile borderColor="black" key={item.id}>
          <Text>{index}</Text>
        </GridTile>
      )}
    />
  )
}

export const DraggableGridScrollView = ({ children, style }) => {
  console.log(style)
  const scrollViewRef = useRef(null)

  const onDragStart = () => {
    console.log('on drag start')
    if (scrollViewRef.current) {
      console.log('disable scrolling')
      scrollViewRef.current.setNativeProps({ scrollEnabled: false })
    }
  }

  const onDragEnd = () => {
    console.log('on drag end')
    if (scrollViewRef.current) {
      console.log('enable scrolling')
      scrollViewRef.current.setNativeProps({ scrollEnabled: true })
    }
  }

  return (
    <ScrollView ref={scrollViewRef} style={style}>
      {React.Children.map(children, (child) => {
        console.log(child?.type, child?.displayName, child?.type.name)
        console.log(child?.type === DraggableGrid)
        if (React.isValidElement(child) && child?.type.name === 'DraggableGrid') {
          console.log('Attaching those things')
          return React.cloneElement(child, {
            onDragStart,
            onDragEnd,
          })
        }
        return child
      })}
    </ScrollView>
  )
}

export const DraggableGrid = ({
  items,
  onDragEnd,
  onDragStart,
}: {
  items: any[]
  onDragEnd: () => void
  onDragStart: () => void
}) => {
  const [data, setData] = useState(items.map((item) => ({ ...item, key: item.id })))

  const renderItem = (item) => {
    return (
      <View
        key={item.key}
        style={[
          {
            flex: 1,
            borderRadius: 8,
            backgroundColor: 'blue',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: s.$075,
          },
        ]}
      >
        <GridTile borderColor="black">
          <Text>{item.id}</Text>
        </GridTile>
      </View>
    )
  }

  return (
    <View
      style={{
        flex: 1,
        width: '100%',
        height: '100%',
      }}
    >
      <DraggableGridComponent
        onDragRelease={(newData) => {
          setData(newData)
          onDragEnd() //This activates the above onDragEnd function when you stop dragging and just turns scrolling back on
        }}
        onDragStart={(e) => {
          console.log('')
          console.log('start')
          console.log(e)
          onDragStart()
        }} //This activates the above onDragStart function when you start dragging and turns scrolling off
        numColumns={3}
        renderItem={renderItem}
        data={data}
      />
    </View>
  )
}
