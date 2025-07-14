import React, { useState, useRef } from 'react'
import { ScrollView, TouchableOpacity, View, Text, FlatList, ScrollViewProps } from 'react-native'
import { GridTile } from '../grid/GridTile'
import { s } from '@/features/style'
import { CompleteRef } from '@/features/pocketbase/types'

// @ts-ignore
import { DraggableGrid as DraggableGridComponent } from 'react-native-draggable-grid'

export const FlatListGrid = ({ items }: { items: CompleteRef[] }) => {
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

export const DraggableGridScrollView = ({
  children,
  style,
}: {
  children: React.ReactNode
  style?: any
}) => {
  const scrollViewRef = useRef<ScrollView>(null)

  const onDragStart = () => {
    if (scrollViewRef.current) {
      scrollViewRef.current.setNativeProps({ scrollEnabled: false })
    }
  }

  const onDragEnd = () => {
    if (scrollViewRef.current) {
      scrollViewRef.current.setNativeProps({ scrollEnabled: true })
    }
  }

  return (
    <ScrollView ref={scrollViewRef} style={style}>
      {React.Children.map(children, (child: any) => {
        if (
          React.isValidElement<{
            onDragStart: () => void
            onDragEnd: () => void
          }>(child) &&
          typeof child.type !== 'string' &&
          child?.type.name === 'DraggableGrid'
        ) {
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
  items: { id: string; key: string }[]
  onDragEnd: () => void
  onDragStart: () => void
}) => {
  const [data, setData] = useState(items.map((item) => ({ ...item, key: item.id })))

  const renderItem = (item: { id: string; key: string }) => {
    return (
      <View
        key={item.key}
        style={[
          {
            flex: 1,
            borderRadius: 8,
            // backgroundColor: 'blue',
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
        onDragRelease={(newData: { id: string; key: string }[]) => {
          setData(newData)
          onDragEnd() //This activates the above onDragEnd function when you stop dragging and just turns scrolling back on
        }}
        onDragStart={(e: { eventName: string }) => {
          onDragStart()
        }} //This activates the above onDragStart function when you start dragging and turns scrolling off
        numColumns={3}
        renderItem={renderItem}
        data={data}
      />
    </View>
  )
}
