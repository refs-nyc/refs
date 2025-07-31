import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.SUPA_URL!
const supabaseKey = process.env.SUPA_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function generateSevenStringsForAll() {
  try {
    console.log('🔄 Starting 7-string generation for all existing items...')
    
    // Get all items that don't have seven_string_embedding yet
    const { data: items, error: itemsError } = await supabase
      .from('items')
      .select(`
        id,
        ref,
        text,
        creator
      `)
      .is('seven_string_embedding', null)
      .limit(100) // Process in batches

    if (itemsError) {
      console.error('❌ Error fetching items:', itemsError)
      return
    }

    if (!items || items.length === 0) {
      console.log('✅ No items found that need 7-string generation')
      return
    }

    console.log(`📋 Found ${items.length} items to process`)

    let successCount = 0
    let errorCount = 0

    for (const item of items) {
      try {
        console.log(`🔄 Processing item ${item.id}...`)
        
        // Get the ref title
        const { data: refData, error: refError } = await supabase
          .from('refs')
          .select('title')
          .eq('id', item.ref)
          .single()

        let refTitle = 'Unknown'
        if (refError) {
          console.log(`⚠️ Missing ref title for item ${item.id}, using fallback`)
          // Use the item text as fallback if available, otherwise use 'Unknown'
          refTitle = item.text || 'Unknown'
        } else {
          refTitle = refData?.title || 'Unknown'
        }

        // Call the Edge Function to process this item
        const { data: processData, error: processError } = await supabase.functions.invoke('openai', {
          body: {
            action: 'process_item',
            item_id: item.id,
            ref_id: item.ref,
            creator: item.creator,
            item_text: item.text || '',
            ref_title: refTitle
          }
        })

        if (processError) {
          console.error(`❌ Error processing item ${item.id}:`, processError)
          errorCount++
        } else {
          console.log(`✅ Successfully processed item ${item.id}:`, processData)
          successCount++
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))

      } catch (error) {
        console.error(`❌ Error processing item ${item.id}:`, error)
        errorCount++
      }
    }

    console.log(`\n📊 Processing complete:`)
    console.log(`✅ Successfully processed: ${successCount} items`)
    console.log(`❌ Errors: ${errorCount} items`)

    // Check if there are more items to process
    const { data: remainingItems, error: remainingError } = await supabase
      .from('items')
      .select('id')
      .is('seven_string_embedding', null)
      .limit(1)

    if (remainingError) {
      console.error('❌ Error checking remaining items:', remainingError)
    } else if (remainingItems && remainingItems.length > 0) {
      console.log(`🔄 There are more items to process. Run this script again to continue.`)
    } else {
      console.log(`🎉 All items have been processed!`)
    }

  } catch (error) {
    console.error('❌ Fatal error:', error)
  }
}

// Run the script
generateSevenStringsForAll() 