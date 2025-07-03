import { Canvas } from '@canvas-js/core/sync'
import RefsClassContract from './classContract'

export const canvasApp = new Canvas({
  topic: 'alpha.refs.nyc',
  contract: RefsClassContract,
})
