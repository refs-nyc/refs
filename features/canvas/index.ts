import { Canvas } from '@canvas-js/core/sync'
import RefsClassContract from './classContract'
import { SIWESigner } from '@canvas-js/signer-ethereum'

const canvasUrl = process.env.EXPO_PUBLIC_CANVAS_URL
if (!canvasUrl) {
  throw new Error('EXPO_PUBLIC_CANVAS_URL is not set')
}

const signer = new SIWESigner({ burner: true })
console.log('creating app')
export const canvasApp = new Canvas({
  topicOverride: 'alpha.refs.nyc.RefsClassContract:263ccd2ec45ca8082e90435c0b18445d',
  reset: true,
  signers: [signer],
  contract: RefsClassContract,
})

console.log('waiting 1000ms...')
setTimeout(async () => {
  console.log('connecting to canvas')
  await canvasApp.connect(canvasUrl)
}, 100)
