const http = require('http');

// Get all items and clear their deleted field
async function clearDeletedField() {
  return new Promise((resolve, reject) => {
    const req = http.get('http://127.0.0.1:8090/api/collections/items/records?perPage=1000', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          const items = response.items;
          console.log(`📋 Found ${items.length} total items`);
          
          const itemsWithDeleted = items.filter(item => item.deleted !== null);
          console.log(`📋 Found ${itemsWithDeleted.length} items with deleted field`);
          
          if (itemsWithDeleted.length === 0) {
            console.log('✅ No items to fix!');
            resolve();
            return;
          }

          // Clear deleted field for all items
          const updatePromises = itemsWithDeleted.map(item => {
            return new Promise((resolveUpdate) => {
              const updateData = JSON.stringify({ deleted: null });
              const options = {
                hostname: '127.0.0.1',
                port: 8090,
                path: `/api/collections/items/records/${item.id}`,
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                  'Content-Length': updateData.length
                }
              };

              const req = http.request(options, (res) => {
                let responseData = '';
                res.on('data', chunk => responseData += chunk);
                res.on('end', () => {
                  if (res.statusCode === 200) {
                    resolveUpdate(true);
                  } else {
                    console.error(`Failed to update item ${item.id}: ${res.statusCode}`);
                    resolveUpdate(false);
                  }
                });
              });

              req.on('error', (error) => {
                console.error(`Error updating item ${item.id}:`, error.message);
                resolveUpdate(false);
              });

              req.write(updateData);
              req.end();
            });
          });

          Promise.all(updatePromises).then(results => {
            const successCount = results.filter(r => r).length;
            const failCount = results.filter(r => !r).length;
            console.log(`✅ Successfully updated: ${successCount} items`);
            if (failCount > 0) {
              console.log(`❌ Failed to update: ${failCount} items`);
            }
            resolve();
          });

        } catch (error) {
          reject(error);
        }
      });
    });
    req.on('error', reject);
  });
}

// Main function
async function main() {
  try {
    console.log('🔧 Clearing deleted field for all items...');
    await clearDeletedField();
    console.log('✅ Done!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main(); 