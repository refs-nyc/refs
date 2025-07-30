const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.SUPA_URL
const supabaseKey = process.env.SUPA_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function simplePopulate() {
  console.log('🚀 Populating items with 7-strings only...')

  try {
    // Get all items that don't have 7-strings yet
    const { data: items, error: fetchError } = await supabase
      .from('items')
      .select('id, ref_id, text')
      .is('seven_string', null)
      .limit(5) // Process fewer items for testing

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
        // For now, just create a simple 7-string without calling the function
        const simpleSevenString = `${item.ref_id} | ${item.text || 'no caption'} | simple | basic | test | demo | placeholder`
        
        // Update the item with just the 7-string
        const { error } = await supabase
          .from('items')
          .update({ 
            seven_string: simpleSevenString,
            updated_at: new Date().toISOString()
          })
          .eq('id', item.id)

        if (error) {
          console.error(`❌ Error updating item ${item.id}:`, error)
        } else {
          console.log(`✅ Successfully updated item ${item.id} with 7-string`)
        }

        // Small delay
        await new Promise(resolve => setTimeout(resolve, 500))

      } catch (error) {
        console.error(`❌ Error processing item ${item.id}:`, error)
      }
    }

    console.log('✅ Finished processing items')

  } catch (error) {
    console.error('❌ Error in simplePopulate:', error)
  }
}

// Run the script
simplePopulate() 