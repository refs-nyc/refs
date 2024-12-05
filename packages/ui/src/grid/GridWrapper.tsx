import { Children } from 'react'
import { YStack, XStack, View } from 'tamagui'
import { Pressable } from 'react-native'
import { useItemStore } from 'app/features/canvas/models'

export const GridWrapper = ({ children, columns = 3, rows = 4 }) => {
  const count = Children.count(children)
  const childrenArray = Children.toArray(children)

  // const add = push({ title: 'New' })

  const size = rows * columns
  const empty = Math.max(size - count, 0)

  console.log('Initialising a grid of size', size)
  console.log('With', count, ' elements')

  return (
    <YStack style={{ flex: 1 }} gap="$2">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <XStack key={rowIndex} gap="$2">
          {childrenArray
            .slice(rowIndex * columns, (rowIndex + 1) * columns)
            .map((child, colIndex) => (
              <>{child}</>
            ))}
        </XStack>
      ))}
    </YStack>
  )
}
