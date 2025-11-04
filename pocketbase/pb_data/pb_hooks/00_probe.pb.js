// Lightweight probe hook so we can confirm the VM loaded.
routerAdd('GET', '/hooks_ping', (c) =>
  c.json(200, {
    ok: true,
    message: 'hooks online',
    timestamp: new Date().toISOString(),
  })
)

onRecordAfterCreateSuccess((event) => {
  try {
    const collection = event?.collection?.name || 'unknown'
    const id = event?.record?.id || null
    console.log('[probe] afterCreate', collection, id)
  } catch (error) {
    console.log('[probe] error', String(error))
  }
})
