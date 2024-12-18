import fs from "node:fs"
import assert from "node:assert"
import process from "node:process"
import http from "node:http"

import { WebSocketServer } from "ws"
import { NetworkServer } from "@canvas-js/gossiplog/server"

import path, { dirname } from "path"
import { fileURLToPath } from "url"
import { packageDirectorySync } from "pkg-dir" 
import express from "express"

import stoppable from "stoppable"
import { createAPI } from "@canvas-js/core/api"

import type { CanvasEvents } from '@canvas-js/core'
import type { GossipLogEvents } from '@canvas-js/gossiplog'
import type { Action, Message, Session, Snapshot } from '@canvas-js/interfaces'
import { init } from '../features/canvas/contract.ts'
import { TypedEventEmitter } from '@libp2p/interface'

const PORT = parseInt(process.env.PORT || '3333', 10)
const HTTP_ADDR = '0.0.0.0'

const LIBP2P_PORT = parseInt(process.env.LIBP2P_PORT || '3334', 10)
const LIBP2P_ANNOUNCE_HOST = process.env.LIBP2P_ANNOUNCE_HOST || 'refs-libp2p.canvas.xyz'
const LIBP2P_ANNOUNCE_PORT = parseInt(process.env.LIBP2P_ANNOUNCE_PORT || '80', 10)

init().then((app) => {
  // libp2p
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

  // network explorer
  const api = express()
  api.use("/api", createAPI(app))
  const currentDirectory = dirname(fileURLToPath(import.meta.url)) // packages/cli/src/commands
  const packageDirectory = packageDirectorySync({ cwd: currentDirectory })
  assert(
    packageDirectory !== undefined,
    'Invalid directory for network explorer static files (build not found)'
  )
  const root = packageDirectorySync({ cwd: path.resolve(packageDirectory || '.', '..') })
  if (root !== undefined) {
    // development package
    const build = path.resolve(root, 'node_modules/@canvas-js/network-explorer/dist')
    assert(
      fs.existsSync(build),
      'Invalid directory for network explorer static files (build not found)'
    )
    api.use(express.static(build))
  } else {
    // installed package
    const networkExplorer = path.resolve(
      packageDirectory,
      'node_modules/@canvas-js/network-explorer'
    )
    assert(fs.existsSync(networkExplorer), 'Could not find network explorer package')
    const build = path.resolve(networkExplorer, 'dist')
    assert(
      fs.existsSync(build),
      'Invalid directory for network explorer static files (build not found)'
    )
    api.use(express.static(build))
  }

  const server = http.createServer(api)
  const network = new NetworkServer(app.messageLog)
  const wss = new WebSocketServer({ server, perMessageDeflate: false })
  wss.on("connection", network.handleConnection)

  const controller = new AbortController()
  controller.signal.addEventListener("abort", () => {
    console.log("[canvas] Stopping HTTP API server...")
    network.close()
    wss.close(() => server.stop(() => console.log("[canvas] HTTP API server stopped.")))
  })

  server.listen(PORT)

  console.log('[canvas] started client-to-server sync api on port', PORT)
  console.log(`[canvas] see: http://${HTTP_ADDR}:${PORT}/api`)

  // Unclear why node --experimental-strip-types doesn't recognize TypedEventEmitter
  ;(app as typeof app & TypedEventEmitter<CanvasEvents & GossipLogEvents>).addEventListener(
    'message',
    (event) => {
      const message: Message<Action | Session | Snapshot> = event.detail.message
      if (message.payload.type !== 'action') {
        return
      }

      console.log('received action', message.payload)
    }
  )
})
