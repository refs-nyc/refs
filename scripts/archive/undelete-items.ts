import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

// Load environment variables
config()

// Supabase setup
const supabaseUrl = process.env.SUPA_URL!
const supabaseKey = process.env.SUPA_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function undeleteItems() {
  console.log('🔄 Temporarily un-deleting items for testing...')

  try {
    // Get items with good text content that are currently deleted
    const { data: items, error: itemsError } = await supabase
      .from('items')
      .select('id, text, ref, deleted')
      .not('text', 'is', null)
      .not('text', 'eq', '')
      .not('text', 'eq', '\n')
      .not('deleted', 'is', null)
      .limit(20)

    if (itemsError) {
      throw new Error(`Error fetching items: ${itemsError.message}`)
    }

    console.log(`📝 Found ${items?.length || 0} items with content to un-delete`)

    if (!items || items.length === 0) {
      console.log('✅ No items to un-delete')
      return
    }

    // Un-delete items by setting deleted to null
    for (const item of items) {
      try {
        console.log(`🔄 Un-deleting item ${item.id}: "${item.text?.substring(0, 50)}..."`)

        const { error: updateError } = await supabase
          .from('items')
          .update({
            deleted: null,
          })
          .eq('id', item.id)

        if (updateError) {
          console.error(`❌ Error un-deleting item ${item.id}:`, updateError)
        } else {
          console.log(`✅ Un-deleted item ${item.id}`)
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))

      } catch (error) {
        console.error(`❌ Error processing item ${item.id}:`, error)
      }
    }

    console.log('🎉 Items un-deleted successfully!')

  } catch (error) {
    console.error('❌ Fatal error:', error)
  }
}

// Run the script
undeleteItems() 