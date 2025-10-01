import React, { Children } from 'react'
import { YStack, XStack } from '@/ui/core/Stacks'
import { s } from '@/features/style'

export const GridWrapper = ({
  children,
  columns = 3,
  rows = 4,
  cellGap = s.$075,
  autoRows = false,
  rowJustify = 'flex-start',
  rowGap,
  colGap,
}: {
  children: React.ReactNode
  columns?: number
  rows?: number
  cellGap?: number
  autoRows?: boolean
  rowJustify?: 'flex-start' | 'center' | 'space-between' | 'space-around' | 'space-evenly'
  rowGap?: number
  colGap?: number
}) => {
  const childrenArray = Children.toArray(children)
  const computedRows = autoRows
    ? Math.ceil(childrenArray.length / columns)
    : rows
  const gapRow = rowGap ?? cellGap
  const gapCol = colGap ?? cellGap

  return (
    <YStack gap={gapRow} style={{ width: '100%' }}>
      {Array.from({ length: computedRows }).map((_, rowIndex) => (
        <XStack key={rowIndex} gap={gapCol} style={{ justifyContent: rowJustify }}>
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
