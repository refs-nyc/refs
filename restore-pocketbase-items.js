const https = require('https');
const http = require('http');

// Get all item IDs that are marked as deleted
async function getDeletedItemIds() {
  return new Promise((resolve, reject) => {
    const req = http.get('http://127.0.0.1:8090/api/collections/items/records?perPage=1000&filter=deleted%20!=%20null', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          const itemIds = response.items.map(item => item.id);
          resolve(itemIds);
        } catch (error) {
          reject(error);
        }
      });
    });
    req.on('error', reject);
  });
}

// Restore a single item by setting deleted to null
async function restoreItem(itemId) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ deleted: null });
    const options = {
      hostname: '127.0.0.1',
      port: 8090,
      path: `/api/collections/items/records/${itemId}`,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(true);
        } else {
          console.error(`Failed to restore item ${itemId}: ${res.statusCode} - ${responseData}`);
          resolve(false);
        }
      });
    });

    req.on('error', (error) => {
      console.error(`Error restoring item ${itemId}:`, error.message);
      resolve(false);
    });

    req.write(data);
    req.end();
  });
}

// Main function
async function restoreAllItems() {
  try {
    console.log('🔍 Getting deleted item IDs...');
    const deletedItemIds = await getDeletedItemIds();
    console.log(`📋 Found ${deletedItemIds.length} items to restore`);

    console.log('🔄 Restoring items...');
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < deletedItemIds.length; i++) {
      const itemId = deletedItemIds[i];
      const success = await restoreItem(itemId);
      
      if (success) {
        successCount++;
      } else {
        failCount++;
      }

      // Progress indicator
      if ((i + 1) % 50 === 0 || i === deletedItemIds.length - 1) {
        console.log(`📊 Progress: ${i + 1}/${deletedItemIds.length} (${successCount} success, ${failCount} failed)`);
      }
    }

    console.log(`✅ Restoration complete!`);
    console.log(`✅ Successfully restored: ${successCount} items`);
    if (failCount > 0) {
      console.log(`❌ Failed to restore: ${failCount} items`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the script
restoreAllItems(); 