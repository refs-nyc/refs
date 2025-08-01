const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase setup
const supabaseUrl = process.env.EXPO_PUBLIC_SUPA_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPA_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testWebhookFlow() {
  console.log('🧪 Testing webhook flow...');
  
  const testItemId = 'test-webhook-' + Date.now();
  const testData = {
    itemId: testItemId,
    action: 'create',
    itemData: {
      ref: 'qb79121ipb869gk',
      creator: 'rpr8bjg26q72z81',
      text: 'Test webhook flow item',
      ref_title: 'Edge city ',
    },
  };

  try {
    // Call the webhook
    console.log('📡 Calling webhook...');
    const response = await fetch('http://localhost:3002/webhook/item-change', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });

    const result = await response.json();
    console.log('✅ Webhook response:', result);

    // Wait a moment for processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check if the item was processed in Supabase
    console.log('🔍 Checking Supabase for processed item...');
    const { data: item, error } = await supabase
      .from('items')
      .select('id, seven_string, seven_string_embedding')
      .eq('id', testItemId)
      .single();

    if (error) {
      console.log('ℹ️ Item not found in Supabase (expected for test item):', error.message);
    } else {
      console.log('✅ Item found in Supabase:', {
        id: item.id,
        has_seven_string: !!item.seven_string,
        has_embedding: !!item.seven_string_embedding,
      });
    }

    console.log('🎉 Webhook flow test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testWebhookFlow(); 