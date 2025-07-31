import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

// Load environment variables
config()

// Supabase setup
const supabaseUrl = process.env.SUPA_URL!
const supabaseKey = process.env.SUPA_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function testVectorStorage() {
  console.log('🧪 Testing vector storage...')

  try {
    // Create a test vector
    const testVector = new Array(1536).fill(0.1)
    
    console.log(`📊 Test vector length: ${testVector.length}`)
    console.log(`📊 Test vector sample: [${testVector.slice(0, 3).join(', ')}]`)

    // Try to update a test item with the vector
    const { error: updateError } = await supabase
      .from('items')
      .update({
        seven_string_embedding: testVector,
      })
      .eq('id', 'test_item_1')

    if (updateError) {
      console.error('❌ Error updating with vector:', updateError)
    } else {
      console.log('✅ Successfully updated with vector')
      
      // Check what was actually stored
      const { data: item, error: fetchError } = await supabase
        .from('items')
        .select('id, seven_string_embedding')
        .eq('id', 'test_item_1')
        .single()

      if (fetchError) {
        console.error('❌ Error fetching item:', fetchError)
      } else {
        console.log('📊 Stored embedding type:', typeof item.seven_string_embedding)
        console.log('📊 Stored embedding length:', Array.isArray(item.seven_string_embedding) ? item.seven_string_embedding.length : 'not an array')
        console.log('📊 Stored embedding sample:', Array.isArray(item.seven_string_embedding) ? item.seven_string_embedding.slice(0, 3) : item.seven_string_embedding?.substring(0, 50))
      }
    }

  } catch (error) {
    console.error('❌ Fatal error:', error)
  }
}

// Run the test
testVectorStorage() 