import { View } from 'react-native'
import { GridWrapper } from './GridWrapper'
import { GridTile } from './GridTile'
import { GridTileWrapper } from './GridTileWrapper'
import { c } from '@/features/style'

export const PlaceholderGrid = ({
  columns = 3,
  rows = 4,
}: {
  columns?: number
  rows?: number
}) => {
  const gridSize = columns * rows

  return (
    <GridWrapper columns={columns} rows={rows}>
      {Array.from({ length: gridSize }).map((_, i) => (
        <GridTileWrapper canEdit={false} key={`placeholder-${i}`} type="">
          <GridTile />
        </GridTileWrapper>
      ))}
    </GridWrapper>
  )
} 