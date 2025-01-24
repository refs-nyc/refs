import React, { Children } from 'react'
import { YStack, XStack } from '@/ui'
import { Dimensions } from 'react-native'
import { s } from '@/features/style'

const win = Dimensions.get('window')

export const GridWrapper = ({
  children,
  columns = 3,
  rows = 4,
}: {
  children: React.ReactNode
  columns?: number
  rows?: number
}) => {
  const count = Children.count(children)
  const childrenArray = Children.toArray(children)

  // const add = push({ title: 'New' })

  const size = rows * columns
  const empty = Math.max(size - count, 0)

  return (
    <YStack gap={s.$075} style={{ width: '100%', minHeight: win.width / 3 }}>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <XStack key={rowIndex} gap={s.$075}>
          {childrenArray
            .slice(rowIndex * columns, (rowIndex + 1) * columns)
            .map((child, colIndex) => (
              <React.Fragment key={colIndex}>{child}</React.Fragment>
            ))}
        </XStack>
      ))}
    </YStack>
  )
}
