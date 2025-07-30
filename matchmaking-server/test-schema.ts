import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config()

const supabaseUrl = process.env.SUPA_URL
const supabaseKey = process.env.SUPA_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testSchema() {
  console.log('Testing Supabase schema...')
  
  try {
    // Test 1: Check if items table exists and what columns it has
    console.log('\n1. Testing items table...')
    const { data: items, error: itemsError } = await supabase
      .from('items')
      .select('*')
      .limit(1)
    
    if (itemsError) {
      console.error('Items table error:', itemsError)
    } else {
      console.log('Items table columns:', Object.keys(items[0] || {}))
      console.log('Sample item:', items[0])
    }

    // Test 2: Check if users table exists
    console.log('\n2. Testing users table...')
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(1)
    
    if (usersError) {
      console.error('Users table error:', usersError)
    } else {
      console.log('Users table columns:', Object.keys(users[0] || {}))
      console.log('Sample user:', users[0])
    }

    // Test 3: Check if refs table exists
    console.log('\n3. Testing refs table...')
    const { data: refs, error: refsError } = await supabase
      .from('refs')
      .select('*')
      .limit(1)
    
    if (refsError) {
      console.error('Refs table error:', refsError)
    } else {
      console.log('Refs table columns:', Object.keys(refs[0] || {}))
      console.log('Sample ref:', refs[0])
    }

  } catch (error) {
    console.error('Schema test error:', error)
  }
}

testSchema() 