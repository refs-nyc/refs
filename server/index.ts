import type { CanvasEvents } from '@canvas-js/core'
import type { GossipLogEvents } from '@canvas-js/gossiplog'
import type { Action, Message, Session } from '@canvas-js/interfaces'
import { contract, init } from '../features/canvas/contract.ts'
import { TypedEventEmitter } from '@libp2p/interface'

const DATABASE_URL = process.env.DATABASE_URL

const PORT = parseInt(process.env.PORT || '3333', 10)
const HTTP_ADDR = '0.0.0.0'

const LIBP2P_PORT = parseInt(process.env.LIBP2P_PORT || '3334', 10)
const LIBP2P_ANNOUNCE_HOST = process.env.LIBP2P_ANNOUNCE_HOST || 'refs-libp2p.canvas.xyz'
const LIBP2P_ANNOUNCE_PORT = parseInt(process.env.LIBP2P_ANNOUNCE_PORT || '80', 10)

init().then((app) => {
  app.listen(PORT).then(() => {
    console.log('[canvas] started client-to-server sync api on port', PORT)
    console.log(`[canvas] see: http://${HTTP_ADDR}:${PORT}/api`)
  })

  app
    .startLibp2p({
      listen: [`/ip4/0.0.0.0/tcp/${LIBP2P_PORT}/ws`],
      announce: [`/dns4/${LIBP2P_ANNOUNCE_HOST}/tcp/${LIBP2P_ANNOUNCE_PORT}/wss`],
      bootstrapList: [],
    })
    .then((libp2p) => {
      console.log('[canvas] started server-to-server libp2p on port', LIBP2P_PORT)
      console.log(`[canvas] peer id: ${libp2p.peerId}`)
    })

  // Unclear why node --experimental-strip-types doesn't recognize TypedEventEmitter
  ;(app as typeof app & TypedEventEmitter<CanvasEvents & GossipLogEvents>).addEventListener(
    'message',
    (event) => {
      const message: Message<Action> | Message<Session> = event.detail.message
      if (message.payload.type !== 'action') {
        return
      }

      console.log('received action', message.payload)
    }
  )
})
