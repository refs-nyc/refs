const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.SUPA_URL
const supabaseKey = process.env.SUPA_KEY
const openaiKey = process.env.OPENAI_API_KEY

if (!supabaseUrl || !supabaseKey || !openaiKey) {
  console.error('❌ Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function setOpenAISecret() {
  console.log('🔑 Setting OpenAI API key as secret in Supabase...')

  try {
    // Set the secret using the REST API
    const { data, error } = await supabase.rpc('set_config', {
      key: 'app.openai_api_key',
      value: openaiKey,
    })

    if (error) {
      console.error('❌ Error setting OpenAI secret:', error)

      // Alternative approach - try to set it via SQL
      console.log('🔄 Trying alternative approach...')

      const { error: sqlError } = await supabase.rpc('exec_sql', {
        sql: `SELECT set_config('app.openai_api_key', '${openaiKey}', false)`,
      })

      if (sqlError) {
        console.error('❌ Alternative approach also failed:', sqlError)
        console.log('📝 You may need to set this manually in the Supabase dashboard:')
        console.log('   1. Go to Settings > Database')
        console.log('   2. Add a new secret with key: app.openai_api_key')
        console.log('   3. Value: your OpenAI API key')
      } else {
        console.log('✅ OpenAI API key set successfully via SQL')
      }
    } else {
      console.log('✅ OpenAI API key set successfully')
    }
  } catch (error) {
    console.error('❌ Error in setOpenAISecret:', error)
    console.log('📝 Manual setup required:')
    console.log('   1. Go to Supabase Dashboard > Settings > Database')
    console.log('   2. Add a new secret with key: app.openai_api_key')
    console.log('   3. Value: your OpenAI API key')
  }
}

// Run the script
setOpenAISecret()
