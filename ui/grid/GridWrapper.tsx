import { Children } from 'react'
import { YStack, XStack } from '@/ui'
import { s } from '@/features/style'

export const GridWrapper = ({ children, columns = 3, rows = 4 }) => {
  const count = Children.count(children)
  const childrenArray = Children.toArray(children)

  // const add = push({ title: 'New' })

  const size = rows * columns
  const empty = Math.max(size - count, 0)

  console.log('Initialising a grid of size', size)
  console.log('With', count, ' elements')

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
