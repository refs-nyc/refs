#!/usr/bin/env node

/**
 * Supabase Setup Script
 *
 * This script helps set up Supabase with the necessary extensions and functions
 * for the 7-string and spirit vector system.
 *
 * Prerequisites:
 * 1. Supabase project created
 * 2. pgvector extension enabled
 * 3. http extension enabled (for OpenAI API calls)
 * 4. OpenAI API key configured in Supabase
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config()

const supabaseUrl = process.env.SUPA_URL
const supabaseKey = process.env.SUPA_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error(
    '❌ Missing Supabase credentials. Please set SUPA_URL and SUPA_KEY in your .env file.'
  )
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function setupSupabase() {
  console.log('🚀 Setting up Supabase for 7-string and spirit vector system...\n')

  try {
    // 1. Enable required extensions
    console.log('1️⃣ Enabling required extensions...')

    const extensions = [
      'CREATE EXTENSION IF NOT EXISTS vector;',
      'CREATE EXTENSION IF NOT EXISTS http;',
    ]

    for (const extension of extensions) {
      const { error } = await supabase.rpc('exec_sql', { sql: extension })
      if (error) {
        console.log(`⚠️ Extension setup warning: ${error.message}`)
      } else {
        console.log('✅ Extensions enabled')
      }
    }

    // 2. Create tables
    console.log('\n2️⃣ Creating tables...')

    const schemaPath = path.join(__dirname, 'supabase-schema.sql')
    const schema = fs.readFileSync(schemaPath, 'utf8')

    const { error: schemaError } = await supabase.rpc('exec_sql', { sql: schema })
    if (schemaError) {
      console.log(`⚠️ Schema setup warning: ${schemaError.message}`)
    } else {
      console.log('✅ Tables created')
    }

    // 3. Create functions
    console.log('\n3️⃣ Creating functions...')

    const functionsPath = path.join(__dirname, 'supabase-functions.sql')
    const functions = fs.readFileSync(functionsPath, 'utf8')

    const { error: functionsError } = await supabase.rpc('exec_sql', { sql: functions })
    if (functionsError) {
      console.log(`⚠️ Functions setup warning: ${functionsError.message}`)
    } else {
      console.log('✅ Functions created')
    }

    // 4. Set OpenAI API key
    console.log('\n4️⃣ Setting OpenAI API key...')

    const openaiKey = process.env.OPENAI_API_KEY
    if (!openaiKey) {
      console.log('⚠️ OPENAI_API_KEY not found in environment variables')
      console.log('   Please set it in Supabase dashboard: Settings > Database > Custom Settings')
    } else {
      const { error: keyError } = await supabase.rpc('exec_sql', {
        sql: `ALTER DATABASE postgres SET app.openai_api_key = '${openaiKey}';`,
      })
      if (keyError) {
        console.log(`⚠️ API key setup warning: ${keyError.message}`)
        console.log('   Please set it manually in Supabase dashboard')
      } else {
        console.log('✅ OpenAI API key configured')
      }
    }

    console.log('\n✅ Supabase setup completed!')
    console.log('\n📋 Next steps:')
    console.log('1. Verify tables exist: items, users')
    console.log(
      '2. Verify functions exist: generate_seven_string, generate_embedding, process_new_item, regenerate_spirit_vector'
    )
    console.log('3. Test with a sample item creation')
    console.log('4. Configure PocketBase hooks to trigger Supabase operations')
  } catch (error) {
    console.error('❌ Setup failed:', error)
    process.exit(1)
  }
}

// Run setup
setupSupabase()
