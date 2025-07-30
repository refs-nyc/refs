const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config()

const supabaseUrl = process.env.SUPA_URL
const supabaseKey = process.env.SUPA_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  console.log('Please ensure SUPA_URL and SUPA_KEY are set in your .env file')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function setupSupabaseComplete() {
  console.log('🚀 Setting up Supabase database completely...')

  try {
    // Step 1: Read SQL files
    console.log('1️⃣ Reading SQL files...')
    
    const schemaSQL = fs.readFileSync(path.join(__dirname, 'supabase-schema.sql'), 'utf8')
    const functionsSQL = fs.readFileSync(path.join(__dirname, 'supabase-functions.sql'), 'utf8')
    
    console.log('✅ SQL files read successfully')

    // Step 2: Apply schema
    console.log('2️⃣ Applying database schema...')
    
    // Split schema into individual statements
    const schemaStatements = schemaSQL.split(';').filter(stmt => stmt.trim())
    
    for (const statement of schemaStatements) {
      if (statement.trim()) {
        try {
          const { error } = await supabase.rpc('exec_sql', {
            sql: statement.trim() + ';'
          })
          
          if (error) {
            console.log(`⚠️ Schema statement warning (may already exist):`, error.message)
          } else {
            console.log('✅ Schema statement executed')
          }
        } catch (error) {
          console.log(`⚠️ Schema statement warning (may already exist):`, error.message)
        }
      }
    }

    // Step 3: Apply functions
    console.log('3️⃣ Applying database functions...')
    
    // Split functions into individual statements
    const functionStatements = functionsSQL.split(';').filter(stmt => stmt.trim())
    
    for (const statement of functionStatements) {
      if (statement.trim()) {
        try {
          const { error } = await supabase.rpc('exec_sql', {
            sql: statement.trim() + ';'
          })
          
          if (error) {
            console.log(`⚠️ Function statement warning (may already exist):`, error.message)
          } else {
            console.log('✅ Function statement executed')
          }
        } catch (error) {
          console.log(`⚠️ Function statement warning (may already exist):`, error.message)
        }
      }
    }

    // Step 4: Test OpenAI API key
    console.log('4️⃣ Testing OpenAI API key...')
    
    try {
      const { data, error } = await supabase.rpc('generate_seven_string', {
        ref_title: 'Test Ref',
        caption: 'Test Caption'
      })
      
      if (error) {
        console.log('⚠️ OpenAI API key may not be set or invalid:', error.message)
        console.log('📝 Please set your OpenAI API key in Supabase dashboard:')
        console.log('   1. Go to Settings > Database')
        console.log('   2. Add a new secret with key: app.openai_api_key')
        console.log('   3. Value: your OpenAI API key')
      } else {
        console.log('✅ OpenAI API key is working')
        console.log('Generated 7-string:', data)
      }
    } catch (error) {
      console.log('⚠️ OpenAI API key test failed:', error.message)
    }

    // Step 5: Test basic database operations
    console.log('5️⃣ Testing basic database operations...')
    
    try {
      // Test items table
      const { data: itemsTest, error: itemsError } = await supabase
        .from('items')
        .select('*')
        .limit(1)
      
      if (itemsError) {
        console.error('❌ Items table test failed:', itemsError)
      } else {
        console.log('✅ Items table is accessible')
      }

      // Test users table
      const { data: usersTest, error: usersError } = await supabase
        .from('users')
        .select('*')
        .limit(1)
      
      if (usersError) {
        console.error('❌ Users table test failed:', usersError)
      } else {
        console.log('✅ Users table is accessible')
      }

    } catch (error) {
      console.error('❌ Database operations test failed:', error)
    }

    console.log('✅ Supabase setup completed!')
    console.log('')
    console.log('📝 Next steps:')
    console.log('   1. Run: node populate-supabase-from-pocketbase.js')
    console.log('   2. Start your matchmaking server')
    console.log('   3. Test the search functionality')

  } catch (error) {
    console.error('❌ Error in setupSupabaseComplete:', error)
  }
}

// Run the setup
setupSupabaseComplete() 