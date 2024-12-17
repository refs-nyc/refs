import { Children } from 'react'
import { FlatList } from 'react-native'
import { YStack, XStack } from '@/ui'
import { s } from '@/features/style'

const renderItem = ({ children }) => {
  ;<>{children}</>
}

export const GridWrapper = ({ children, columns = 3, rows = 4 }) => {
  const count = Children.count(children)
  const childrenArray = Children.toArray(children)

  // const add = push({ title: 'New' })

  const size = rows * columns
  const empty = Math.max(size - count, 0)

  return (
    <YStack gap={s.$075}>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <XStack key={rowIndex} gap={s.$075}>
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
