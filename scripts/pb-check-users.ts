import fs from 'fs'
import PocketBase from 'pocketbase'

async function main() {
  // Ensure .env is loaded when running outside Expo
  if (!process.env.EXPO_PUBLIC_POCKETBASE_URL) {
    try {
      const raw = fs.readFileSync('.env', 'utf8')
      for (const line of raw.split('\n')) {
        const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
        if (m) {
          const key = m[1]
          let val = m[2]
          if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1)
          process.env[key] = val
        }
      }
    } catch {}
  }
  const url = process.env.EXPO_PUBLIC_POCKETBASE_URL
  if (!url) {
    console.error('Missing EXPO_PUBLIC_POCKETBASE_URL')
    process.exit(1)
  }
  const pb = new PocketBase(url)
  pb.autoCancellation(false)

  const values = ['Gigi', 'gigi', 'Noemie', 'Noëmie']
  for (const val of values) {
    const res = await pb.collection('users').getList(1, 10, {
      filter: `firstName = \"${val}\"`,
      fields: 'id,firstName,lastName,userName,created,image,avatar_url'
    })
    console.log(val + ':', res.items.map((u: any) => ({ id: u.id, firstName: u.firstName, userName: u.userName })))
  }

  // Fallback: pull a page and locally search
  const page = await pb.collection('users').getList(1, 200, {
    fields: 'id,firstName,lastName,userName,created,image,avatar_url'
  })
  const list = page.items.map((u: any) => ({ id: u.id, firstName: u.firstName, userName: u.userName }))
  const matches = list.filter((u: any) => {
    const hay = `${u.firstName || ''} ${u.userName || ''}`.toLowerCase()
    return hay.includes('gigi') || hay.includes('noemie') || hay.includes('noëmie')
  })
  console.log('Local matches:', matches)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

