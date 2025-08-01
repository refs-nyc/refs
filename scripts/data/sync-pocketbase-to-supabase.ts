import PocketBase from 'pocketbase'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

// Load environment variables
config()

// PocketBase setup
const pocketbase = new PocketBase(process.env.EXPO_PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090')

// Supabase setup
const supabaseUrl = process.env.SUPA_URL!
const supabaseKey = process.env.SUPA_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function syncPocketBaseToSupabase() {
  console.log('🔄 Starting PocketBase to Supabase sync...')

  try {
    // 1. Sync Users
    console.log('📥 Syncing users...')
    const users = await pocketbase.collection('users').getFullList({
      sort: '-created',
    })

    for (const user of users) {
      const { error } = await supabase.from('users').upsert(
        {
          id: user.id,
          name: user.name,
          userName: user.userName,
          email: user.email,
          avatarURL: user.avatarURL,
          created: user.created,
          updated: user.updated,
        },
        { onConflict: 'id' }
      )

      if (error) {
        console.error(`❌ Error syncing user ${user.id}:`, error)
      } else {
        console.log(`✅ Synced user: ${user.userName}`)
      }
    }

    // 2. Sync Refs
    console.log('📥 Syncing refs...')
    const refs = await pocketbase.collection('refs').getFullList({
      sort: '-created',
      expand: 'creator',
    })

    for (const ref of refs) {
      const { error } = await supabase.from('refs').upsert(
        {
          id: ref.id,
          title: ref.title,
          image: ref.image,
          creator: ref.creator,
          type: ref.type,
          meta: ref.meta,
          url: ref.url,
          showInTicker: ref.showInTicker,
          created: ref.created,
          updated: ref.updated,
        },
        { onConflict: 'id' }
      )

      if (error) {
        console.error(`❌ Error syncing ref ${ref.id}:`, error)
      } else {
        console.log(`✅ Synced ref: ${ref.title}`)
      }
    }

    // 3. Sync Items
    console.log('📥 Syncing items...')
    const items = await pocketbase.collection('items').getFullList({
      sort: '-created',
      expand: 'ref,creator',
    })

    for (const item of items) {
      const { error } = await supabase.from('items').upsert(
        {
          id: item.id,
          ref: item.ref,
          image: item.image,
          text: item.text,
          url: item.url,
          backlog: item.backlog,
          order: item.order,
          creator: item.creator,
          list: item.list,
          parent: item.parent,
          promptContext: item.promptContext,
          created: item.created,
          updated: item.updated,
        },
        { onConflict: 'id' }
      )

      if (error) {
        console.error(`❌ Error syncing item ${item.id}:`, error)
      } else {
        console.log(`✅ Synced item: ${item.text?.substring(0, 30)}...`)
      }
    }

    console.log('🎉 Sync completed!')
    console.log(`📊 Summary:`)
    console.log(`   - Users: ${users.length}`)
    console.log(`   - Refs: ${refs.length}`)
    console.log(`   - Items: ${items.length}`)
  } catch (error) {
    console.error('❌ Sync failed:', error)
  }
}

// Run the sync
syncPocketBaseToSupabase()
