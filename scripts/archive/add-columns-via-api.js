const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.SUPA_URL
const supabaseKey = process.env.SUPA_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function addColumns() {
  console.log('🚀 Adding 7-string and embedding columns to Supabase...')

  try {
    // Add columns to items table
    console.log('1️⃣ Adding columns to items table...')
    const { error: itemsError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE items
        ADD COLUMN IF NOT EXISTS seven_string TEXT,
        ADD COLUMN IF NOT EXISTS seven_string_embedding vector(1536);
      `,
    })

    if (itemsError) {
      console.log('⚠️ Items table columns may already exist or exec_sql not available')
    } else {
      console.log('✅ Items table columns added')
    }

    // Add columns to users table
    console.log('2️⃣ Adding columns to users table...')
    const { error: usersError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS spirit_vector TEXT,
        ADD COLUMN IF NOT EXISTS spirit_vector_embedding vector(1536);
      `,
    })

    if (usersError) {
      console.log('⚠️ Users table columns may already exist or exec_sql not available')
    } else {
      console.log('✅ Users table columns added')
    }

    // Create indexes
    console.log('3️⃣ Creating vector indexes...')
    const { error: indexError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE INDEX IF NOT EXISTS items_seven_string_embedding_idx ON items USING ivfflat (seven_string_embedding vector_cosine_ops);
        CREATE INDEX IF NOT EXISTS users_spirit_vector_embedding_idx ON users USING ivfflat (spirit_vector_embedding vector_cosine_ops);
      `,
    })

    if (indexError) {
      console.log('⚠️ Indexes may already exist or exec_sql not available')
    } else {
      console.log('✅ Vector indexes created')
    }

    // Enable extensions
    console.log('4️⃣ Enabling extensions...')
    const { error: extError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE EXTENSION IF NOT EXISTS vector;
        CREATE EXTENSION IF NOT EXISTS http;
      `,
    })

    if (extError) {
      console.log('⚠️ Extensions may already exist or exec_sql not available')
    } else {
      console.log('✅ Extensions enabled')
    }

    console.log('✅ Column addition completed!')
    console.log('📋 Next: Test with a sample item to generate 7-string and embedding')
  } catch (error) {
    console.error('❌ Error adding columns:', error)
  }
}

addColumns()
