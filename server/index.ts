import { contract, init } from '../features/canvas/contract.ts'

const DATABASE_URL = process.env.DATABASE_URL

const PORT = parseInt(process.env.PORT || '3333', 10)
const HTTP_ADDR = '0.0.0.0'

const LIBP2P_PORT = parseInt(process.env.LIBP2P_PORT || '3334', 10)
const LIBP2P_ANNOUNCE_HOST = process.env.LIBP2P_ANNOUNCE_HOST || 'refs.canvas.xyz'
const LIBP2P_ANNOUNCE_PORT = parseInt(process.env.LIBP2P_ANNOUNCE_PORT || '80', 10)

init().then((app) => {
  app.listen(PORT, HTTP_ADDR).then(() => {
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
})
