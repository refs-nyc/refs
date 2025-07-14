import { Canvas } from '@canvas-js/core/sync'
import RefsClassContract from './classContract'
import { SIWESigner } from '@canvas-js/signer-ethereum'

const canvasUrl = process.env.EXPO_PUBLIC_CANVAS_URL
if (!canvasUrl) {
  throw new Error('EXPO_PUBLIC_CANVAS_URL is not set')
}

const signer = new SIWESigner({ burner: true })
export const canvasApp = new Canvas({
  topicOverride: 'alpha.refs.nyc.RefsClassContract:cf44acebbfaf69a67c5633d90cd45318',
  reset: true,
  signers: [signer],
  contract: RefsClassContract,
})

setTimeout(async () => {
  await canvasApp.connect(canvasUrl)
}, 100)
