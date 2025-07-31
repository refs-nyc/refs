const { createClient } = require('@supabase/supabase-js')
const PocketBase = require('pocketbase').default
require('dotenv').config()

const supabaseUrl = process.env.SUPA_URL
const supabaseKey = process.env.SUPA_KEY
const pocketbaseUrl = process.env.EXPO_PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090'

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)
const pb = new PocketBase(pocketbaseUrl)

async function populateSupabaseSimple() {
  console.log('🚀 Populating Supabase from PocketBase (simple version)...')

  try {
    // First, populate users
    console.log('1️⃣ Populating users...')
    const users = await pb.collection('users').getList(1, 1000, {
      expand: 'items',
    })

    console.log(`📝 Found ${users.items.length} users`)

    for (const user of users.items) {
      try {
        const { error } = await supabase.from('users').upsert({
          id: user.id,
          name: user.name || user.userName,
          avatar_url: user.avatar_url || user.image,
          created_at: user.created,
          updated_at: user.updated,
        })

        if (error) {
          console.error(`❌ Error upserting user ${user.id}:`, error)
        } else {
          console.log(`✅ User ${user.id} synced to Supabase`)
        }
      } catch (error) {
        console.error(`❌ Error processing user ${user.id}:`, error)
      }
    }

    // Then, populate items (without 7-string generation for now)
    console.log('2️⃣ Populating items...')
    const items = await pb.collection('items').getList(1, 1000, {
      expand: 'ref,creator',
    })

    console.log(`📝 Found ${items.items.length} items`)

    for (const item of items.items) {
      try {
        // Direct upsert without 7-string generation
        const { error: upsertError } = await supabase.from('items').upsert({
          id: item.id,
          ref_id: item.ref,
          creator: item.creator,
          text: item.text || '',
          created_at: item.created,
          updated_at: item.updated,
        })

        if (upsertError) {
          console.error(`❌ Error upserting item ${item.id}:`, upsertError)
        } else {
          console.log(`✅ Item ${item.id} synced to Supabase`)
        }

        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 50))
      } catch (error) {
        console.error(`❌ Error processing item ${item.id}:`, error)
      }
    }

    console.log('✅ Finished populating Supabase from PocketBase')
  } catch (error) {
    console.error('❌ Error in populateSupabaseSimple:', error)
  }
}

// Run the script
populateSupabaseSimple()
