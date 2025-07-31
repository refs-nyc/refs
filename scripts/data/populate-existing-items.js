const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.SUPA_URL
const supabaseKey = process.env.SUPA_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function populateExistingItems() {
  console.log('🚀 Populating existing items with 7-strings and embeddings...')

  try {
    // Get all items that don't have 7-strings yet
    const { data: items, error: fetchError } = await supabase
      .from('items')
      .select('id, ref_id, text')
      .is('seven_string', null)
      .limit(10) // Process in batches

    if (fetchError) {
      console.error('❌ Error fetching items:', fetchError)
      return
    }

    console.log(`📝 Found ${items?.length || 0} items to process`)

    if (!items || items.length === 0) {
      console.log('✅ No items need processing')
      return
    }

    // Process each item
    for (const item of items) {
      console.log(`🔄 Processing item ${item.id}...`)

      try {
        // Call the process_new_item function
        const { error } = await supabase.rpc('process_new_item', {
          item_id: item.id,
          ref_id: item.ref_id,
          item_text: item.text || '',
          ref_title: item.ref_id, // For now, use ref_id as title
        })

        if (error) {
          console.error(`❌ Error processing item ${item.id}:`, error)
        } else {
          console.log(`✅ Successfully processed item ${item.id}`)
        }

        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 1000))
      } catch (error) {
        console.error(`❌ Error processing item ${item.id}:`, error)
      }
    }

    console.log('✅ Finished processing items')
  } catch (error) {
    console.error('❌ Error in populateExistingItems:', error)
  }
}

// Run the script
populateExistingItems()
