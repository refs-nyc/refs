import React, { Children } from 'react'
import { YStack, XStack } from '@/ui/core/Stacks'
import { Dimensions } from 'react-native'
import { s } from '@/features/style'

const win = Dimensions.get('window')

export const GridWrapper = ({
  children,
  columns = 3,
  rows = 4,
  cellGap = s.$075,
}: {
  children: React.ReactNode
  columns?: number
  rows?: number
  cellGap?: number
}) => {
  const childrenArray = Children.toArray(children)

  return (
    <YStack gap={cellGap} style={{ width: '100%', minHeight: win.width / 3 }}>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <XStack key={rowIndex} gap={cellGap}>
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
