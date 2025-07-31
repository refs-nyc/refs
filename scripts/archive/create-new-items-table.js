const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.SUPA_URL
const supabaseKey = process.env.SUPA_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function createNewItemsTable() {
  console.log('🚀 Creating new items table with 7-string columns...')

  try {
    // First, let's get all existing items
    console.log('1️⃣ Fetching existing items...')
    const { data: existingItems, error: fetchError } = await supabase.from('items').select('*')

    if (fetchError) {
      console.error('❌ Error fetching existing items:', fetchError)
      return
    }

    console.log(`📊 Found ${existingItems.length} existing items`)

    // Create new items table with seven_string columns
    console.log('2️⃣ Creating new items table...')

    // We'll need to do this manually in Supabase dashboard
    console.log('⚠️ Manual step required:')
    console.log('1. Go to Supabase Dashboard > SQL Editor')
    console.log('2. Run this SQL:')
    console.log(`
      -- Create new items table with seven_string columns
      CREATE TABLE items_new (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        creator TEXT NOT NULL,
        ref_id TEXT NOT NULL,
        text TEXT,
        seven_string TEXT,
        seven_string_embedding vector(1536),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Copy existing data
      INSERT INTO items_new (id, creator, ref_id, text, created_at, updated_at)
      SELECT id, creator, ref_id, text, created_at, updated_at FROM items;

      -- Drop old table and rename new one
      DROP TABLE items;
      ALTER TABLE items_new RENAME TO items;

      -- Create indexes
      CREATE INDEX items_seven_string_embedding_idx ON items USING ivfflat (seven_string_embedding vector_cosine_ops);
    `)

    console.log('3️⃣ After running the SQL above, we can test with a sample item')
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

createNewItemsTable()
