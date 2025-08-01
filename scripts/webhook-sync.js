const express = require('express');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
app.use(express.json());

// Supabase setup
const supabaseUrl = process.env.EXPO_PUBLIC_SUPA_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPA_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Webhook endpoint for item changes
app.post('/webhook/item-change', async (req, res) => {
  try {
    const { itemId, action, itemData } = req.body;
    
    console.log(`🔄 Webhook received: ${action} for item ${itemId}`);
    
    if (action === 'create' || action === 'update') {
      // Call Supabase edge function to process the item
      const { data, error } = await supabase.functions.invoke('openai', {
        body: {
          action: 'process_item',
          item_id: itemId,
          ref_id: itemData.ref,
          creator: itemData.creator,
          item_text: itemData.text || '',
          ref_title: itemData.ref_title || 'Unknown',
        },
      });

      if (error) {
        console.error(`❌ Error processing item ${itemId}:`, error);
        return res.status(500).json({ error: error.message });
      }

      console.log(`✅ Successfully processed item ${itemId}:`, data);

      // Regenerate spirit vector for the user
      if (itemData.creator) {
        const { data: spiritData, error: spiritError } = await supabase.functions.invoke('openai', {
          body: {
            action: 'regenerate_spirit_vector',
            user_id: itemData.creator,
          },
        });

        if (spiritError) {
          console.error(`❌ Error regenerating spirit vector for user ${itemData.creator}:`, spiritError);
        } else {
          console.log(`✅ Successfully regenerated spirit vector for user ${itemData.creator}:`, spiritData);
        }
      }

      res.json({ success: true, message: `Item ${itemId} processed successfully` });
    } else {
      res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.WEBHOOK_PORT || 3002;

app.listen(PORT, () => {
  console.log(`🚀 Webhook server running on port ${PORT}`);
  console.log(`📡 Webhook endpoint: http://localhost:${PORT}/webhook/item-change`);
}); 